import { FileText } from "lucide-react"
import { Topbar } from "@/components/topbar"
import { MandatTypeBadge } from "@/components/mandat-type-badge"
import { Pagination } from "@/components/pagination"
import { FilterBar } from "@/components/filter-bar"
import { FilterableHeader } from "@/components/filterable-header"
import { MandatDrawerRow, ContactTrigger } from "@/components/entity-drawers/entity-triggers"
import { listMandats } from "@/lib/mandats/queries"
import { parsePage } from "@/lib/pagination"
import { toArray } from "@/lib/search-params"

export const dynamic = "force-dynamic"

type MandatsSearchParams = {
  search?: string
  type?: string | string[]
  statut?: string | string[]
  categorie?: string | string[]
  source?: string | string[]
  page?: string
  sort?: string
  dir?: string
}

const ENDPOINT = "/api/mandats/column-values"
const FILTER_KEYS = ["type", "statut", "categorie"]
const KEY_LABELS = { type: "Type", statut: "Statut", categorie: "Catégorie" }

export default async function MandatsPage({
  searchParams,
}: {
  searchParams: Promise<MandatsSearchParams>
}) {
  const params = await searchParams
  const page = parsePage(params.page)
  const filters = {
    search: params.search,
    type: toArray(params.type),
    statut: toArray(params.statut),
    categorie: toArray(params.categorie),
    source: toArray(params.source),
    sort: params.sort,
    dir: params.dir,
    page,
  }
  const { items: mandats, total, totalPages } = await listMandats(filters)

  return (
    <>
      <Topbar title="Mandats" />
      <div className="flex-1 overflow-auto p-8">
        <FilterBar
          searchParams={params}
          searchPlaceholder="Propriétaire, adresse, commune…"
          filterKeys={FILTER_KEYS}
          keyLabels={KEY_LABELS}
        />

        <div className="overflow-hidden rounded-[8px] border border-border bg-card shadow-[var(--shadow-card)]">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border text-left text-xs font-medium text-muted-foreground">
                <th className="px-5 py-3 text-center">
                  <FilterableHeader
                    label="Type"
                    sortKey="type"
                    filterColumn="type"
                    filterEndpoint={ENDPOINT}
                    selected={filters.type}
                    searchParams={params}
                    currentSort={params.sort}
                    currentDir={params.dir}
                    align="center"
                  />
                </th>
                <th className="px-5 py-3 text-center">
                  <FilterableHeader
                    label="Statut"
                    sortKey="statut"
                    filterColumn="statut"
                    filterEndpoint={ENDPOINT}
                    selected={filters.statut}
                    searchParams={params}
                    currentSort={params.sort}
                    currentDir={params.dir}
                    align="center"
                  />
                </th>
                <th className="px-5 py-3 text-center">
                  <FilterableHeader
                    label="Catégorie"
                    sortKey="categorie"
                    filterColumn="categorie"
                    filterEndpoint={ENDPOINT}
                    selected={filters.categorie}
                    searchParams={params}
                    currentSort={params.sort}
                    currentDir={params.dir}
                    align="center"
                  />
                </th>
                <th className="px-5 py-3">Propriétaire</th>
                <th className="px-5 py-3">Locataire</th>
                <th className="px-5 py-3">Bien</th>
              </tr>
            </thead>
            <tbody>
              {mandats.map((mandat) => (
                <MandatDrawerRow
                  key={mandat.id}
                  mandatId={mandat.id}
                  className="border-b border-border last:border-0 hover:bg-muted/50"
                >
                  <td className="px-5 py-3 text-center">
                    <MandatTypeBadge type={mandat.type} />
                  </td>
                  <td className="px-5 py-3 text-center text-muted-foreground">{mandat.statut ?? "-"}</td>
                  <td className="px-5 py-3 text-center text-muted-foreground">{mandat.categorie ?? "-"}</td>
                  <td className="px-5 py-3">
                    {mandat.proprietaire ? (
                      <ContactTrigger id={mandat.proprietaire.id} className="text-foreground hover:underline">
                        {mandat.proprietaire.prenom} {mandat.proprietaire.nom}
                      </ContactTrigger>
                    ) : (
                      <span className="text-muted-foreground">-</span>
                    )}
                  </td>
                  <td className="px-5 py-3">
                    {mandat.locataire ? (
                      <ContactTrigger id={mandat.locataire.id} className="text-foreground hover:underline">
                        {mandat.locataire.prenom} {mandat.locataire.nom}
                      </ContactTrigger>
                    ) : (
                      <span className="text-muted-foreground">-</span>
                    )}
                  </td>
                  <td className="px-5 py-3 text-muted-foreground">
                    {mandat.bien?.titre || mandat.bien?.adresse || mandat.bien?.commune || "-"}
                  </td>
                </MandatDrawerRow>
              ))}
              {mandats.length === 0 && (
                <tr>
                  <td colSpan={6} className="px-16 py-14 text-center">
                    <div className="flex flex-col items-center gap-2 text-muted-foreground">
                      <FileText className="h-8 w-8 opacity-40" />
                      <p>Aucun mandat ne correspond à ces filtres.</p>
                    </div>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        <Pagination page={page} total={total} totalPages={totalPages} searchParams={params} />
      </div>
    </>
  )
}
