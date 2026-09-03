import { randomUUID } from "node:crypto"
import { prisma } from "@/lib/db/prisma"
import { Source } from "@/lib/generated/prisma/enums"
import { parseTabularBuffer } from "@/lib/imports/excel-parser"
import { buildHeaderIndex } from "@/lib/imports/header-index"
import { mapSepteoBienRow, type SepteoBienRow } from "@/lib/imports/mapping-biens-septeo"
import { parseFrDate } from "@/lib/imports/parse-date"
import { parseNumber } from "@/lib/imports/parse-number"
import { chunk } from "@/lib/imports/batch"
import { mapWithConcurrency } from "@/lib/imports/concurrency"
import { PersonResolver } from "@/lib/imports/person-resolver"
import { nullifyUndefined } from "@/lib/imports/nullify-undefined"
import { recordImportRun } from "@/lib/imports/record-import-run"
import type { ImportResult, OnProgress } from "@/lib/imports/import-types"

// Import de l'export Septéo "biens/mandats" (gestion locative) — un lot + son
// mandat de gestion par ligne, cf. lib/imports/mapping-biens-septeo.ts. Même
// volume modeste que l'import biens Apimo (~230 lignes), même séparation
// dédup-en-mémoire / écritures DB batchées.
//
// Différence clé avec l'import Apimo biens : DEUX personnes à résoudre par
// ligne (propriétaire ET locataire actuel), toutes deux tous pôles/sources
// confondus — un propriétaire Septéo peut déjà exister comme prospect Apimo,
// et réciproquement (cf. demande explicite Milton : "un contact bien
// propriétaires peut exister et dans septeo et dans apimo").
const CREATE_BATCH_SIZE = 200
const WRITE_CONCURRENCY = 10

function parseInt(value: string | undefined): number | undefined {
  const n = parseNumber(value)
  return n === undefined ? undefined : Math.round(n)
}

function parseMeuble(value: string | undefined): boolean | undefined {
  if (!value) return undefined
  return value.trim().toLowerCase() === "oui"
}

type BienData = ReturnType<typeof buildBienData>

function buildBienData(mapped: SepteoBienRow) {
  return {
    adresse: mapped.adresse,
    commune: mapped.commune,
    typeBien: mapped.natureLot,
    // "MandatLot_SurfaceHabitable" n'est renseignée que sur ~70% des lots —
    // repli sur "SurfaceUtile" (~94%), toujours présente pour un local commercial.
    surface: parseNumber(mapped.surfaceHabitable) ?? parseNumber(mapped.surfaceUtile),
    codePostal: mapped.codePostal,
    pays: mapped.pays,
    residence: mapped.residence,
    adresseComplement: mapped.adresseComplement,
    pieces: parseInt(mapped.typeLot), // "4 Pièces" -> 4
    agence: mapped.agence,
    energieConsommation: parseNumber(mapped.energieConsommation),
    energieEmission: parseNumber(mapped.energieEmission),
    meuble: parseMeuble(mapped.meuble),
    referenceProduit: mapped.numero,
    referenceLot: mapped.referenceLot,
    // Pas de "prix" : un lot en gestion locative n'est pas à vendre — le loyer
    // vit sur le mandat (Mandat.montantLoyer), pas sur le bien.
  }
}

function buildMandatData(
  mapped: SepteoBienRow,
  bienId: string,
  proprietaireId: string | null,
  locataireId: string | null,
) {
  return {
    // Toujours une gestion locative dans cet export (Mandat_Gere vaut "1" sur
    // 100% des lignes, aucune variation) — texte fixe informatif, cf. le même
    // filet côté import biens Apimo pour Mandat.type (NOT NULL).
    type: "Gestion locative",
    categorie: "Location",
    proprietaireId,
    locataireId,
    bienId,
    dateSignature: parseFrDate(mapped.dateSignature),
    finMandat: parseFrDate(mapped.finMandat),
    numero: mapped.numero,
    typeBail: mapped.typeBail,
    usage: mapped.usage,
    regimeFiscal: mapped.regimeFiscal,
    montantLoyer: parseNumber(mapped.montantLoyer),
    montantCharges: parseNumber(mapped.montantCharges),
    montantDepotGarantie: parseNumber(mapped.montantDepotGarantie),
    fraisAgence: parseNumber(mapped.fraisAgence),
    honorairesGestion: parseNumber(mapped.honorairesGestion),
    pourcentageHonorairesGestion: parseNumber(mapped.pourcentageHonorairesGestion),
  }
}

export async function importSepteoBiens(
  buffer: ArrayBuffer,
  fileName: string,
  onProgress?: OnProgress,
): Promise<ImportResult> {
  const { headerRow, rows } = await parseTabularBuffer(buffer, fileName)
  const headerIndex = buildHeaderIndex(headerRow)

  const [existingBiens, existingMandats, identityCandidates] = await Promise.all([
    prisma.bien.findMany({
      where: { source: Source.SEPTEO },
      select: { id: true, sourceRef: true },
    }),
    prisma.mandat.findMany({
      where: { source: Source.SEPTEO },
      select: { id: true, sourceRef: true },
    }),
    prisma.contact.findMany({
      select: { id: true, email: true, telephone: true, nom: true, prenom: true },
    }),
  ])
  const bienIdByRef = new Map(existingBiens.map((b) => [b.sourceRef, b.id]))
  const mandatIdByRef = new Map(existingMandats.map((m) => [m.sourceRef, m.id]))
  const persons = new PersonResolver(identityCandidates)

  type BienPlan = { id: string; isNew: boolean; data: BienData; sourceRef: string }
  type MandatPlan = {
    id: string
    isNew: boolean
    sourceRef: string
    bienId: string
    proprietaireId: string | null
    locataireId: string | null
    mapped: SepteoBienRow
  }
  const bienPlans: BienPlan[] = []
  const mandatPlans: MandatPlan[] = []

  // Phase 1 — dédup/résolution en mémoire (aucun accès DB).
  for (const row of rows) {
    const mapped = mapSepteoBienRow(headerIndex, row)
    if (!mapped) continue

    const proprietaireId = persons.resolve({
      civilite: mapped.proprietaireCivilite,
      nom: mapped.proprietaireNom,
      prenom: mapped.proprietairePrenom,
      telephone: mapped.proprietaireTelephone,
      email: mapped.proprietaireEmail,
      commune: mapped.commune,
      persona: "proprietaire_bailleur",
    })

    const locataireId = persons.resolve({
      civilite: mapped.locataireCivilite,
      nom: mapped.locataireNom,
      prenom: mapped.locatairePrenom,
      telephone: mapped.locataireTelephone,
      email: mapped.locataireEmail,
      commune: mapped.commune,
      persona: "locataire",
    })

    const existingBienId = bienIdByRef.get(mapped.idLot)
    const bienId = existingBienId ?? randomUUID()
    if (!existingBienId) bienIdByRef.set(mapped.idLot, bienId)
    bienPlans.push({
      id: bienId,
      isNew: !existingBienId,
      data: buildBienData(mapped),
      sourceRef: mapped.idLot,
    })

    const existingMandatId = mandatIdByRef.get(mapped.idMandatLot)
    const mandatId = existingMandatId ?? randomUUID()
    // "MandatLot_IDMandatLot" est presque toujours unique (232/233 sur l'export
    // réel) mais pas garanti — sans ce `set`, deux lignes partageant le même id
    // généreraient deux `createMany` en conflit sur la contrainte unique
    // (source, sourceRef) plutôt que de fusionner en une mise à jour.
    if (!existingMandatId) mandatIdByRef.set(mapped.idMandatLot, mandatId)
    mandatPlans.push({
      id: mandatId,
      isNew: !existingMandatId,
      sourceRef: mapped.idMandatLot,
      bienId,
      proprietaireId,
      locataireId,
      mapped,
    })
  }

  const total = bienPlans.length
  let processed = 0
  const tick = () => onProgress?.({ processed: ++processed, total })

  // Phase 2a — propriétaires/locataires : créations en masse, tags de persona
  // en parallèle borné pour les contacts déjà existants.
  for (const batch of chunk(persons.toCreate, CREATE_BATCH_SIZE)) {
    await prisma.contact.createMany({
      data: batch.map((p) => ({
        id: p.id,
        civilite: p.civilite,
        prenom: p.prenom,
        nom: p.nom,
        telephone: p.telephone,
        email: p.email,
        commune: p.commune,
        personas: p.personas,
        source: Source.SEPTEO,
      })),
    })
  }
  await mapWithConcurrency(
    [...persons.idsToTagPersonas.entries()],
    WRITE_CONCURRENCY,
    async ([id, personasToAdd]) => {
      const contact = await prisma.contact.findUnique({ where: { id }, select: { personas: true } })
      const merged = Array.from(new Set([...(contact?.personas ?? []), ...personasToAdd]))
      await prisma.contact.update({ where: { id }, data: { personas: { set: merged } } })
    },
  )

  // Phase 2b — biens.
  const newBiens = bienPlans.filter((b) => b.isNew)
  const existingBienPlans = bienPlans.filter((b) => !b.isNew)
  for (const batch of chunk(newBiens, CREATE_BATCH_SIZE)) {
    await prisma.bien.createMany({
      data: batch.map((b) => ({
        id: b.id,
        source: Source.SEPTEO,
        sourceRef: b.sourceRef,
        ...b.data,
      })),
    })
    batch.forEach(tick)
  }
  await mapWithConcurrency(existingBienPlans, WRITE_CONCURRENCY, async (b) => {
    await prisma.bien.update({ where: { id: b.id }, data: nullifyUndefined(b.data) })
    tick()
  })

  // Phase 2c — mandats (dépendent des biens/contacts créés ci-dessus).
  const newMandats = mandatPlans.filter((m) => m.isNew)
  const existingMandatPlans = mandatPlans.filter((m) => !m.isNew)
  for (const batch of chunk(newMandats, CREATE_BATCH_SIZE)) {
    await prisma.mandat.createMany({
      data: batch.map((m) => ({
        id: m.id,
        source: Source.SEPTEO,
        sourceRef: m.sourceRef,
        ...buildMandatData(m.mapped, m.bienId, m.proprietaireId, m.locataireId),
      })),
    })
  }
  await mapWithConcurrency(existingMandatPlans, WRITE_CONCURRENCY, async (m) => {
    await prisma.mandat.update({
      where: { id: m.id },
      data: nullifyUndefined(buildMandatData(m.mapped, m.bienId, m.proprietaireId, m.locataireId)),
    })
  })

  const duplicatesFound = existingBienPlans.length

  await recordImportRun({
    source: Source.SEPTEO,
    kind: "biens_mandats",
    fileName,
    status: "success",
    recordsUpserted: total,
    duplicatesFound,
  })

  return { status: "success", recordsUpserted: total, duplicatesFound }
}
