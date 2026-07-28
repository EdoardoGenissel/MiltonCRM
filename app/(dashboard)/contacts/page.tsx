import Link from "next/link"
import { RotateCcw, Users } from "lucide-react"
import { Topbar } from "@/components/topbar"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { PersonaBadge } from "@/components/persona-badge"
import { ContactAvatar } from "@/components/contact-avatar"
import { Pagination } from "@/components/pagination"
import { SortableHeader } from "@/components/sortable-header"
import { ColumnFilter } from "@/components/column-filter"
import { PersonaTabs } from "@/components/persona-tabs"
import { listContacts } from "@/lib/contacts/queries"
import { parsePage } from "@/lib/pagination"
import { toArray } from "@/lib/search-params"

export const dynamic = "force-dynamic"

type ContactsSearchParams = {
  search?: string
  persona?: string | string[]
  source?: string | string[]
  commune?: string | string[]
  nom?: string | string[]
  telephone?: string | string[]
  email?: string | string[]
  page?: string
  sort?: string
  dir?: string
}

export default async function ContactsPage({
  searchParams,
}: {
  searchParams: Promise<ContactsSearchParams>
}) {
  const params = await searchParams
  const page = parsePage(params.page)
  const filters = {
    search: params.search,
    persona: toArray(params.persona),
    source: toArray(params.source),
    commune: toArray(params.commune),
    nom: toArray(params.nom),
    telephone: toArray(params.telephone),
    email: toArray(params.email),
    sort: params.sort,
    dir: params.dir,
    page,
  }
  const { items: contacts, total, totalPages } = await listContacts(filters)

  // Boolean(...) est nécessaire ici : sans ça, quand tout est vide la chaîne de
  // `||` retombe sur le dernier `.length` (0, un nombre) plutôt que sur `false` —
  // et `{0 && <Link/>}` affiche littéralement "0" dans le JSX (React ne masque
  // que `false`/`null`/`undefined`, pas les autres valeurs falsy).
  const hasActiveFilters = Boolean(
    params.search ||
      filters.persona.length ||
      filters.source.length ||
      filters.commune.length ||
      filters.nom.length ||
      filters.telephone.length ||
      filters.email.length
  )

  return (
    <>
      <Topbar title="Contacts" />
      <div className="flex-1 overflow-auto p-8">
        <div className="mb-4 flex flex-wrap items-end justify-between gap-3">
          <PersonaTabs searchParams={params} />

          <form className="flex flex-wrap items-end gap-3">
            <div className="flex flex-col gap-1.5">
              <Input
                id="search"
                name="search"
                defaultValue={params.search}
                placeholder="Nom, prénom, téléphone, email…"
                className="w-72"
              />
            </div>

            <Button type="submit">Rechercher</Button>
            {hasActiveFilters && (
              <Button variant="ghost" size="lg" nativeButton={false} render={<Link href="/contacts" />}>
                <RotateCcw className="h-3.5 w-3.5" />
                Réinitialiser
              </Button>
            )}
          </form>
        </div>

        <div className="overflow-hidden rounded-[8px] border border-border bg-card shadow-[var(--shadow-card)]">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border text-left text-xs font-medium text-muted-foreground">
                <th className="px-5 py-3">
                  <div className="flex items-center gap-1.5">
                    <SortableHeader
                      label="Nom"
                      sortKey="nom"
                      currentSort={params.sort}
                      currentDir={params.dir}
                      searchParams={params}
                    />
                    <ColumnFilter
                      column="nom"
                      label="Nom"
                      selected={filters.nom}
                      searchParams={params}
                    />
                  </div>
                </th>
                <th className="px-5 py-3 text-center">
                  <div className="flex items-center justify-center gap-1.5">
                    <SortableHeader
                      label="Téléphone"
                      sortKey="telephone"
                      currentSort={params.sort}
                      currentDir={params.dir}
                      searchParams={params}
                    />
                    <ColumnFilter
                      column="telephone"
                      label="Téléphone"
                      selected={filters.telephone}
                      searchParams={params}
                    />
                  </div>
                </th>
                <th className="px-5 py-3 text-center">
                  <div className="flex items-center justify-center gap-1.5">
                    <SortableHeader
                      label="Email"
                      sortKey="email"
                      currentSort={params.sort}
                      currentDir={params.dir}
                      searchParams={params}
                    />
                    <ColumnFilter
                      column="email"
                      label="Email"
                      selected={filters.email}
                      searchParams={params}
                    />
                  </div>
                </th>
                <th className="px-5 py-3 text-center">Type</th>
                <th className="px-5 py-3 text-center">
                  <div className="flex items-center justify-center gap-1.5">
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
                    />
                  </div>
                </th>
              </tr>
            </thead>
            <tbody>
              {contacts.map((contact) => (
                <tr key={contact.id} className="border-b border-border last:border-0 hover:bg-muted/50">
                  <td className="px-5 py-3">
                    <Link href={`/contacts/${contact.id}`} className="group flex items-center gap-3">
                      <ContactAvatar prenom={contact.prenom} nom={contact.nom} size="sm" />
                      <span className="font-medium text-foreground group-hover:underline">
                        {contact.prenom} {contact.nom}
                      </span>
                    </Link>
                  </td>
                  <td className="px-5 py-3 text-center text-muted-foreground">{contact.telephone ?? "-"}</td>
                  <td className="px-5 py-3 text-center text-muted-foreground">{contact.email ?? "-"}</td>
                  <td className="px-5 py-3">
                    <div className="flex flex-wrap justify-center gap-1.5">
                      {contact.personas.map((persona) => (
                        <PersonaBadge key={persona} persona={persona} />
                      ))}
                    </div>
                  </td>
                  <td className="px-5 py-3 text-center text-muted-foreground">{contact.commune ?? "-"}</td>
                </tr>
              ))}
              {contacts.length === 0 && (
                <tr>
                  <td colSpan={5} className="px-16 py-14 text-center">
                    <div className="flex flex-col items-center gap-2 text-muted-foreground">
                      <Users className="h-8 w-8 opacity-40" />
                      <p>Aucun contact ne correspond à ces filtres.</p>
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
