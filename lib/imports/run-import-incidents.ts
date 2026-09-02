import { randomUUID } from "node:crypto"
import { prisma } from "@/lib/db/prisma"
import { Source } from "@/lib/generated/prisma/enums"
import { parseTabularBuffer } from "@/lib/imports/excel-parser"
import { buildHeaderIndex } from "@/lib/imports/header-index"
import { mapIncidentRow } from "@/lib/imports/mapping-incidents"
import { parseFrDate } from "@/lib/imports/parse-date"
import { chunk } from "@/lib/imports/batch"
import { mapWithConcurrency } from "@/lib/imports/concurrency"
import { nullifyUndefined } from "@/lib/imports/nullify-undefined"
import { buildContactLabelIndex, resolveContactByLabel } from "@/lib/imports/label-resolver"
import { recordImportRun } from "@/lib/imports/record-import-run"
import type { ImportResult, OnProgress } from "@/lib/imports/import-types"

// Import de l'export Septéo "Liste incident" (~690 lignes). Rattachement
// best-effort : le libellé "Tiers" est résolu vers un contact (match strict, cf.
// label-resolver) ; si ce contact n'a qu'UN seul mandat (comme locataire ou
// propriétaire), on en déduit le bien/mandat concerné. Les lignes sans "Tiers"
// (courriers internes, tâches) sont conservées sans rattachement.
const CREATE_BATCH_SIZE = 300
const WRITE_CONCURRENCY = 10

export async function importSepteoIncidents(
  buffer: ArrayBuffer,
  fileName: string,
  onProgress?: OnProgress
): Promise<ImportResult> {
  const { headerRow, rows } = await parseTabularBuffer(buffer, fileName)
  const headerIndex = buildHeaderIndex(headerRow)

  const [contacts, mandats, existing] = await Promise.all([
    prisma.contact.findMany({ select: { id: true, nom: true, prenom: true } }),
    prisma.mandat.findMany({ select: { id: true, bienId: true, locataireId: true, proprietaireId: true } }),
    prisma.incident.findMany({ where: { source: Source.SEPTEO }, select: { id: true, sourceRef: true } }),
  ])

  const labelIndex = buildContactLabelIndex(contacts)

  // contactId -> mandats où il est locataire ou propriétaire.
  const mandatsByContact = new Map<string, (typeof mandats)[number][]>()
  for (const m of mandats) {
    for (const cid of [m.locataireId, m.proprietaireId]) {
      if (!cid) continue
      const list = mandatsByContact.get(cid) ?? []
      list.push(m)
      mandatsByContact.set(cid, list)
    }
  }

  const idBySourceRef = new Map(existing.map((e) => [e.sourceRef, e.id]))

  function buildData(mapped: NonNullable<ReturnType<typeof mapIncidentRow>>) {
    const contactId = resolveContactByLabel(labelIndex, mapped.tiersLabel)
    const linked = contactId ? mandatsByContact.get(contactId) : undefined
    const mandat = linked && linked.length === 1 ? linked[0] : undefined
    return {
      tiersLabel: mapped.tiersLabel,
      objet: mapped.objet,
      creeLe: parseFrDate(mapped.creeLe),
      responsable: mapped.responsable,
      etat: mapped.etat,
      derniereEtape: mapped.derniereEtape,
      contactId,
      mandatId: mandat?.id ?? null,
      bienId: mandat?.bienId ?? null,
    }
  }

  type Plan = { id: string; isNew: boolean; sourceRef: string; data: ReturnType<typeof buildData> }
  const plans: Plan[] = []
  const seen = new Set<string>()
  for (const row of rows) {
    const mapped = mapIncidentRow(headerIndex, row)
    if (!mapped) continue
    if (seen.has(mapped.sourceRef)) continue
    seen.add(mapped.sourceRef)
    const existingId = idBySourceRef.get(mapped.sourceRef)
    plans.push({
      id: existingId ?? randomUUID(),
      isNew: !existingId,
      sourceRef: mapped.sourceRef,
      data: buildData(mapped),
    })
  }

  const total = plans.length
  let processed = 0
  const tick = () => onProgress?.({ processed: ++processed, total })

  const newPlans = plans.filter((p) => p.isNew)
  const existingPlans = plans.filter((p) => !p.isNew)

  for (const batch of chunk(newPlans, CREATE_BATCH_SIZE)) {
    await prisma.incident.createMany({
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
    await prisma.incident.update({ where: { id: p.id }, data: nullifyUndefined(p.data) })
    tick()
  })

  const duplicatesFound = existingPlans.length
  await recordImportRun({
    source: Source.SEPTEO,
    kind: "incidents",
    fileName,
    status: "success",
    recordsUpserted: total,
    duplicatesFound,
  })
  return { status: "success", recordsUpserted: total, duplicatesFound }
}
