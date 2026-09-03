import { cn } from "@/lib/utils"
import { SortableHeader } from "@/components/sortable-header"
import { ColumnFilter } from "@/components/column-filter"

// En-tête de colonne = libellé (triable ou non) + éventuel filtre "façon Excel".
// Encapsule le `<div flex>` répété dans chaque `<thead>` des pages liste.
export function FilterableHeader({
  label,
  sortKey,
  filterColumn,
  filterEndpoint,
  selected = [],
  labelMap,
  searchParams,
  currentSort,
  currentDir,
  align = "start",
}: {
  label: string
  sortKey?: string
  filterColumn?: string
  filterEndpoint?: string
  selected?: string[]
  labelMap?: Record<string, string>
  searchParams: Record<string, string | string[] | undefined>
  currentSort?: string
  currentDir?: string
  align?: "start" | "center"
}) {
  return (
    <div className={cn("flex items-center gap-1.5", align === "center" && "justify-center")}>
      {sortKey ? (
        <SortableHeader
          label={label}
          sortKey={sortKey}
          currentSort={currentSort}
          currentDir={currentDir}
          searchParams={searchParams}
        />
      ) : (
        <span>{label}</span>
      )}
      {filterColumn && (
        <ColumnFilter
          column={filterColumn}
          label={label}
          selected={selected}
          searchParams={searchParams}
          labelMap={labelMap}
          {...(filterEndpoint ? { endpoint: filterEndpoint } : {})}
        />
      )}
    </div>
  )
}
