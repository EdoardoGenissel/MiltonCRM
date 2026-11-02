import type { NextRequest } from "next/server"
import {
  listVisiteColumnValues,
  VISITE_FILTER_COLUMNS,
  type VisiteFilterColumn,
  type VisiteListFilters,
} from "@/lib/visites/queries"

function readFilters(params: URLSearchParams): VisiteListFilters {
  return {
    search: params.get("search") ?? undefined,
    typeBien: params.getAll("typeBien"),
    commune: params.getAll("commune"),
    categorie: params.getAll("categorie"),
    conseiller: params.getAll("conseiller"),
    statut: params.getAll("statut"),
  }
}

export async function GET(request: NextRequest) {
  const params = request.nextUrl.searchParams
  const column = params.get("column")
  if (!column || !VISITE_FILTER_COLUMNS.includes(column as VisiteFilterColumn)) {
    return Response.json({ error: "Colonne invalide." }, { status: 400 })
  }

  const q = params.get("q") ?? ""
  return Response.json(listVisiteColumnValues(column as VisiteFilterColumn, readFilters(params), q))
}
