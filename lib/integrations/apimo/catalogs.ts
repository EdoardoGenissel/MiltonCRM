import { apimoGetAbsolute } from "./client"

// Les valeurs codées de l'API (type de bien, statut, civilité, origine...) sont
// des ids de catalogue : on les retraduit avec les libellés français d'Apimo, qui
// sont exactement ceux de l'export Excel ("Vendu/loué par l'agence", "Maison
// jumelée"...) - indispensable pour que les filtres existants du CRM continuent
// de fonctionner après la bascule de l'import manuel vers l'API.
export const CATALOG_NAMES = [
  "property_type",
  "property_subtype",
  "property_status",
  "property_category",
  "property_agreement",
  "property_floor",
  "contact_title",
  "referral",
] as const

export type CatalogName = (typeof CATALOG_NAMES)[number]

type CatalogEntry = { id: number; name: string; name_plurial?: string }

export type ApimoCatalogs = Record<CatalogName, Map<number, CatalogEntry>>

export async function loadApimoCatalogs(): Promise<ApimoCatalogs> {
  const entries = await Promise.all(
    CATALOG_NAMES.map(async (name) => {
      const items = await apimoGetAbsolute<CatalogEntry[]>(`/catalogs/${name}`, { culture: "fr" })
      return [name, new Map(items.map((item) => [item.id, item]))] as const
    }),
  )
  return Object.fromEntries(entries) as ApimoCatalogs
}

export function catalogLabel(
  catalogs: ApimoCatalogs,
  name: CatalogName,
  id: number | string | null | undefined,
): string | undefined {
  if (id === null || id === undefined || id === "") return undefined
  return catalogs[name].get(Number(id))?.name
}
