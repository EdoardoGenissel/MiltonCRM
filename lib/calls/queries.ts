import { prisma } from "@/lib/db/prisma"

// Fenêtre pendant laquelle un appel est considéré "en cours" pour le bandeau
// temps réel (cf. app/api/calls/active/route.ts) - durée large d'un appel
// entrant, pas une vraie notion de statut "raccroché" (Ringover ne nous notifie
// pas la fin d'appel dans ce webhook).
const ACTIVE_CALL_WINDOW_MS = 60_000

export function getActiveCall() {
  return prisma.callLog.findFirst({
    where: { receivedAt: { gte: new Date(Date.now() - ACTIVE_CALL_WINDOW_MS) } },
    include: { matchedContact: { select: { id: true, prenom: true, nom: true } } },
    orderBy: { receivedAt: "desc" },
  })
}
