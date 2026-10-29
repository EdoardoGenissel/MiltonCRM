import { PAGE_SIZE, toPageResult } from "@/lib/pagination"
import { VISITES, type Visite } from "@/lib/visites/data"
import { VISITE_STATUTS, VISITE_STATUT_LABELS } from "@/lib/visites/statuts"

export type VisiteFilterColumn = "typeBien" | "commune" | "categorie" | "conseiller" | "statut"

export const VISITE_FILTER_COLUMNS: VisiteFilterColumn[] = [
  "typeBien",
  "commune",
  "categorie",
  "conseiller",
  "statut",
]

export type VisiteListFilters = {
  search?: string
  typeBien?: string[]
  commune?: string[]
  categorie?: string[]
  conseiller?: string[]
  statut?: string[]
  page?: number
  sort?: string
  dir?: string
}

function normalize(value: string): string {
  return value
    .toLocaleLowerCase("fr-FR")
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "")
}

function matchesSearch(visite: Visite, search: string): boolean {
  const q = normalize(search.trim())
  if (!q) return true
  const { prenom, nom, telephone } = visite.visiteur
  const fields = [visite.adresse, visite.commune, visite.referenceProduit, `${prenom} ${nom}`]
  return (
    fields.some((field) => normalize(field).includes(q)) ||
    telephone.replace(/\s/g, "").includes(q.replace(/\s/g, ""))
  )
}

export function filterVisites(
  filters: VisiteListFilters,
  excludeColumn?: VisiteFilterColumn,
): Visite[] {
  return VISITES.filter((visite) => {
    if (filters.search && !matchesSearch(visite, filters.search)) return false
    return VISITE_FILTER_COLUMNS.every((column) => {
      if (column === excludeColumn) return true
      const selected = filters[column]
      return !selected?.length || selected.includes(visite[column])
    })
  })
}

export type VisiteSortKey =
  "date" | "typeBien" | "adresse" | "commune" | "visiteur" | "conseiller" | "statut"

const SORT_VALUE: Record<VisiteSortKey, (visite: Visite) => string> = {
  date: (v) => `${v.date}T${v.heure}`,
  typeBien: (v) => v.typeBien,
  adresse: (v) => v.adresse,
  commune: (v) => v.commune,
  visiteur: (v) => `${v.visiteur.nom} ${v.visiteur.prenom}`,
  conseiller: (v) => v.conseiller,
  statut: (v) => VISITE_STATUT_LABELS[v.statut],
}

function asSortKey(value: string | undefined): VisiteSortKey | undefined {
  return (Object.keys(SORT_VALUE) as VisiteSortKey[]).find((key) => key === value)
}

export function listVisites(filters: VisiteListFilters = {}) {
  const { page = 1, sort, dir } = filters
  const sortKey = asSortKey(sort)
  const descending = sortKey ? dir === "desc" : true
  const direction = descending ? -1 : 1
  const valueOf = SORT_VALUE[sortKey ?? "date"]

  const rows = filterVisites(filters).sort(
    (a, b) => direction * valueOf(a).localeCompare(valueOf(b), "fr", { numeric: true }),
  )
  const items = rows.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE)

  return toPageResult(items, rows.length, page)
}

export function listVisiteColumnValues(
  column: VisiteFilterColumn,
  filters: VisiteListFilters,
  q: string,
) {
  const present = new Set(filterVisites(filters, column).map((visite) => visite[column]))
  const ordered =
    column === "statut"
      ? VISITE_STATUTS.map((s) => s.value).filter((value) => present.has(value))
      : [...present].sort((a, b) => a.localeCompare(b, "fr"))

  const needle = normalize(q.trim())
  const values = ordered.filter((value) =>
    normalize(column === "statut" ? VISITE_STATUT_LABELS[value] : value).includes(needle),
  )
  return { values, hasMore: false }
}
