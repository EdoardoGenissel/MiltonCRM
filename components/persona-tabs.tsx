import { FilterTabs } from "@/components/filter-tabs"
import { PERSONAS } from "@/lib/contacts/personas"

// Onglets "type de contact" — appel préconfiguré de FilterTabs.
export function PersonaTabs({
  searchParams,
}: {
  searchParams: Record<string, string | string[] | undefined>
}) {
  return <FilterTabs param="persona" options={PERSONAS} searchParams={searchParams} />
}
