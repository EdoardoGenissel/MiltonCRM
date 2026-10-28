// Appel Gemini (Google AI Studio) en sortie JSON structurée. Clé lue dans
// `google_ai_studio` (nom de la variable d'env fournie), modèle surchargeable
// par GEMINI_MODEL.
const API_BASE = "https://generativelanguage.googleapis.com/v1beta/models"
const DEFAULT_MODEL = "gemini-3.8-flash"

export async function generateJson<T>({
  system,
  prompt,
  schema,
}: {
  system: string
  prompt: string
  // Sous-ensemble OpenAPI 3 accepté par `responseSchema` (type, properties,
  // required, nullable, enum, items, description).
  schema: Record<string, unknown>
}): Promise<T> {
  const apiKey = process.env.google_ai_studio ?? process.env.GEMINI_API_KEY
  if (!apiKey) throw new Error("Clé Google AI Studio manquante (variable d'env google_ai_studio)")
  const model = process.env.GEMINI_MODEL ?? DEFAULT_MODEL

  let lastError: unknown
  // Retentatives sur 429/5xx (quota par minute, surcharge ponctuelle du modèle).
  for (let attempt = 0; attempt < 3; attempt++) {
    const res = await fetch(`${API_BASE}/${model}:generateContent`, {
      method: "POST",
      headers: { "content-type": "application/json", "x-goog-api-key": apiKey },
      body: JSON.stringify({
        systemInstruction: { parts: [{ text: system }] },
        contents: [{ role: "user", parts: [{ text: prompt }] }],
        generationConfig: {
          temperature: 0,
          responseMimeType: "application/json",
          responseSchema: schema,
        },
      }),
    })

    if (res.status === 429 || res.status >= 500) {
      lastError = new Error(`Gemini ${res.status} : ${await res.text()}`)
      await new Promise((resolve) => setTimeout(resolve, 2000 * (attempt + 1)))
      continue
    }
    if (!res.ok) throw new Error(`Gemini ${res.status} : ${await res.text()}`)

    const data = (await res.json()) as {
      candidates?: { content?: { parts?: { text?: string }[] }; finishReason?: string }[]
    }
    const text = data.candidates?.[0]?.content?.parts?.map((p) => p.text ?? "").join("")
    if (!text) {
      throw new Error(
        `Réponse Gemini vide (${data.candidates?.[0]?.finishReason ?? "sans candidat"})`,
      )
    }
    return JSON.parse(text) as T
  }
  throw lastError
}
