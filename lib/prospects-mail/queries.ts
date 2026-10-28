import { prisma } from "@/lib/db/prisma"
import type { MailSuggestion } from "@/lib/generated/prisma/client"
import type { MailExtraction } from "./extract"
import type { ProposedAction } from "./proposals"
import type { ApplyResult } from "./apply"
import { HISTORY_STATUTS } from "./filters"

export { HISTORY_STATUTS, PERIODES } from "./filters"

export type BoardFilters = {
  search?: string
  statuts?: string[]
  boites?: string[]
  periode?: string
  par?: string[]
  historyLimit?: number
}

export const HISTORY_PAGE_SIZE = 40

// Vue sérialisable (props de composant client) d'une proposition - nom et
// origine lus dans l'extraction IA : pour un mail relayé par un portail,
// l'expéditeur technique (noreply@...) n'est pas le prospect.
export type SuggestionSummary = {
  id: string
  statut: string
  displayName: string
  subject: string | null
  fromEmail: string | null
  mailbox: string
  receivedAt: string
  resume: string | null
  origine: string | null
  actions: Pick<ProposedAction, "entity" | "op">[]
  applied: Pick<NonNullable<ApplyResult["applied"]>[number], "entity" | "op">[] | null
  error: string | null
  traiteLe: string | null
  traitePar: string | null
}

export function toSummary(s: MailSuggestion): SuggestionSummary {
  const extraction = s.extraction as unknown as MailExtraction | null
  const contactName = [extraction?.contact?.prenom, extraction?.contact?.nom]
    .filter(Boolean)
    .join(" ")
  const resultat = s.resultat as unknown as ApplyResult | null
  return {
    id: s.id,
    statut: s.statut,
    displayName: contactName || s.fromName || s.fromEmail || "Expéditeur inconnu",
    subject: s.subject,
    fromEmail: s.fromEmail,
    mailbox: s.mailbox,
    receivedAt: s.receivedAt.toISOString(),
    resume: s.resume,
    origine: extraction?.origine?.precision ?? extraction?.origine?.canal ?? null,
    actions: (s.actions as unknown as ProposedAction[]).map(({ entity, op }) => ({ entity, op })),
    applied: resultat?.applied?.map(({ entity, op }) => ({ entity, op })) ?? null,
    error: s.error,
    traiteLe: s.traiteLe?.toISOString() ?? null,
    traitePar: s.traitePar,
  }
}

function searchWhere(search?: string) {
  if (!search) return {}
  return {
    OR: [
      { subject: { contains: search, mode: "insensitive" as const } },
      { fromName: { contains: search, mode: "insensitive" as const } },
      { fromEmail: { contains: search, mode: "insensitive" as const } },
      { resume: { contains: search, mode: "insensitive" as const } },
    ],
  }
}

export async function listProspectsBoard({
  search,
  statuts = [],
  boites = [],
  periode,
  par = [],
  historyLimit = HISTORY_PAGE_SIZE,
}: BoardFilters) {
  const days = Number(periode)
  // Filtres communs aux deux colonnes : recherche, boîte, période de réception.
  const common = {
    ...searchWhere(search),
    ...(boites.length ? { mailbox: { in: boites } } : {}),
    ...(days > 0 ? { receivedAt: { gte: new Date(Date.now() - days * 86_400_000) } } : {}),
  }
  const allHistory = HISTORY_STATUTS.map((s) => s.value as string)
  const historyWhere = {
    ...common,
    statut: { in: statuts.length ? statuts.filter((s) => allHistory.includes(s)) : allHistory },
    ...(par.length ? { traitePar: { in: par } } : {}),
  }

  const [pending, historyItems, historyTotal, mailboxes, traitants] = await Promise.all([
    prisma.mailSuggestion.findMany({
      where: { ...common, statut: "en_attente" },
      orderBy: { receivedAt: "desc" },
      take: 200,
    }),
    prisma.mailSuggestion.findMany({
      where: historyWhere,
      // Les fils traités par un commercial selon la date de traitement ; ceux
      // écartés automatiquement selon la date du mail.
      orderBy: [{ traiteLe: { sort: "desc", nulls: "last" } }, { receivedAt: "desc" }],
      take: historyLimit,
    }),
    prisma.mailSuggestion.count({ where: historyWhere }),
    prisma.mailSuggestion.findMany({ distinct: ["mailbox"], select: { mailbox: true } }),
    prisma.mailSuggestion.findMany({
      where: { traitePar: { not: null } },
      distinct: ["traitePar"],
      select: { traitePar: true },
    }),
  ])

  return {
    pending: pending.map(toSummary),
    history: historyItems.map(toSummary),
    historyTotal,
    // Valeurs proposées dans le menu Filtres (celles réellement présentes).
    facets: {
      boites: mailboxes.map((m) => m.mailbox).sort(),
      par: traitants.map((t) => t.traitePar!).sort(),
    },
  }
}

export async function lastMailSync() {
  return prisma.syncRun.findFirst({
    where: { source: "GMAIL" },
    orderBy: { startedAt: "desc" },
    select: { startedAt: true, status: true },
  })
}
