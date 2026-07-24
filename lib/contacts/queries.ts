import { prisma } from "@/lib/db/prisma"
import { Source } from "@/lib/generated/prisma/enums"
import { PAGE_SIZE, toPageResult } from "@/lib/pagination"

export type FilterColumn = "nom" | "telephone" | "email" | "commune" | "source" | "persona"

export type ContactListFilters = {
  search?: string
  persona?: string[]
  source?: string[]
  commune?: string[]
  nom?: string[]
  telephone?: string[]
  email?: string[]
  categorie?: string
  page?: number
  sort?: string
  dir?: string
}

function asSource(value: string): Source | undefined {
  return (Object.values(Source) as string[]).includes(value) ? (value as Source) : undefined
}

// Construit le `where` Prisma à partir des filtres actifs. `excludeColumn` permet
// de retirer le filtre d'UNE colonne — utilisé par l'API de valeurs uniques
// (app/api/contacts/column-values) pour que la liste proposée pour une colonne
// reflète les filtres déjà posés sur les *autres* colonnes, comme dans Excel.
export function buildContactWhere(filters: ContactListFilters, excludeColumn?: FilterColumn) {
  const { search, persona, source, commune, nom, telephone, email, categorie } = filters
  const validSources = (source ?? []).map(asSource).filter((s): s is Source => Boolean(s))

  return {
    AND: [
      search
        ? {
            OR: [
              { nom: { contains: search, mode: "insensitive" as const } },
              { prenom: { contains: search, mode: "insensitive" as const } },
              { telephone: { contains: search } },
              { email: { contains: search, mode: "insensitive" as const } },
            ],
          }
        : {},
      excludeColumn !== "nom" && nom?.length ? { nom: { in: nom } } : {},
      excludeColumn !== "telephone" && telephone?.length ? { telephone: { in: telephone } } : {},
      excludeColumn !== "email" && email?.length ? { email: { in: email } } : {},
      excludeColumn !== "persona" && persona?.length ? { personas: { hasSome: persona } } : {},
      excludeColumn !== "source" && validSources.length ? { source: { in: validSources } } : {},
      excludeColumn !== "commune" && commune?.length ? { commune: { in: commune } } : {},
      categorie ? { prospectDetail: { categorie } } : {},
    ],
  }
}

export type ContactSortKey = "nom" | "commune" | "source" | "telephone" | "email"

const SORT_KEYS: ContactSortKey[] = ["nom", "commune", "source", "telephone", "email"]

function asSortKey(value: string | undefined): ContactSortKey | undefined {
  return SORT_KEYS.find((key) => key === value)
}

// Tri "à la Excel" par colonne (cf. components/sortable-header.tsx) — un seul
// champ à la fois, direction explicite dans l'URL plutôt qu'un état client.
// `personas` (tableau) n'a pas d'ordre naturel à un seul critère — pas de tri
// possible sur cette colonne, filtre uniquement.
export function buildOrderBy(sort: string | undefined, dir: string | undefined) {
  const direction = dir === "desc" ? ("desc" as const) : ("asc" as const)
  switch (asSortKey(sort)) {
    case "nom":
      return [{ nom: direction }, { prenom: direction }]
    case "commune":
      return [{ commune: direction }]
    case "source":
      return [{ source: direction }]
    case "telephone":
      return [{ telephone: direction }]
    case "email":
      return [{ email: direction }]
    default:
      return [{ updatedAt: "desc" as const }]
  }
}

// Centralise les lectures Prisma pour les contacts — pas de requête Prisma
// dispersée dans les pages (même discipline que lib/kpis/*.ts côté Cockpit).
export async function listContacts(filters: ContactListFilters) {
  const { page = 1, sort, dir } = filters
  const where = buildContactWhere(filters)

  const [items, total] = await prisma.$transaction([
    prisma.contact.findMany({
      where,
      include: { prospectDetail: true },
      orderBy: buildOrderBy(sort, dir),
      skip: (page - 1) * PAGE_SIZE,
      take: PAGE_SIZE,
    }),
    prisma.contact.count({ where }),
  ])

  return toPageResult(items, total, page)
}

export function getContactById(id: string) {
  return prisma.contact.findUnique({
    where: { id },
    include: {
      prospectDetail: true,
      mandats: { include: { bien: true }, orderBy: { updatedAt: "desc" } },
      callLogs: { orderBy: { receivedAt: "desc" }, take: 20 },
      estimations: { include: { bien: true }, orderBy: { createdAt: "desc" } },
    },
  })
}
