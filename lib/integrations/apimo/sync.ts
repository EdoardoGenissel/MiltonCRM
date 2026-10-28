import { Source } from "@/lib/generated/prisma/enums"
import type { ImportResult } from "@/lib/imports/import-types"
import { recordImportRun, type ImportKindGroup } from "@/lib/imports/record-import-run"
import { upsertApimoProspects } from "@/lib/imports/run-import"
import { upsertApimoBiens } from "@/lib/imports/run-import-biens"
import { loadApimoCatalogs } from "./catalogs"
import { apimoGetAbsolute, apimoGetAll } from "./client"
import { mapApimoProperty } from "./map-property"
import { mapApimoRequest } from "./map-request"
import { fullName, type ApimoMappingContext } from "./mapping-context"
import type { ApimoContact, ApimoProperty, ApimoRequest, ApimoResidence, ApimoUser } from "./types"

// Synchro Apimo → CRM par l'API, en remplacement des imports manuels des exports
// Excel "prospects" et "Produits" (biens + mandats) : mêmes écritures en base
// (upsertApimoProspects / upsertApimoBiens), alimentées par l'API plutôt que par
// un fichier. Apimo fait autorité - les fiches qui en viennent ne sont pas
// modifiables dans le CRM, la synchro peut donc les réécrire à chaque passage.
//
// Coût : ~25 requêtes par synchro complète (pages de 1 000), très en dessous du
// quota Apimo (1 000 requêtes affichées dans le dashboard).

// Libellé affiché à la place du nom de fichier dans l'historique des imports.
export const APIMO_SYNC_LABEL = "Synchro API Apimo"

// GET /properties sans filtre ne renvoie que les biens "En cours" (step 1) - 86
// sur 829 le 2026-10-25. Les biens en attente (2) et terminés (3, vendus/loués,
// retirés...) faisaient partie de l'export Excel : on les demande explicitement.
// Step 4 = supprimé, volontairement ignoré.
const PROPERTY_STEPS = [1, 2, 3]

export type ApimoSnapshot = {
  ctx: ApimoMappingContext
  requests: ApimoRequest[]
  properties: ApimoProperty[]
}

function sharedEmails(contacts: ApimoContact[]): Set<string> {
  const counts = new Map<string, number>()
  for (const contact of contacts) {
    const email = contact.email?.trim().toLowerCase()
    if (email) counts.set(email, (counts.get(email) ?? 0) + 1)
  }
  return new Set([...counts].filter(([, n]) => n > 1).map(([email]) => email))
}

export async function fetchApimoSnapshot(): Promise<ApimoSnapshot> {
  const agencyId = Number(process.env.APIMO_AGENCY_ID)
  const [agencies, users, residences, catalogs, contacts, requests, ...propertiesByStep] =
    await Promise.all([
      apimoGetAbsolute<{ agencies: { id: number; name: string }[] }>("/agencies"),
      apimoGetAll<ApimoUser>("users"),
      apimoGetAll<ApimoResidence>("residences"),
      loadApimoCatalogs(),
      apimoGetAll<ApimoContact>("contacts"),
      apimoGetAll<ApimoRequest>("requests"),
      ...PROPERTY_STEPS.map((step) => apimoGetAll<ApimoProperty>("properties", { step })),
    ])

  const ctx: ApimoMappingContext = {
    catalogs,
    agencyName: agencies.agencies.find((a) => a.id === agencyId)?.name ?? "",
    users: new Map(
      users.flatMap((u) => {
        const name = fullName(u.firstname, u.lastname)
        return name ? [[u.id, name] as const] : []
      }),
    ),
    residences: new Map(
      residences.flatMap((r) => (r.name ? [[r.id, r.name.trim()] as const] : [])),
    ),
    contacts: new Map(contacts.map((c) => [c.id, c])),
    sharedEmails: sharedEmails(contacts),
  }

  return { ctx, requests, properties: propertiesByStep.flat() }
}

// Comme l'export Excel (quasi exclusivement des recherches actives) : une
// recherche désactivée n'est plus un prospect à suivre.
export function buildProspectItems({ ctx, requests }: ApimoSnapshot) {
  return requests.flatMap((request) => {
    const contact =
      request.active && request.contact ? ctx.contacts.get(request.contact) : undefined
    return contact ? [mapApimoRequest(request, contact, ctx)] : []
  })
}

export function buildBienItems({ ctx, properties }: ApimoSnapshot) {
  return properties.map((property) => mapApimoProperty(property, ctx))
}

async function runStep(
  kind: ImportKindGroup,
  step: () => Promise<ImportResult>,
): Promise<ImportResult> {
  try {
    return await step()
  } catch (err) {
    const message = err instanceof Error ? err.message : "Erreur inconnue"
    await recordImportRun({
      source: Source.APIMO,
      kind,
      fileName: APIMO_SYNC_LABEL,
      status: "error",
      recordsUpserted: 0,
      duplicatesFound: 0,
      error: message,
    })
    return { status: "error", recordsUpserted: 0, duplicatesFound: 0, error: message }
  }
}

export type ApimoSyncResult = { prospects: ImportResult; biens: ImportResult }

export async function syncApimo(): Promise<ApimoSyncResult> {
  let snapshot: ApimoSnapshot
  try {
    snapshot = await fetchApimoSnapshot()
  } catch (err) {
    // API injoignable : rien n'a été écrit, un seul SyncRun en erreur suffit.
    const failed = await runStep("contacts", () => Promise.reject(err))
    return { prospects: failed, biens: failed }
  }

  // Prospects d'abord : un propriétaire qui est aussi prospect est alors déjà en
  // base avec son id Apimo, et l'import biens le retrouve exactement.
  const prospects = await runStep("contacts", () =>
    upsertApimoProspects(buildProspectItems(snapshot), { fileName: APIMO_SYNC_LABEL }),
  )
  const biens = await runStep("biens_mandats", () =>
    upsertApimoBiens(buildBienItems(snapshot), { fileName: APIMO_SYNC_LABEL }),
  )
  return { prospects, biens }
}
