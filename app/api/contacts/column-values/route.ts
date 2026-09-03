import type { NextRequest } from "next/server"
import { prisma } from "@/lib/db/prisma"
import {
  buildContactWhere,
  type ContactListFilters,
  type FilterColumn,
} from "@/lib/contacts/queries"
import { PERSONAS } from "@/lib/contacts/personas"

const COLUMNS: FilterColumn[] = ["nom", "telephone", "email", "commune", "source", "persona"]
const MAX_VALUES = 100

function readFilters(params: URLSearchParams): ContactListFilters {
  return {
    search: params.get("search") ?? undefined,
    nom: params.getAll("nom"),
    telephone: params.getAll("telephone"),
    email: params.getAll("email"),
    commune: params.getAll("commune"),
    source: params.getAll("source"),
    persona: params.getAll("persona"),
  }
}

// Valeurs uniques disponibles pour un filtre colonne façon Excel (cf.
// components/column-filter.tsx) — respecte les filtres déjà actifs sur les
// *autres* colonnes (excludeColumn) et une recherche texte `q` sur la liste
// elle-même, plafonné à MAX_VALUES pour ne jamais renvoyer les ~3800 valeurs
// nom/téléphone/email d'un coup.
export async function GET(request: NextRequest) {
  const params = request.nextUrl.searchParams
  const column = params.get("column")
  if (!column || !COLUMNS.includes(column as FilterColumn)) {
    return Response.json({ error: "Colonne invalide." }, { status: 400 })
  }

  const q = params.get("q")?.trim() ?? ""
  const filters = readFilters(params)
  const where = buildContactWhere(filters, column as FilterColumn)
  const qFilter = q ? { contains: q, mode: "insensitive" as const } : undefined

  if (column === "persona") {
    // `personas` est un tableau (pas de `distinct` Prisma possible dessus) — on
    // vérifie juste, pour chacun des 4 personas connus, s'il existe au moins une
    // fiche qui le porte compte tenu des filtres déjà actifs sur les autres
    // colonnes (ex. commune=CAYENNE -> ne proposer que les personas réellement
    // présents parmi les contacts de Cayenne).
    const counts = await Promise.all(
      PERSONAS.map((p) =>
        prisma.contact.count({ where: { ...where, personas: { has: p.value } } }),
      ),
    )
    const values = PERSONAS.filter((_, i) => counts[i] > 0)
      .map((p) => p.value)
      .filter((v) => v.toLowerCase().includes(q.toLowerCase()))
    return Response.json({ values, hasMore: false })
  }

  if (column === "source") {
    const rows = await prisma.contact.findMany({
      where,
      distinct: ["source"],
      select: { source: true },
    })
    const values = rows
      .map((r) => r.source)
      .filter((v) => v.toLowerCase().includes(q.toLowerCase()))
      .sort()
    return Response.json({ values, hasMore: false })
  }

  if (column === "nom") {
    const rows = await prisma.contact.findMany({
      where: qFilter ? { ...where, nom: qFilter } : where,
      distinct: ["nom"],
      select: { nom: true },
      orderBy: { nom: "asc" },
      take: MAX_VALUES + 1,
    })
    return Response.json({
      values: rows.slice(0, MAX_VALUES).map((r) => r.nom),
      hasMore: rows.length > MAX_VALUES,
    })
  }

  if (column === "telephone") {
    const rows = await prisma.contact.findMany({
      where: {
        ...where,
        telephone: qFilter ? { ...qFilter, not: null } : { not: null },
      },
      distinct: ["telephone"],
      select: { telephone: true },
      orderBy: { telephone: "asc" },
      take: MAX_VALUES + 1,
    })
    const values = rows.map((r) => r.telephone).filter((v): v is string => v !== null)
    return Response.json({
      values: values.slice(0, MAX_VALUES),
      hasMore: values.length > MAX_VALUES,
    })
  }

  if (column === "email") {
    const rows = await prisma.contact.findMany({
      where: {
        ...where,
        email: qFilter ? { ...qFilter, not: null } : { not: null },
      },
      distinct: ["email"],
      select: { email: true },
      orderBy: { email: "asc" },
      take: MAX_VALUES + 1,
    })
    const values = rows.map((r) => r.email).filter((v): v is string => v !== null)
    return Response.json({
      values: values.slice(0, MAX_VALUES),
      hasMore: values.length > MAX_VALUES,
    })
  }

  // column === "commune"
  const rows = await prisma.contact.findMany({
    where: {
      ...where,
      commune: qFilter ? { ...qFilter, not: null } : { not: null },
    },
    distinct: ["commune"],
    select: { commune: true },
    orderBy: { commune: "asc" },
    take: MAX_VALUES + 1,
  })
  const values = rows.map((r) => r.commune).filter((v): v is string => v !== null)
  return Response.json({ values: values.slice(0, MAX_VALUES), hasMore: values.length > MAX_VALUES })
}
