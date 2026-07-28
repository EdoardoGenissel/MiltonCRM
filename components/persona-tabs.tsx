import Link from "next/link"
import { cn } from "@/lib/utils"
import { PERSONAS } from "@/lib/contacts/personas"

function paramsToArray(value: string | string[] | undefined): string[] {
  if (!value) return []
  return Array.isArray(value) ? value : [value]
}

const TABS = [{ value: "", label: "Tous" }, ...PERSONAS]

// Filtre "type de contact" en tabs plutôt qu'en case à cocher multi-select
// (cf. ColumnFilter) : un seul persona actif à la fois, tout passe par l'URL
// (?persona=...), même logique que le tri (cf. components/sortable-header.tsx).
export function PersonaTabs({
  searchParams,
}: {
  searchParams: Record<string, string | string[] | undefined>
}) {
  const active = paramsToArray(searchParams.persona)[0] ?? ""

  return (
    <div className="flex items-center gap-1">
      {TABS.map((tab) => {
        const isActive = tab.value === active

        const params = new URLSearchParams()
        for (const [key, value] of Object.entries(searchParams)) {
          if (key === "persona" || key === "page") continue
          for (const v of paramsToArray(value)) params.append(key, v)
        }
        if (tab.value) params.set("persona", tab.value)

        return (
          <Link
            key={tab.label}
            href={`?${params.toString()}`}
            className={cn(
              "rounded-[8px] px-3 py-1.5 text-sm font-medium transition-colors",
              isActive
                ? "bg-primary text-primary-foreground"
                : "text-muted-foreground hover:bg-muted hover:text-foreground"
            )}
          >
            {tab.label}
          </Link>
        )
      })}
    </div>
  )
}
