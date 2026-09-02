// Mapping colonnes → champs CRM pour l'export Septéo "liste impayés loyers"
// (gestion locative) — une ligne par lot en situation d'impayé, cf.
// `data/liste impayés loyers.csv`. Le rattachement bien/mandat/contacts se fait
// dans le runner (run-import-impayes.ts) via `Ref. Lot` → `Bien.referenceLot`.
import { at, cell, type HeaderIndex } from "./header-index"

export type ImpayeRow = {
  refLot: string
  locataireLabel?: string // "Nom Locataire" brut (libellé sale, non parsé)
  proprietaireLabel?: string // "Propriétaire" brut
  dateEntree?: string
  dateFinPreavis?: string
  solde?: string
  niveau?: string // "Niv"
  dateDerniereRelance?: string
  niveauDerniereRelance?: string
  ecartNiveau?: string // "True" | "False"
  frais?: string
  codeGli?: string
  procedureRelance?: string
  typeEnvoi?: string
}

export function mapImpayeRow(headerIndex: HeaderIndex, row: unknown[]): ImpayeRow | null {
  const refLot = cell(row, at(headerIndex, "reflot"))
  if (!refLot) return null

  return {
    refLot,
    locataireLabel: cell(row, at(headerIndex, "nomlocataire")),
    proprietaireLabel: cell(row, at(headerIndex, "proprietaire")),
    dateEntree: cell(row, at(headerIndex, "dateentree")),
    dateFinPreavis: cell(row, at(headerIndex, "datefinpreavis")),
    solde: cell(row, at(headerIndex, "solde")),
    niveau: cell(row, at(headerIndex, "niv")),
    dateDerniereRelance: cell(row, at(headerIndex, "datederniererelance")),
    niveauDerniereRelance: cell(row, at(headerIndex, "niveauderniererelance")),
    ecartNiveau: cell(row, at(headerIndex, "ecartniveau")),
    frais: cell(row, at(headerIndex, "frais")),
    codeGli: cell(row, at(headerIndex, "codegli")),
    procedureRelance: cell(row, at(headerIndex, "procedurederelance")),
    typeEnvoi: cell(row, at(headerIndex, "typeenvoi")),
  }
}
