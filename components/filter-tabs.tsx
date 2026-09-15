import { TabStrip } from "@/components/ui/tab-strip"
import { buildQuery, toArray } from "@/lib/search-params"

// Filtre mono-valeur présenté en onglets (un seul actif à la fois), tout passe
// par l'URL (?<param>=...) - même logique que le tri (cf.
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
    <TabStrip
      items={tabs.map((tab) => ({
        key: tab.label,
        label: tab.label,
        active: tab.value === active,
        href: `?${buildQuery(searchParams, { set: { [param]: tab.value || undefined } }).toString()}`,
      }))}
    />
  )
}
