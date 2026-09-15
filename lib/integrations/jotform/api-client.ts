// Client API JotForm (pull) - remplace la dépendance au seul webhook
// (app/api/jotform/webhook) pour l'automatisation des estimations : permet de
// rejouer tout l'historique et de ne pas perdre de soumission en cas de webhook
// manqué. Doc : https://api.jotform.com/docs/

const JOTFORM_API_BASE = "https://api.jotform.com"

// Réponse brute par question, indexée par qid (cf. GET /form/{id}/submissions).
// `answer` a une forme différente selon `type` (string, string[], ou objet pour
// les champs composites comme control_fullname/control_phone/control_address).
export type JotformAnswer = {
  name: string
  text: string
  type: string
  answer?: unknown
  prettyFormat?: string
}

export type JotformSubmission = {
  id: string
  form_id: string
  created_at: string
  status: string
  answers: Record<string, JotformAnswer>
}

type JotformApiResponse<T> = {
  responseCode: number
  message: string
  content: T
}

function requireApiKey(): string {
  const key = process.env.JOTFORM_API_KEY
  if (!key) throw new Error("JOTFORM_API_KEY manquant.")
  return key
}

async function jotformGet<T>(path: string, params: Record<string, string> = {}): Promise<T> {
  const url = new URL(`${JOTFORM_API_BASE}${path}`)
  url.searchParams.set("apiKey", requireApiKey())
  for (const [key, value] of Object.entries(params)) url.searchParams.set(key, value)

  const res = await fetch(url, { cache: "no-store" })
  if (!res.ok) {
    throw new Error(`JotForm API ${path} a répondu ${res.status}`)
  }

  const data = (await res.json()) as JotformApiResponse<T>
  if (data.responseCode !== 200) {
    throw new Error(`JotForm API ${path} : ${data.message}`)
  }
  return data.content
}

// L'API JotForm plafonne chaque page à 1000 résultats ; on reste plus bas pour
// ne pas bloquer trop longtemps la route de sync sur un gros formulaire.
const PAGE_SIZE = 200

// Récupère TOUTES les soumissions d'un formulaire, paginées, triées par date de
// création croissante.
export async function fetchAllSubmissions(formId: string): Promise<JotformSubmission[]> {
  const all: JotformSubmission[] = []
  let offset = 0

  while (true) {
    const page = await jotformGet<JotformSubmission[]>(`/form/${formId}/submissions`, {
      limit: String(PAGE_SIZE),
      offset: String(offset),
      orderby: "created_at",
    })
    all.push(...page)
    if (page.length < PAGE_SIZE) break
    offset += PAGE_SIZE
  }

  return all
}
