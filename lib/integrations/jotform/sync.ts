import { prisma } from "@/lib/db/prisma"
import { Source } from "@/lib/generated/prisma/enums"
import { resolveContactMatch, type ContactMatchCandidate } from "@/lib/contacts/dedupe"
import { fillBlanks, resolveBienMatch, type BienMatchCandidate } from "@/lib/biens/dedupe"
import { generateEstimationReport } from "@/lib/integrations/cityscan/client"
import { fetchAllSubmissions } from "./api-client"
import { mapEstimationSubmission, type MappedEstimationSubmission } from "./mapping"

// Id du formulaire "ESTIMATION IMMOBILIERE" (cf. scope.md §"Automatisation des
// estimations") — repéré via GET /user/forms avec la clé JOTFORM_API_KEY.
// Surchargeable par env si le formulaire est recréé/dupliqué côté JotForm.
const ESTIMATION_FORM_ID = process.env.JOTFORM_ESTIMATION_FORM_ID ?? "240225221809044"

export type JotformSyncResult = {
  status: "success" | "error"
  total: number
  created: number
  updated: number
  error?: string
}

type MappedBien = NonNullable<MappedEstimationSubmission["bien"]>

function bienJotformFields(bien: MappedBien) {
  return {
    codePostal: bien.codePostal,
    typeBien: bien.typeBien,
    pieces: bien.pieces,
    surfaceTerrain: bien.surfaceTerrain,
    referenceCadastrale: bien.referenceCadastrale,
    taxeFonciere: bien.taxeFonciere,
    chargesCopropriete: bien.chargesCopropriete,
    copropriete: bien.copropriete,
    assainissement: bien.assainissement,
    cuisineEquipements: bien.cuisineEquipements,
    equipements: bien.equipements,
    pointsPositifs: bien.pointsPositifs,
    pointsNegatifs: bien.pointsNegatifs,
    disponibilite: bien.disponibilite,
  }
}

// Rapproche le bien décrit par la soumission JotForm d'un bien Apimo/Septéo déjà
// existant (même adresse) plutôt que de systématiquement créer un doublon
// "source JOTFORM" — et si un rapprochement est trouvé, ne complète que les
// champs vides (priorité Apimo/Septéo, cf. lib/biens/dedupe.ts `fillBlanks`).
// Sans rapprochement, se rabat sur un Bien propre à JotForm (upsert par
// submissionId, comme avant).
async function resolveBien(bienCandidates: BienMatchCandidate[], mapped: MappedEstimationSubmission) {
  if (!mapped.bien?.adresse) return null

  const matchedId = resolveBienMatch(bienCandidates, {
    adresse: mapped.bien.adresse,
    commune: mapped.bien.commune,
  })

  if (matchedId) {
    const current = await prisma.bien.findUniqueOrThrow({ where: { id: matchedId } })
    const fill = fillBlanks(current, {
      adresse: mapped.bien.adresse,
      commune: mapped.bien.commune,
      ...bienJotformFields(mapped.bien),
    })
    return Object.keys(fill).length > 0
      ? prisma.bien.update({ where: { id: matchedId }, data: fill })
      : current
  }

  return prisma.bien.upsert({
    where: { source_sourceRef: { source: Source.JOTFORM, sourceRef: mapped.submissionId } },
    create: {
      adresse: mapped.bien.adresse,
      commune: mapped.bien.commune,
      source: Source.JOTFORM,
      sourceRef: mapped.submissionId,
      ...bienJotformFields(mapped.bien),
    },
    update: {
      adresse: mapped.bien.adresse,
      commune: mapped.bien.commune,
      ...bienJotformFields(mapped.bien),
    },
  })
}

// Synchronisation JotForm → CRM par appel API (pull), en alternative au webhook
// `/api/jotform/webhook` (cf. app/api/jotform/sync/route.ts) : rejoue tout
// l'historique des soumissions à chaque appel plutôt que de dépendre d'un
// événement webhook qui peut être manqué. Idempotent (upsert sur
// `Estimation.jotformSubmissionId`), donc peut tourner en cron sans dupliquer.
export async function syncJotformEstimations(): Promise<JotformSyncResult> {
  const syncRun = await prisma.syncRun.create({
    data: { source: Source.JOTFORM, status: "running" },
  })

  let created = 0
  let updated = 0

  try {
    const submissions = await fetchAllSubmissions(ESTIMATION_FORM_ID)

    // Chargé une seule fois puis complété localement au fil des créations, pour
    // éviter un `findMany` sur tous les contacts JOTFORM à chaque soumission
    // (coût O(n²) sur ~500 soumissions sinon).
    const candidates: ContactMatchCandidate[] = await prisma.contact.findMany({
      where: { source: Source.JOTFORM },
      select: { id: true, source: true, sourceRef: true, nom: true, prenom: true, telephone: true },
    })

    // Seules les sources Apimo/Septéo font foi pour la fiche bien (cf. demande
    // "favoriser Apimo/Septéo") — on ne rapproche donc jamais une soumission
    // JotForm contre un bien déjà créé par une autre soumission JotForm.
    const bienCandidates: BienMatchCandidate[] = await prisma.bien.findMany({
      where: { source: { in: [Source.APIMO, Source.SEPTEO] } },
      select: { id: true, source: true, adresse: true, commune: true },
    })

    for (const submission of submissions) {
      const mapped = mapEstimationSubmission(submission)
      if (!mapped.contact.nom && !mapped.contact.prenom) continue // soumission incomplète/test

      const existing = await prisma.estimation.findUnique({
        where: { jotformSubmissionId: mapped.submissionId },
        select: { id: true, cityscanReportUrl: true },
      })

      const matchId = resolveContactMatch(candidates, {
        source: Source.JOTFORM,
        nom: mapped.contact.nom,
        prenom: mapped.contact.prenom,
        telephone: mapped.contact.telephone,
      })

      const contact = await prisma.contact.upsert({
        where: { id: matchId ?? "__none__" },
        create: {
          prenom: mapped.contact.prenom,
          nom: mapped.contact.nom,
          telephone: mapped.contact.telephone,
          email: mapped.contact.email,
          commune: mapped.contact.commune,
          personas: ["prospect"],
          source: Source.JOTFORM,
        },
        update: {
          telephone: mapped.contact.telephone ?? undefined,
          email: mapped.contact.email ?? undefined,
          commune: mapped.contact.commune ?? undefined,
        },
      })
      if (!matchId) {
        candidates.push({
          id: contact.id,
          source: contact.source,
          sourceRef: contact.sourceRef,
          nom: contact.nom,
          prenom: contact.prenom,
          telephone: contact.telephone,
        })
      }

      const bien = await resolveBien(bienCandidates, mapped)

      const estimation = await prisma.estimation.upsert({
        where: { jotformSubmissionId: mapped.submissionId },
        create: {
          contactId: contact.id,
          bienId: bien?.id,
          jotformSubmissionId: mapped.submissionId,
          submittedAt: mapped.submittedAt,
          answers: mapped.answers,
          statut: "en_attente",
        },
        update: {
          contactId: contact.id,
          bienId: bien?.id ?? undefined,
          submittedAt: mapped.submittedAt,
          answers: mapped.answers,
        },
      })

      if (existing) updated++
      else created++

      if (!existing?.cityscanReportUrl) {
        try {
          const { reportUrl } = await generateEstimationReport({
            bienAdresse: bien?.adresse,
            bienCommune: bien?.commune,
            bienType: bien?.typeBien,
            bienSurface: null,
          })
          await prisma.estimation.update({
            where: { id: estimation.id },
            data: { cityscanReportUrl: reportUrl, statut: "genere" },
          })
        } catch {
          // CityScan pas encore branché en mode live (cf.
          // lib/integrations/cityscan/client.ts) — l'estimation reste
          // "en_attente", non bloquant pour le reste du sync.
        }
      }
    }

    await prisma.syncRun.update({
      where: { id: syncRun.id },
      data: { status: "success", finishedAt: new Date(), recordsUpserted: created + updated },
    })

    return { status: "success", total: submissions.length, created, updated }
  } catch (err) {
    const message = err instanceof Error ? err.message : "Erreur JotForm sync inconnue"
    await prisma.syncRun.update({
      where: { id: syncRun.id },
      data: { status: "error", finishedAt: new Date(), error: message, recordsUpserted: created + updated },
    })
    return { status: "error", total: 0, created, updated, error: message }
  }
}
