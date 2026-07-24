// Extraction des champs utiles d'un événement webhook Ringover, d'après le vrai
// schéma publié par Ringover (developer.ringover.com/web/openapi_public.yml) —
// pas une supposition : `{ event, resource, timestamp, data: {...}, attempt? }`,
// tous les champs utiles nichés sous `data`. Un seul type d'événement à la fois
// (ringing/answered/hangup/missed/voicemail/record_available/
// transcription_available/summary_available/tags_updated/comments_updated) : les
// champs de `data` varient donc selon `event`, d'où le côté "tout optionnel" ici.
export type ParsedRingoverEvent = {
  event?: string
  resource?: string
  callId?: string
  phoneNumber?: string
  direction?: "inbound" | "outbound"
  timestamp?: string
  recordUrl?: string // data.record (hangup) ou data.record_link (record_available)
  recordDuration?: string
  transcriptionUrl?: string // data.transcription_url (transcription_available)
  summary?: string // data.summary (summary_available)
}

function firstString(data: Record<string, unknown>, keys: string[]): string | undefined {
  for (const key of keys) {
    const value = data[key]
    if (typeof value === "string" && value.trim()) return value
  }
  return undefined
}

function asDirection(value: unknown): "inbound" | "outbound" | undefined {
  return value === "inbound" || value === "outbound" ? value : undefined
}

// `call_id` est un uint64 (ex. 1234567890987654321) — bien au-delà de
// Number.MAX_SAFE_INTEGER (2^53). `JSON.parse` le convertirait déjà en `number`
// avec perte de précision avant qu'on puisse intervenir, donc on l'extrait par
// regex sur le corps brut, avant tout parsing JSON, pour ne jamais le faire
// transiter par un `number` JS.
export function extractRawCallId(rawBody: string): string | undefined {
  const match = rawBody.match(/"call_id"\s*:\s*(\d+)/)
  return match?.[1]
}

export function parseRingoverEvent(payload: unknown, rawBody?: string): ParsedRingoverEvent {
  if (typeof payload !== "object" || payload === null) return {}
  const root = payload as Record<string, unknown>
  const data = (typeof root.data === "object" && root.data !== null
    ? (root.data as Record<string, unknown>)
    : {}) as Record<string, unknown>

  // Fallback si rawBody n'est pas fourni (tests, ou appelant qui n'a que l'objet
  // déjà parsé) : call_id peut être un number déjà tronqué par JSON.parse, on le
  // convertit quand même en string plutôt que de perdre l'identifiant.
  const rawCallIdField = data.call_id ?? data.callId ?? data.id
  const fallbackCallId =
    typeof rawCallIdField === "string"
      ? rawCallIdField
      : typeof rawCallIdField === "number"
        ? String(rawCallIdField)
        : undefined
  const callId = (rawBody ? extractRawCallId(rawBody) : undefined) ?? fallbackCallId

  return {
    event: firstString(root, ["event"]),
    resource: firstString(root, ["resource"]),
    callId,
    // On ne s'intéresse qu'au numéro de l'appelant externe — pour un appel
    // entrant (le seul cas qui déclenche le bandeau, cf. isIncomingCall), c'est
    // `from_number`. Un événement sortant n'alimente pas le bandeau de toute
    // façon (cf. app/api/ringover/webhook).
    phoneNumber: firstString(data, ["from_number", "caller_number"]),
    direction: asDirection(data.direction),
    timestamp: firstString(root, ["timestamp"]) ?? firstString(data, ["start_time"]),
    recordUrl: firstString(data, ["record", "record_link"]),
    recordDuration: firstString(data, ["record_duration"]),
    transcriptionUrl: firstString(data, ["transcription_url"]),
    summary: firstString(data, ["summary"]),
  }
}

// `new Date(chaîne invalide)` produit un "Invalid Date" que Postgres/Prisma
// rejette à l'insertion — on retombe sur l'instant présent plutôt que de faire
// échouer tout l'enregistrement pour un timestamp mal formé. `timestamp` Ringover
// est un epoch en secondes (ex. 1554823493.76), pas une chaîne ISO.
export function safeDate(value: string | undefined): Date {
  if (!value) return new Date()
  const numeric = Number(value)
  if (Number.isFinite(numeric) && numeric > 0) {
    const fromEpoch = new Date(numeric * 1000)
    if (!Number.isNaN(fromEpoch.getTime())) return fromEpoch
  }
  const date = new Date(value)
  return Number.isNaN(date.getTime()) ? new Date() : date
}

// Le bandeau "Appel en cours" (cf. components/incoming-call-banner.tsx) et le
// CallLog associé ne concernent que l'appel entrant en train de sonner — pas les
// appels sortants, ni manqué/répondu/raccroché/messagerie vocale/mise à jour de
// tags, qui restent uniquement dans RingoverEvent (cf. scope.md "à l'appel
// entrant, détecter automatiquement le contact").
export function isIncomingCall(parsed: ParsedRingoverEvent): boolean {
  return parsed.event === "ringing" && parsed.direction === "inbound"
}
