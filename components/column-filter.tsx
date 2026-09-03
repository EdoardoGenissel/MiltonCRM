"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { Popover } from "@base-ui/react/popover"
import { ListFilter } from "lucide-react"
import { cn } from "@/lib/utils"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { buildQuery } from "@/lib/search-params"

type ColumnValuesResponse = { values?: string[]; hasMore?: boolean; error?: string }

// Filtre "à la Excel" pour un en-tête de colonne : popover avec recherche +
// cases à cocher sur les valeurs uniques réellement présentes (cf.
// app/api/contacts/column-values), sélection appliquée seulement au clic
// "Appliquer" (pas de navigation à chaque coche).
export function ColumnFilter({
  column,
  label,
  selected,
  searchParams,
  labelMap,
  endpoint = "/api/contacts/column-values",
}: {
  column: string
  label: string
  selected: string[]
  searchParams: Record<string, string | string[] | undefined>
  // Un Server Component ne peut pas passer de fonction à un Client Component
  // (non sérialisable à travers la frontière RSC) — une table de correspondance
  // simple fait le même travail (cf. lib/contacts/personas.ts, lib/contacts/sources.ts).
  labelMap?: Record<string, string>
  // Réutilisé par les pages Biens/Mandats (cf. app/api/biens/column-values,
  // app/api/mandats/column-values) — même popover, autre source de valeurs.
  endpoint?: string
}) {
  const router = useRouter()
  const [open, setOpen] = useState(false)
  const [query, setQuery] = useState("")
  const [values, setValues] = useState<string[]>([])
  const [hasMore, setHasMore] = useState(false)
  const [loading, setLoading] = useState(false)
  const [pending, setPending] = useState<Set<string>>(new Set(selected))

  // Réinitialise le brouillon de sélection et la recherche à l'ouverture — fait
  // dans le handler d'ouverture (pas un effet) : setState y est un événement
  // utilisateur normal, pas une synchronisation avec un système externe.
  function handleOpenChange(next: boolean) {
    setOpen(next)
    if (next) {
      setPending(new Set(selected))
      setQuery("")
    }
  }

  useEffect(() => {
    if (!open) return
    let cancelled = false
    // eslint-disable-next-line react-hooks/set-state-in-effect -- effet de fetch classique (débounce), setLoading avant l'appel réseau est le comportement attendu.
    setLoading(true)

    const timeout = setTimeout(async () => {
      const params = buildQuery(searchParams, {
        drop: ["sort", "dir"],
        set: { column, q: query || undefined },
      })

      try {
        const res = await fetch(`${endpoint}?${params.toString()}`)
        const data: ColumnValuesResponse = await res.json()
        if (!cancelled) {
          setValues(data.values ?? [])
          setHasMore(data.hasMore ?? false)
        }
      } catch {
        if (!cancelled) {
          setValues([])
          setHasMore(false)
        }
      } finally {
        if (!cancelled) setLoading(false)
      }
    }, 200)

    return () => {
      cancelled = true
      clearTimeout(timeout)
    }
  }, [open, query, column, searchParams, endpoint])

  function toggle(value: string) {
    setPending((prev) => {
      const next = new Set(prev)
      if (next.has(value)) next.delete(value)
      else next.add(value)
      return next
    })
  }

  function apply() {
    const params = buildQuery(searchParams, { append: { [column]: [...pending] } })
    setOpen(false)
    router.push(`?${params.toString()}`)
  }

  const isActive = selected.length > 0

  return (
    <Popover.Root open={open} onOpenChange={handleOpenChange}>
      <Popover.Trigger
        className={cn(
          "rounded p-0.5 text-muted-foreground hover:text-foreground",
          isActive && "text-primary"
        )}
        aria-label={`Filtrer ${label}`}
      >
        <ListFilter className="h-3.5 w-3.5" />
      </Popover.Trigger>
      <Popover.Portal>
        <Popover.Positioner sideOffset={6} align="start">
          <Popover.Popup className="w-64 rounded-[8px] border border-border bg-popover p-3 text-popover-foreground shadow-lg">
            <Input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Rechercher…"
              className="mb-2 h-8"
              autoFocus
            />

            <div className="mb-2 flex items-center justify-between text-xs">
              <button
                type="button"
                className="text-primary hover:underline"
                onClick={() => setPending(new Set(values))}
              >
                Tout sélectionner
              </button>
              <button
                type="button"
                className="text-muted-foreground hover:text-foreground"
                onClick={() => setPending(new Set())}
              >
                Effacer
              </button>
            </div>

            <div className="max-h-56 overflow-auto rounded-[8px] border border-border">
              {loading && <p className="p-3 text-xs text-muted-foreground">Chargement…</p>}
              {!loading && values.length === 0 && (
                <p className="p-3 text-xs text-muted-foreground">Aucune valeur.</p>
              )}
              {!loading &&
                values.map((value) => (
                  <label
                    key={value}
                    className="flex cursor-pointer items-center gap-2 px-2.5 py-1.5 text-sm hover:bg-muted"
                  >
                    <input
                      type="checkbox"
                      checked={pending.has(value)}
                      onChange={() => toggle(value)}
                      className="h-3.5 w-3.5 rounded border-input"
                    />
                    <span className="truncate">{labelMap?.[value] ?? value}</span>
                  </label>
                ))}
            </div>

            {hasMore && (
              <p className="mt-1.5 text-xs text-muted-foreground">
                Plus de {values.length} résultats - affinez la recherche.
              </p>
            )}

            <div className="mt-3 flex justify-end gap-2">
              <Button type="button" variant="ghost" size="lg" onClick={() => setOpen(false)}>
                Annuler
              </Button>
              <Button type="button" size="lg" onClick={apply}>
                Appliquer
              </Button>
            </div>
          </Popover.Popup>
        </Popover.Positioner>
      </Popover.Portal>
    </Popover.Root>
  )
}
