import { Users } from "lucide-react"
import { Topbar } from "@/components/topbar"
import { TableCard, TableHeadRow, TableEmpty } from "@/components/ui/data-table"
import { PersonaBadge } from "@/components/persona-badge"
import { StatutBadge } from "@/components/statut-badge"
import { ContactAvatar } from "@/components/contact-avatar"
import { Pagination } from "@/components/pagination"
import { FilterBar } from "@/components/filter-bar"
import { FilterableHeader } from "@/components/filterable-header"
import { PersonaTabs } from "@/components/persona-tabs"
import { ContactTrigger } from "@/components/entity-drawers/entity-triggers"
import { listContacts } from "@/lib/contacts/queries"
import { contactStatut, STATUT_LABELS } from "@/lib/contacts/statut"
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
  statut?: string | string[]
  page?: string
  sort?: string
  dir?: string
}

const FILTER_KEYS = ["nom", "telephone", "email", "commune", "statut"]
const KEY_LABELS = {
  nom: "Nom",
  telephone: "Téléphone",
  email: "Email",
  commune: "Commune",
  statut: "Statut",
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
    statut: toArray(params.statut),
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
          valueLabels={{ statut: STATUT_LABELS }}
          tabs={<PersonaTabs searchParams={params} />}
        />

        <TableCard>
          <TableHeadRow>
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
            <th className="px-5 py-3">
              <FilterableHeader
                label="Email"
                sortKey="email"
                filterColumn="email"
                selected={filters.email}
                searchParams={params}
                currentSort={params.sort}
                currentDir={params.dir}
              />
            </th>
            <th className="px-5 py-3">Type</th>
            <th className="px-5 py-3">
              <FilterableHeader
                label="Statut"
                filterColumn="statut"
                selected={filters.statut}
                labelMap={STATUT_LABELS}
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
                selected={filters.commune}
                searchParams={params}
                currentSort={params.sort}
                currentDir={params.dir}
              />
            </th>
          </TableHeadRow>
          <tbody>
            {contacts.map((contact) => (
              <tr
                key={contact.id}
                className="border-b border-border last:border-0 hover:bg-muted/50"
              >
                <td className="px-5 py-3">
                  <ContactTrigger id={contact.id} className="group flex items-center gap-3">
                    <ContactAvatar prenom={contact.prenom} nom={contact.nom} size="sm" />
                    <span className="font-medium text-foreground group-hover:underline">
                      {contact.prenom} {contact.nom}
                    </span>
                  </ContactTrigger>
                </td>
                <td className="px-5 py-3 whitespace-nowrap text-muted-foreground">
                  {contact.telephone ?? "-"}
                </td>
                <td className="px-5 py-3 text-muted-foreground">{contact.email ?? "-"}</td>
                <td className="px-5 py-3">
                  <div className="flex flex-wrap justify-start gap-1.5">
                    {contact.personas.map((persona) => (
                      <PersonaBadge key={persona} persona={persona} />
                    ))}
                  </div>
                </td>
                <td className="px-5 py-3">
                  <StatutBadge statut={contactStatut(contact)} />
                </td>
                <td className="px-5 py-3 text-muted-foreground">{contact.commune ?? "-"}</td>
              </tr>
            ))}
            {contacts.length === 0 && (
              <TableEmpty
                icon={Users}
                label="Aucun contact ne correspond à ces filtres."
                colSpan={6}
              />
            )}
          </tbody>
        </TableCard>

        <Pagination page={page} total={total} totalPages={totalPages} searchParams={params} />
      </div>
    </>
  )
}
