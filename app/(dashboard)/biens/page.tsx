import { Building2 } from "lucide-react"
import { Topbar } from "@/components/topbar"
import { TableCard, TableHeadRow, TableEmpty } from "@/components/ui/data-table"
import { Pagination } from "@/components/pagination"
import { FilterBar } from "@/components/filter-bar"
import { FilterableHeader } from "@/components/filterable-header"
import { BienType } from "@/components/bien-type"
import { BienTrigger, ContactTrigger } from "@/components/entity-drawers/entity-triggers"
import { listBiens } from "@/lib/biens/queries"
import { parsePage } from "@/lib/pagination"
import { toArray } from "@/lib/search-params"

export const dynamic = "force-dynamic"

type BiensSearchParams = {
  search?: string
  commune?: string | string[]
  typeBien?: string | string[]
  statut?: string | string[]
  source?: string | string[]
  categorie?: string | string[]
  page?: string
  sort?: string
  dir?: string
}

const ENDPOINT = "/api/biens/column-values"
const FILTER_KEYS = ["commune", "typeBien", "categorie", "statut"]
const KEY_LABELS = {
  commune: "Commune",
  typeBien: "Type",
  categorie: "Catégorie",
  statut: "Statut",
}

export default async function BiensPage({
  searchParams,
}: {
  searchParams: Promise<BiensSearchParams>
}) {
  const params = await searchParams
  const page = parsePage(params.page)
  const filters = {
    search: params.search,
    commune: toArray(params.commune),
    typeBien: toArray(params.typeBien),
    statut: toArray(params.statut),
    source: toArray(params.source),
    categorie: toArray(params.categorie),
    sort: params.sort,
    dir: params.dir,
    page,
  }
  const { items: biens, total, totalPages } = await listBiens(filters)

  return (
    <>
      <Topbar title="Biens" />
      <div className="flex-1 overflow-auto p-8">
        <FilterBar
          searchParams={params}
          searchPlaceholder="Adresse, commune, référence…"
          filterKeys={FILTER_KEYS}
          keyLabels={KEY_LABELS}
        />

        <TableCard>
          <TableHeadRow>
            <th className="px-5 py-3">Photo</th>
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
                label="Adresse"
                sortKey="adresse"
                searchParams={params}
                currentSort={params.sort}
                currentDir={params.dir}
              />
            </th>
            <th className="px-5 py-3">Référence</th>
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
                label="Catégorie"
                filterColumn="categorie"
                filterEndpoint={ENDPOINT}
                selected={filters.categorie}
                searchParams={params}
              />
            </th>
            <th className="px-5 py-3">
              <FilterableHeader
                label="Surface"
                sortKey="surface"
                searchParams={params}
                currentSort={params.sort}
                currentDir={params.dir}
              />
            </th>
            <th className="px-5 py-3">
              <FilterableHeader
                label="Prix"
                sortKey="prix"
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
                searchParams={params}
                currentSort={params.sort}
                currentDir={params.dir}
              />
            </th>
            <th className="px-5 py-3">Propriétaire</th>
          </TableHeadRow>
          <tbody>
            {biens.map((bien) => {
              const proprietaire = bien.mandats[0]?.proprietaire
              const categorie = bien.mandats[0]?.categorie
              return (
                <tr
                  key={bien.id}
                  className="border-b border-border last:border-0 hover:bg-muted/50"
                >
                  <td className="px-5 py-3">
                    {bien.photos[0] ? (
                      // eslint-disable-next-line @next/next/no-img-element -- photos externes Apimo
                      <img
                        src={bien.photos[0]}
                        alt=""
                        loading="lazy"
                        className="h-12 w-16 rounded-md object-cover"
                      />
                    ) : (
                      <div className="h-12 w-16 rounded-md bg-muted" />
                    )}
                  </td>
                  <td className="px-5 py-3">
                    <BienType value={bien.typeBien} />
                  </td>
                  <td className="px-5 py-3 font-medium text-foreground">
                    <BienTrigger id={bien.id} className="hover:underline">
                      {bien.adresse || bien.titre || "-"}
                    </BienTrigger>
                  </td>
                  <td className="px-5 py-3 text-muted-foreground">
                    {bien.referenceProduit ?? "-"}
                  </td>
                  <td className="px-5 py-3 text-muted-foreground">{bien.commune ?? "-"}</td>
                  <td className="px-5 py-3 text-muted-foreground">{categorie ?? "-"}</td>
                  <td className="px-5 py-3 text-muted-foreground">
                    {bien.surface ? `${bien.surface} m²` : "-"}
                  </td>
                  <td className="px-5 py-3 text-muted-foreground">
                    {bien.prix ? `${bien.prix} €` : "-"}
                  </td>
                  <td className="px-5 py-3 text-muted-foreground">{bien.statut ?? "-"}</td>
                  <td className="px-5 py-3">
                    {proprietaire ? (
                      <ContactTrigger
                        id={proprietaire.id}
                        className="text-foreground hover:underline"
                      >
                        {proprietaire.prenom} {proprietaire.nom}
                      </ContactTrigger>
                    ) : (
                      <span className="text-muted-foreground">{bien.proprietaireLabel ?? "-"}</span>
                    )}
                  </td>
                </tr>
              )
            })}
            {biens.length === 0 && (
              <TableEmpty
                icon={Building2}
                label="Aucun bien ne correspond à ces filtres."
                colSpan={10}
              />
            )}
          </tbody>
        </TableCard>

        <Pagination page={page} total={total} totalPages={totalPages} searchParams={params} />
      </div>
    </>
  )
}
