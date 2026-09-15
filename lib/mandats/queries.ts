import { prisma } from "@/lib/db/prisma"
import { Source } from "@/lib/generated/prisma/enums"
import { PAGE_SIZE, toPageResult } from "@/lib/pagination"

export type MandatFilterColumn = "type" | "statut" | "categorie" | "source"

export type MandatListFilters = {
  search?: string
  type?: string[]
  statut?: string[]
  categorie?: string[]
  source?: string[]
  page?: number
  sort?: string
  dir?: string
}

function asSource(value: string): Source | undefined {
  return (Object.values(Source) as string[]).includes(value) ? (value as Source) : undefined
}

// Même logique que `buildContactWhere`/`buildBienWhere` - `excludeColumn` pour
// que l'API de valeurs uniques d'une colonne reflète les filtres déjà posés sur
// les *autres* colonnes. La recherche texte porte sur le bien et le propriétaire
// (le mandat lui-même n'a pas de champ "libellé").
export function buildMandatWhere(filters: MandatListFilters, excludeColumn?: MandatFilterColumn) {
  const { search, type, statut, categorie, source } = filters
  const validSources = (source ?? []).map(asSource).filter((s): s is Source => Boolean(s))

  return {
    AND: [
      search
        ? {
            OR: [
              { bien: { adresse: { contains: search, mode: "insensitive" as const } } },
              { bien: { commune: { contains: search, mode: "insensitive" as const } } },
              { proprietaire: { nom: { contains: search, mode: "insensitive" as const } } },
              { proprietaire: { prenom: { contains: search, mode: "insensitive" as const } } },
            ],
          }
        : {},
      excludeColumn !== "type" && type?.length ? { type: { in: type } } : {},
      excludeColumn !== "statut" && statut?.length ? { statut: { in: statut } } : {},
      excludeColumn !== "categorie" && categorie?.length ? { categorie: { in: categorie } } : {},
      excludeColumn !== "source" && validSources.length ? { source: { in: validSources } } : {},
    ],
  }
}

export type MandatSortKey = "type" | "statut" | "categorie" | "source"

const SORT_KEYS: MandatSortKey[] = ["type", "statut", "categorie", "source"]

function asSortKey(value: string | undefined): MandatSortKey | undefined {
  return SORT_KEYS.find((key) => key === value)
}

export function buildMandatOrderBy(sort: string | undefined, dir: string | undefined) {
  const direction = dir === "desc" ? ("desc" as const) : ("asc" as const)
  switch (asSortKey(sort)) {
    case "type":
      return [{ type: direction }]
    case "statut":
      return [{ statut: direction }]
    case "categorie":
      return [{ categorie: direction }]
    case "source":
      return [{ source: direction }]
    default:
      return [{ updatedAt: "desc" as const }]
  }
}

export function getMandatById(id: string) {
  return prisma.mandat.findUnique({
    where: { id },
    include: { proprietaire: true, locataire: true, bien: true },
  })
}

export async function listMandats(filters: MandatListFilters = {}) {
  const { page = 1, sort, dir } = filters
  const where = buildMandatWhere(filters)

  const [items, total] = await prisma.$transaction([
    prisma.mandat.findMany({
      where,
      include: { proprietaire: true, locataire: true, bien: true },
      orderBy: buildMandatOrderBy(sort, dir),
      skip: (page - 1) * PAGE_SIZE,
      take: PAGE_SIZE,
    }),
    prisma.mandat.count({ where }),
  ])

  return toPageResult(items, total, page)
}
