import { Users } from "lucide-react"
import { Topbar } from "@/components/topbar"
import { PersonaBadge } from "@/components/persona-badge"
import { ContactAvatar } from "@/components/contact-avatar"
import { Pagination } from "@/components/pagination"
import { FilterBar } from "@/components/filter-bar"
import { FilterableHeader } from "@/components/filterable-header"
import { PersonaTabs } from "@/components/persona-tabs"
import { ContactTrigger } from "@/components/entity-drawers/entity-triggers"
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

const FILTER_KEYS = ["nom", "telephone", "email", "commune"]
const KEY_LABELS = { nom: "Nom", telephone: "Téléphone", email: "Email", commune: "Commune" }

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

  return (
    <>
      <Topbar title="Contacts" />
      <div className="flex-1 overflow-auto p-8">
        <FilterBar
          searchParams={params}
          searchPlaceholder="Nom, prénom, téléphone, email…"
          filterKeys={FILTER_KEYS}
          keyLabels={KEY_LABELS}
          tabs={<PersonaTabs searchParams={params} />}
        />

        <div className="overflow-hidden rounded-[8px] border border-border bg-card shadow-[var(--shadow-card)]">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border text-left text-xs font-medium text-muted-foreground">
                <th className="px-5 py-3">
                  <FilterableHeader
                    label="Nom"
                    sortKey="nom"
                    filterColumn="nom"
                    selected={filters.nom}
                    searchParams={params}
                    currentSort={params.sort}
                    currentDir={params.dir}
                  />
                </th>
                <th className="px-5 py-3">
                  <FilterableHeader
                    label="Téléphone"
                    sortKey="telephone"
                    filterColumn="telephone"
                    selected={filters.telephone}
                    searchParams={params}
                    currentSort={params.sort}
                    currentDir={params.dir}
                  />
                </th>
                <th className="px-5 py-3 text-center">
                  <FilterableHeader
                    label="Email"
                    sortKey="email"
                    filterColumn="email"
                    selected={filters.email}
                    searchParams={params}
                    currentSort={params.sort}
                    currentDir={params.dir}
                    align="center"
                  />
                </th>
                <th className="px-5 py-3 text-center">Type</th>
                <th className="px-5 py-3 text-center">
                  <FilterableHeader
                    label="Commune"
                    sortKey="commune"
                    filterColumn="commune"
                    selected={filters.commune}
                    searchParams={params}
                    currentSort={params.sort}
                    currentDir={params.dir}
                    align="center"
                  />
                </th>
              </tr>
            </thead>
            <tbody>
              {contacts.map((contact) => (
                <tr key={contact.id} className="border-b border-border last:border-0 hover:bg-muted/50">
                  <td className="px-5 py-3">
                    <ContactTrigger id={contact.id} className="group flex items-center gap-3">
                      <ContactAvatar prenom={contact.prenom} nom={contact.nom} size="sm" />
                      <span className="font-medium text-foreground group-hover:underline">
                        {contact.prenom} {contact.nom}
                      </span>
                    </ContactTrigger>
                  </td>
                  <td className="px-5 py-3 whitespace-nowrap text-muted-foreground">{contact.telephone ?? "-"}</td>
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
