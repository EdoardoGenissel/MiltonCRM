import { prisma } from "@/lib/db/prisma"
import { Source } from "@/lib/generated/prisma/enums"
import { PAGE_SIZE, toPageResult } from "@/lib/pagination"

export type BienFilterColumn = "commune" | "typeBien" | "statut" | "source" | "categorie"

export type BienListFilters = {
  search?: string
  commune?: string[]
  typeBien?: string[]
  statut?: string[]
  source?: string[]
  categorie?: string[]
  page?: number
  sort?: string
  dir?: string
}

function asSource(value: string): Source | undefined {
  return (Object.values(Source) as string[]).includes(value) ? (value as Source) : undefined
}

// Même logique que `buildContactWhere` (cf. lib/contacts/queries.ts) : un
// `excludeColumn` pour que l'API de valeurs uniques d'une colonne reflète les
// filtres déjà posés sur les *autres* colonnes. `categorie` vit sur `Mandat`
// (pas sur `Bien`, cf. décision de modélisation dans run-import-biens.ts), d'où
// le filtre via la relation.
export function buildBienWhere(filters: BienListFilters, excludeColumn?: BienFilterColumn) {
  const { search, commune, typeBien, statut, source, categorie } = filters
  const validSources = (source ?? []).map(asSource).filter((s): s is Source => Boolean(s))

  return {
    AND: [
      search
        ? {
            OR: [
              { adresse: { contains: search, mode: "insensitive" as const } },
              { commune: { contains: search, mode: "insensitive" as const } },
              { titre: { contains: search, mode: "insensitive" as const } },
              { referenceProduit: { contains: search, mode: "insensitive" as const } },
            ],
          }
        : {},
      excludeColumn !== "commune" && commune?.length ? { commune: { in: commune } } : {},
      excludeColumn !== "typeBien" && typeBien?.length ? { typeBien: { in: typeBien } } : {},
      excludeColumn !== "statut" && statut?.length ? { statut: { in: statut } } : {},
      excludeColumn !== "source" && validSources.length ? { source: { in: validSources } } : {},
      excludeColumn !== "categorie" && categorie?.length
        ? { mandats: { some: { categorie: { in: categorie } } } }
        : {},
    ],
  }
}

export type BienSortKey = "adresse" | "commune" | "typeBien" | "surface" | "prix" | "statut"

const SORT_KEYS: BienSortKey[] = ["adresse", "commune", "typeBien", "surface", "prix", "statut"]

function asSortKey(value: string | undefined): BienSortKey | undefined {
  return SORT_KEYS.find((key) => key === value)
}

export function buildBienOrderBy(sort: string | undefined, dir: string | undefined) {
  const direction = dir === "desc" ? ("desc" as const) : ("asc" as const)
  switch (asSortKey(sort)) {
    case "adresse":
      return [{ adresse: direction }]
    case "commune":
      return [{ commune: direction }]
    case "typeBien":
      return [{ typeBien: direction }]
    case "surface":
      return [{ surface: direction }]
    case "prix":
      return [{ prix: direction }]
    case "statut":
      return [{ statut: direction }]
    default:
      return [{ updatedAt: "desc" as const }]
  }
}

export async function listBiens(filters: BienListFilters = {}) {
  const { page = 1, sort, dir } = filters
  const where = buildBienWhere(filters)

  const [items, total] = await prisma.$transaction([
    prisma.bien.findMany({
      where,
      include: { mandats: { include: { proprietaire: true }, orderBy: { updatedAt: "desc" }, take: 1 } },
      orderBy: buildBienOrderBy(sort, dir),
      skip: (page - 1) * PAGE_SIZE,
      take: PAGE_SIZE,
    }),
    prisma.bien.count({ where }),
  ])

  return toPageResult(items, total, page)
}

export function getBienById(id: string) {
  return prisma.bien.findUnique({
    where: { id },
    include: {
      mandats: { include: { proprietaire: true }, orderBy: { updatedAt: "desc" } },
      estimations: { include: { contact: true }, orderBy: { createdAt: "desc" } },
    },
  })
}
