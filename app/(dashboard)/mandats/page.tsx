import Link from "next/link"
import { FileText, RotateCcw } from "lucide-react"
import { Topbar } from "@/components/topbar"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { SourceBadge } from "@/components/source-badge"
import { Pagination } from "@/components/pagination"
import { SortableHeader } from "@/components/sortable-header"
import { ColumnFilter } from "@/components/column-filter"
import { ClickableRow } from "@/components/clickable-row"
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

  const hasActiveFilters = Boolean(
    params.search ||
      filters.type.length ||
      filters.statut.length ||
      filters.categorie.length ||
      filters.source.length
  )

  return (
    <>
      <Topbar title="Mandats" />
      <div className="flex-1 overflow-auto p-8">
        <form className="mb-4 flex flex-wrap items-end gap-3">
          <div className="flex flex-col gap-1.5">
            <label htmlFor="search" className="text-xs font-medium text-muted-foreground">
              Recherche rapide
            </label>
            <Input
              id="search"
              name="search"
              defaultValue={params.search}
              placeholder="Propriétaire, adresse, commune…"
              className="w-72"
            />
          </div>

          <Button type="submit">Rechercher</Button>
          {hasActiveFilters && (
            <Button variant="ghost" size="sm" nativeButton={false} render={<Link href="/mandats" />}>
              <RotateCcw className="h-3.5 w-3.5" />
              Réinitialiser les filtres
            </Button>
          )}

          <span className="ml-auto self-end pb-2 text-xs text-muted-foreground">
            Cliquez une ligne pour ouvrir la fiche du bien. Filtrez et triez depuis les en-têtes.
          </span>
        </form>

        <div className="overflow-hidden rounded-2xl border border-border bg-card shadow-[var(--shadow-card)]">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border text-left text-xs font-medium text-muted-foreground">
                <th className="px-5 py-3">
                  <div className="flex items-center gap-1.5">
                    <SortableHeader
                      label="Type"
                      sortKey="type"
                      currentSort={params.sort}
                      currentDir={params.dir}
                      searchParams={params}
                    />
                    <ColumnFilter
                      column="type"
                      label="Type"
                      selected={filters.type}
                      searchParams={params}
                      endpoint="/api/mandats/column-values"
                    />
                  </div>
                </th>
                <th className="px-5 py-3">
                  <div className="flex items-center gap-1.5">
                    <SortableHeader
                      label="Statut"
                      sortKey="statut"
                      currentSort={params.sort}
                      currentDir={params.dir}
                      searchParams={params}
                    />
                    <ColumnFilter
                      column="statut"
                      label="Statut"
                      selected={filters.statut}
                      searchParams={params}
                      endpoint="/api/mandats/column-values"
                    />
                  </div>
                </th>
                <th className="px-5 py-3">
                  <div className="flex items-center gap-1.5">
                    <SortableHeader
                      label="Catégorie"
                      sortKey="categorie"
                      currentSort={params.sort}
                      currentDir={params.dir}
                      searchParams={params}
                    />
                    <ColumnFilter
                      column="categorie"
                      label="Catégorie"
                      selected={filters.categorie}
                      searchParams={params}
                      endpoint="/api/mandats/column-values"
                    />
                  </div>
                </th>
                <th className="px-5 py-3">Propriétaire</th>
                <th className="px-5 py-3">Bien</th>
                <th className="px-5 py-3">
                  <div className="flex items-center gap-1.5">
                    <SortableHeader
                      label="Source"
                      sortKey="source"
                      currentSort={params.sort}
                      currentDir={params.dir}
                      searchParams={params}
                    />
                    <ColumnFilter
                      column="source"
                      label="Source"
                      selected={filters.source}
                      searchParams={params}
                      endpoint="/api/mandats/column-values"
                    />
                  </div>
                </th>
              </tr>
            </thead>
            <tbody>
              {mandats.map((mandat) => (
                <ClickableRow
                  key={mandat.id}
                  href={mandat.bien ? `/biens/${mandat.bien.id}#mandat-${mandat.id}` : "#"}
                  className="border-b border-border last:border-0 hover:bg-muted/50"
                >
                  <td className="px-5 py-3 font-medium text-foreground">{mandat.type}</td>
                  <td className="px-5 py-3 text-muted-foreground">{mandat.statut ?? "—"}</td>
                  <td className="px-5 py-3 text-muted-foreground">{mandat.categorie ?? "—"}</td>
                  <td className="px-5 py-3">
                    {mandat.proprietaire ? (
                      <Link
                        href={`/contacts/${mandat.proprietaire.id}`}
                        className="text-foreground hover:underline"
                      >
                        {mandat.proprietaire.prenom} {mandat.proprietaire.nom}
                      </Link>
                    ) : (
                      <span className="text-muted-foreground">—</span>
                    )}
                  </td>
                  <td className="px-5 py-3 text-muted-foreground">
                    {mandat.bien?.titre || mandat.bien?.adresse || mandat.bien?.commune || "—"}
                  </td>
                  <td className="px-5 py-3">
                    <SourceBadge source={mandat.source} />
                  </td>
                </ClickableRow>
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
