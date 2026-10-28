import { prisma } from "@/lib/db/prisma"
import { Source } from "@/lib/generated/prisma/enums"
import type { Prisma } from "@/lib/generated/prisma/client"
import { mapWithConcurrency } from "@/lib/imports/concurrency"
import {
  attachmentNames,
  getThread,
  header,
  listThreadIds,
  messageText,
  parseAddress,
  type GmailMessage,
} from "@/lib/integrations/google/gmail"
import { extractFromThread } from "./extract"
import { loadCandidates, matchExtraction, type MatchCandidates } from "./match"
import { buildActions } from "./proposals"

// Boîtes analysées - surchargeable par PROSPECTS_MAILBOXES (liste séparée par
// des virgules). Le compte de service doit avoir la délégation Gmail
// (gmail.readonly) sur chacune.
function mailboxes(): string[] {
  const fromEnv = process.env.PROSPECTS_MAILBOXES?.split(",")
    .map((m) => m.trim())
    .filter(Boolean)
  if (fromEnv?.length) return fromEnv
  const domain = process.env.GOOGLE_WORKSPACE_DOMAIN ?? "miltonimmobilier.fr"
  return [`contact@${domain}`, `prospects@${domain}`]
}

// contact@ reçoit beaucoup de bruit (newsletters, publicités) : on écarte d'emblée
// les catégories Gmail Promotions/Réseaux sociaux, le reste est trié par l'IA
// (`pertinent`) - les portails immobiliers arrivent souvent en "Notifications",
// on ne peut donc pas filtrer davantage côté Gmail.
const WINDOW_DAYS = Number(process.env.PROSPECTS_MAIL_WINDOW_DAYS ?? 14)
const GMAIL_QUERY = `-in:sent -in:chats -in:spam -in:trash -category:promotions -category:social newer_than:${WINDOW_DAYS}d`
const MAX_THREADS_SCANNED = 300
const CONCURRENCY = 4
const MAX_THREAD_CHARS = 15_000
const MAX_MESSAGE_CHARS = 6_000

export type MailSyncResult = {
  status: "success" | "error"
  analyzed: number
  proposals: number
  ignored: number
  failed: number
  remaining: number
  error?: string
}

// Message "entrant" = reçu par la boîte (un message envoyé à soi-même, ex.
// transfert d'une notification Calendly, porte à la fois SENT et INBOX).
function isInbound(message: GmailMessage): boolean {
  const labels = message.labelIds ?? []
  return !labels.includes("SENT") || labels.includes("INBOX")
}

function threadText(messages: GmailMessage[]): string {
  const blocks = messages.map((m) => {
    const attachments = attachmentNames(m)
    const body = messageText(m)
    return [
      `De : ${header(m, "From") ?? "?"}`,
      `À : ${header(m, "To") ?? "?"}`,
      `Date : ${header(m, "Date") ?? "?"}`,
      `Objet : ${header(m, "Subject") ?? ""}`,
      attachments.length ? `Pièces jointes : ${attachments.join(", ")}` : null,
      "",
      body.length > MAX_MESSAGE_CHARS ? `${body.slice(0, MAX_MESSAGE_CHARS)}…` : body,
    ]
      .filter((line) => line !== null)
      .join("\n")
  })
  const text = blocks.join("\n\n-----\n\n")
  // Les messages les plus récents priment : on tronque par le début.
  return text.length > MAX_THREAD_CHARS ? `…${text.slice(-MAX_THREAD_CHARS)}` : text
}

// Équipe commerciale, pour attribuer l'origine "Prospection" : profils CRM
// (prénom + email, ex. "Johan <johan@...>") rapprochés par prénom des noms
// d'utilisateurs Apimo ("Johan MILTON"), libellé de référence côté Apimo.
export async function loadCommerciaux(): Promise<string[]> {
  const [profiles, utilisateurs] = await Promise.all([
    prisma.profile.findMany({ select: { fullName: true, email: true } }),
    prisma.bien.findMany({
      where: { utilisateur: { not: null } },
      distinct: ["utilisateur"],
      select: { utilisateur: true },
    }),
  ])
  const firstName = (name: string) => name.trim().split(/\s+/)[0].toLowerCase()
  const apimoNames = utilisateurs
    .map((u) => u.utilisateur!)
    .filter((name) => !/milton immobilier/i.test(name))

  const used = new Set<string>()
  const team = profiles.map((p) => {
    const apimo = apimoNames.find((name) => firstName(name) === firstName(p.fullName))
    if (apimo) used.add(apimo)
    return `${apimo ?? p.fullName} (${p.email})`
  })
  return [...team, ...apimoNames.filter((name) => !used.has(name))]
}

type PendingThread = { mailbox: string; threadId: string; lastInboundId: string }

// Fils dont le dernier message entrant n'a pas encore été analysé (ou dont
// l'analyse a échoué) - du plus récent au plus ancien.
async function findPendingThreads(mailbox: string): Promise<PendingThread[]> {
  const threadIds = await listThreadIds(mailbox, GMAIL_QUERY, MAX_THREADS_SCANNED)
  const known = await prisma.mailSuggestion.findMany({
    where: { mailbox, gmailThreadId: { in: threadIds }, statut: { not: "erreur" } },
    select: { gmailMessageId: true },
  })
  const knownIds = new Set(known.map((s) => s.gmailMessageId))

  const pending: (PendingThread | null)[] = new Array(threadIds.length).fill(null)
  await mapWithConcurrency(threadIds, 8, async (threadId, index) => {
    const thread = await getThread(mailbox, threadId, "minimal")
    const lastInbound = (thread.messages ?? []).filter(isInbound).at(-1)
    if (lastInbound && !knownIds.has(lastInbound.id)) {
      pending[index] = { mailbox, threadId, lastInboundId: lastInbound.id }
    }
  })
  return pending.filter((p): p is PendingThread => p !== null)
}

async function analyzeThread(
  pending: PendingThread,
  candidates: MatchCandidates,
  commerciaux: string[],
) {
  const thread = await getThread(pending.mailbox, pending.threadId, "full")
  const messages = thread.messages ?? []
  const lastInbound = messages.filter(isInbound).at(-1)
  if (!lastInbound) return null

  const from = parseAddress(header(lastInbound, "From"))
  const base = {
    mailbox: pending.mailbox,
    gmailThreadId: pending.threadId,
    gmailMessageId: lastInbound.id,
    fromName: from.name,
    fromEmail: from.email,
    subject: header(messages[0], "Subject") ?? null,
    receivedAt: new Date(Number(lastInbound.internalDate ?? Date.now())),
  }
  const text = threadText(messages)

  let data: Omit<Prisma.MailSuggestionUncheckedCreateInput, keyof typeof base>
  try {
    const extraction = await extractFromThread(pending.mailbox, text, commerciaux)
    const actions = buildActions(extraction, await matchExtraction(extraction, candidates))
    data = {
      excerpt: text,
      pertinent: extraction.pertinent,
      resume: extraction.resume,
      extraction: extraction as unknown as Prisma.InputJsonValue,
      actions: actions as unknown as Prisma.InputJsonValue,
      statut: extraction.pertinent ? "en_attente" : "ignoree",
      error: null,
    }
  } catch (err) {
    data = {
      excerpt: text,
      statut: "erreur",
      error: err instanceof Error ? err.message : "Erreur d'analyse inconnue",
    }
  }

  // Une proposition encore non traitée sur ce fil est réanalysée sur place
  // (nouveau message) plutôt que doublée ; une proposition déjà validée/rejetée
  // est conservée telle quelle et la nouvelle s'ajoute à côté.
  const open = await prisma.mailSuggestion.findFirst({
    where: {
      mailbox: pending.mailbox,
      gmailThreadId: pending.threadId,
      statut: { in: ["en_attente", "ignoree", "erreur"] },
    },
    select: { id: true },
  })
  return open
    ? prisma.mailSuggestion.update({ where: { id: open.id }, data: { ...base, ...data } })
    : prisma.mailSuggestion.create({ data: { ...base, ...data } })
}

// Analyse les nouveaux fils des boîtes configurées, dans la limite de
// `timeBudgetMs` (les routes serverless ont une durée max) : ce qui n'a pas pu
// être traité le sera au passage suivant (cron ou bouton "Analyser").
export async function syncProspectMails({
  timeBudgetMs = 20_000,
}: { timeBudgetMs?: number } = {}): Promise<MailSyncResult> {
  const startedAt = Date.now()
  const syncRun = await prisma.syncRun.create({ data: { source: Source.GMAIL, status: "running" } })
  const result: MailSyncResult = {
    status: "success",
    analyzed: 0,
    proposals: 0,
    ignored: 0,
    failed: 0,
    remaining: 0,
  }

  try {
    const pending = (await Promise.all(mailboxes().map(findPendingThreads))).flat()
    const [candidates, commerciaux] = await Promise.all([loadCandidates(), loadCommerciaux()])

    let started = 0
    await mapWithConcurrency(pending, CONCURRENCY, async (thread) => {
      if (Date.now() - startedAt > timeBudgetMs) return
      started++
      const saved = await analyzeThread(thread, candidates, commerciaux).catch(() => null)
      result.analyzed++
      if (!saved || saved.statut === "erreur") result.failed++
      else if (saved.statut === "ignoree") result.ignored++
      else result.proposals++
    })
    result.remaining = pending.length - started

    await prisma.syncRun.update({
      where: { id: syncRun.id },
      data: {
        status: result.failed > 0 ? "error" : "success",
        finishedAt: new Date(),
        recordsUpserted: result.analyzed - result.failed,
        error: result.failed > 0 ? `${result.failed} fil(s) en échec d'analyse` : undefined,
      },
    })
    return result
  } catch (err) {
    const message = err instanceof Error ? err.message : "Erreur d'analyse des mails inconnue"
    await prisma.syncRun.update({
      where: { id: syncRun.id },
      data: { status: "error", finishedAt: new Date(), error: message },
    })
    return { ...result, status: "error", error: message }
  }
}
