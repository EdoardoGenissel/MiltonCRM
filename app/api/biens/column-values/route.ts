import type { NextRequest } from "next/server"
import { prisma } from "@/lib/db/prisma"
import { buildBienWhere, type BienListFilters, type BienFilterColumn } from "@/lib/biens/queries"

const COLUMNS: BienFilterColumn[] = ["commune", "typeBien", "statut", "source", "categorie"]
const MAX_VALUES = 100

function readFilters(params: URLSearchParams): BienListFilters {
  return {
    search: params.get("search") ?? undefined,
    commune: params.getAll("commune"),
    typeBien: params.getAll("typeBien"),
    statut: params.getAll("statut"),
    source: params.getAll("source"),
    categorie: params.getAll("categorie"),
  }
}

// Valeurs uniques pour un filtre colonne façon Excel sur la page Biens — même
// principe que app/api/contacts/column-values (cf. components/column-filter.tsx).
export async function GET(request: NextRequest) {
  const params = request.nextUrl.searchParams
  const column = params.get("column")
  if (!column || !COLUMNS.includes(column as BienFilterColumn)) {
    return Response.json({ error: "Colonne invalide." }, { status: 400 })
  }

  const q = params.get("q")?.trim() ?? ""
  const filters = readFilters(params)
  const where = buildBienWhere(filters, column as BienFilterColumn)
  const qFilter = q ? { contains: q, mode: "insensitive" as const } : undefined

  if (column === "source") {
    const rows = await prisma.bien.findMany({
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

  // `categorie` vit sur Mandat, pas sur Bien (cf. lib/biens/queries.ts) — on
  // interroge donc les mandats dont le bien correspond aux filtres actifs.
  if (column === "categorie") {
    const rows = await prisma.mandat.findMany({
      where: { bien: where, categorie: qFilter ? { ...qFilter, not: null } : { not: null } },
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

  if (column === "commune") {
    const rows = await prisma.bien.findMany({
      where: { ...where, commune: qFilter ? { ...qFilter, not: null } : { not: null } },
      distinct: ["commune"],
      select: { commune: true },
      orderBy: { commune: "asc" },
      take: MAX_VALUES + 1,
    })
    const values = rows.map((r) => r.commune).filter((v): v is string => v !== null)
    return Response.json({
      values: values.slice(0, MAX_VALUES),
      hasMore: values.length > MAX_VALUES,
    })
  }

  if (column === "typeBien") {
    const rows = await prisma.bien.findMany({
      where: { ...where, typeBien: qFilter ? { ...qFilter, not: null } : { not: null } },
      distinct: ["typeBien"],
      select: { typeBien: true },
      orderBy: { typeBien: "asc" },
      take: MAX_VALUES + 1,
    })
    const values = rows.map((r) => r.typeBien).filter((v): v is string => v !== null)
    return Response.json({
      values: values.slice(0, MAX_VALUES),
      hasMore: values.length > MAX_VALUES,
    })
  }

  // column === "statut"
  const rows = await prisma.bien.findMany({
    where: { ...where, statut: qFilter ? { ...qFilter, not: null } : { not: null } },
    distinct: ["statut"],
    select: { statut: true },
    orderBy: { statut: "asc" },
    take: MAX_VALUES + 1,
  })
  const values = rows.map((r) => r.statut).filter((v): v is string => v !== null)
  return Response.json({ values: values.slice(0, MAX_VALUES), hasMore: values.length > MAX_VALUES })
}
