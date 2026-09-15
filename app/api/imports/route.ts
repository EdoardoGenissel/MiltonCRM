import { type NextRequest } from "next/server"
import { runImport, type ImportResult, type ImportProgress } from "@/lib/imports/run-import"
import { parseTabularBuffer } from "@/lib/imports/excel-parser"
import { detectImportKind } from "@/lib/imports/detect-kind"
import type { ImportKind } from "@/lib/imports/mapping"

// Un import Apimo réel tourne sur ~3 700 lignes avec 2 upserts DB chacune - assez
// long pour qu'un simple JSON de retour laisse l'utilisateur face à un écran figé.
// On streame donc la progression en NDJSON (une ligne JSON par événement) plutôt
// que d'ajouter une file de jobs/worker séparé, hors de portée pour ce volume
// (cf. décision Cockpit "pas de worker séparé pour le volume attendu").
export const maxDuration = 300

type StreamEvent =
  | { type: "detected"; kind: ImportKind }
  | { type: "progress"; processed: number; total: number }
  | { type: "done"; result: ImportResult }

// Ne pousse un événement de progression que toutes les 250ms (ou au dernier
// événement) : à raison d'un onProgress par ligne sur ~3700 lignes, streamer
// chaque événement sans throttle multiplierait les chunks réseau pour un gain de
// fluidité imperceptible sur une barre de progression.
const PROGRESS_THROTTLE_MS = 250

export async function POST(request: NextRequest) {
  const formData = await request.formData()
  const file = formData.get("file")
  const kind = formData.get("kind")

  const validKinds: ImportKind[] = [
    "apimo_prospects",
    "apimo_biens",
    "septeo_contacts",
    "septeo_biens",
    "septeo_impayes",
    "septeo_incidents",
    "septeo_loyers_appeles",
  ]
  if (!(file instanceof File)) {
    return Response.json({ error: "Fichier manquant." }, { status: 400 })
  }

  const buffer = await file.arrayBuffer()
  const fileName = file.name
  const encoder = new TextEncoder()

  // `kind` explicite = l'utilisateur a forcé le type ; sinon on le déduit de la
  // ligne d'en-tête du fichier (cas par défaut de l'UI).
  let resolvedKind: ImportKind | null = validKinds.includes(kind as ImportKind)
    ? (kind as ImportKind)
    : null
  if (!resolvedKind) {
    try {
      const { headerRow } = await parseTabularBuffer(buffer, fileName)
      resolvedKind = detectImportKind(headerRow)
    } catch {
      resolvedKind = null
    }
    if (!resolvedKind) {
      return Response.json(
        {
          error:
            "Type d'export non reconnu. Vérifie qu'il s'agit d'un export Apimo (prospects / biens) " +
            "ou Septéo (propriétaires-locataires / biens / impayés / incidents / loyers appelés) non modifié.",
        },
        { status: 400 },
      )
    }
  }
  const importKind: ImportKind = resolvedKind

  const stream = new ReadableStream<Uint8Array>({
    async start(controller) {
      const send = (event: StreamEvent) =>
        controller.enqueue(encoder.encode(JSON.stringify(event) + "\n"))
      let lastSent = 0

      send({ type: "detected", kind: importKind })

      const result = await runImport(importKind, buffer, fileName, (progress: ImportProgress) => {
        const now = Date.now()
        const isLast = progress.processed >= progress.total
        if (isLast || now - lastSent >= PROGRESS_THROTTLE_MS) {
          lastSent = now
          send({ type: "progress", processed: progress.processed, total: progress.total })
        }
      })

      send({ type: "done", result })
      controller.close()
    },
  })

  return new Response(stream, {
    headers: { "Content-Type": "application/x-ndjson; charset=utf-8" },
  })
}
