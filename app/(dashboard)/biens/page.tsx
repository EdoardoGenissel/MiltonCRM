import Link from "next/link"
import { Building2, RotateCcw } from "lucide-react"
import { Topbar } from "@/components/topbar"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { SourceBadge } from "@/components/source-badge"
import { Pagination } from "@/components/pagination"
import { SortableHeader } from "@/components/sortable-header"
import { ColumnFilter } from "@/components/column-filter"
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

  const hasActiveFilters = Boolean(
    params.search ||
      filters.commune.length ||
      filters.typeBien.length ||
      filters.statut.length ||
      filters.source.length ||
      filters.categorie.length
  )

  return (
    <>
      <Topbar title="Biens" />
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
              placeholder="Adresse, commune, référence…"
              className="w-72"
            />
          </div>

          <Button type="submit">Rechercher</Button>
          {hasActiveFilters && (
            <Button variant="ghost" size="sm" nativeButton={false} render={<Link href="/biens" />}>
              <RotateCcw className="h-3.5 w-3.5" />
              Réinitialiser les filtres
            </Button>
          )}

          <span className="ml-auto self-end pb-2 text-xs text-muted-foreground">
            Filtrez et triez directement depuis les en-têtes de colonne, comme dans un tableur.
          </span>
        </form>

        <div className="overflow-hidden rounded-2xl border border-border bg-card shadow-[var(--shadow-card)]">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border text-left text-xs font-medium text-muted-foreground">
                <th className="px-5 py-3">
                  <div className="flex items-center gap-1.5">
                    <SortableHeader
                      label="Adresse"
                      sortKey="adresse"
                      currentSort={params.sort}
                      currentDir={params.dir}
                      searchParams={params}
                    />
                  </div>
                </th>
                <th className="px-5 py-3">
                  <div className="flex items-center gap-1.5">
                    <SortableHeader
                      label="Commune"
                      sortKey="commune"
                      currentSort={params.sort}
                      currentDir={params.dir}
                      searchParams={params}
                    />
                    <ColumnFilter
                      column="commune"
                      label="Commune"
                      selected={filters.commune}
                      searchParams={params}
                      endpoint="/api/biens/column-values"
                    />
                  </div>
                </th>
                <th className="px-5 py-3">
                  <div className="flex items-center gap-1.5">
                    <SortableHeader
                      label="Type"
                      sortKey="typeBien"
                      currentSort={params.sort}
                      currentDir={params.dir}
                      searchParams={params}
                    />
                    <ColumnFilter
                      column="typeBien"
                      label="Type"
                      selected={filters.typeBien}
                      searchParams={params}
                      endpoint="/api/biens/column-values"
                    />
                  </div>
                </th>
                <th className="px-5 py-3">
                  <div className="flex items-center gap-1.5">
                    Catégorie
                    <ColumnFilter
                      column="categorie"
                      label="Catégorie"
                      selected={filters.categorie}
                      searchParams={params}
                      endpoint="/api/biens/column-values"
                    />
                  </div>
                </th>
                <th className="px-5 py-3">
                  <SortableHeader
                    label="Surface"
                    sortKey="surface"
                    currentSort={params.sort}
                    currentDir={params.dir}
                    searchParams={params}
                  />
                </th>
                <th className="px-5 py-3">
                  <SortableHeader
                    label="Prix"
                    sortKey="prix"
                    currentSort={params.sort}
                    currentDir={params.dir}
                    searchParams={params}
                  />
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
                      endpoint="/api/biens/column-values"
                    />
                  </div>
                </th>
                <th className="px-5 py-3">Propriétaire</th>
                <th className="px-5 py-3">
                  <div className="flex items-center gap-1.5">
                    Source
                    <ColumnFilter
                      column="source"
                      label="Source"
                      selected={filters.source}
                      searchParams={params}
                      endpoint="/api/biens/column-values"
                    />
                  </div>
                </th>
              </tr>
            </thead>
            <tbody>
              {biens.map((bien) => {
                const proprietaire = bien.mandats[0]?.proprietaire
                const categorie = bien.mandats[0]?.categorie
                return (
                  <tr key={bien.id} className="border-b border-border last:border-0 hover:bg-muted/50">
                    <td className="px-5 py-3 font-medium text-foreground">
                      <Link href={`/biens/${bien.id}`} className="hover:underline">
                        {bien.titre || bien.adresse || "—"}
                      </Link>
                    </td>
                    <td className="px-5 py-3 text-muted-foreground">{bien.commune ?? "—"}</td>
                    <td className="px-5 py-3 text-muted-foreground">{bien.typeBien ?? "—"}</td>
                    <td className="px-5 py-3 text-muted-foreground">{categorie ?? "—"}</td>
                    <td className="px-5 py-3 text-muted-foreground">
                      {bien.surface ? `${bien.surface} m²` : "—"}
                    </td>
                    <td className="px-5 py-3 text-muted-foreground">
                      {bien.prix ? `${bien.prix} €` : "—"}
                    </td>
                    <td className="px-5 py-3 text-muted-foreground">{bien.statut ?? "—"}</td>
                    <td className="px-5 py-3">
                      {proprietaire ? (
                        <Link
                          href={`/contacts/${proprietaire.id}`}
                          className="text-foreground hover:underline"
                        >
                          {proprietaire.prenom} {proprietaire.nom}
                        </Link>
                      ) : (
                        <span className="text-muted-foreground">{bien.proprietaireLabel ?? "—"}</span>
                      )}
                    </td>
                    <td className="px-5 py-3">
                      <SourceBadge source={bien.source} />
                    </td>
                  </tr>
                )
              })}
              {biens.length === 0 && (
                <tr>
                  <td colSpan={9} className="px-16 py-14 text-center">
                    <div className="flex flex-col items-center gap-2 text-muted-foreground">
                      <Building2 className="h-8 w-8 opacity-40" />
                      <p>Aucun bien ne correspond à ces filtres.</p>
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
