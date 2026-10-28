import { prisma } from "@/lib/db/prisma"
import { Source } from "@/lib/generated/prisma/enums"
import { APIMO_SYNC_LABEL } from "@/lib/integrations/apimo/sync"

export function listImportRuns() {
  return prisma.syncRun.findMany({
    where: { source: { in: [Source.APIMO, Source.SEPTEO] }, fileName: { not: null } },
    orderBy: { startedAt: "desc" },
    take: 30,
  })
}

// Le dernier import réussi par type (contacts / biens & mandats) - utilisé pour
// le résumé "statistiques du dernier import" en haut de la page Imports.
export async function listLatestImportLogByKind() {
  const [contacts, biensMandats] = await Promise.all([
    prisma.importLog.findFirst({ where: { kind: "contacts" }, orderBy: { startedAt: "desc" } }),
    prisma.importLog.findFirst({
      where: { kind: "biens_mandats" },
      orderBy: { startedAt: "desc" },
    }),
  ])
  return { contacts, biensMandats }
}

// Dernière synchro Apimo par l'API (une synchro = deux SyncRun, prospects puis
// biens & mandats) - pour l'encart "Synchro Apimo" de la page Imports.
export function getLatestApimoSync() {
  return prisma.syncRun.findFirst({
    where: { source: Source.APIMO, fileName: APIMO_SYNC_LABEL },
    orderBy: { startedAt: "desc" },
  })
}
