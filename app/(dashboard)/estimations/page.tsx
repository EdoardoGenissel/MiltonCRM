import Link from "next/link"
import { Calculator } from "lucide-react"
import { Topbar } from "@/components/topbar"
import { Pagination } from "@/components/pagination"
import { FilterBar } from "@/components/filter-bar"
import { FilterableHeader } from "@/components/filterable-header"
import { TableCard, TableHeadRow, TableEmpty } from "@/components/ui/data-table"
import { ContactTrigger } from "@/components/entity-drawers/entity-triggers"
import { EstimationStatutBadge } from "@/components/estimation-statut-badge"
import { listEstimations } from "@/lib/estimations/queries"
import { ESTIMATION_STATUT_LABELS } from "@/lib/estimations/statuts"
import { parsePage } from "@/lib/pagination"
import { toArray } from "@/lib/search-params"

export const dynamic = "force-dynamic"

type EstimationsSearchParams = {
  search?: string
  statut?: string | string[]
  page?: string
  sort?: string
  dir?: string
}

const ENDPOINT = "/api/estimations/column-values"

export default async function EstimationsPage({
  searchParams,
}: {
  searchParams: Promise<EstimationsSearchParams>
}) {
  const params = await searchParams
  const page = parsePage(params.page)
  const filters = {
    search: params.search,
    statut: toArray(params.statut),
    sort: params.sort,
    dir: params.dir,
    page,
  }
  const { items: estimations, total, totalPages } = await listEstimations(filters)

  return (
    <>
      <Topbar title="Estimations" />
      <div className="flex-1 overflow-auto p-8">
        <FilterBar
          searchParams={params}
          searchPlaceholder="Contact, adresse, commune…"
          filterKeys={["statut"]}
          keyLabels={{ statut: "Statut" }}
          valueLabels={{ statut: ESTIMATION_STATUT_LABELS }}
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
            <th className="px-5 py-3">Contact</th>
            <th className="px-5 py-3">Bien</th>
            <th className="px-5 py-3">
              <FilterableHeader
                label="Statut"
                sortKey="statut"
                filterColumn="statut"
                filterEndpoint={ENDPOINT}
                selected={filters.statut}
                labelMap={ESTIMATION_STATUT_LABELS}
                searchParams={params}
                currentSort={params.sort}
                currentDir={params.dir}
              />
            </th>
            <th className="px-5 py-3">Rapport</th>
          </TableHeadRow>
          <tbody>
            {estimations.map((estimation) => (
              <tr key={estimation.id} className="border-b border-border last:border-0">
                <td className="px-5 py-3 text-muted-foreground">
                  {new Date(estimation.submittedAt ?? estimation.createdAt).toLocaleDateString(
                    "fr-FR",
                  )}
                </td>
                <td className="px-5 py-3">
                  {estimation.contact ? (
                    <ContactTrigger
                      id={estimation.contact.id}
                      className="text-foreground hover:underline"
                    >
                      {estimation.contact.prenom} {estimation.contact.nom}
                    </ContactTrigger>
                  ) : (
                    "-"
                  )}
                </td>
                <td className="px-5 py-3 text-muted-foreground">
                  {estimation.bien ? (
                    <>
                      {estimation.bien.adresse ?? "-"}
                      {(estimation.bien.codePostal || estimation.bien.commune) && (
                        <span className="text-xs">
                          {" "}
                          (
                          {[estimation.bien.codePostal, estimation.bien.commune]
                            .filter(Boolean)
                            .join(" ")}
                          )
                        </span>
                      )}
                    </>
                  ) : (
                    "-"
                  )}
                </td>
                <td className="px-5 py-3">
                  <EstimationStatutBadge statut={estimation.statut} />
                </td>
                <td className="px-5 py-3">
                  {estimation.cityscanReportUrl ? (
                    <Link
                      href={estimation.cityscanReportUrl}
                      target="_blank"
                      className="text-primary hover:underline"
                    >
                      Voir le rapport
                    </Link>
                  ) : (
                    "-"
                  )}
                </td>
              </tr>
            ))}
            {estimations.length === 0 && (
              <TableEmpty
                icon={Calculator}
                label="Aucune estimation ne correspond à ces filtres."
                colSpan={5}
              />
            )}
          </tbody>
        </TableCard>

        <Pagination page={page} total={total} totalPages={totalPages} searchParams={params} />
      </div>
    </>
  )
}
