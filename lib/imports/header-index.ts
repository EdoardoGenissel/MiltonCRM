// Indexation générique des en-têtes de colonnes pour les imports Excel/CSV
// (prospects, biens/mandats) - extrait de mapping.ts pour être partagé entre les
// différents mappings sans dupliquer la logique de normalisation/lookup.
import { unwrapQuotes } from "./text-clean"
import { normalizeCommune } from "./normalize-commune"

function normalizeHeader(header: string): string {
  return header
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]/g, "")
}

export function cell(row: unknown[], index: number | undefined): string | undefined {
  if (index === undefined || index < 0) return undefined
  const raw = row[index]
  if (raw === undefined || raw === null) return undefined
  const value = unwrapQuotes(String(raw).trim())
  return value === "" || value === '""' ? undefined : value
}

export function communeCell(row: unknown[], index: number | undefined): string | undefined {
  const value = cell(row, index)
  return value ? normalizeCommune(value) : undefined
}

export type HeaderIndex = Map<string, number[]>

export function buildHeaderIndex(headerRow: unknown[]): HeaderIndex {
  const index: HeaderIndex = new Map()
  headerRow.forEach((h, i) => {
    if (h) {
      const key = normalizeHeader(String(h))
      const existing = index.get(key)
      if (existing) existing.push(i)
      else index.set(key, [i])
    }
  })
  return index
}

// Certains en-têtes Apimo apparaissent deux fois avec un sens différent selon
// l'occurrence (ex. "Ville" = zone de recherche du prospect puis adresse
// personnelle, "Adresse"/"Référence" pareil) - `occurrence` sélectionne le
// n-ième index (0 = premier, par défaut).
export function at(index: HeaderIndex, key: string, occurrence = 0): number | undefined {
  return index.get(key)?.[occurrence]
}
