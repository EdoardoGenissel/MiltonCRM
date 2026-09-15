import type { NextRequest } from "next/server"
import { prisma } from "@/lib/db/prisma"
import {
  buildEstimationWhere,
  ESTIMATION_STATUTS,
  type EstimationFilterColumn,
  type EstimationListFilters,
} from "@/lib/estimations/queries"

const COLUMNS: EstimationFilterColumn[] = ["statut"]

function readFilters(params: URLSearchParams): EstimationListFilters {
  return {
    search: params.get("search") ?? undefined,
    statut: params.getAll("statut"),
  }
}

// Valeurs uniques pour un filtre colonne façon Excel sur la page Estimations -
// même principe que app/api/contacts/column-values (cf. components/column-filter.tsx).
export async function GET(request: NextRequest) {
  const params = request.nextUrl.searchParams
  const column = params.get("column")
  if (!column || !COLUMNS.includes(column as EstimationFilterColumn)) {
    return Response.json({ error: "Colonne invalide." }, { status: 400 })
  }

  const q = params.get("q")?.trim().toLowerCase() ?? ""
  const where = buildEstimationWhere(readFilters(params), column as EstimationFilterColumn)

  // column === "statut" : liste fermée (4 valeurs connues) - on ne propose que
  // celles réellement présentes compte tenu des autres filtres actifs.
  const rows = await prisma.estimation.findMany({
    where,
    distinct: ["statut"],
    select: { statut: true },
  })
  const present = new Set(rows.map((r) => r.statut))
  const values = ESTIMATION_STATUTS.map((s) => s.value).filter(
    (v) => present.has(v) && v.toLowerCase().includes(q),
  )
  return Response.json({ values, hasMore: false })
}
