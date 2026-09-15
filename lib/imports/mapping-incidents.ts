// Mapping colonnes → champs CRM pour l'export Septéo "Liste incident" (gestion
// locative) - un événement de gestion par ligne (travaux, remboursement DG,
// courrier...), cf. `data/Liste incident.csv`. Fichier CSV quoté avec des
// retours-ligne embarqués dans "Objet / Libellé" (cf. lib/imports/excel-parser.ts).
// Le rattachement contact/bien/mandat se fait dans le runner
// (run-import-incidents.ts) via le libellé "Tiers".
import { at, cell, type HeaderIndex } from "./header-index"

export type IncidentRow = {
  sourceRef: string // "Référence" (id événement Septéo)
  tiersLabel?: string
  objet?: string
  creeLe?: string
  responsable?: string
  etat?: string // "État de l'événement"
  derniereEtape?: string
}

export function mapIncidentRow(headerIndex: HeaderIndex, row: unknown[]): IncidentRow | null {
  const sourceRef = cell(row, at(headerIndex, "reference"))
  if (!sourceRef) return null

  return {
    sourceRef,
    tiersLabel: cell(row, at(headerIndex, "tiers")),
    objet: cell(row, at(headerIndex, "objetlibelle")),
    creeLe: cell(row, at(headerIndex, "creele")),
    responsable: cell(row, at(headerIndex, "responsable")),
    etat: cell(row, at(headerIndex, "etatdelevenement")),
    derniereEtape: cell(row, at(headerIndex, "derniereetape")),
  }
}
