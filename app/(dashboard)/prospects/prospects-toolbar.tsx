"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { Popover } from "@base-ui/react/popover"
import { ListFilter } from "lucide-react"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"
import { buildQuery, toArray } from "@/lib/search-params"
import { HISTORY_STATUTS, PERIODES } from "@/lib/prospects-mail/filters"

type Params = Record<string, string | string[] | undefined>
type Draft = { periode: string; statut: string[]; boite: string[]; par: string[] }

function readDraft(params: Params): Draft {
  return {
    periode: toArray(params.periode)[0] ?? "",
    statut: toArray(params.statut),
    boite: toArray(params.boite),
    par: toArray(params.par),
  }
}

function CheckList({
  options,
  selected,
  onChange,
}: {
  options: { value: string; label: string }[]
  selected: string[]
  onChange: (next: string[]) => void
}) {
  return (
    <div className="flex flex-col">
      {options.map((option) => (
        <label
          key={option.value}
          className="flex cursor-pointer items-center gap-2 rounded px-2 py-1.5 text-sm hover:bg-muted"
        >
          <input
            type="checkbox"
            className="h-3.5 w-3.5 rounded border-input"
            checked={selected.includes(option.value)}
            onChange={(e) =>
              onChange(
                e.target.checked
                  ? [...selected, option.value]
                  : selected.filter((v) => v !== option.value),
              )
            }
          />
          <span className="truncate">{option.label}</span>
        </label>
      ))}
    </div>
  )
}

function Group({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <fieldset className="flex flex-col">
      <legend className="mb-1.5 text-xs font-medium text-muted-foreground">{title}</legend>
      {children}
    </fieldset>
  )
}

// Bouton "Filtres" de la page Prospects, logé dans l'emplacement gauche de
// FilterBar (qui garde la recherche, les pastilles "Clé : valeur" et
// "Réinitialiser" communes aux pages liste). Même comportement que
// ColumnFilter : brouillon local, appliqué au clic sur "Appliquer".
export function FiltersButton({
  searchParams,
  facets,
}: {
  searchParams: Params
  facets: { boites: string[]; par: string[] }
}) {
  const router = useRouter()
  const [open, setOpen] = useState(false)
  const [draft, setDraft] = useState<Draft>(() => readDraft(searchParams))

  const applied = readDraft(searchParams)
  const activeCount =
    (applied.periode ? 1 : 0) + applied.statut.length + applied.boite.length + applied.par.length

  function handleOpenChange(next: boolean) {
    setOpen(next)
    if (next) setDraft(readDraft(searchParams))
  }

  function apply() {
    setOpen(false)
    const params = buildQuery(searchParams, {
      drop: ["hl"],
      set: { periode: draft.periode || undefined },
      append: { statut: draft.statut, boite: draft.boite, par: draft.par },
    })
    router.push(`?${params.toString()}`)
  }

  return (
    <Popover.Root open={open} onOpenChange={handleOpenChange}>
      <Popover.Trigger render={<Button variant="outline" />}>
        <ListFilter className={cn(activeCount > 0 && "text-primary")} />
        Filtres
        {activeCount > 0 && (
          <span className="text-muted-foreground tabular-nums">({activeCount})</span>
        )}
      </Popover.Trigger>
      <Popover.Portal>
        <Popover.Positioner sideOffset={6} align="start">
          <Popover.Popup className="w-72 rounded-md border border-border bg-popover p-3 text-popover-foreground shadow-lg">
            <div className="flex max-h-[60vh] flex-col gap-4 overflow-auto">
              <Group title="Reçus depuis">
                <div className="grid grid-cols-4 gap-1 rounded-md bg-muted p-1">
                  {[{ value: "", label: "Tout" }, ...PERIODES].map((p) => (
                    <button
                      key={p.value || "all"}
                      type="button"
                      aria-pressed={draft.periode === p.value}
                      onClick={() => setDraft({ ...draft, periode: p.value })}
                      className={cn(
                        "rounded px-2 py-1 text-xs font-medium transition-colors focus-visible:ring-2 focus-visible:ring-ring/50 focus-visible:outline-none",
                        draft.periode === p.value
                          ? "bg-card text-foreground shadow-sm"
                          : "text-muted-foreground hover:text-foreground",
                      )}
                    >
                      {p.value ? `${p.value} j` : p.label}
                    </button>
                  ))}
                </div>
              </Group>

              <Group title="Statut (historique)">
                <CheckList
                  options={HISTORY_STATUTS.map((s) => ({ value: s.value, label: s.label }))}
                  selected={draft.statut}
                  onChange={(statut) => setDraft({ ...draft, statut })}
                />
              </Group>

              {facets.boites.length > 1 && (
                <Group title="Boîte mail">
                  <CheckList
                    options={facets.boites.map((b) => ({ value: b, label: b }))}
                    selected={draft.boite}
                    onChange={(boite) => setDraft({ ...draft, boite })}
                  />
                </Group>
              )}

              {facets.par.length > 0 && (
                <Group title="Traité par (historique)">
                  <CheckList
                    options={facets.par.map((p) => ({ value: p, label: p.split("@")[0] }))}
                    selected={draft.par}
                    onChange={(par) => setDraft({ ...draft, par })}
                  />
                </Group>
              )}
            </div>

            <div className="mt-3 flex items-center justify-between gap-2 border-t border-border pt-3">
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="text-muted-foreground"
                onClick={() => setDraft({ periode: "", statut: [], boite: [], par: [] })}
              >
                Effacer
              </Button>
              <div className="flex gap-2">
                <Button type="button" variant="ghost" onClick={() => setOpen(false)}>
                  Annuler
                </Button>
                <Button type="button" onClick={apply}>
                  Appliquer
                </Button>
              </div>
            </div>
          </Popover.Popup>
        </Popover.Positioner>
      </Popover.Portal>
    </Popover.Root>
  )
}
