import { CalendarDays } from "lucide-react"
import { Topbar } from "@/components/topbar"
import { TableCard, TableHeadRow, TableEmpty } from "@/components/ui/data-table"
import { Pagination } from "@/components/pagination"
import { FilterBar } from "@/components/filter-bar"
import { FilterableHeader } from "@/components/filterable-header"
import { FilterTabs } from "@/components/filter-tabs"
import { BienType } from "@/components/bien-type"
import { VisiteRetourBadge, VisiteStatutBadge } from "@/components/visite-badges"
import { listVisites } from "@/lib/visites/queries"
import { VISITE_STATUT_LABELS } from "@/lib/visites/statuts"
import { parsePage } from "@/lib/pagination"
import { toArray } from "@/lib/search-params"

export const dynamic = "force-dynamic"

type VisitesSearchParams = {
  search?: string
  typeBien?: string | string[]
  commune?: string | string[]
  categorie?: string | string[]
  conseiller?: string | string[]
  statut?: string | string[]
  page?: string
  sort?: string
  dir?: string
}

const ENDPOINT = "/api/visites/column-values"
const FILTER_KEYS = ["typeBien", "commune", "conseiller", "statut"]
const KEY_LABELS = {
  typeBien: "Type",
  commune: "Commune",
  conseiller: "Conseiller",
  statut: "Statut",
}
const CATEGORIES = [
  { value: "Vente", label: "Vente" },
  { value: "Location", label: "Location" },
]

function jourLabel(date: string): string {
  return new Date(`${date}T12:00:00Z`).toLocaleDateString("fr-FR", {
    weekday: "short",
    day: "numeric",
    month: "short",
    timeZone: "UTC",
  })
}

export default async function VisitesPage({
  searchParams,
}: {
  searchParams: Promise<VisitesSearchParams>
}) {
  const params = await searchParams
  const page = parsePage(params.page)
  const filters = {
    search: params.search,
    typeBien: toArray(params.typeBien),
    commune: toArray(params.commune),
    categorie: toArray(params.categorie),
    conseiller: toArray(params.conseiller),
    statut: toArray(params.statut),
    sort: params.sort,
    dir: params.dir,
    page,
  }
  const { items: visites, total, totalPages } = listVisites(filters)

  return (
    <>
      <Topbar title="Visites" />
      <div className="flex-1 overflow-auto p-8">
        <FilterBar
          searchParams={params}
          searchPlaceholder="Visiteur, adresse, référence…"
          filterKeys={FILTER_KEYS}
          keyLabels={KEY_LABELS}
          valueLabels={{ statut: VISITE_STATUT_LABELS }}
          tabs={
            <FilterTabs
              param="categorie"
              options={CATEGORIES}
              allLabel="Toutes"
              searchParams={params}
            />
          }
        />

        <TableCard>
          <TableHeadRow>
            <th className="px-5 py-3">
              <FilterableHeader
                label="Date"
                sortKey="date"
                searchParams={params}
                currentSort={params.sort}
                currentDir={params.dir}
              />
            </th>
            <th className="px-5 py-3">
              <FilterableHeader
                label="Type"
                sortKey="typeBien"
                filterColumn="typeBien"
                filterEndpoint={ENDPOINT}
                selected={filters.typeBien}
                searchParams={params}
                currentSort={params.sort}
                currentDir={params.dir}
              />
            </th>
            <th className="px-5 py-3">
              <FilterableHeader
                label="Bien"
                sortKey="adresse"
                searchParams={params}
                currentSort={params.sort}
                currentDir={params.dir}
              />
            </th>
            <th className="px-5 py-3">
              <FilterableHeader
                label="Commune"
                sortKey="commune"
                filterColumn="commune"
                filterEndpoint={ENDPOINT}
                selected={filters.commune}
                searchParams={params}
                currentSort={params.sort}
                currentDir={params.dir}
              />
            </th>
            <th className="px-5 py-3">
              <FilterableHeader
                label="Visiteur"
                sortKey="visiteur"
                searchParams={params}
                currentSort={params.sort}
                currentDir={params.dir}
              />
            </th>
            <th className="px-5 py-3">
              <FilterableHeader
                label="Conseiller"
                sortKey="conseiller"
                filterColumn="conseiller"
                filterEndpoint={ENDPOINT}
                selected={filters.conseiller}
                searchParams={params}
                currentSort={params.sort}
                currentDir={params.dir}
              />
            </th>
            <th className="px-5 py-3">
              <FilterableHeader
                label="Statut"
                sortKey="statut"
                filterColumn="statut"
                filterEndpoint={ENDPOINT}
                selected={filters.statut}
                labelMap={VISITE_STATUT_LABELS}
                searchParams={params}
                currentSort={params.sort}
                currentDir={params.dir}
              />
            </th>
            <th className="px-5 py-3">Retour</th>
          </TableHeadRow>
          <tbody>
            {visites.map((visite) => (
              <tr
                key={visite.id}
                className="border-b border-border last:border-0 hover:bg-muted/50"
              >
                <td className="whitespace-nowrap px-5 py-3">
                  <div className="font-medium text-foreground">{jourLabel(visite.date)}</div>
                  <div className="text-xs text-muted-foreground">
                    {visite.heure.replace(":", "h")}
                  </div>
                </td>
                <td className="px-5 py-3">
                  <BienType value={visite.typeBien} />
                  <div className="text-xs text-muted-foreground">{visite.categorie}</div>
                </td>
                <td className="min-w-48 px-5 py-3">
                  <div className="font-medium text-foreground">{visite.adresse}</div>
                  <div className="text-xs text-muted-foreground">{visite.referenceProduit}</div>
                </td>
                <td className="px-5 py-3 text-muted-foreground">{visite.commune}</td>
                <td className="px-5 py-3">
                  <div className="text-foreground">
                    {visite.visiteur.prenom} {visite.visiteur.nom}
                  </div>
                  <div className="whitespace-nowrap text-xs text-muted-foreground">
                    {visite.visiteur.telephone}
                  </div>
                </td>
                <td className="px-5 py-3 text-muted-foreground">{visite.conseiller}</td>
                <td className="whitespace-nowrap px-5 py-3">
                  <VisiteStatutBadge statut={visite.statut} />
                </td>
                <td className="whitespace-nowrap px-5 py-3">
                  <VisiteRetourBadge retour={visite.retour} />
                </td>
              </tr>
            ))}
            {visites.length === 0 && (
              <TableEmpty
                icon={CalendarDays}
                label="Aucune visite ne correspond à ces filtres."
                colSpan={8}
              />
            )}
          </tbody>
        </TableCard>

        <Pagination page={page} total={total} totalPages={totalPages} searchParams={params} />
      </div>
    </>
  )
}
