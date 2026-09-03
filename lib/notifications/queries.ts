import { prisma } from "@/lib/db/prisma"

export type NotificationItem = {
  id: string
  message: string
  createdAt: string
}

const RECENT_WINDOW_DAYS = 7

const KIND_LABELS: Record<string, string> = {
  contacts: "contact(s)",
  biens_mandats: "bien(s)/mandat(s)",
}

// Notifications "best-effort" dérivées de données déjà en base (ImportLog,
// Estimation) — pas de table de notifications dédiée : le point rouge se base
// sur la date du plus récent événement, comparée à un horodatage "vu" stocké
// côté client (cf. components/notification-bell.tsx). ImportLog (cf.
// lib/imports/record-import-run.ts) donne le détail créés/mis à jour par type
// d'import, plus précis que SyncRun seul (partagé avec Cockpit).
export async function getRecentNotifications(): Promise<NotificationItem[]> {
  const since = new Date(Date.now() - RECENT_WINDOW_DAYS * 24 * 60 * 60 * 1000)

  const [imports, estimations] = await Promise.all([
    prisma.importLog.findMany({
      where: { startedAt: { gte: since } },
      orderBy: { startedAt: "desc" },
      take: 5,
    }),
    prisma.estimation.findMany({
      where: { createdAt: { gte: since } },
      orderBy: { createdAt: "desc" },
      select: { createdAt: true },
    }),
  ])

  const importItems: NotificationItem[] = imports.map((log) => ({
    id: `import-${log.id}`,
    message: `Suite à un import : ${log.total} ${KIND_LABELS[log.kind] ?? "fiche(s)"} importé(s) (${log.created} créé(s), ${log.updated} mis à jour)`,
    createdAt: log.startedAt.toISOString(),
  }))

  const estimationItems: NotificationItem[] =
    estimations.length > 0
      ? [
          {
            id: "estimations-recent",
            message: `Suite à de nouvelles estimations : ${estimations.length} nouvelle(s) estimation(s)`,
            createdAt: estimations[0].createdAt.toISOString(),
          },
        ]
      : []

  return [...importItems, ...estimationItems].sort(
    (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
  )
}
