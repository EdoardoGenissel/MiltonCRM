import { prisma } from "@/lib/db/prisma"
import { Source } from "@/lib/generated/prisma/enums"
import type { Prisma } from "@/lib/generated/prisma/client"
import { fieldDef, fromDisplay, toDisplay, type ProposalEntity } from "./fields"
import type { MailExtraction } from "./extract"
import { loadCandidates, matchContactId, matchExtraction } from "./match"
import { buildActions, type ProposedAction } from "./proposals"

// Choix du commercial pour chaque action proposée (même ordre que
// `MailSuggestion.actions`) : action cochée ou non, et valeurs retenues pour
// les seuls champs cochés (éventuellement corrigées à la main).
export type ActionDecision = { enabled: boolean; fields: Record<string, string> }

// Ce qui a réellement été écrit, conservé dans `MailSuggestion.resultat` pour
// l'historique de la page Prospects (les valeurs ont pu être corrigées à la
// main par rapport à la proposition de l'IA).
export type AppliedChange = {
  entity: ProposalEntity
  op: "create" | "update" | "lien"
  targetId: string | null
  fields: { key: string; label: string; value: string | null }[]
}

export type ApplyResult = {
  contactId?: string
  bienId?: string
  mandatId?: string
  applied?: AppliedChange[]
}

export class ApplyError extends Error {}

function toData(entity: ProposalEntity, fields: Record<string, string>) {
  const data: Record<string, unknown> = {}
  for (const [key, raw] of Object.entries(fields)) {
    const def = fieldDef(entity, key)
    if (!def) continue // champ hors registre : jamais écrit
    const value = fromDisplay(def.type, raw)
    if (value !== undefined) data[key] = value
  }
  return data
}

export async function applySuggestion(
  suggestionId: string,
  decisions: ActionDecision[],
  userEmail: string | null,
): Promise<ApplyResult> {
  const suggestion = await prisma.mailSuggestion.findUnique({ where: { id: suggestionId } })
  if (!suggestion) throw new ApplyError("Proposition introuvable.")
  if (suggestion.statut === "validee") throw new ApplyError("Proposition déjà validée.")

  const actions = suggestion.actions as unknown as ProposedAction[]
  const sourceRef = `${suggestion.mailbox}:${suggestion.gmailMessageId}`
  const chosen = actions
    .map((action, index) => ({ action, decision: decisions[index] }))
    .filter(({ action, decision }) => decision?.enabled || action.op === "lien")
    .map(({ action, decision }) => ({
      action,
      data: toData(action.entity, decision?.fields ?? {}),
    }))
  const find = (entity: ProposalEntity) => chosen.find((c) => c.action.entity === entity)

  // Un même prospect peut écrire dans deux fils différents : si la fiche a été
  // créée entre-temps (autre proposition validée), on la met à jour au lieu de
  // créer un doublon.
  const contactChoice = find("contact")
  let existingContactId = contactChoice?.action.targetId ?? null
  if (contactChoice && !existingContactId) {
    const { contacts } = await loadCandidates()
    existingContactId =
      matchContactId(contacts, {
        email: contactChoice.data.email as string | undefined,
        telephone: contactChoice.data.telephone as string | undefined,
      })?.id ?? null
  }

  const result = await prisma.$transaction(async (tx) => {
    const result: ApplyResult = {}

    if (contactChoice) {
      const data = contactChoice.data
      if (existingContactId) {
        if (Array.isArray(data.personas)) {
          const current = await tx.contact.findUniqueOrThrow({
            where: { id: existingContactId },
            select: { personas: true },
          })
          data.personas = [...new Set([...current.personas, ...(data.personas as string[])])]
        }
        await tx.contact.update({ where: { id: existingContactId }, data })
        result.contactId = existingContactId
      } else {
        if (!data.nom && !data.prenom)
          throw new ApplyError("Nom ou prénom requis pour créer le contact.")
        const created = await tx.contact.create({
          data: {
            ...data,
            prenom: (data.prenom as string | null) ?? "",
            nom: (data.nom as string | null) ?? "",
            personas: (data.personas as string[] | undefined) ?? [],
            source: Source.GMAIL,
            sourceRef,
          },
        })
        result.contactId = created.id
      }
    }

    const recherche = find("prospectDetail")
    if (recherche && result.contactId && Object.keys(recherche.data).length) {
      await tx.prospectDetail.upsert({
        where: { contactId: result.contactId },
        create: { contactId: result.contactId, ...recherche.data },
        update: recherche.data,
      })
    }

    const bien = find("bien")
    if (bien) {
      if (bien.action.targetId) {
        if (bien.action.op === "update" && Object.keys(bien.data).length) {
          await tx.bien.update({ where: { id: bien.action.targetId }, data: bien.data })
        }
        result.bienId = bien.action.targetId
      } else {
        const created = await tx.bien.create({
          data: { ...bien.data, source: Source.GMAIL, sourceRef },
        })
        result.bienId = created.id
      }
    }

    const mandat = find("mandat")
    if (mandat) {
      if (mandat.action.targetId) {
        await tx.mandat.update({ where: { id: mandat.action.targetId }, data: mandat.data })
        result.mandatId = mandat.action.targetId
      } else {
        const created = await tx.mandat.create({
          data: {
            ...mandat.data,
            type: (mandat.data.type as string | null) ?? "simple",
            statut: "en_cours",
            proprietaireId: result.contactId,
            bienId: result.bienId,
            source: Source.GMAIL,
            sourceRef,
          },
        })
        result.mandatId = created.id
      }
    }

    const idFor: Record<ProposalEntity, string | undefined> = {
      contact: result.contactId,
      prospectDetail: result.contactId,
      bien: result.bienId,
      mandat: result.mandatId,
    }
    result.applied = chosen.map(({ action, data }) => ({
      entity: action.entity,
      op:
        action.entity === "contact" && existingContactId
          ? "update"
          : action.op === "lien" || Object.keys(data).length > 0
            ? action.op
            : "lien",
      targetId: idFor[action.entity] ?? null,
      fields: Object.entries(data).map(([key, value]) => ({
        key,
        label: fieldDef(action.entity, key)?.label ?? key,
        value: toDisplay(value),
      })),
    }))

    await tx.mailSuggestion.update({
      where: { id: suggestionId },
      data: {
        statut: "validee",
        resultat: result as unknown as Prisma.InputJsonValue,
        traiteLe: new Date(),
        traitePar: userEmail,
      },
    })
    return result
  })

  return result
}

export async function rejectSuggestion(suggestionId: string, userEmail: string | null) {
  await prisma.mailSuggestion.update({
    where: { id: suggestionId },
    data: { statut: "rejetee", traiteLe: new Date(), traitePar: userEmail },
  })
}

// Remet une proposition dans la file "à valider" - pour un mail jugé non
// pertinent par l'IA à tort, les propositions sont recalculées comme s'il
// l'était (Gemini a quand même extrait ce qu'il a trouvé).
export async function reopenSuggestion(suggestionId: string) {
  const suggestion = await prisma.mailSuggestion.findUniqueOrThrow({ where: { id: suggestionId } })
  if (suggestion.statut === "validee") throw new ApplyError("Proposition déjà validée.")

  let actions = suggestion.actions as unknown as ProposedAction[]
  const extraction = suggestion.extraction as unknown as MailExtraction | null
  if (extraction) {
    const forced = { ...extraction, pertinent: true }
    actions = buildActions(forced, await matchExtraction(forced, await loadCandidates()))
  }

  await prisma.mailSuggestion.update({
    where: { id: suggestionId },
    data: {
      statut: "en_attente",
      actions: actions as unknown as Prisma.InputJsonValue,
      traiteLe: null,
      traitePar: null,
    },
  })
}
