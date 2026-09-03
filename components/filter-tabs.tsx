import Link from "next/link"
import { cn } from "@/lib/utils"
import { buildQuery, toArray } from "@/lib/search-params"

// Filtre mono-valeur présenté en onglets (un seul actif à la fois), tout passe
// par l'URL (?<param>=...) — même logique que le tri (cf.
// components/sortable-header.tsx). Générique : `PersonaTabs` n'en est plus qu'un
// appel préconfiguré.
export function FilterTabs({
  param,
  options,
  allLabel = "Tous",
  searchParams,
}: {
  param: string
  options: readonly { value: string; label: string }[]
  allLabel?: string
  searchParams: Record<string, string | string[] | undefined>
}) {
  const active = toArray(searchParams[param])[0] ?? ""
  const tabs = [{ value: "", label: allLabel }, ...options]

  return (
    <div className="flex items-center gap-1 border-b border-border">
      {tabs.map((tab) => {
        const isActive = tab.value === active
        const params = buildQuery(searchParams, { set: { [param]: tab.value || undefined } })

        return (
          <Link
            key={tab.label}
            href={`?${params.toString()}`}
            className={cn(
              "relative px-3 py-2 text-sm font-medium transition-colors after:absolute after:inset-x-0 after:-bottom-px after:h-0.5 after:rounded-full after:opacity-0 after:transition-opacity",
              isActive
                ? "text-foreground after:bg-foreground after:opacity-100"
                : "text-foreground/60 hover:text-foreground",
            )}
          >
            {tab.label}
          </Link>
        )
      })}
    </div>
  )
}
