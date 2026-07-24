import { NextResponse, type NextRequest } from "next/server"
import { prisma } from "@/lib/db/prisma"
import { Source } from "@/lib/generated/prisma/enums"
import { resolveContactMatch } from "@/lib/contacts/dedupe"
import { jotformSubmissionSchema } from "@/lib/integrations/jotform/types"
import { generateEstimationReport } from "@/lib/integrations/cityscan/client"

// Webhook JotForm → CityScan (cf. scope.md §"Automatisation des estimations") :
// supprime la ressaisie manuelle du rapport reçu par mail dans CityScan.
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
      personas: ["prospect"],
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
    const { reportUrl } = await generateEstimationReport({
      bienAdresse: bien?.adresse,
      bienCommune: bien?.commune,
      bienType: bien?.typeBien,
      bienSurface: bien?.surface ? Number(bien.surface) : null,
    })

    await prisma.estimation.update({
      where: { id: estimation.id },
      data: { cityscanReportUrl: reportUrl, statut: "genere" },
    })

    return NextResponse.json({ estimationId: estimation.id, reportUrl })
  } catch (err) {
    const message = err instanceof Error ? err.message : "Erreur CityScan inconnue"
    return NextResponse.json({ estimationId: estimation.id, error: message }, { status: 502 })
  }
}
