export const PAGE_SIZE = 50

export type PageResult<T> = {
  items: T[]
  total: number
  page: number
  pageSize: number
  totalPages: number
}

export function parsePage(value: string | undefined): number {
  const n = Number(value)
  return Number.isInteger(n) && n > 0 ? n : 1
}

export function toPageResult<T>(items: T[], total: number, page: number): PageResult<T> {
  return {
    items,
    total,
    page,
    pageSize: PAGE_SIZE,
    totalPages: Math.max(1, Math.ceil(total / PAGE_SIZE)),
  }
}

export type PageListItem = number | "ellipsis"

// Liste de numéros de page à afficher façon "1 2 3 … 12" : toujours la première,
// la dernière, la page courante et ses voisines immédiates — "ellipsis" pour les
// trous, plutôt que d'afficher les dizaines de pages intermédiaires.
export function buildPageList(current: number, total: number): PageListItem[] {
  if (total <= 1) return [1]

  const pages = new Set<number>([1, total, current, current - 1, current + 1])
  const sorted = [...pages].filter((p) => p >= 1 && p <= total).sort((a, b) => a - b)

  const result: PageListItem[] = []
  for (let i = 0; i < sorted.length; i++) {
    if (i > 0 && sorted[i] - sorted[i - 1] > 1) result.push("ellipsis")
    result.push(sorted[i])
  }
  return result
}
