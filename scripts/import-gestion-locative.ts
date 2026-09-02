// Script de test manuel : rejoue l'import Septéo biens (pour peupler
// Bien.referenceLot) puis importe les 3 nouveaux exports "gestion locative"
// (impayés, incidents, loyers appelés) depuis `data/`.
//
// Usage : npx tsx scripts/import-gestion-locative.ts [--biens]
import "dotenv/config"
import { readFile } from "node:fs/promises"
import path from "node:path"
import { runImport } from "@/lib/imports/run-import"
import type { ImportKind } from "@/lib/imports/mapping"
import { prisma } from "@/lib/db/prisma"

const ROOT = process.cwd()

async function run(kind: ImportKind, file: string) {
  const buf = await readFile(path.join(ROOT, "data", file))
  const res = await runImport(kind, buf.buffer.slice(buf.byteOffset, buf.byteOffset + buf.byteLength), file)
  console.log(`${kind.padEnd(24)} ${file.padEnd(32)} ->`, res)
}

async function main() {
  if (process.argv.includes("--biens")) {
    await run("septeo_biens", path.join("properties", "import septeo.csv"))
  }
  await run("septeo_impayes", "liste impayés loyers.csv")
  await run("septeo_incidents", "Liste incident.csv")
  await run("septeo_loyers_appeles", "liste loyer appelé.csv")

  const [impayes, incidents, loyers] = await Promise.all([
    prisma.impaye.aggregate({ _count: { _all: true, bienId: true, locataireId: true } }),
    prisma.incident.aggregate({ _count: { _all: true, contactId: true, bienId: true } }),
    prisma.loyerAppele.aggregate({ _count: { _all: true, contactId: true, bienId: true } }),
  ])
  console.log("\nImpaye     ", impayes._count)
  console.log("Incident   ", incidents._count)
  console.log("LoyerAppele", loyers._count)
  await prisma.$disconnect()
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
