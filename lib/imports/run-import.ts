import { randomUUID } from "node:crypto"
import { prisma } from "@/lib/db/prisma"
import { Source } from "@/lib/generated/prisma/enums"
import { resolveContactMatch, type ContactMatchCandidate } from "@/lib/contacts/dedupe"
import { parseTabularBuffer } from "@/lib/imports/excel-parser"
import {
  buildHeaderIndex,
  mapApimoRow,
  mapSepteoRow,
  type ApimoProspectRow,
  type ImportKind,
} from "@/lib/imports/mapping"
import { chunk } from "@/lib/imports/batch"
import { mapWithConcurrency } from "@/lib/imports/concurrency"
import { parseFrDate } from "@/lib/imports/parse-date"
import { parseNumber } from "@/lib/imports/parse-number"
import { importApimoBiens } from "@/lib/imports/run-import-biens"
import type { ImportResult, OnProgress } from "@/lib/imports/import-types"

export type { ImportResult, ImportProgress, OnProgress } from "@/lib/imports/import-types"

// Écrire une ligne à la fois (upsert par ligne) fait ~2 allers-retours réseau par
// ligne vers le pooler Supabase — pour 3 700 lignes Apimo ça peut prendre plusieurs
// minutes. On sépare donc dédup (en mémoire, quasi instantané) et écriture DB (en
// masse) : les nouvelles fiches partent en `createMany` par lots de 500 (1 aller-
// retour pour 500 lignes au lieu de 500), les fiches déjà existantes (doublons
// détectés) sont mises à jour en parallèle borné — chacune cible un id distinct,
// donc sans risque de collision entre écritures concurrentes.
const CREATE_BATCH_SIZE = 500
const UPDATE_CONCURRENCY = 10

type CandidateWithPersonas = ContactMatchCandidate & { personas: string[] }

async function loadCandidates(source: Source): Promise<CandidateWithPersonas[]> {
  return prisma.contact.findMany({
    where: { source },
    select: {
      id: true,
      source: true,
      sourceRef: true,
      nom: true,
      prenom: true,
      telephone: true,
      personas: true,
    },
  })
}

function parseLoyerMax(value: string | undefined): number | undefined {
  if (!value) return undefined
  return parseNumber(value)
}

// Reste des colonnes Apimo (au-delà du socle de scope.md) → champs
// `ProspectDetail`, factorisé pour être utilisé à la fois en création
// (`createMany`) et en mise à jour (`upsert`) d'une fiche déjà existante.
function buildProspectDetailExtras(mapped: ApimoProspectRow) {
  return {
    coAgence: mapped.coAgence,
    prixMin: parseNumber(mapped.prixMin),
    prixMax: parseNumber(mapped.prixMax),
    devise: mapped.devise,
    pieces: mapped.pieces,
    surfaceMin: parseNumber(mapped.surfaceMin),
    surfaceMax: parseNumber(mapped.surfaceMax),
    secteur: mapped.secteur,
    quartier: mapped.quartier,
    derniereAction: parseFrDate(mapped.derniereAction),
    commentaire: mapped.commentaire,
    creeLe: parseFrDate(mapped.creeLe),
    utilisateur: mapped.utilisateur,
    emailingAbonne: mapped.emailingAbonne,
    magazineAbonne: mapped.magazineAbonne,
    originePrecise: mapped.originePrecise,
    languesParlees: mapped.languesParlees,
    dateNaissance: parseFrDate(mapped.dateNaissance),
    lieuNaissance: mapped.lieuNaissance,
    adressePersonnelle: mapped.adressePersonnelle,
    adresseComplement: mapped.adresseComplement,
    codePostal: mapped.codePostal,
    villePersonnelle: mapped.villePersonnelle,
    pays: mapped.pays,
    agence: mapped.agence,
    referenceProduit: mapped.referenceProduit,
    criteresComplementaires: mapped.criteresComplementaires,
    attributs: mapped.attributs,
    majLe: parseFrDate(mapped.majLe),
    majPar: mapped.majPar,
  }
}

async function importApimoProspects(
  buffer: ArrayBuffer,
  fileName: string,
  onProgress?: OnProgress
): Promise<ImportResult> {
  const { headerRow, rows } = await parseTabularBuffer(buffer, fileName)
  const headerIndex = buildHeaderIndex(headerRow)
  const candidates = await loadCandidates(Source.APIMO)

  // Phase 1 — dédup en mémoire, aucun accès DB : rapide même sur des milliers de
  // lignes, donc pas besoin d'y reporter de progression.
  type ToCreate = { id: string; mapped: NonNullable<ReturnType<typeof mapApimoRow>> }
  type ToUpdate = { matchId: string; mapped: NonNullable<ReturnType<typeof mapApimoRow>> }
  const toCreate: ToCreate[] = []
  const toUpdate: ToUpdate[] = []

  for (const row of rows) {
    const mapped = mapApimoRow(headerIndex, row)
    if (!mapped || !mapped.nom) continue

    const matchId = resolveContactMatch(candidates, {
      source: Source.APIMO,
      sourceRef: mapped.sourceRef,
      nom: mapped.nom,
      prenom: mapped.prenom,
      telephone: mapped.telephone,
    })

    if (matchId) {
      toUpdate.push({ matchId, mapped })
    } else {
      const id = randomUUID()
      toCreate.push({ id, mapped })
      // Visible immédiatement pour les lignes suivantes du même fichier (ex. une
      // même personne présente deux fois dans l'export) — sans ça, deux lignes
      // identiques créeraient deux contacts au lieu d'un doublon détecté.
      candidates.push({
        id,
        source: Source.APIMO,
        sourceRef: mapped.sourceRef ?? null,
        nom: mapped.nom,
        prenom: mapped.prenom,
        telephone: mapped.telephone ?? null,
        personas: ["prospect"],
      })
    }
  }

  const total = toCreate.length + toUpdate.length
  let processed = 0

  // Phase 2a — nouvelles fiches, par lots.
  for (const batch of chunk(toCreate, CREATE_BATCH_SIZE)) {
    await prisma.contact.createMany({
      data: batch.map(({ id, mapped }) => ({
        id,
        civilite: mapped.civilite,
        prenom: mapped.prenom,
        nom: mapped.nom,
        email: mapped.email,
        telephone: mapped.telephone,
        commune: mapped.commune,
        personas: ["prospect"],
        source: Source.APIMO,
        sourceRef: mapped.sourceRef,
      })),
    })
    await prisma.prospectDetail.createMany({
      data: batch.map(({ id, mapped }) => ({
        contactId: id,
        alerteAbonne: mapped.alerteAbonne,
        classification: mapped.classification,
        origine: mapped.origine,
        categorie: mapped.categorie,
        typeBien: mapped.typeBien,
        loyerMax:
          mapped.categorie?.toLowerCase() === "location" ? parseLoyerMax(mapped.loyerMax) : undefined,
        ...buildProspectDetailExtras(mapped),
      })),
    })
    processed += batch.length
    onProgress?.({ processed, total })
  }

  // Phase 2b — doublons détectés (matchId existant) : update en parallèle borné.
  await mapWithConcurrency(toUpdate, UPDATE_CONCURRENCY, async ({ matchId, mapped }) => {
    const loyerMax =
      mapped.categorie?.toLowerCase() === "location" ? parseLoyerMax(mapped.loyerMax) : undefined

    // Fusionne avec les personas existants plutôt que d'écraser : un contact peut
    // avoir été rattaché entretemps comme propriétaire/locataire (import biens ou
    // Septéo) — un ré-import Apimo prospects ne doit pas faire disparaître ce
    // persona (cf. bug corrigé lors de l'ajout de l'import biens).
    const existingPersonas = candidates.find((c) => c.id === matchId)?.personas ?? []
    const mergedPersonas = Array.from(new Set([...existingPersonas, "prospect"]))

    await prisma.contact.update({
      where: { id: matchId },
      data: {
        civilite: mapped.civilite,
        email: mapped.email,
        telephone: mapped.telephone,
        commune: mapped.commune,
        personas: { set: mergedPersonas },
      },
    })
    const extras = buildProspectDetailExtras(mapped)
    await prisma.prospectDetail.upsert({
      where: { contactId: matchId },
      create: {
        contactId: matchId,
        alerteAbonne: mapped.alerteAbonne,
        classification: mapped.classification,
        origine: mapped.origine,
        categorie: mapped.categorie,
        typeBien: mapped.typeBien,
        loyerMax,
        ...extras,
      },
      update: {
        alerteAbonne: mapped.alerteAbonne,
        classification: mapped.classification,
        origine: mapped.origine,
        categorie: mapped.categorie,
        typeBien: mapped.typeBien,
        loyerMax,
        ...extras,
      },
    })
    processed += 1
    onProgress?.({ processed, total })
  })

  await prisma.syncRun.create({
    data: {
      source: Source.APIMO,
      status: "success",
      finishedAt: new Date(),
      recordsUpserted: total,
      duplicatesFound: toUpdate.length,
      fileName,
    },
  })

  return { status: "success", recordsUpserted: total, duplicatesFound: toUpdate.length }
}

async function importSepteoContacts(
  buffer: ArrayBuffer,
  fileName: string,
  onProgress?: OnProgress
): Promise<ImportResult> {
  const { headerRow, rows } = await parseTabularBuffer(buffer, fileName)
  const headerIndex = buildHeaderIndex(headerRow)
  const candidates = await loadCandidates(Source.SEPTEO)

  type ToCreate = { id: string; mapped: NonNullable<ReturnType<typeof mapSepteoRow>> }
  type ToUpdate = {
    matchId: string
    mapped: NonNullable<ReturnType<typeof mapSepteoRow>>
    mergedPersonas: string[]
  }
  const toCreate: ToCreate[] = []
  const toUpdate: ToUpdate[] = []

  for (const row of rows) {
    const mapped = mapSepteoRow(headerIndex, row)
    if (!mapped) continue

    const matchId = resolveContactMatch(candidates, {
      source: Source.SEPTEO,
      nom: mapped.nom,
      prenom: mapped.prenom,
      telephone: mapped.telephone,
    })

    if (matchId) {
      const existingPersonas = candidates.find((c) => c.id === matchId)?.personas ?? []
      const mergedPersonas = Array.from(new Set([...existingPersonas, ...mapped.personas]))
      toUpdate.push({ matchId, mapped, mergedPersonas })
    } else {
      const id = randomUUID()
      toCreate.push({ id, mapped })
      candidates.push({
        id,
        source: Source.SEPTEO,
        sourceRef: null,
        nom: mapped.nom,
        prenom: mapped.prenom,
        telephone: mapped.telephone ?? null,
        personas: mapped.personas,
      })
    }
  }

  const total = toCreate.length + toUpdate.length
  let processed = 0

  for (const batch of chunk(toCreate, CREATE_BATCH_SIZE)) {
    await prisma.contact.createMany({
      data: batch.map(({ id, mapped }) => ({
        id,
        prenom: mapped.prenom,
        nom: mapped.nom,
        email: mapped.email,
        telephone: mapped.telephone,
        commune: mapped.commune,
        personas: mapped.personas,
        source: Source.SEPTEO,
      })),
    })
    processed += batch.length
    onProgress?.({ processed, total })
  }

  await mapWithConcurrency(toUpdate, UPDATE_CONCURRENCY, async ({ matchId, mapped, mergedPersonas }) => {
    await prisma.contact.update({
      where: { id: matchId },
      data: {
        email: mapped.email,
        telephone: mapped.telephone,
        commune: mapped.commune,
        personas: { set: mergedPersonas },
      },
    })
    processed += 1
    onProgress?.({ processed, total })
  })

  await prisma.syncRun.create({
    data: {
      source: Source.SEPTEO,
      status: "success",
      finishedAt: new Date(),
      recordsUpserted: total,
      duplicatesFound: toUpdate.length,
      fileName,
    },
  })

  return { status: "success", recordsUpserted: total, duplicatesFound: toUpdate.length }
}

export async function runImport(
  kind: ImportKind,
  buffer: ArrayBuffer,
  fileName: string,
  onProgress?: OnProgress
): Promise<ImportResult> {
  try {
    switch (kind) {
      case "apimo_prospects":
        return await importApimoProspects(buffer, fileName, onProgress)
      case "apimo_biens":
        return await importApimoBiens(buffer, fileName, onProgress)
      case "septeo_contacts":
        return await importSepteoContacts(buffer, fileName, onProgress)
    }
  } catch (err) {
    const message = err instanceof Error ? err.message : "Erreur inconnue"
    await prisma.syncRun.create({
      data: {
        source: kind === "septeo_contacts" ? Source.SEPTEO : Source.APIMO,
        status: "error",
        finishedAt: new Date(),
        error: message,
        fileName,
      },
    })
    return { status: "error", recordsUpserted: 0, duplicatesFound: 0, error: message }
  }
}
