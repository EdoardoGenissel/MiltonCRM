// Client HTTP bas niveau pour l'API Apimo (api.apimo.pro). Auth Basic
// (provider:token), porté depuis Cockpit (lib/integrations/apimo/client.ts) où il
// est déjà vérifié en conditions réelles - cf. Cockpit/scripts/test-apimo-auth.ts.
//
// Important - `provider` (APIMO_PROVIDER, utilisé pour l'auth Basic) et `agency_id`
// (APIMO_AGENCY_ID, utilisé dans le chemin `/agencies/{agency_id}/...`) sont deux
// identifiants DIFFÉRENTS côté Apimo. Confondre les deux fait échouer tous les
// endpoints `/agencies/{id}/...` en 403 alors que l'auth elle-même est valide.
// Récupérer l'agency_id via `GET /agencies` plutôt que de réutiliser le provider.
//
// Apimo filtre les appels par IP (whitelist) : les IP de Netlify changeant, tous
// les appels passent par le proxy QuotaGuard Static (IP fixes, à déclarer chez
// Apimo) dès que QUOTAGUARDSTATIC_URL est défini. On utilise le `fetch` d'undici
// et non celui de Node pour que le ProxyAgent et le fetch soient de la même
// version (mélanger les deux casse sur certaines versions de Node).
import { fetch, ProxyAgent, type RequestInit, type Response } from "undici"

const API_BASE = "https://api.apimo.pro"

let proxyAgent: ProxyAgent | undefined

function apimoFetch(url: string | URL, init: RequestInit = {}): Promise<Response> {
  const proxyUrl = process.env.QUOTAGUARDSTATIC_URL
  if (!proxyUrl) return fetch(url, init)
  proxyAgent ??= new ProxyAgent(proxyUrl)
  return fetch(url, { ...init, dispatcher: proxyAgent })
}

export class ApimoAuthError extends Error {
  constructor(
    public status: number,
    public detail: string,
  ) {
    super(`Apimo auth error ${status}: ${detail}`)
  }
}

export class ApimoForbiddenError extends Error {
  constructor(detail: string) {
    super(
      `Apimo a répondu 403 Forbidden : ${detail}. Vérifier d'abord APIMO_AGENCY_ID ` +
        "(doit être l'id retourné par GET /agencies, pas APIMO_PROVIDER), puis que " +
        "QUOTAGUARDSTATIC_URL est défini et que les IP QuotaGuard sont whitelistées " +
        "chez Apimo, avant de suspecter un scope manquant.",
    )
  }
}

function getCredentials(): { provider: string; token: string; agencyId: string } {
  const provider = process.env.APIMO_PROVIDER
  const token = process.env.APIMO_API_KEY
  const agencyId = process.env.APIMO_AGENCY_ID
  if (!provider || !token || !agencyId) {
    throw new Error(
      "APIMO_PROVIDER / APIMO_API_KEY / APIMO_AGENCY_ID manquants dans l'environnement",
    )
  }
  return { provider, token, agencyId }
}

function authHeader(): string {
  const { provider, token } = getCredentials()
  return `Basic ${Buffer.from(`${provider}:${token}`).toString("base64")}`
}

async function parseAndCheck<T>(response: Response): Promise<T> {
  // `any` comme le fetch natif : la forme dépend de l'endpoint, validée par l'appelant.
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const body: any = await response.json().catch(() => null)

  if (response.status === 401 || response.status === 400) {
    throw new ApimoAuthError(response.status, body?.detail ?? response.statusText)
  }
  if (response.status === 403) {
    throw new ApimoForbiddenError(body?.detail ?? response.statusText)
  }
  if (!response.ok) {
    throw new Error(`Apimo API error ${response.status}: ${JSON.stringify(body)}`)
  }

  return body as T
}

/**
 * GET authentifié sur l'API Apimo, relatif à `/agencies/{agency_id}`, ex.
 * `apimoGet("/leads", { limit: 50 })` → GET /agencies/{agency_id}/leads?limit=50
 */
export async function apimoGet<T = unknown>(
  path: string,
  params?: Record<string, string | number>,
): Promise<T> {
  const { agencyId } = getCredentials()
  const url = new URL(`${API_BASE}/agencies/${agencyId}${path}`)
  for (const [key, value] of Object.entries(params ?? {})) {
    url.searchParams.set(key, String(value))
  }

  const response = await apimoFetch(url, {
    headers: { Authorization: authHeader(), Accept: "application/json" },
  })
  return parseAndCheck<T>(response)
}

// Maximum accepté par l'API sur tous les endpoints de liste (cf. Cockpit/apimmo.md).
const PAGE_SIZE = 1000

/**
 * Parcourt toutes les pages d'un endpoint de liste (`limit`/`offset`), ex.
 * `apimoGetAll("contacts")` → GET /agencies/{agency_id}/contacts?limit=1000&offset=0,
 * puis offset=1000... jusqu'à `total_items`. La réponse est toujours enveloppée
 * (`{ total_items, timestamp, <resource>: [...] }`), jamais un tableau brut.
 */
export async function apimoGetAll<T>(
  resource: string,
  params?: Record<string, string | number>,
): Promise<T[]> {
  const items: T[] = []
  for (let offset = 0; ; offset += PAGE_SIZE) {
    const page = await apimoGet<Record<string, unknown> & { total_items?: number }>(
      `/${resource}`,
      {
        ...params,
        limit: PAGE_SIZE,
        offset,
      },
    )
    const batch = (page[resource] ?? []) as T[]
    items.push(...batch)
    if (batch.length < PAGE_SIZE || items.length >= (page.total_items ?? 0)) return items
  }
}

/**
 * POST authentifié sur l'API Apimo, relatif à `/agencies/{agency_id}`, ex.
 * `apimoPost("/leads", { reference, type, ... })` → POST /agencies/{agency_id}/leads
 */
export async function apimoPost<T = unknown>(path: string, body: unknown): Promise<T> {
  const { agencyId } = getCredentials()
  const url = `${API_BASE}/agencies/${agencyId}${path}`

  const response = await apimoFetch(url, {
    method: "POST",
    headers: {
      Authorization: authHeader(),
      Accept: "application/json",
      "Content-Type": "application/json",
    },
    body: JSON.stringify(body),
  })
  return parseAndCheck<T>(response)
}

/**
 * GET authentifié sur un chemin absolu (non préfixé par `/agencies/{agency_id}`),
 * ex. les catalogues : `apimoGetAbsolute("/catalogs/lead_type", { culture: "fr" })`.
 */
export async function apimoGetAbsolute<T = unknown>(
  path: string,
  params?: Record<string, string | number>,
): Promise<T> {
  const url = new URL(`${API_BASE}${path}`)
  for (const [key, value] of Object.entries(params ?? {})) {
    url.searchParams.set(key, String(value))
  }

  const response = await apimoFetch(url, {
    headers: { Authorization: authHeader(), Accept: "application/json" },
  })
  return parseAndCheck<T>(response)
}
