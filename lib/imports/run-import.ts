import { randomUUID } from "node:crypto"
import { prisma } from "@/lib/db/prisma"
import { Source } from "@/lib/generated/prisma/enums"
import { resolveContactMatch, type ContactMatchCandidate } from "@/lib/contacts/dedupe"
import { parseTabularBuffer } from "@/lib/imports/excel-parser"
import {
  buildHeaderIndex,
  mapApimoRow,
  mapSepteoRow,
  type ApimoProspectRow,
  type ImportKind,
} from "@/lib/imports/mapping"
import { apimoProspectPersona } from "@/lib/imports/apimo-persona"
import { chunk } from "@/lib/imports/batch"
import { mapWithConcurrency } from "@/lib/imports/concurrency"
import { parseFrDate } from "@/lib/imports/parse-date"
import { parseNumber } from "@/lib/imports/parse-number"
import { nullifyUndefined } from "@/lib/imports/nullify-undefined"
import { importApimoBiens } from "@/lib/imports/run-import-biens"
import { importSepteoBiens } from "@/lib/imports/run-import-biens-septeo"
import { importSepteoImpayes } from "@/lib/imports/run-import-impayes"
import { importSepteoIncidents } from "@/lib/imports/run-import-incidents"
import { importSepteoLoyersAppeles } from "@/lib/imports/run-import-loyers-appeles"
import { recordImportRun } from "@/lib/imports/record-import-run"
import type { ImportResult, OnProgress } from "@/lib/imports/import-types"

export type { ImportResult, ImportProgress, OnProgress } from "@/lib/imports/import-types"

// Écrire une ligne à la fois (upsert par ligne) fait ~2 allers-retours réseau par
// ligne vers le pooler Supabase - pour 3 700 lignes Apimo ça peut prendre plusieurs
// minutes. On sépare donc dédup (en mémoire, quasi instantané) et écriture DB (en
// masse) : les nouvelles fiches partent en `createMany` par lots de 500 (1 aller-
// retour pour 500 lignes au lieu de 500), les fiches déjà existantes (doublons
// détectés) sont mises à jour en parallèle borné - chacune cible un id distinct,
// donc sans risque de collision entre écritures concurrentes.
const CREATE_BATCH_SIZE = 500
const UPDATE_CONCURRENCY = 10

type CandidateWithPersonas = ContactMatchCandidate & { personas: string[] }

async function loadCandidates(source: Source): Promise<CandidateWithPersonas[]> {
  return prisma.contact.findMany({
    where: { source },
    select: {
      id: true,
      source: true,
      sourceRef: true,
      nom: true,
      prenom: true,
      telephone: true,
      personas: true,
    },
  })
}

// `resolveContactMatch` ne compare que des contacts de même source (cf. son
// contrat : "les candidats doivent déjà être pré-filtrés par l'appelant") - un
// prospect Apimo et un propriétaire/locataire Septéo pour la même personne ne
// matchaient donc jamais, même avec un email identique. Repéré lors de l'audit
// du 2026-07-24 (166 paires de contacts dupliqués par email, cf. mémoire du
// projet) : la fiche la plus ancienne restait orpheline, la plus récente
// n'était jamais reliée dessus. Ce filet de secours vérifie l'email tous
// sources confondues *avant* de créer une nouvelle fiche ; volontairement
// conservateur (persona ajouté, aucun champ écrasé) - cf. `PersonResolver`
// (import biens), même logique.
async function loadContactIdsByEmail(): Promise<Map<string, string>> {
  const rows = await prisma.contact.findMany({
    where: { email: { not: null } },
    select: { id: true, email: true },
  })
  const index = new Map<string, string>()
  for (const row of rows) {
    if (row.email) index.set(row.email.trim().toLowerCase(), row.id)
  }
  return index
}

async function tagCrossSourcePersonas(ids: Map<string, Set<string>>): Promise<void> {
  await mapWithConcurrency([...ids.entries()], UPDATE_CONCURRENCY, async ([id, personasToAdd]) => {
    const contact = await prisma.contact.findUnique({ where: { id }, select: { personas: true } })
    const merged = Array.from(new Set([...(contact?.personas ?? []), ...personasToAdd]))
    await prisma.contact.update({ where: { id }, data: { personas: { set: merged } } })
  })
}

function parseLoyerMax(value: string | undefined): number | undefined {
  if (!value) return undefined
  return parseNumber(value)
}

// Fiche prospect déjà typée - produite soit depuis une ligne de l'export Excel
// (rowToProspectItem ci-dessous), soit depuis une recherche Apimo + son contact
// (lib/integrations/apimo/map-request.ts) : `upsertApimoProspects` ne sait pas
// d'où elle vient.
export type ApimoProspectDetailFields = {
  alerteAbonne: boolean
  classification?: string
  origine?: string
  categorie?: string
  typeBien?: string
  loyerMax?: number
  coAgence?: string
  prixMin?: number
  prixMax?: number
  devise?: string
  pieces?: string
  surfaceMin?: number
  surfaceMax?: number
  secteur?: string
  quartier?: string
  derniereAction?: Date
  commentaire?: string
  creeLe?: Date
  utilisateur?: string
  emailingAbonne?: boolean
  magazineAbonne?: boolean
  originePrecise?: string
  languesParlees: string[]
  dateNaissance?: Date
  lieuNaissance?: string
  adressePersonnelle?: string
  adresseComplement?: string
  codePostal?: string
  villePersonnelle?: string
  pays?: string
  agence?: string
  referenceProduit?: string
  criteresComplementaires?: string
  attributs?: string
  majLe?: Date
  majPar?: string
}

// Une ligne = une recherche : une même personne peut apparaître plusieurs fois
// (ex. une recherche en location + une en achat). Ses types de prospect se
// cumulent, les critères sont ceux de la dernière ligne traitée.
export type ApimoProspectItem = {
  sourceRef?: string
  civilite?: string
  prenom: string
  nom: string
  telephone?: string
  email?: string
  commune?: string
  persona: string
  detail: ApimoProspectDetailFields
}

// Ligne Excel → item. Le loyer max n'a de sens que pour une recherche en
// location ("Prix max" = budget d'achat sinon).
function rowToProspectItem(mapped: ApimoProspectRow): ApimoProspectItem {
  return {
    sourceRef: mapped.sourceRef,
    civilite: mapped.civilite,
    prenom: mapped.prenom,
    nom: mapped.nom,
    telephone: mapped.telephone,
    email: mapped.email,
    commune: mapped.commune,
    persona: apimoProspectPersona(mapped.categorie),
    detail: {
      alerteAbonne: mapped.alerteAbonne,
      classification: mapped.classification,
      origine: mapped.origine,
      categorie: mapped.categorie,
      typeBien: mapped.typeBien,
      loyerMax:
        mapped.categorie?.toLowerCase() === "location" ? parseLoyerMax(mapped.loyerMax) : undefined,
      coAgence: mapped.coAgence,
      prixMin: parseNumber(mapped.prixMin),
      prixMax: parseNumber(mapped.prixMax),
      devise: mapped.devise,
      pieces: mapped.pieces,
      surfaceMin: parseNumber(mapped.surfaceMin),
      surfaceMax: parseNumber(mapped.surfaceMax),
      secteur: mapped.secteur,
      quartier: mapped.quartier,
      derniereAction: parseFrDate(mapped.derniereAction),
      commentaire: mapped.commentaire,
      creeLe: parseFrDate(mapped.creeLe),
      utilisateur: mapped.utilisateur,
      emailingAbonne: mapped.emailingAbonne,
      magazineAbonne: mapped.magazineAbonne,
      originePrecise: mapped.originePrecise,
      languesParlees: mapped.languesParlees,
      dateNaissance: parseFrDate(mapped.dateNaissance),
      lieuNaissance: mapped.lieuNaissance,
      adressePersonnelle: mapped.adressePersonnelle,
      adresseComplement: mapped.adresseComplement,
      codePostal: mapped.codePostal,
      villePersonnelle: mapped.villePersonnelle,
      pays: mapped.pays,
      agence: mapped.agence,
      referenceProduit: mapped.referenceProduit,
      criteresComplementaires: mapped.criteresComplementaires,
      attributs: mapped.attributs,
      majLe: parseFrDate(mapped.majLe),
      majPar: mapped.majPar,
    },
  }
}

async function importApimoProspects(
  buffer: ArrayBuffer,
  fileName: string,
  onProgress?: OnProgress,
): Promise<ImportResult> {
  const { headerRow, rows } = await parseTabularBuffer(buffer, fileName)
  const headerIndex = buildHeaderIndex(headerRow)
  const items = rows
    .map((row) => mapApimoRow(headerIndex, row))
    .filter((mapped): mapped is ApimoProspectRow => mapped !== null)
    .map(rowToProspectItem)
  return upsertApimoProspects(items, { fileName, onProgress })
}

export async function upsertApimoProspects(
  items: ApimoProspectItem[],
  { fileName, onProgress }: { fileName: string; onProgress?: OnProgress },
): Promise<ImportResult> {
  const candidates = await loadCandidates(Source.APIMO)
  const emailIndex = await loadContactIdsByEmail()

  // Phase 1 - dédup en mémoire, aucun accès DB : rapide même sur des milliers de
  // lignes, donc pas besoin d'y reporter de progression.
  type ToCreate = { id: string; item: ApimoProspectItem }
  type ToUpdate = { matchId: string; item: ApimoProspectItem }
  const toCreate: ToCreate[] = []
  const toUpdate: ToUpdate[] = []
  const crossSourceTags = new Map<string, Set<string>>()

  for (const item of items) {
    if (!item.nom) continue

    const matchId = resolveContactMatch(candidates, {
      source: Source.APIMO,
      sourceRef: item.sourceRef,
      nom: item.nom,
      prenom: item.prenom,
      telephone: item.telephone,
    })

    const emailMatchId = matchId
      ? null
      : (item.email && emailIndex.get(item.email.trim().toLowerCase())) || null

    if (matchId) {
      toUpdate.push({ matchId, item })
    } else if (emailMatchId) {
      const personas = crossSourceTags.get(emailMatchId) ?? new Set<string>()
      personas.add(item.persona)
      crossSourceTags.set(emailMatchId, personas)
    } else {
      const id = randomUUID()
      toCreate.push({ id, item })
      // Visible immédiatement pour les lignes suivantes du même fichier (ex. une
      // même personne présente deux fois dans l'export) - sans ça, deux lignes
      // identiques créeraient deux contacts au lieu d'un doublon détecté.
      candidates.push({
        id,
        source: Source.APIMO,
        sourceRef: item.sourceRef ?? null,
        nom: item.nom,
        prenom: item.prenom,
        telephone: item.telephone ?? null,
        personas: [item.persona],
      })
      if (item.email) emailIndex.set(item.email.trim().toLowerCase(), id)
    }
  }

  const total = toCreate.length + toUpdate.length + crossSourceTags.size
  let processed = 0

  // Phase 2a - nouvelles fiches, par lots.
  for (const batch of chunk(toCreate, CREATE_BATCH_SIZE)) {
    await prisma.contact.createMany({
      data: batch.map(({ id, item }) => ({
        id,
        civilite: item.civilite,
        prenom: item.prenom,
        nom: item.nom,
        email: item.email,
        telephone: item.telephone,
        commune: item.commune,
        personas: [item.persona],
        source: Source.APIMO,
        sourceRef: item.sourceRef,
      })),
    })
    await prisma.prospectDetail.createMany({
      data: batch.map(({ id, item }) => ({ contactId: id, ...item.detail })),
    })
    processed += batch.length
    onProgress?.({ processed, total })
  }

  // Phase 2b - doublons détectés (matchId existant) : update en parallèle borné.
  // Une personne présente sur plusieurs lignes (plusieurs recherches) est mise à
  // jour une fois par ligne : chacune ajoute son persona, la dernière fixe les
  // critères. D'où l'écriture séquentielle par contact (chaîne de promesses) -
  // deux lignes du même contact en parallèle pourraient s'écraser leurs personas.
  const updatesByContact = new Map<string, ApimoProspectItem[]>()
  for (const { matchId, item } of toUpdate) {
    updatesByContact.set(matchId, [...(updatesByContact.get(matchId) ?? []), item])
  }
  await mapWithConcurrency(
    [...updatesByContact.entries()],
    UPDATE_CONCURRENCY,
    async ([matchId, contactItems]) => {
      // Fusionne avec les personas existants plutôt que d'écraser : un contact peut
      // avoir été rattaché entretemps comme vendeur/bailleur/locataire (import biens
      // ou Septéo) - un ré-import Apimo prospects ne doit pas faire disparaître ce
      // type (cf. bug corrigé lors de l'ajout de l'import biens).
      const existingPersonas = candidates.find((c) => c.id === matchId)?.personas ?? []
      const mergedPersonas = Array.from(
        new Set([...existingPersonas, ...contactItems.map((item) => item.persona)]),
      )
      const item = contactItems[contactItems.length - 1]

      await prisma.contact.update({
        where: { id: matchId },
        data: {
          civilite: item.civilite,
          email: item.email,
          telephone: item.telephone,
          commune: item.commune,
          personas: { set: mergedPersonas },
        },
      })
      await prisma.prospectDetail.upsert({
        where: { contactId: matchId },
        create: { contactId: matchId, ...item.detail },
        update: nullifyUndefined(item.detail),
      })
      processed += contactItems.length
      onProgress?.({ processed, total })
    },
  )

  // Phase 2c - doublons cross-source détectés par email (contact déjà existant
  // côté Septéo) : on ajoute seulement le persona, sans écraser ses champs.
  await tagCrossSourcePersonas(crossSourceTags)
  processed += crossSourceTags.size
  onProgress?.({ processed, total })

  const duplicatesFound = toUpdate.length + crossSourceTags.size

  await recordImportRun({
    source: Source.APIMO,
    kind: "contacts",
    fileName,
    status: "success",
    recordsUpserted: total,
    duplicatesFound,
  })

  return { status: "success", recordsUpserted: total, duplicatesFound }
}

async function importSepteoContacts(
  buffer: ArrayBuffer,
  fileName: string,
  onProgress?: OnProgress,
): Promise<ImportResult> {
  const { headerRow, rows } = await parseTabularBuffer(buffer, fileName)
  const headerIndex = buildHeaderIndex(headerRow)
  const candidates = await loadCandidates(Source.SEPTEO)
  const emailIndex = await loadContactIdsByEmail()

  type ToCreate = { id: string; mapped: NonNullable<ReturnType<typeof mapSepteoRow>> }
  type ToUpdate = {
    matchId: string
    mapped: NonNullable<ReturnType<typeof mapSepteoRow>>
    mergedPersonas: string[]
  }
  const toCreate: ToCreate[] = []
  const toUpdate: ToUpdate[] = []
  const crossSourceTags = new Map<string, Set<string>>()

  for (const row of rows) {
    const mapped = mapSepteoRow(headerIndex, row)
    if (!mapped) continue

    const matchId = resolveContactMatch(candidates, {
      source: Source.SEPTEO,
      nom: mapped.nom,
      prenom: mapped.prenom,
      telephone: mapped.telephone,
    })

    const emailMatchId = matchId
      ? null
      : (mapped.email && emailIndex.get(mapped.email.trim().toLowerCase())) || null

    if (matchId) {
      const existingPersonas = candidates.find((c) => c.id === matchId)?.personas ?? []
      const mergedPersonas = Array.from(new Set([...existingPersonas, ...mapped.personas]))
      toUpdate.push({ matchId, mapped, mergedPersonas })
    } else if (emailMatchId) {
      const personas = crossSourceTags.get(emailMatchId) ?? new Set<string>()
      mapped.personas.forEach((p) => personas.add(p))
      crossSourceTags.set(emailMatchId, personas)
    } else {
      const id = randomUUID()
      toCreate.push({ id, mapped })
      candidates.push({
        id,
        source: Source.SEPTEO,
        sourceRef: null,
        nom: mapped.nom,
        prenom: mapped.prenom,
        telephone: mapped.telephone ?? null,
        personas: mapped.personas,
      })
      if (mapped.email) emailIndex.set(mapped.email.trim().toLowerCase(), id)
    }
  }

  const total = toCreate.length + toUpdate.length + crossSourceTags.size
  let processed = 0

  for (const batch of chunk(toCreate, CREATE_BATCH_SIZE)) {
    await prisma.contact.createMany({
      data: batch.map(({ id, mapped }) => ({
        id,
        prenom: mapped.prenom,
        nom: mapped.nom,
        email: mapped.email,
        telephone: mapped.telephone,
        commune: mapped.commune,
        personas: mapped.personas,
        source: Source.SEPTEO,
      })),
    })
    processed += batch.length
    onProgress?.({ processed, total })
  }

  await mapWithConcurrency(
    toUpdate,
    UPDATE_CONCURRENCY,
    async ({ matchId, mapped, mergedPersonas }) => {
      await prisma.contact.update({
        where: { id: matchId },
        data: {
          email: mapped.email,
          telephone: mapped.telephone,
          commune: mapped.commune,
          personas: { set: mergedPersonas },
        },
      })
      processed += 1
      onProgress?.({ processed, total })
    },
  )

  await tagCrossSourcePersonas(crossSourceTags)
  processed += crossSourceTags.size
  onProgress?.({ processed, total })
  const duplicatesFound = toUpdate.length + crossSourceTags.size

  await recordImportRun({
    source: Source.SEPTEO,
    kind: "contacts",
    fileName,
    status: "success",
    recordsUpserted: total,
    duplicatesFound,
  })

  return { status: "success", recordsUpserted: total, duplicatesFound }
}

export async function runImport(
  kind: ImportKind,
  buffer: ArrayBuffer,
  fileName: string,
  onProgress?: OnProgress,
): Promise<ImportResult> {
  try {
    switch (kind) {
      case "apimo_prospects":
        return await importApimoProspects(buffer, fileName, onProgress)
      case "apimo_biens":
        return await importApimoBiens(buffer, fileName, onProgress)
      case "septeo_contacts":
        return await importSepteoContacts(buffer, fileName, onProgress)
      case "septeo_biens":
        return await importSepteoBiens(buffer, fileName, onProgress)
      case "septeo_impayes":
        return await importSepteoImpayes(buffer, fileName, onProgress)
      case "septeo_incidents":
        return await importSepteoIncidents(buffer, fileName, onProgress)
      case "septeo_loyers_appeles":
        return await importSepteoLoyersAppeles(buffer, fileName, onProgress)
    }
  } catch (err) {
    const message = err instanceof Error ? err.message : "Erreur inconnue"
    const errorKind: Record<
      ImportKind,
      "contacts" | "biens_mandats" | "impayes" | "incidents" | "loyers_appeles"
    > = {
      apimo_prospects: "contacts",
      septeo_contacts: "contacts",
      apimo_biens: "biens_mandats",
      septeo_biens: "biens_mandats",
      septeo_impayes: "impayes",
      septeo_incidents: "incidents",
      septeo_loyers_appeles: "loyers_appeles",
    }
    await recordImportRun({
      source: kind === "apimo_prospects" || kind === "apimo_biens" ? Source.APIMO : Source.SEPTEO,
      kind: errorKind[kind],
      fileName,
      status: "error",
      recordsUpserted: 0,
      duplicatesFound: 0,
      error: message,
    })
    return { status: "error", recordsUpserted: 0, duplicatesFound: 0, error: message }
  }
}
