import { randomUUID } from "node:crypto"
import { prisma } from "@/lib/db/prisma"
import { Source } from "@/lib/generated/prisma/enums"
import { resolveContactByIdentity, type IdentityMatchCandidate } from "@/lib/contacts/dedupe"
import { parseTabularBuffer } from "@/lib/imports/excel-parser"
import { buildHeaderIndex } from "@/lib/imports/header-index"
import { mapApimoBienRow, type ApimoBienRow } from "@/lib/imports/mapping-biens"
import { parseApimoProprietaires } from "@/lib/imports/apimo-proprietaire"
import { apimoOwnerPersona } from "@/lib/imports/apimo-persona"
import { parseApimoDateTime } from "@/lib/imports/parse-datetime"
import { parseNumber } from "@/lib/imports/parse-number"
import { chunk } from "@/lib/imports/batch"
import { mapWithConcurrency } from "@/lib/imports/concurrency"
import { nullifyUndefined } from "@/lib/imports/nullify-undefined"
import { recordImportRun } from "@/lib/imports/record-import-run"
import type { ImportResult, OnProgress } from "@/lib/imports/import-types"
import {
  MANDAT_TYPE_INCONNU,
  type ApimoBienFields,
  type ApimoBienItem,
  type ApimoMandatFields,
  type ApimoOwnerInput,
} from "@/lib/imports/apimo-bien-item"

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

type OwnerCandidate = IdentityMatchCandidate & { source: Source; sourceRef: string | null }

async function loadOwnerCandidates(): Promise<OwnerCandidate[]> {
  // Tous pôles/sources confondus : un propriétaire peut déjà exister comme
  // prospect Apimo ou contact Septéo - cf. "fiche contact unifiée cross-pôle".
  return prisma.contact.findMany({
    select: {
      id: true,
      source: true,
      sourceRef: true,
      email: true,
      telephone: true,
      nom: true,
      prenom: true,
    },
  })
}

function buildBienData(mapped: ApimoBienRow): ApimoBienFields {
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

function buildMandatData(mapped: ApimoBienRow): ApimoMandatFields {
  return {
    // "Mandat" n'est renseigné que sur ~64% des lignes (cf. étapes amont comme
    // "Attente mandat") - Mandat.type est NOT NULL, d'où ce filet par défaut,
    // écrit en toutes lettres puisqu'affiché tel quel sur les fiches.
    type: mapped.typeMandat ?? MANDAT_TYPE_INCONNU,
    statut: mapped.etape,
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

// Ligne Excel → item. Email/téléphone de l'export : seulement fiables pour un
// propriétaire unique (co-propriétaires "M. A - M. B" : coordonnées de qui ?).
function rowToItem(mapped: ApimoBienRow): ApimoBienItem {
  const parsed = parseApimoProprietaires(mapped.proprietaireLabel)
  const single = parsed.length === 1
  return {
    sourceRef: mapped.apinumber,
    bien: buildBienData(mapped),
    mandat: buildMandatData(mapped),
    owners: parsed.map((p) => ({
      ...p,
      email: single ? mapped.proprietaireEmail : undefined,
      telephone: single ? mapped.proprietaireTelephone : undefined,
    })),
  }
}

export async function importApimoBiens(
  buffer: ArrayBuffer,
  fileName: string,
  onProgress?: OnProgress,
): Promise<ImportResult> {
  const { headerRow, rows } = await parseTabularBuffer(buffer, fileName)
  const headerIndex = buildHeaderIndex(headerRow)
  const items = rows
    .map((row) => mapApimoBienRow(headerIndex, row))
    .filter((mapped): mapped is ApimoBienRow => mapped !== null)
    .map(rowToItem)
  return upsertApimoBiens(items, { fileName, onProgress })
}

// Coordonnées d'un propriétaire Apimo déjà connu (même sourceRef) réalignées sur
// Apimo, qui fait autorité sur ses propres fiches (pas de modification possible
// côté CRM) - typiquement le prénom réduit à une initiale ("M.") par l'export
// Excel, remplacé par le vrai prénom renvoyé par l'API.
type OwnerRefresh = {
  id: string
  sourceRef: string
  owner: ApimoOwnerInput
  personas: Set<string>
}

export async function upsertApimoBiens(
  items: ApimoBienItem[],
  { fileName, onProgress }: { fileName: string; onProgress?: OnProgress },
): Promise<ImportResult> {
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
  // Contacts Apimo par id Apimo (Contact.sourceRef) - rapprochement exact des
  // propriétaires renvoyés par l'API, prioritaire sur le rapprochement par identité.
  const apimoContactIdByRef = new Map(
    ownerCandidates
      .filter((c) => c.source === Source.APIMO && c.sourceRef)
      .map((c) => [c.sourceRef!, c.id]),
  )

  type OwnerToCreate = {
    id: string
    sourceRef?: string
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
  const ownersToRefresh = new Map<string, OwnerRefresh>()

  type BienPlan = { id: string; isNew: boolean; data: ApimoBienFields; sourceRef: string }
  type MandatPlan = {
    id: string
    isNew: boolean
    sourceRef: string
    bienId: string
    proprietaireId: string | null
    data: ApimoMandatFields
  }
  const bienPlans: BienPlan[] = []
  const mandatPlans: MandatPlan[] = []

  // Phase 1 - dédup/résolution en mémoire (aucun accès DB), y compris pour les
  // propriétaires : deux lignes (deux biens) du même propriétaire non encore en
  // base doivent aboutir au même contact plutôt qu'à deux doublons.
  for (const item of items) {
    let proprietaireId: string | null = null
    const ownerPersona = apimoOwnerPersona(item.mandat.categorie)

    for (const owner of item.owners) {
      let ownerId = owner.apimoContactId
        ? (apimoContactIdByRef.get(owner.apimoContactId) ?? null)
        : null
      const matchedBySourceRef = ownerId !== null
      ownerId ??= resolveContactByIdentity(ownerCandidates, {
        email: owner.email,
        telephone: owner.telephone,
        nom: owner.nom,
        prenom: owner.prenom,
      })

      if (ownerId) {
        const candidate = ownerCandidates.find((c) => c.id === ownerId)
        // Fiche Apimo sans sourceRef (créée par l'import Excel, qui n'avait pas
        // l'id du propriétaire) : on la rattache à son id Apimo au passage, pour
        // un rapprochement exact aux synchros suivantes.
        const canAdopt =
          !!owner.apimoContactId &&
          !matchedBySourceRef &&
          candidate?.source === Source.APIMO &&
          !candidate.sourceRef &&
          !apimoContactIdByRef.has(owner.apimoContactId)
        if (canAdopt) {
          candidate.sourceRef = owner.apimoContactId!
          apimoContactIdByRef.set(owner.apimoContactId!, ownerId)
        }

        if (owner.apimoContactId && (matchedBySourceRef || canAdopt)) {
          const refresh = ownersToRefresh.get(ownerId) ?? {
            id: ownerId,
            sourceRef: owner.apimoContactId,
            owner,
            personas: new Set<string>(),
          }
          refresh.personas.add(ownerPersona)
          ownersToRefresh.set(ownerId, refresh)
        } else {
          const personas = ownerIdsToTag.get(ownerId) ?? new Set<string>()
          personas.add(ownerPersona)
          ownerIdsToTag.set(ownerId, personas)
        }
      } else {
        ownerId = randomUUID()
        ownersToCreate.push({
          id: ownerId,
          sourceRef: owner.apimoContactId,
          civilite: owner.civilite,
          prenom: owner.prenom,
          nom: owner.nom,
          telephone: owner.telephone,
          email: owner.email,
          commune: item.bien.commune,
          persona: ownerPersona,
        })
        ownerCandidates.push({
          id: ownerId,
          source: Source.APIMO,
          sourceRef: owner.apimoContactId ?? null,
          email: owner.email ?? null,
          telephone: owner.telephone ?? null,
          nom: owner.nom,
          prenom: owner.prenom,
        })
        if (owner.apimoContactId) apimoContactIdByRef.set(owner.apimoContactId, ownerId)
      }
      proprietaireId ??= ownerId
    }

    const existingBienId = bienIdByRef.get(item.sourceRef)
    const bienId = existingBienId ?? randomUUID()
    if (!existingBienId) bienIdByRef.set(item.sourceRef, bienId)
    bienPlans.push({
      id: bienId,
      isNew: !existingBienId,
      data: item.bien,
      sourceRef: item.sourceRef,
    })

    const existingMandatId = mandatIdByRef.get(item.sourceRef)
    const mandatId = existingMandatId ?? randomUUID()
    // Filet de sécurité si jamais un même "Apinumber" apparaissait deux fois
    // dans l'export (cf. même correctif sur l'import biens Septéo, où un doublon
    // réel a révélé l'absence de ce `set`) : sans lui, deux lignes partageant le
    // même id généreraient deux `createMany` en conflit sur la contrainte unique
    // (source, sourceRef) plutôt que de fusionner en une mise à jour.
    if (!existingMandatId) mandatIdByRef.set(item.sourceRef, mandatId)
    mandatPlans.push({
      id: mandatId,
      isNew: !existingMandatId,
      sourceRef: item.sourceRef,
      bienId,
      proprietaireId,
      data: item.mandat,
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
        sourceRef: o.sourceRef,
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
  // `undefined` = champ laissé tel quel (pas d'effacement d'un email/téléphone
  // que l'API n'aurait pas), comme pour la mise à jour des prospects.
  await mapWithConcurrency(
    [...ownersToRefresh.values()],
    WRITE_CONCURRENCY,
    async ({ id, sourceRef, owner, personas }) => {
      const contact = await prisma.contact.findUnique({ where: { id }, select: { personas: true } })
      const merged = Array.from(new Set([...(contact?.personas ?? []), ...personas]))
      await prisma.contact.update({
        where: { id },
        data: {
          sourceRef,
          civilite: owner.civilite,
          prenom: owner.prenom,
          nom: owner.nom,
          email: owner.email,
          telephone: owner.telephone,
          personas: { set: merged },
        },
      })
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
        bienId: m.bienId,
        proprietaireId: m.proprietaireId,
        ...m.data,
      })),
    })
  }
  await mapWithConcurrency(existingMandatPlans, WRITE_CONCURRENCY, async (m) => {
    await prisma.mandat.update({
      where: { id: m.id },
      data: nullifyUndefined({ bienId: m.bienId, proprietaireId: m.proprietaireId, ...m.data }),
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
