import { randomUUID } from "node:crypto"
import { prisma } from "@/lib/db/prisma"
import { Source } from "@/lib/generated/prisma/enums"
import { parseTabularBuffer } from "@/lib/imports/excel-parser"
import { buildHeaderIndex } from "@/lib/imports/header-index"
import { mapLoyerAppeleRow, type LoyerAppeleRow } from "@/lib/imports/mapping-loyers-appeles"
import { parseFrDate } from "@/lib/imports/parse-date"
import { parseNumber } from "@/lib/imports/parse-number"
import { chunk } from "@/lib/imports/batch"
import { mapWithConcurrency } from "@/lib/imports/concurrency"
import { nullifyUndefined } from "@/lib/imports/nullify-undefined"
import { buildContactLabelIndex, resolveContactByLabel } from "@/lib/imports/label-resolver"
import { recordImportRun } from "@/lib/imports/record-import-run"
import type { ImportResult, OnProgress } from "@/lib/imports/import-types"

// Import de l'export Septéo "liste loyer appelé" (~6500 écritures comptables du
// compte locataires). On agrège par quittance — folio + pièce + date écriture +
// compte auxiliaire — pour obtenir une ligne `LoyerAppele` par appel de loyer :
// `montantAppele` = somme des débits (loyer + provisions de charges + TVA...),
// `montantRegle` = somme des crédits. Rattachement best-effort au locataire via
// "Libellé auxiliaire", puis à son mandat/bien s'il n'en a qu'un.
//
// Limite connue : "Numéro folio"/"Numéro pièce" peuvent se réinitialiser d'un
// exercice comptable à l'autre — la clé de dédup est donc best-effort.
const CREATE_BATCH_SIZE = 500
const WRITE_CONCURRENCY = 10

function round2(n: number): number {
  return Math.round(n * 100) / 100
}

type Aggregate = {
  sourceRef: string
  first: LoyerAppeleRow
  montantAppele: number
  montantRegle: number
}

export async function importSepteoLoyersAppeles(
  buffer: ArrayBuffer,
  fileName: string,
  onProgress?: OnProgress,
): Promise<ImportResult> {
  const { headerRow, rows } = await parseTabularBuffer(buffer, fileName)
  const headerIndex = buildHeaderIndex(headerRow)

  // Phase 0 — agrégation en mémoire par quittance.
  const groups = new Map<string, Aggregate>()
  for (const row of rows) {
    const mapped = mapLoyerAppeleRow(headerIndex, row)
    if (!mapped) continue
    const sourceRef = [
      mapped.numeroFolio ?? "",
      mapped.numeroPiece ?? "",
      mapped.dateEcriture ?? "",
      mapped.auxiliaire ?? "",
    ].join("-")
    const group = groups.get(sourceRef) ?? {
      sourceRef,
      first: mapped,
      montantAppele: 0,
      montantRegle: 0,
    }
    group.montantAppele += parseNumber(mapped.debit) ?? 0
    group.montantRegle += parseNumber(mapped.credit) ?? 0
    groups.set(sourceRef, group)
  }

  const [contacts, mandats, existing] = await Promise.all([
    prisma.contact.findMany({ select: { id: true, nom: true, prenom: true } }),
    prisma.mandat.findMany({ select: { id: true, bienId: true, locataireId: true } }),
    prisma.loyerAppele.findMany({
      where: { source: Source.SEPTEO },
      select: { id: true, sourceRef: true },
    }),
  ])

  const labelIndex = buildContactLabelIndex(contacts)
  const mandatsByLocataire = new Map<string, (typeof mandats)[number][]>()
  for (const m of mandats) {
    if (!m.locataireId) continue
    const list = mandatsByLocataire.get(m.locataireId) ?? []
    list.push(m)
    mandatsByLocataire.set(m.locataireId, list)
  }
  const idBySourceRef = new Map(existing.map((e) => [e.sourceRef, e.id]))

  function buildData(agg: Aggregate) {
    const m = agg.first
    const contactId = resolveContactByLabel(labelIndex, m.locataireLabel)
    const linked = contactId ? mandatsByLocataire.get(contactId) : undefined
    const mandat = linked && linked.length === 1 ? linked[0] : undefined
    return {
      numeroFolio: m.numeroFolio,
      numeroPiece: m.numeroPiece,
      dateEcriture: parseFrDate(m.dateEcriture),
      auxiliaire: m.auxiliaire,
      locataireLabel: m.locataireLabel,
      gestionnaire: m.gestionnaire,
      societe: m.societe,
      categorieLot: m.categorieLot,
      typeLot: m.typeLot,
      montantAppele: round2(agg.montantAppele),
      montantRegle: round2(agg.montantRegle),
      contactId,
      mandatId: mandat?.id ?? null,
      bienId: mandat?.bienId ?? null,
    }
  }

  type Plan = { id: string; isNew: boolean; sourceRef: string; data: ReturnType<typeof buildData> }
  const plans: Plan[] = []
  for (const agg of groups.values()) {
    const existingId = idBySourceRef.get(agg.sourceRef)
    plans.push({
      id: existingId ?? randomUUID(),
      isNew: !existingId,
      sourceRef: agg.sourceRef,
      data: buildData(agg),
    })
  }

  const total = plans.length
  let processed = 0
  const tick = () => onProgress?.({ processed: ++processed, total })

  const newPlans = plans.filter((p) => p.isNew)
  const existingPlans = plans.filter((p) => !p.isNew)

  for (const batch of chunk(newPlans, CREATE_BATCH_SIZE)) {
    await prisma.loyerAppele.createMany({
      data: batch.map((p) => ({
        id: p.id,
        source: Source.SEPTEO,
        sourceRef: p.sourceRef,
        ...p.data,
      })),
    })
    batch.forEach(tick)
  }
  await mapWithConcurrency(existingPlans, WRITE_CONCURRENCY, async (p) => {
    await prisma.loyerAppele.update({ where: { id: p.id }, data: nullifyUndefined(p.data) })
    tick()
  })

  const duplicatesFound = existingPlans.length
  await recordImportRun({
    source: Source.SEPTEO,
    kind: "loyers_appeles",
    fileName,
    status: "success",
    recordsUpserted: total,
    duplicatesFound,
  })
  return { status: "success", recordsUpserted: total, duplicatesFound }
}
