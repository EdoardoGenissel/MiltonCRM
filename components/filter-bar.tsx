"use client"

import { useCallback, useEffect, useRef, useState, type ReactNode } from "react"
import { usePathname, useRouter } from "next/navigation"
import { Search, X } from "lucide-react"
import { buildQuery, toArray } from "@/lib/search-params"

type Chip = { key: string; value: string; label: string; ariaLabel: string }

// Délai entre la dernière frappe et la mise à jour de ?search=.
const SEARCH_DEBOUNCE_MS = 300

// Barre recherche + filtres actifs, partagée par toutes les pages liste
// (Contacts, Biens, Mandats, Estimations, Prospects). Tout passe par l'URL,
// cohérent avec SortableHeader / ColumnFilter / Pagination :
//  - la recherche se lance à la frappe (ou avec Entrée) et remplace ?search=…
//    en conservant les filtres colonne / le tri, sans empiler l'historique ;
//  - chaque filtre actif est affiché en "chip" retirable individuellement ;
//  - "Tout effacer" renvoie sur le pathname nu (hors `keepOnReset`).
export function FilterBar({
  searchParams,
  searchPlaceholder,
  filterKeys,
  keyLabels = {},
  valueLabels = {},
  tabs,
  filters,
  keepOnReset = [],
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
  // Rendu dans le champ de recherche, à droite (ex. bouton "Filtres" de Prospects).
  filters?: ReactNode
  // Clés conservées par "Tout effacer" (ex. l'onglet affiché, `vue`).
  keepOnReset?: string[]
}) {
  const router = useRouter()
  const pathname = usePathname()
  const currentSearch = toArray(searchParams.search)[0] ?? ""
  const [search, setSearch] = useState(currentSearch)
  // Dernière valeur envoyée dans l'URL : son retour (re-rendu serveur) ne doit
  // pas écraser ce que l'utilisateur a tapé entre-temps.
  const [sent, setSent] = useState(currentSearch)
  const [prevSearch, setPrevSearch] = useState(currentSearch)
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null)

  // ?search= modifié de l'extérieur (pastille retirée, "Tout effacer", onglet,
  // navigation arrière) : le champ suit.
  if (currentSearch !== prevSearch) {
    setPrevSearch(currentSearch)
    if (currentSearch !== sent) {
      setSent(currentSearch)
      setSearch(currentSearch)
    }
  }

  function push(params: URLSearchParams) {
    const qs = params.toString()
    router.push(qs ? `${pathname}?${qs}` : pathname)
  }

  const replaceSearch = useCallback(
    (value: string) => {
      setSent(value)
      const qs = buildQuery(searchParams, { set: { search: value || undefined } }).toString()
      router.replace(qs ? `${pathname}?${qs}` : pathname, { scroll: false })
    },
    [searchParams, pathname, router],
  )

  useEffect(() => {
    const value = search.trim()
    if (value === currentSearch) return
    timer.current = setTimeout(() => replaceSearch(value), SEARCH_DEBOUNCE_MS)
    return () => {
      if (timer.current) clearTimeout(timer.current)
    }
  }, [search, currentSearch, replaceSearch])

  function submitSearch(e: React.FormEvent) {
    e.preventDefault()
    if (timer.current) clearTimeout(timer.current)
    const value = search.trim()
    if (value !== currentSearch) replaceSearch(value)
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
    chips.push({
      key: "search",
      value: currentSearch,
      label: `« ${currentSearch} »`,
      ariaLabel: `Retirer la recherche « ${currentSearch} »`,
    })
  }
  for (const key of filterKeys) {
    for (const value of toArray(searchParams[key])) {
      const label = `${keyLabels[key] ?? key} : ${valueLabels[key]?.[value] ?? value}`
      chips.push({ key, value, label, ariaLabel: `Retirer le filtre ${label}` })
    }
  }

  return (
    <div className="mb-4">
      <div className="flex flex-wrap items-end justify-between gap-3">
        {tabs ?? <span />}

        <form
          onSubmit={submitSearch}
          role="search"
          className="flex h-10 w-full items-center gap-2 rounded-md border border-border bg-card pr-1 pl-3 transition-[box-shadow,border-color] focus-within:border-ring focus-within:ring-3 focus-within:ring-ring/50 md:w-[420px]"
        >
          <Search aria-hidden className="h-4 w-4 shrink-0 text-muted-foreground" />
          <input
            type="search"
            name="search"
            aria-label="Rechercher"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder={searchPlaceholder}
            className="h-full min-w-0 flex-1 bg-transparent text-sm text-foreground outline-none placeholder:text-muted-foreground"
          />
          {filters && (
            <>
              <span aria-hidden className="h-5 w-px shrink-0 bg-border" />
              {filters}
            </>
          )}
        </form>
      </div>

      {chips.length > 0 && (
        <div className="mt-3 flex flex-wrap items-center gap-2">
          {chips.map((chip) => (
            <button
              key={`${chip.key}:${chip.value}`}
              type="button"
              onClick={() => removeChip(chip)}
              aria-label={chip.ariaLabel}
              className="inline-flex h-7 items-center gap-1.5 rounded-full border border-border bg-card pr-2 pl-2.5 text-xs font-medium text-foreground transition-colors hover:bg-muted focus-visible:ring-3 focus-visible:ring-ring/50 focus-visible:outline-none"
            >
              {chip.label}
              <X aria-hidden className="h-3 w-3 text-muted-foreground" />
            </button>
          ))}
          <button
            type="button"
            onClick={() =>
              push(
                buildQuery(Object.fromEntries(keepOnReset.map((key) => [key, searchParams[key]]))),
              )
            }
            className="rounded-md text-xs font-medium text-muted-foreground transition-colors hover:text-foreground focus-visible:ring-3 focus-visible:ring-ring/50 focus-visible:outline-none"
          >
            Tout effacer
          </button>
        </div>
      )}
    </div>
  )
}
