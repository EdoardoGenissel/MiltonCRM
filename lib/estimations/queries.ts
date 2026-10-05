import { prisma } from "@/lib/db/prisma"
import { PAGE_SIZE, toPageResult } from "@/lib/pagination"

export { ESTIMATION_STATUTS, ESTIMATION_STATUT_LABELS } from "@/lib/estimations/statuts"

export type EstimationFilterColumn = "statut"

export type EstimationListFilters = {
  search?: string
  statut?: string[]
  page?: number
  sort?: string
  dir?: string
}

// Même logique que buildContactWhere / buildBienWhere : `excludeColumn` retire
// le filtre d'une colonne pour l'API de valeurs uniques (cf.
// app/api/estimations/column-values). La recherche texte porte sur le contact
// et l'adresse du bien (l'estimation elle-même n'a pas de libellé).
export function buildEstimationWhere(
  filters: EstimationListFilters,
  excludeColumn?: EstimationFilterColumn,
) {
  const { search, statut } = filters

  return {
    AND: [
      search
        ? {
            OR: [
              { contact: { nom: { contains: search, mode: "insensitive" as const } } },
              { contact: { prenom: { contains: search, mode: "insensitive" as const } } },
              { bien: { adresse: { contains: search, mode: "insensitive" as const } } },
              { bien: { commune: { contains: search, mode: "insensitive" as const } } },
            ],
          }
        : {},
      excludeColumn !== "statut" && statut?.length ? { statut: { in: statut } } : {},
    ],
  }
}

type EstimationSortKey = "date" | "statut"

function buildEstimationOrderBy(sort: string | undefined, dir: string | undefined) {
  const direction = dir === "desc" ? ("desc" as const) : ("asc" as const)
  switch (sort as EstimationSortKey) {
    case "statut":
      return [{ statut: direction }]
    case "date":
      return [{ submittedAt: direction }]
    default:
      return [{ submittedAt: "desc" as const }]
  }
}

export async function listEstimations(filters: EstimationListFilters = {}) {
  const { page = 1, sort, dir } = filters
  const where = buildEstimationWhere(filters)

  const [items, total] = await Promise.all([
    prisma.estimation.findMany({
      where,
      include: { contact: true, bien: true },
      orderBy: buildEstimationOrderBy(sort, dir),
      skip: (page - 1) * PAGE_SIZE,
      take: PAGE_SIZE,
    }),
    prisma.estimation.count({ where }),
  ])

  return toPageResult(items, total, page)
}
