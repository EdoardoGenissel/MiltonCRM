import Link from "next/link"
import { ArrowDown, ArrowUp, ArrowUpDown } from "lucide-react"
import { cn } from "@/lib/utils"
import { buildQuery } from "@/lib/search-params"

// Tri "à la Excel" en cliquant l'en-tête de colonne - pas d'état client, tout
// passe par l'URL (?sort=...&dir=...), cohérent avec le pattern déjà utilisé pour
// les filtres et la pagination (cf. components/pagination.tsx).
export function SortableHeader({
  label,
  sortKey,
  currentSort,
  currentDir,
  searchParams,
}: {
  label: string
  sortKey: string
  currentSort?: string
  currentDir?: string
  searchParams: Record<string, string | string[] | undefined>
}) {
  const isActive = currentSort === sortKey
  const nextDir = isActive && currentDir !== "desc" ? "desc" : "asc"

  const params = buildQuery(searchParams, { set: { sort: sortKey, dir: nextDir } })

  const Icon = !isActive ? ArrowUpDown : currentDir === "desc" ? ArrowDown : ArrowUp

  return (
    <Link
      href={`?${params.toString()}`}
      className={cn(
        "inline-flex items-center gap-1 hover:text-foreground",
        isActive && "text-foreground",
      )}
    >
      {label}
      <Icon className={cn("h-3 w-3", !isActive && "opacity-40")} />
    </Link>
  )
}
