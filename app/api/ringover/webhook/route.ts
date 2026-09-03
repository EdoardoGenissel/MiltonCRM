import { NextResponse, type NextRequest } from "next/server"
import { prisma } from "@/lib/db/prisma"
import type { Prisma } from "@/lib/generated/prisma/client"
import { matchContactByCall } from "@/lib/integrations/ringover/match"
import {
  isIncomingCall,
  parseRingoverEvent,
  safeDate,
} from "@/lib/integrations/ringover/parse-event"
import { verifyRingoverSignature } from "@/lib/integrations/ringover/webhook-signature"

// Webhook Ringover — un seul point d'entrée pour tous les types d'événements
// (ringing, answered, hangup, missed, voicemail, record_available,
// transcription_available, summary_available, tags/comments_updated...), cf.
// scope.md §"Ringover - matching des appels". Schéma confirmé via le fichier
// OpenAPI public de Ringover (developer.ringover.com/web/openapi_public.yml) —
// {event, resource, timestamp, data: {...}}, pas une simple structure plate.
export async function POST(request: NextRequest) {
  // Lu en texte brut d'abord : nécessaire à la fois pour la vérification de
  // signature (le JWT encapsule le payload tel quel) et pour extraire call_id
  // sans passer par un `number` JS qui tronquerait ce uint64 (cf. parse-event.ts).
  const rawBody = await request.text()

  const signatureHeader =
    request.headers.get("x-ringover-webhook-signature") ?? request.headers.get("authorization")

  let authorized = false
  if (signatureHeader && process.env.RINGOVER_WEBHOOK_SECRET) {
    // Mécanisme réel Ringover (V1) : JWT HS512 signé avec la clé webhook du
    // dashboard Ringover (Paramètres > Webhooks) — cf. lib/integrations/ringover/
    // webhook-signature.ts.
    authorized =
      verifyRingoverSignature(signatureHeader, process.env.RINGOVER_WEBHOOK_SECRET) !== null
  }
  if (!authorized) {
    // Repli : secret en query string — utile pour nos propres tests manuels tant
    // qu'on n'a pas récupéré la vraie clé webhook dans le dashboard Ringover.
    const querySecret = request.nextUrl.searchParams.get("secret")
    authorized =
      Boolean(process.env.RINGOVER_WEBHOOK_SECRET) &&
      querySecret === process.env.RINGOVER_WEBHOOK_SECRET
  }
  if (!authorized) {
    return NextResponse.json({ error: "Non autorisé." }, { status: 401 })
  }

  let payload: unknown
  try {
    payload = JSON.parse(rawBody)
  } catch {
    return NextResponse.json({ error: "JSON invalide." }, { status: 400 })
  }

  const parsed = parseRingoverEvent(payload, rawBody)

  // Matching contact dès qu'un numéro exploitable est présent.
  let matchedContactId: string | null = null
  if (parsed.phoneNumber) {
    const candidates = await prisma.contact.findMany({
      where: { telephone: { not: null } },
      select: { id: true, nom: true, prenom: true, telephone: true },
    })
    matchedContactId = matchContactByCall(candidates, { phoneNumber: parsed.phoneNumber })
  }

  // Filet de sécurité : conserve TOUT événement reçu, peu importe son type.
  await prisma.ringoverEvent.create({
    data: {
      event: parsed.event,
      payload: payload as Prisma.InputJsonValue,
      matchedContactId,
    },
  })

  if (!parsed.callId) {
    return NextResponse.json({ matchedContactId })
  }

  const existing = await prisma.callLog.findUnique({ where: { ringoverCallId: parsed.callId } })

  // Bandeau "Appel en cours" + CallLog (Lot 4) : uniquement pour l'appel entrant
  // qui sonne. Les événements suivants du même appel (hangup, record_available,
  // transcription_available...) enrichissent ce CallLog s'il existe déjà, mais ne
  // déclenchent pas la création d'un nouveau CallLog à eux seuls — on ne veut pas
  // créer une entrée "appel" à partir d'un événement type tags_updated isolé.
  if (!existing && !isIncomingCall(parsed)) {
    return NextResponse.json({ matchedContactId })
  }

  const callLog = await prisma.callLog.upsert({
    where: { ringoverCallId: parsed.callId },
    create: {
      ringoverCallId: parsed.callId,
      phoneNumber: parsed.phoneNumber ?? "",
      direction: parsed.direction,
      matchedContactId,
      receivedAt: safeDate(parsed.timestamp),
      recordUrl: parsed.recordUrl,
      transcriptionUrl: parsed.transcriptionUrl,
      transcriptSummary: parsed.summary,
    },
    update: {
      // Ne jamais écraser une valeur déjà connue par du vide (ex. un événement
      // hangup sans record ne doit pas effacer un record_available reçu avant).
      recordUrl: parsed.recordUrl ?? existing?.recordUrl,
      transcriptionUrl: parsed.transcriptionUrl ?? existing?.transcriptionUrl,
      transcriptSummary: parsed.summary ?? existing?.transcriptSummary,
    },
  })

  return NextResponse.json({ matchedContactId, callLogId: callLog.id })
}
