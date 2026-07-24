import Link from "next/link"
import { cn } from "@/lib/utils"
import { buildPageList, PAGE_SIZE } from "@/lib/pagination"

function paramsToArray(value: string | string[] | undefined): string[] {
  if (!value) return []
  return Array.isArray(value) ? value : [value]
}

export function Pagination({
  page,
  total,
  totalPages,
  searchParams,
}: {
  page: number
  total: number
  totalPages: number
  searchParams: Record<string, string | string[] | undefined>
}) {
  if (totalPages <= 1 && total <= PAGE_SIZE) return null

  function hrefForPage(target: number) {
    const params = new URLSearchParams()
    for (const [key, value] of Object.entries(searchParams)) {
      if (key === "page") continue
      for (const v of paramsToArray(value)) params.append(key, v)
    }
    if (target > 1) params.set("page", String(target))
    const qs = params.toString()
    return qs ? `?${qs}` : "?"
  }

  const linkClass = (disabled: boolean, active = false) =>
    cn(
      "flex h-8 min-w-8 items-center justify-center rounded-lg border px-2.5 text-sm font-medium",
      active
        ? "border-primary bg-primary text-primary-foreground"
        : "border-border text-foreground hover:bg-muted",
      disabled && "pointer-events-none opacity-40"
    )

  const from = total === 0 ? 0 : (page - 1) * PAGE_SIZE + 1
  const to = Math.min(page * PAGE_SIZE, total)
  const pageList = buildPageList(page, totalPages)

  return (
    <div className="mt-4 flex items-center justify-between">
      <span className="text-sm text-muted-foreground">
        Affichage {from}–{to} sur {total}
      </span>

      <div className="flex items-center gap-1.5">
        <Link href={hrefForPage(page - 1)} aria-disabled={page <= 1} className={linkClass(page <= 1)}>
          Précédent
        </Link>

        {pageList.map((item, i) =>
          item === "ellipsis" ? (
            <span key={`ellipsis-${i}`} className="px-1 text-sm text-muted-foreground">
              …
            </span>
          ) : (
            <Link key={item} href={hrefForPage(item)} className={linkClass(false, item === page)}>
              {item}
            </Link>
          )
        )}

        <Link
          href={hrefForPage(page + 1)}
          aria-disabled={page >= totalPages}
          className={linkClass(page >= totalPages)}
        >
          Suivant
        </Link>
      </div>
    </div>
  )
}
