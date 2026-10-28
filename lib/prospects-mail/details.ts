import { prisma } from "@/lib/db/prisma"
import { FIELDS, toDisplay, type ProposalEntity } from "./fields"
import type { ProposedAction } from "./proposals"
import type { ApplyResult } from "./apply"
import { toSummary, type SuggestionSummary } from "./queries"

// Détail complet d'une proposition pour la modale de validation et le drawer
// d'historique : en plus des champs proposés, les valeurs actuelles de TOUS
// les champs du registre pour les fiches existantes - le commercial peut ainsi
// corriger n'importe quel champ, pas seulement ceux que l'IA a remplis.
export type ActionDetail = ProposedAction & { currentValues: Record<string, string | null> }

export type SuggestionDetail = SuggestionSummary & {
  excerpt: string | null
  actionsDetail: ActionDetail[]
  resultat: ApplyResult | null
}

function pick(entity: ProposalEntity, record: Record<string, unknown> | null) {
  return Object.fromEntries(FIELDS[entity].map((f) => [f.key, toDisplay(record?.[f.key])]))
}

async function currentRecord(
  action: ProposedAction,
  contactId: string | null,
): Promise<Record<string, unknown> | null> {
  switch (action.entity) {
    case "contact":
      return action.targetId ? prisma.contact.findUnique({ where: { id: action.targetId } }) : null
    case "prospectDetail":
      return contactId ? prisma.prospectDetail.findUnique({ where: { contactId } }) : null
    case "bien":
      return action.targetId ? prisma.bien.findUnique({ where: { id: action.targetId } }) : null
    case "mandat":
      return action.targetId ? prisma.mandat.findUnique({ where: { id: action.targetId } }) : null
  }
}

export async function getSuggestionDetail(id: string): Promise<SuggestionDetail | null> {
  const suggestion = await prisma.mailSuggestion.findUnique({ where: { id } })
  if (!suggestion) return null

  const actions = suggestion.actions as unknown as ProposedAction[]
  const contactId = actions.find((a) => a.entity === "contact")?.targetId ?? null
  const actionsDetail = await Promise.all(
    actions.map(async (action) => ({
      ...action,
      currentValues: pick(action.entity, await currentRecord(action, contactId)),
    })),
  )

  return {
    ...toSummary(suggestion),
    excerpt: suggestion.excerpt,
    actionsDetail,
    resultat: suggestion.resultat as unknown as ApplyResult | null,
  }
}
