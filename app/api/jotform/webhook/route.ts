import { NextResponse, type NextRequest } from "next/server"
import { prisma } from "@/lib/db/prisma"
import { Source } from "@/lib/generated/prisma/enums"
import { resolveContactMatch } from "@/lib/contacts/dedupe"
import { jotformSubmissionSchema } from "@/lib/integrations/jotform/types"
import { pushEstimationLead } from "@/lib/integrations/apimo/leads"

// Webhook JotForm → Apimo (cf. lib/integrations/apimo/leads.ts) : pousse la
// demande d'estimation comme Lead Apimo pour supprimer la ressaisie manuelle par
// l'agent avant de lancer l'AVM depuis la fiche bien.
// Authentifié par secret partagé en query string (proxy.ts laisse passer cette
// route sans session Supabase).
export async function POST(request: NextRequest) {
  const secret = request.nextUrl.searchParams.get("secret")
  if (!process.env.JOTFORM_WEBHOOK_SECRET || secret !== process.env.JOTFORM_WEBHOOK_SECRET) {
    return NextResponse.json({ error: "Non autorisé." }, { status: 401 })
  }

  const body = await request.json()
  const parsed = jotformSubmissionSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0]?.message }, { status: 400 })
  }
  const submission = parsed.data

  const candidates = await prisma.contact.findMany({
    where: { source: Source.JOTFORM },
    select: { id: true, source: true, sourceRef: true, nom: true, prenom: true, telephone: true },
  })
  const matchId = resolveContactMatch(candidates, {
    source: Source.JOTFORM,
    nom: submission.contactNom,
    prenom: submission.contactPrenom,
    telephone: submission.contactTelephone,
  })

  const contact = await prisma.contact.upsert({
    where: { id: matchId ?? "__none__" },
    create: {
      prenom: submission.contactPrenom,
      nom: submission.contactNom,
      telephone: submission.contactTelephone,
      email: submission.contactEmail,
      // Le formulaire JotForm est une demande d'estimation -> le contact veut
      // (faire estimer puis) vendre son bien.
      personas: ["vendeur"],
      source: Source.JOTFORM,
    },
    update: {
      telephone: submission.contactTelephone,
      email: submission.contactEmail,
    },
  })

  const bien = submission.bienAdresse
    ? await prisma.bien.create({
        data: {
          adresse: submission.bienAdresse,
          commune: submission.bienCommune,
          typeBien: submission.bienType,
          surface: submission.bienSurface ? Number(submission.bienSurface) : undefined,
          source: Source.JOTFORM,
        },
      })
    : null

  const estimation = await prisma.estimation.upsert({
    where: { jotformSubmissionId: submission.submissionID },
    create: {
      contactId: contact.id,
      bienId: bien?.id,
      jotformSubmissionId: submission.submissionID,
      statut: "en_attente",
    },
    update: {},
  })

  try {
    const { id: apimoLeadId } = await pushEstimationLead({
      jotformSubmissionId: submission.submissionID,
      contact: {
        prenom: submission.contactPrenom,
        nom: submission.contactNom,
        email: submission.contactEmail ?? null,
        telephone: submission.contactTelephone ?? null,
      },
      bien: bien ? { adresse: bien.adresse, commune: bien.commune, codePostal: null } : null,
    })

    await prisma.estimation.update({
      where: { id: estimation.id },
      data: { apimoLeadId, statut: "envoye_apimo" },
    })

    return NextResponse.json({ estimationId: estimation.id, apimoLeadId })
  } catch (err) {
    const message = err instanceof Error ? err.message : "Erreur Apimo inconnue"
    return NextResponse.json({ estimationId: estimation.id, error: message }, { status: 502 })
  }
}
