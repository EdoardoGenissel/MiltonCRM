import { randomUUID } from "node:crypto"
import { prisma } from "@/lib/db/prisma"
import { Source } from "@/lib/generated/prisma/enums"
import {
  resolveContactByIdentity,
  type IncomingIdentity,
  type IdentityMatchCandidate,
} from "@/lib/contacts/dedupe"
import { parseTabularBuffer } from "@/lib/imports/excel-parser"
import { buildHeaderIndex } from "@/lib/imports/header-index"
import { mapApimoBienRow, type ApimoBienRow } from "@/lib/imports/mapping-biens"
import { parseApimoProprietaire } from "@/lib/imports/apimo-proprietaire"
import { apimoOwnerPersona } from "@/lib/imports/apimo-persona"
import { parseApimoDateTime } from "@/lib/imports/parse-datetime"
import { parseNumber } from "@/lib/imports/parse-number"
import { chunk } from "@/lib/imports/batch"
import { mapWithConcurrency } from "@/lib/imports/concurrency"
import { nullifyUndefined } from "@/lib/imports/nullify-undefined"
import { recordImportRun } from "@/lib/imports/record-import-run"
import type { ImportResult, OnProgress } from "@/lib/imports/import-types"

// Import de l'export Apimo "Produits" (biens + mandats, un couple par ligne) -
// cf. lib/imports/mapping-biens.ts pour le détail des colonnes. Volume nettement
// plus faible que l'export prospects (~700 lignes vs ~3700), donc pas besoin de la
// même discipline de batching agressif : on garde surtout la séparation
// dédup-en-mémoire (phase 1, synchrone) / écritures DB (phase 2, batchées ou en
// parallèle borné) qui a fait ses preuves sur l'import prospects.
const CREATE_BATCH_SIZE = 200
const WRITE_CONCURRENCY = 10

function parseInt(value: string | undefined): number | undefined {
  const n = parseNumber(value)
  return n === undefined ? undefined : Math.round(n)
}

async function loadOwnerCandidates(): Promise<IdentityMatchCandidate[]> {
  // Tous pôles/sources confondus : un propriétaire peut déjà exister comme
  // prospect Apimo ou contact Septéo - cf. "fiche contact unifiée cross-pôle".
  return prisma.contact.findMany({
    select: { id: true, email: true, telephone: true, nom: true, prenom: true },
  })
}

type BienData = ReturnType<typeof buildBienData>

function buildBienData(mapped: ApimoBienRow) {
  return {
    adresse: mapped.adresse,
    commune: mapped.commune,
    typeBien: mapped.typeBien,
    surface: parseNumber(mapped.surface),
    prix: parseNumber(mapped.prix),
    statut: mapped.etape,
    codePostal: mapped.codePostal,
    quartier: mapped.quartier,
    pays: mapped.pays,
    residence: mapped.residence,
    adresseComplement: mapped.adresseComplement,
    etage: mapped.etage,
    numeroClef: mapped.numeroClef,
    pieces: parseInt(mapped.pieces),
    chambres: parseInt(mapped.chambres),
    devise: mapped.devise,
    attributs: mapped.attributs,
    titre: mapped.titre,
    description: mapped.description,
    photos: mapped.photos,
    energieConsommation: parseNumber(mapped.energieConsommation),
    energieEmission: parseNumber(mapped.energieEmission),
    agence: mapped.agence,
    utilisateur: mapped.utilisateur,
    referenceProduit: mapped.referenceProduit,
    proprietaireLabel: mapped.proprietaireLabel,
    creeLe: parseApimoDateTime(mapped.creeLe),
    majLe: parseApimoDateTime(mapped.majLe),
  }
}

function buildMandatData(mapped: ApimoBienRow, bienId: string, proprietaireId: string | null) {
  return {
    // "Mandat" n'est renseigné que sur ~64% des lignes (cf. étapes amont comme
    // "Attente mandat") - Mandat.type est NOT NULL, d'où ce filet par défaut,
    // écrit en toutes lettres puisqu'affiché tel quel sur les fiches.
    type: mapped.typeMandat ?? "Non précisé",
    statut: mapped.etape,
    proprietaireId,
    bienId,
    dateSignature: parseApimoDateTime(mapped.demarrageMandat),
    categorie: mapped.categorie,
    coAgent: mapped.coAgent,
    finMandat: parseApimoDateTime(mapped.finMandat),
    origine: mapped.origine,
    originePrecise: mapped.originePrecise,
    honorairesProprietaire: parseNumber(mapped.honorairesProprietaire),
    honorairesAcheteur: parseNumber(mapped.honorairesAcheteur),
    montantProprietaire: parseNumber(mapped.montantProprietaire),
    montantCompromis: parseNumber(mapped.montantCompromis),
    venduLe: parseApimoDateTime(mapped.venduLe),
  }
}

export async function importApimoBiens(
  buffer: ArrayBuffer,
  fileName: string,
  onProgress?: OnProgress,
): Promise<ImportResult> {
  const { headerRow, rows } = await parseTabularBuffer(buffer, fileName)
  const headerIndex = buildHeaderIndex(headerRow)

  const [existingBiens, existingMandats, ownerCandidates] = await Promise.all([
    prisma.bien.findMany({
      where: { source: Source.APIMO },
      select: { id: true, sourceRef: true },
    }),
    prisma.mandat.findMany({
      where: { source: Source.APIMO },
      select: { id: true, sourceRef: true },
    }),
    loadOwnerCandidates(),
  ])
  const bienIdByRef = new Map(existingBiens.map((b) => [b.sourceRef, b.id]))
  const mandatIdByRef = new Map(existingMandats.map((m) => [m.sourceRef, m.id]))

  type OwnerToCreate = {
    id: string
    civilite?: string
    prenom: string
    nom: string
    telephone?: string
    email?: string
    commune?: string
    persona: string // "vendeur" | "bailleur", selon la catégorie du mandat
  }
  const ownersToCreate: OwnerToCreate[] = []
  // contacts existants -> type(s) de prospect à leur ajouter (un même propriétaire
  // peut avoir un mandat de vente ET un mandat de location sur deux lignes).
  const ownerIdsToTag = new Map<string, Set<string>>()

  type BienPlan = { id: string; isNew: boolean; data: BienData; sourceRef: string }
  type MandatPlan = {
    id: string
    isNew: boolean
    sourceRef: string
    bienId: string
    proprietaireId: string | null
    mapped: ApimoBienRow
  }
  const bienPlans: BienPlan[] = []
  const mandatPlans: MandatPlan[] = []

  // Phase 1 - dédup/résolution en mémoire (aucun accès DB), y compris pour les
  // propriétaires : deux lignes (deux biens) du même propriétaire non encore en
  // base doivent aboutir au même contact plutôt qu'à deux doublons.
  for (const row of rows) {
    const mapped = mapApimoBienRow(headerIndex, row)
    if (!mapped) continue

    let proprietaireId: string | null = null
    const parsed = parseApimoProprietaire(mapped.proprietaireLabel)
    if (parsed?.nom) {
      const ownerPersona = apimoOwnerPersona(mapped.categorie)
      const incoming: IncomingIdentity = {
        email: mapped.proprietaireEmail,
        telephone: mapped.proprietaireTelephone,
        nom: parsed.nom,
        prenom: parsed.prenom,
      }
      const matchId = resolveContactByIdentity(ownerCandidates, incoming)
      if (matchId) {
        proprietaireId = matchId
        const personas = ownerIdsToTag.get(matchId) ?? new Set<string>()
        personas.add(ownerPersona)
        ownerIdsToTag.set(matchId, personas)
      } else {
        const id = randomUUID()
        ownersToCreate.push({
          id,
          civilite: parsed.civilite,
          prenom: parsed.prenom,
          nom: parsed.nom,
          telephone: mapped.proprietaireTelephone,
          email: mapped.proprietaireEmail,
          commune: mapped.commune,
          persona: ownerPersona,
        })
        ownerCandidates.push({
          id,
          email: mapped.proprietaireEmail ?? null,
          telephone: mapped.proprietaireTelephone ?? null,
          nom: parsed.nom,
          prenom: parsed.prenom,
        })
        proprietaireId = id
      }
    }

    const existingBienId = bienIdByRef.get(mapped.apinumber)
    const bienId = existingBienId ?? randomUUID()
    if (!existingBienId) bienIdByRef.set(mapped.apinumber, bienId)
    bienPlans.push({
      id: bienId,
      isNew: !existingBienId,
      data: buildBienData(mapped),
      sourceRef: mapped.apinumber,
    })

    const existingMandatId = mandatIdByRef.get(mapped.apinumber)
    const mandatId = existingMandatId ?? randomUUID()
    // Filet de sécurité si jamais un même "Apinumber" apparaissait deux fois
    // dans l'export (cf. même correctif sur l'import biens Septéo, où un doublon
    // réel a révélé l'absence de ce `set`) : sans lui, deux lignes partageant le
    // même id généreraient deux `createMany` en conflit sur la contrainte unique
    // (source, sourceRef) plutôt que de fusionner en une mise à jour.
    if (!existingMandatId) mandatIdByRef.set(mapped.apinumber, mandatId)
    mandatPlans.push({
      id: mandatId,
      isNew: !existingMandatId,
      sourceRef: mapped.apinumber,
      bienId,
      proprietaireId,
      mapped,
    })
  }

  const total = bienPlans.length
  let processed = 0
  const tick = () => onProgress?.({ processed: ++processed, total })

  // Phase 2a - propriétaires : créations en masse, tags de persona en parallèle
  // borné (contacts déjà existants, un seul champ à mettre à jour).
  for (const batch of chunk(ownersToCreate, CREATE_BATCH_SIZE)) {
    await prisma.contact.createMany({
      data: batch.map((o) => ({
        id: o.id,
        civilite: o.civilite,
        prenom: o.prenom,
        nom: o.nom,
        telephone: o.telephone,
        email: o.email,
        commune: o.commune,
        personas: [o.persona],
        source: Source.APIMO,
      })),
    })
  }
  await mapWithConcurrency(
    [...ownerIdsToTag.entries()],
    WRITE_CONCURRENCY,
    async ([id, personasToAdd]) => {
      const contact = await prisma.contact.findUnique({ where: { id }, select: { personas: true } })
      const merged = Array.from(new Set([...(contact?.personas ?? []), ...personasToAdd]))
      await prisma.contact.update({ where: { id }, data: { personas: { set: merged } } })
    },
  )

  // Phase 2b - biens.
  const newBiens = bienPlans.filter((b) => b.isNew)
  const existingBienPlans = bienPlans.filter((b) => !b.isNew)
  for (const batch of chunk(newBiens, CREATE_BATCH_SIZE)) {
    await prisma.bien.createMany({
      data: batch.map((b) => ({
        id: b.id,
        source: Source.APIMO,
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

  // Phase 2c - mandats (dépendent des biens et propriétaires créés ci-dessus).
  const newMandats = mandatPlans.filter((m) => m.isNew)
  const existingMandatPlans = mandatPlans.filter((m) => !m.isNew)
  for (const batch of chunk(newMandats, CREATE_BATCH_SIZE)) {
    await prisma.mandat.createMany({
      data: batch.map((m) => ({
        id: m.id,
        source: Source.APIMO,
        sourceRef: m.sourceRef,
        ...buildMandatData(m.mapped, m.bienId, m.proprietaireId),
      })),
    })
  }
  await mapWithConcurrency(existingMandatPlans, WRITE_CONCURRENCY, async (m) => {
    await prisma.mandat.update({
      where: { id: m.id },
      data: nullifyUndefined(buildMandatData(m.mapped, m.bienId, m.proprietaireId)),
    })
  })

  const duplicatesFound = existingBienPlans.length

  await recordImportRun({
    source: Source.APIMO,
    kind: "biens_mandats",
    fileName,
    status: "success",
    recordsUpserted: total,
    duplicatesFound,
  })

  return { status: "success", recordsUpserted: total, duplicatesFound }
}
