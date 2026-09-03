import type { NextRequest } from "next/server"
import { prisma } from "@/lib/db/prisma"
import {
  buildMandatWhere,
  type MandatListFilters,
  type MandatFilterColumn,
} from "@/lib/mandats/queries"

const COLUMNS: MandatFilterColumn[] = ["type", "statut", "categorie", "source"]
const MAX_VALUES = 100

function readFilters(params: URLSearchParams): MandatListFilters {
  return {
    search: params.get("search") ?? undefined,
    type: params.getAll("type"),
    statut: params.getAll("statut"),
    categorie: params.getAll("categorie"),
    source: params.getAll("source"),
  }
}

// Valeurs uniques pour un filtre colonne façon Excel sur la page Mandats — même
// principe que app/api/contacts/column-values (cf. components/column-filter.tsx).
export async function GET(request: NextRequest) {
  const params = request.nextUrl.searchParams
  const column = params.get("column")
  if (!column || !COLUMNS.includes(column as MandatFilterColumn)) {
    return Response.json({ error: "Colonne invalide." }, { status: 400 })
  }

  const q = params.get("q")?.trim() ?? ""
  const filters = readFilters(params)
  const where = buildMandatWhere(filters, column as MandatFilterColumn)
  const qFilter = q ? { contains: q, mode: "insensitive" as const } : undefined

  if (column === "source") {
    const rows = await prisma.mandat.findMany({
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

  if (column === "type") {
    const rows = await prisma.mandat.findMany({
      where: qFilter ? { ...where, type: qFilter } : where,
      distinct: ["type"],
      select: { type: true },
      orderBy: { type: "asc" },
      take: MAX_VALUES + 1,
    })
    return Response.json({
      values: rows.slice(0, MAX_VALUES).map((r) => r.type),
      hasMore: rows.length > MAX_VALUES,
    })
  }

  if (column === "categorie") {
    const rows = await prisma.mandat.findMany({
      where: { ...where, categorie: qFilter ? { ...qFilter, not: null } : { not: null } },
      distinct: ["categorie"],
      select: { categorie: true },
      orderBy: { categorie: "asc" },
      take: MAX_VALUES + 1,
    })
    const values = rows.map((r) => r.categorie).filter((v): v is string => v !== null)
    return Response.json({
      values: values.slice(0, MAX_VALUES),
      hasMore: values.length > MAX_VALUES,
    })
  }

  // column === "statut"
  const rows = await prisma.mandat.findMany({
    where: { ...where, statut: qFilter ? { ...qFilter, not: null } : { not: null } },
    distinct: ["statut"],
    select: { statut: true },
    orderBy: { statut: "asc" },
    take: MAX_VALUES + 1,
  })
  const values = rows.map((r) => r.statut).filter((v): v is string => v !== null)
  return Response.json({ values: values.slice(0, MAX_VALUES), hasMore: values.length > MAX_VALUES })
}
