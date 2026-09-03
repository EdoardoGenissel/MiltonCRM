"use client"

import { useState, type ReactNode } from "react"
import { usePathname, useRouter } from "next/navigation"
import { RotateCcw, Search, X } from "lucide-react"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { buildQuery, toArray } from "@/lib/search-params"

type Chip = { key: string; value: string; label: string }

// Barre recherche + filtres actifs, partagée par toutes les pages liste
// (Contacts, Biens, Mandats, Estimations). Tout passe par l'URL, cohérent avec
// SortableHeader / ColumnFilter / Pagination :
//  - la recherche pousse ?search=… en conservant les filtres colonne / le tri ;
//  - chaque filtre actif est affiché en "chip" retirable individuellement ;
//  - "Réinitialiser" renvoie sur le pathname nu.
export function FilterBar({
  searchParams,
  searchPlaceholder,
  filterKeys,
  keyLabels = {},
  valueLabels = {},
  tabs,
}: {
  searchParams: Record<string, string | string[] | undefined>
  searchPlaceholder: string
  // Clés de query considérées comme "filtre" -> chips retirables + bouton reset.
  filterKeys: string[]
  // Libellé affiché pour une clé (ex. { nom: "Nom", typeBien: "Type" }).
  keyLabels?: Record<string, string>
  // Libellé affiché pour une valeur, par clé (ex. { persona: PERSONA_LABELS }).
  valueLabels?: Record<string, Record<string, string>>
  tabs?: ReactNode
}) {
  const router = useRouter()
  const pathname = usePathname()
  const currentSearch = toArray(searchParams.search)[0] ?? ""
  const [search, setSearch] = useState(currentSearch)

  function push(params: URLSearchParams) {
    const qs = params.toString()
    router.push(qs ? `${pathname}?${qs}` : pathname)
  }

  function submitSearch(e: React.FormEvent) {
    e.preventDefault()
    push(buildQuery(searchParams, { set: { search: search.trim() || undefined } }))
  }

  function removeChip(chip: Chip) {
    if (chip.key === "search") {
      push(buildQuery(searchParams, { set: { search: undefined } }))
      return
    }
    const kept = toArray(searchParams[chip.key]).filter((v) => v !== chip.value)
    push(buildQuery(searchParams, { append: { [chip.key]: kept } }))
  }

  const chips: Chip[] = []
  if (currentSearch) {
    chips.push({ key: "search", value: currentSearch, label: `« ${currentSearch} »` })
  }
  for (const key of filterKeys) {
    for (const value of toArray(searchParams[key])) {
      chips.push({
        key,
        value,
        label: `${keyLabels[key] ?? key} : ${valueLabels[key]?.[value] ?? value}`,
      })
    }
  }

  return (
    <div className="mb-4 flex flex-col gap-3">
      <div className="flex flex-wrap items-end justify-between gap-3">
        {tabs ?? <span />}

        <form onSubmit={submitSearch} className="flex items-end gap-2">
          <div className="relative">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              name="search"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder={searchPlaceholder}
              className="w-72 pl-9"
            />
          </div>
          <Button type="submit">Rechercher</Button>
        </form>
      </div>

      {chips.length > 0 && (
        <div className="flex flex-wrap items-center gap-2">
          {chips.map((chip) => (
            <button
              key={`${chip.key}:${chip.value}`}
              type="button"
              onClick={() => removeChip(chip)}
              className="inline-flex items-center gap-1.5 rounded-full border border-border bg-muted/60 py-1 pl-2.5 pr-2 text-xs font-medium text-foreground hover:bg-muted"
            >
              {chip.label}
              <X className="h-3 w-3 text-muted-foreground" />
            </button>
          ))}
          <Button
            variant="ghost"
            size="sm"
            onClick={() => router.push(pathname)}
            className="text-muted-foreground"
          >
            <RotateCcw className="h-3.5 w-3.5" />
            Réinitialiser
          </Button>
        </div>
      )}
    </div>
  )
}
