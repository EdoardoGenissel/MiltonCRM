// Mapping colonnes → champs CRM pour l'export Septéo "liste loyer appelé"
// (gestion locative) - grand-livre du compte locataires : une ligne = un poste
// comptable (loyer, provisions de charges, TVA...), cf.
// `data/liste loyer appelé.csv`. Le runner (run-import-loyers-appeles.ts)
// agrège ensuite les lignes par quittance (folio + pièce + date + auxiliaire).
import { at, cell, type HeaderIndex } from "./header-index"

export type LoyerAppeleRow = {
  numeroFolio?: string
  numeroPiece?: string
  dateEcriture?: string
  auxiliaire?: string // code compte locataire ("L000307")
  locataireLabel?: string // "Libellé auxiliaire"
  libelleEcriture?: string
  debit?: string
  credit?: string
  societe?: string
  gestionnaire?: string
  categorieLot?: string // "Catégorie"
  typeLot?: string // "Type"
}

export function mapLoyerAppeleRow(headerIndex: HeaderIndex, row: unknown[]): LoyerAppeleRow | null {
  const numeroFolio = cell(row, at(headerIndex, "numerofolio"))
  const numeroPiece = cell(row, at(headerIndex, "numeropiece"))
  if (!numeroFolio && !numeroPiece) return null

  return {
    numeroFolio,
    numeroPiece,
    dateEcriture: cell(row, at(headerIndex, "dateecriture")),
    auxiliaire: cell(row, at(headerIndex, "auxiliaire")),
    locataireLabel: cell(row, at(headerIndex, "libelleauxiliaire")),
    libelleEcriture: cell(row, at(headerIndex, "libelleecriture")),
    debit: cell(row, at(headerIndex, "debit")),
    credit: cell(row, at(headerIndex, "credit")),
    societe: cell(row, at(headerIndex, "societe")),
    gestionnaire: cell(row, at(headerIndex, "gestionnaire")),
    categorieLot: cell(row, at(headerIndex, "categorie")),
    typeLot: cell(row, at(headerIndex, "type")),
  }
}
