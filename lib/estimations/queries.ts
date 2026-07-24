import { prisma } from "@/lib/db/prisma"
import { PAGE_SIZE, toPageResult } from "@/lib/pagination"

export async function listEstimations(page = 1) {
  const [items, total] = await prisma.$transaction([
    prisma.estimation.findMany({
      include: { contact: true, bien: true },
      orderBy: { createdAt: "desc" },
      skip: (page - 1) * PAGE_SIZE,
      take: PAGE_SIZE,
    }),
    prisma.estimation.count(),
  ])

  return toPageResult(items, total, page)
}
