import { getDelegatedAccessToken } from "./service-account"

// Client Gmail minimal (lecture seule) pour l'analyse des boîtes contact@ /
// prospects@ - cf. lib/prospects-mail/sync.ts.
const API_BASE = "https://gmail.googleapis.com/gmail/v1/users/me"
const SCOPE = "https://www.googleapis.com/auth/gmail.readonly"

type GmailHeader = { name: string; value: string }

type GmailPart = {
  mimeType?: string
  filename?: string
  headers?: GmailHeader[]
  body?: { data?: string; size?: number }
  parts?: GmailPart[]
}

export type GmailMessage = {
  id: string
  threadId: string
  labelIds?: string[]
  snippet?: string
  internalDate?: string
  payload?: GmailPart
}

export type GmailThread = { id: string; messages?: GmailMessage[] }

async function gmailGet<T>(
  mailbox: string,
  path: string,
  params: Record<string, string | string[]> = {},
): Promise<T> {
  const token = await getDelegatedAccessToken(mailbox, SCOPE)
  const query = new URLSearchParams()
  for (const [key, value] of Object.entries(params)) {
    for (const v of Array.isArray(value) ? value : [value]) query.append(key, v)
  }
  const res = await fetch(`${API_BASE}${path}?${query}`, {
    headers: { authorization: `Bearer ${token}` },
  })
  if (!res.ok) throw new Error(`Gmail ${path} (${mailbox}) : ${res.status} ${await res.text()}`)
  return res.json() as Promise<T>
}

// Liste les ids de fils correspondant à la requête Gmail `q`, du plus récent au
// plus ancien, jusqu'à `max`.
export async function listThreadIds(mailbox: string, q: string, max: number): Promise<string[]> {
  const ids: string[] = []
  let pageToken: string | undefined
  do {
    const page = await gmailGet<{ threads?: { id: string }[]; nextPageToken?: string }>(
      mailbox,
      "/threads",
      {
        q,
        maxResults: String(Math.min(100, max - ids.length)),
        ...(pageToken ? { pageToken } : {}),
      },
    )
    ids.push(...(page.threads ?? []).map((t) => t.id))
    pageToken = page.nextPageToken
  } while (pageToken && ids.length < max)
  return ids
}

export function getThread(mailbox: string, threadId: string, format: "minimal" | "full") {
  return gmailGet<GmailThread>(mailbox, `/threads/${threadId}`, { format })
}

export function header(message: GmailMessage, name: string): string | undefined {
  return message.payload?.headers?.find((h) => h.name.toLowerCase() === name.toLowerCase())?.value
}

// "Jean Dupont <jean@x.fr>" -> { name: "Jean Dupont", email: "jean@x.fr" }
export function parseAddress(value: string | undefined): {
  name: string | null
  email: string | null
} {
  if (!value) return { name: null, email: null }
  const match = value.match(/^\s*"?([^"<]*?)"?\s*<([^>]+)>\s*$/)
  if (match) return { name: match[1].trim() || null, email: match[2].trim().toLowerCase() }
  return { name: null, email: value.trim().toLowerCase() }
}

function decode(data: string): string {
  return Buffer.from(data, "base64url").toString("utf8")
}

function htmlToText(html: string): string {
  return html
    .replace(/<(style|script)[\s\S]*?<\/\1>/gi, "")
    .replace(/<br\s*\/?>/gi, "\n")
    .replace(/<\/(p|div|tr|li|h\d)>/gi, "\n")
    .replace(/<[^>]+>/g, "")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
}

function findPart(part: GmailPart | undefined, mimeType: string): GmailPart | undefined {
  if (!part) return undefined
  if (part.mimeType === mimeType && part.body?.data && !part.filename) return part
  for (const child of part.parts ?? []) {
    const found = findPart(child, mimeType)
    if (found) return found
  }
  return undefined
}

// Corps texte d'un message : text/plain de préférence, sinon text/html converti.
// Les réponses citées ("> ..." et tout ce qui suit "Le ... a écrit :") sont
// retirées - le fil complet est de toute façon envoyé message par message.
export function messageText(message: GmailMessage): string {
  const plain = findPart(message.payload, "text/plain")
  const html = plain ? undefined : findPart(message.payload, "text/html")
  const raw = plain?.body?.data
    ? decode(plain.body.data)
    : html?.body?.data
      ? htmlToText(decode(html.body.data))
      : (message.snippet ?? "")

  const lines: string[] = []
  for (const line of raw.replace(/\r\n/g, "\n").split("\n")) {
    if (/^(Le|On) .{5,200}(a écrit|wrote)\s*:\s*$/i.test(line.trim())) break
    if (/^-{2,}\s*(Original Message|Message d'origine)/i.test(line.trim())) break
    if (line.trimStart().startsWith(">")) continue
    lines.push(line)
  }
  return lines
    .join("\n")
    .replace(/\n{3,}/g, "\n\n")
    .trim()
}

export function attachmentNames(message: GmailMessage): string[] {
  const names: string[] = []
  const walk = (part: GmailPart | undefined) => {
    if (!part) return
    if (part.filename) names.push(part.filename)
    part.parts?.forEach(walk)
  }
  walk(message.payload)
  return names
}
