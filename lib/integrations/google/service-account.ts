import { createSign } from "node:crypto"

// Jeton OAuth Google pour le compte de service (GOOGLE_SA_CLIENT_EMAIL) agissant
// au nom d'un utilisateur Workspace (`subject`) - délégation au niveau du domaine
// configurée dans la console Admin Google. Pas de dépendance `googleapis` : le
// flux JWT bearer tient en un appel HTTP signé RS256.
const TOKEN_URL = "https://oauth2.googleapis.com/token"

const cache = new Map<string, { token: string; expiresAt: number }>()

function base64url(value: unknown): string {
  return Buffer.from(JSON.stringify(value)).toString("base64url")
}

export async function getDelegatedAccessToken(subject: string, scope: string): Promise<string> {
  const cacheKey = `${subject} ${scope}`
  const cached = cache.get(cacheKey)
  if (cached && cached.expiresAt > Date.now() + 60_000) return cached.token

  const clientEmail = process.env.GOOGLE_SA_CLIENT_EMAIL
  const privateKey = process.env.GOOGLE_SA_PRIVATE_KEY?.replace(/\\n/g, "\n")
  if (!clientEmail || !privateKey) {
    throw new Error("GOOGLE_SA_CLIENT_EMAIL / GOOGLE_SA_PRIVATE_KEY manquants dans l'environnement")
  }

  const now = Math.floor(Date.now() / 1000)
  const unsigned = `${base64url({ alg: "RS256", typ: "JWT" })}.${base64url({
    iss: clientEmail,
    sub: subject,
    scope,
    aud: TOKEN_URL,
    iat: now,
    exp: now + 3600,
  })}`
  const signature = createSign("RSA-SHA256").update(unsigned).sign(privateKey, "base64url")

  const res = await fetch(TOKEN_URL, {
    method: "POST",
    headers: { "content-type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      grant_type: "urn:ietf:params:oauth:grant-type:jwt-bearer",
      assertion: `${unsigned}.${signature}`,
    }),
  })
  const data = (await res.json()) as {
    access_token?: string
    expires_in?: number
    error?: string
    error_description?: string
  }
  if (!res.ok || !data.access_token) {
    throw new Error(
      `Jeton Google refusé pour ${subject} : ${data.error ?? res.status} ${data.error_description ?? ""}`.trim(),
    )
  }

  cache.set(cacheKey, {
    token: data.access_token,
    expiresAt: Date.now() + (data.expires_in ?? 3600) * 1000,
  })
  return data.access_token
}
