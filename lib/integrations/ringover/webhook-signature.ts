import { createHmac, timingSafeEqual } from "node:crypto"

// Vérification/signature des webhooks Ringover - mécanisme V1 (actuellement par
// défaut) : un JWT signé HS512, envoyé dans le header `X-Ringover-Webhook-Signature`
// (l'ancien header `Authorization` est conservé pour rétrocompatibilité). Les claims
// décodées exposent `url` (l'endpoint configuré) et `payload` (le corps de
// l'événement) - cf. developer.ringover.com/web/openapi_public.yml, section
// "Securing your webhooks". Pas de dépendance `jsonwebtoken` : HS512 se vérifie en
// ~10 lignes avec le module `crypto` natif de Node.
export type RingoverWebhookClaims = {
  url?: string
  payload?: unknown
  [key: string]: unknown
}

function base64UrlDecode(segment: string): Buffer {
  return Buffer.from(segment, "base64url")
}

export function verifyRingoverSignature(
  token: string,
  secret: string,
): RingoverWebhookClaims | null {
  const parts = token.split(".")
  if (parts.length !== 3) return null
  const [headerB64, payloadB64, signatureB64] = parts

  const expected = createHmac("sha512", secret).update(`${headerB64}.${payloadB64}`).digest()

  let actual: Buffer
  try {
    actual = base64UrlDecode(signatureB64)
  } catch {
    return null
  }
  if (expected.length !== actual.length || !timingSafeEqual(expected, actual)) return null

  try {
    return JSON.parse(base64UrlDecode(payloadB64).toString("utf8"))
  } catch {
    return null
  }
}

// Construit un JWT HS512 identique à ce que Ringover enverrait - utilisé par les
// tests et par le script de simulation manuelle (cf. scripts/), pas par la route
// webhook elle-même (qui ne fait que vérifier).
export function signRingoverPayload(secret: string, claims: RingoverWebhookClaims): string {
  const header = { alg: "HS512", typ: "JWT" }
  const headerB64 = Buffer.from(JSON.stringify(header)).toString("base64url")
  const payloadB64 = Buffer.from(JSON.stringify(claims)).toString("base64url")
  const signature = createHmac("sha512", secret)
    .update(`${headerB64}.${payloadB64}`)
    .digest("base64url")
  return `${headerB64}.${payloadB64}.${signature}`
}
