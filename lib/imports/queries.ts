import { prisma } from "@/lib/db/prisma"
import { Source } from "@/lib/generated/prisma/enums"

export function listImportRuns() {
  return prisma.syncRun.findMany({
    where: { source: { in: [Source.APIMO, Source.SEPTEO] }, fileName: { not: null } },
    orderBy: { startedAt: "desc" },
    take: 30,
  })
}
