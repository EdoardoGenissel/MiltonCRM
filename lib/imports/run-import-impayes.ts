import { randomUUID } from "node:crypto"
import { prisma } from "@/lib/db/prisma"
import { Source } from "@/lib/generated/prisma/enums"
import { parseTabularBuffer } from "@/lib/imports/excel-parser"
import { buildHeaderIndex } from "@/lib/imports/header-index"
import { mapImpayeRow } from "@/lib/imports/mapping-impayes"
import { parseFrDateTime } from "@/lib/imports/parse-datetime"
import { parseNumber } from "@/lib/imports/parse-number"
import { chunk } from "@/lib/imports/batch"
import { mapWithConcurrency } from "@/lib/imports/concurrency"
import { nullifyUndefined } from "@/lib/imports/nullify-undefined"
import { recordImportRun } from "@/lib/imports/record-import-run"
import type { ImportResult, OnProgress } from "@/lib/imports/import-types"

// Import de l'export Septéo "liste impayés loyers" (~50 lignes, une par lot en
// situation d'impayé). Rattachement direct au bien via "Ref. Lot" →
// `Bien.referenceLot` (alimenté par l'import biens Septéo) ; le mandat de gestion
// du bien fournit ensuite locataire et propriétaire — les libellés du CSV
// ("Nom Locataire", "Propriétaire") sont trop sales pour un matching fiable et
// sont conservés bruts (`*Label`).
const CREATE_BATCH_SIZE = 200
const WRITE_CONCURRENCY = 10

function normRef(value: string): string {
  return value.trim().toUpperCase()
}

function parseIntOrUndef(value: string | undefined): number | undefined {
  const n = parseNumber(value)
  return n === undefined ? undefined : Math.round(n)
}

function parseBool(value: string | undefined): boolean | undefined {
  if (!value) return undefined
  return value.trim().toLowerCase() === "true"
}

export async function importSepteoImpayes(
  buffer: ArrayBuffer,
  fileName: string,
  onProgress?: OnProgress
): Promise<ImportResult> {
  const { headerRow, rows } = await parseTabularBuffer(buffer, fileName)
  const headerIndex = buildHeaderIndex(headerRow)

  const [biens, mandats, existing] = await Promise.all([
    prisma.bien.findMany({ where: { referenceLot: { not: null } }, select: { id: true, referenceLot: true } }),
    prisma.mandat.findMany({
      select: { id: true, bienId: true, locataireId: true, proprietaireId: true, type: true },
    }),
    prisma.impaye.findMany({ where: { source: Source.SEPTEO }, select: { id: true, sourceRef: true } }),
  ])

  const bienIdByRef = new Map<string, string>()
  for (const b of biens) if (b.referenceLot) bienIdByRef.set(normRef(b.referenceLot), b.id)

  // Mandat "principal" par bien : on privilégie une gestion locative.
  const mandatByBien = new Map<string, (typeof mandats)[number]>()
  for (const m of mandats) {
    if (!m.bienId) continue
    const current = mandatByBien.get(m.bienId)
    const isGestion = (m.type ?? "").toLowerCase().includes("gestion")
    if (!current || (isGestion && !(current.type ?? "").toLowerCase().includes("gestion"))) {
      mandatByBien.set(m.bienId, m)
    }
  }

  const idBySourceRef = new Map(existing.map((e) => [e.sourceRef, e.id]))

  type Plan = { id: string; isNew: boolean; data: ReturnType<typeof buildData> }

  function buildData(mapped: NonNullable<ReturnType<typeof mapImpayeRow>>) {
    const bienId = bienIdByRef.get(normRef(mapped.refLot)) ?? null
    const mandat = bienId ? mandatByBien.get(bienId) : undefined
    return {
      refLot: mapped.refLot,
      locataireLabel: mapped.locataireLabel,
      proprietaireLabel: mapped.proprietaireLabel,
      dateEntree: parseFrDateTime(mapped.dateEntree),
      dateFinPreavis: parseFrDateTime(mapped.dateFinPreavis),
      solde: parseNumber(mapped.solde) ?? 0,
      niveau: parseIntOrUndef(mapped.niveau),
      dateDerniereRelance: parseFrDateTime(mapped.dateDerniereRelance),
      niveauDerniereRelance: parseIntOrUndef(mapped.niveauDerniereRelance),
      ecartNiveau: parseBool(mapped.ecartNiveau),
      frais: parseNumber(mapped.frais),
      codeGli: mapped.codeGli,
      procedureRelance: mapped.procedureRelance,
      typeEnvoi: mapped.typeEnvoi,
      bienId,
      mandatId: mandat?.id ?? null,
      locataireId: mandat?.locataireId ?? null,
      proprietaireId: mandat?.proprietaireId ?? null,
    }
  }

  const plans: Plan[] = []
  const seen = new Set<string>()
  for (const row of rows) {
    const mapped = mapImpayeRow(headerIndex, row)
    if (!mapped) continue
    const sourceRef = mapped.refLot
    if (seen.has(sourceRef)) continue // 1 ligne par lot attendue
    seen.add(sourceRef)
    const existingId = idBySourceRef.get(sourceRef)
    plans.push({ id: existingId ?? randomUUID(), isNew: !existingId, data: buildData(mapped) })
  }

  const total = plans.length
  let processed = 0
  const tick = () => onProgress?.({ processed: ++processed, total })

  const newPlans = plans.filter((p) => p.isNew)
  const existingPlans = plans.filter((p) => !p.isNew)

  for (const batch of chunk(newPlans, CREATE_BATCH_SIZE)) {
    await prisma.impaye.createMany({
      data: batch.map((p) => ({
        id: p.id,
        source: Source.SEPTEO,
        sourceRef: p.data.refLot,
        ...p.data,
      })),
    })
    batch.forEach(tick)
  }
  await mapWithConcurrency(existingPlans, WRITE_CONCURRENCY, async (p) => {
    await prisma.impaye.update({ where: { id: p.id }, data: nullifyUndefined(p.data) })
    tick()
  })

  const duplicatesFound = existingPlans.length
  await recordImportRun({
    source: Source.SEPTEO,
    kind: "impayes",
    fileName,
    status: "success",
    recordsUpserted: total,
    duplicatesFound,
  })
  return { status: "success", recordsUpserted: total, duplicatesFound }
}
