// Script de test manuel : récupère le dernier appel avec un enregistrement
// disponible via l'API REST Ringover (`GET /calls`, cf. developer.ringover.com/
// web/openapi_public.yml) et télécharge l'audio en local. Ne passe pas par le
// webhook — utile pour vérifier l'accès à l'API/l'enregistrement des appels sans
// attendre un vrai appel entrant ni configurer le webhook côté Ringover.
//
// Usage : npx tsx scripts/ringover-fetch-latest-recording.ts
import "dotenv/config"
import { mkdir, writeFile } from "node:fs/promises"
import path from "node:path"

const API_KEY = process.env.RINGOVER_API_KEY
if (!API_KEY) {
  throw new Error("RINGOVER_API_KEY manquant dans .env")
}

type RingoverCall = {
  call_id: string
  direction: "in" | "out"
  from_number: string
  to_number: string
  start_time: string
  total_duration: number
  record?: string
}

type RingoverCallsListResponse = {
  call_list: RingoverCall[]
  call_list_count: number
  total_call_count: number
}

async function main() {
  const res = await fetch("https://public-api.ringover.com/v2/calls?limit_count=100", {
    headers: { Authorization: API_KEY! },
  })

  if (!res.ok) {
    throw new Error(`Ringover API ${res.status}: ${await res.text()}`)
  }

  const data = (await res.json()) as RingoverCallsListResponse
  console.log(
    `${data.call_list_count} appel(s) récupéré(s) (${data.total_call_count} au total sur les 15 derniers jours).`
  )

  const withRecording = data.call_list.find((call) => call.record)
  if (!withRecording) {
    console.log(
      "Aucun appel avec enregistrement dans les résultats récents — soit l'enregistrement des appels n'est pas activé côté Ringover (Dashboard > Utilisateurs > permissions > \"Allow to record\"), soit aucun appel récent n'en a un."
    )
    return
  }

  console.log("Appel avec enregistrement trouvé :", {
    call_id: withRecording.call_id,
    direction: withRecording.direction,
    from: withRecording.from_number,
    to: withRecording.to_number,
    start_time: withRecording.start_time,
    duration_s: withRecording.total_duration,
  })

  const audioRes = await fetch(withRecording.record!)
  if (!audioRes.ok) {
    throw new Error(`Téléchargement de l'audio échoué : ${audioRes.status}`)
  }
  const buffer = Buffer.from(await audioRes.arrayBuffer())

  const outDir = path.join(process.cwd(), "tmp", "ringover")
  await mkdir(outDir, { recursive: true })
  const outPath = path.join(outDir, `call-${withRecording.call_id}.mp3`)
  await writeFile(outPath, buffer)

  console.log(`Audio sauvegardé : ${outPath} (${buffer.length} octets)`)
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
