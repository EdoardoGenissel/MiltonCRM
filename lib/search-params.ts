// Next.js App Router ne renvoie un tableau pour une clé de searchParams que si
// elle apparaît plusieurs fois dans l'URL (une seule occurrence -> string simple)
// - à normaliser systématiquement pour les filtres multi-valeurs (cf.
// components/column-filter.tsx).
export function toArray(value: string | string[] | undefined): string[] {
  if (!value) return []
  return Array.isArray(value) ? value : [value]
}

type SearchParamsRecord = Record<string, string | string[] | undefined>

type BuildQueryOptions = {
  // Clés retirées de l'URL résultante.
  drop?: string[]
  // Clés forcées à une valeur unique (undefined / "" -> retirée).
  set?: Record<string, string | undefined>
  // Clés recevant plusieurs valeurs (remplacent celles déjà présentes).
  append?: Record<string, string[]>
}

// Reconstruit une query string à partir des searchParams courants - recopie tout
// sauf `page` (toute navigation filtre/tri/recherche revient à la page 1) et les
// clés explicitement pilotées. Centralise le boilerplate répété dans
// sortable-header / pagination / filter-tabs / filter-bar / column-filter.
export function buildQuery(
  searchParams: SearchParamsRecord,
  { drop = [], set = {}, append = {} }: BuildQueryOptions = {},
): URLSearchParams {
  const managed = new Set([...drop, ...Object.keys(set), ...Object.keys(append)])
  const params = new URLSearchParams()

  for (const [key, value] of Object.entries(searchParams)) {
    if (key === "page" || managed.has(key)) continue
    for (const v of toArray(value)) params.append(key, v)
  }

  for (const [key, value] of Object.entries(set)) {
    if (value !== undefined && value !== "") params.set(key, value)
  }

  for (const [key, values] of Object.entries(append)) {
    for (const v of values) params.append(key, v)
  }

  return params
}
