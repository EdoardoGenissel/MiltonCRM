// Mapping colonnes → champs CRM pour l'export Apimo "Produits" (feuille
// "Produits" du classeur biens/mandats, ex. `data/properties/Properties
// APImmo.xlsx`) — un bien + un mandat par ligne, éventuellement rattachés à un
// propriétaire (cf. `lib/imports/apimo-proprietaire.ts` pour le parsing de la
// colonne "Propriétaire", volontairement pauvre côté Apimo).
import { at, cell, communeCell, type HeaderIndex } from "./header-index"

export type ApimoBienRow = {
  // Identité du bien — "Apinumber" est l'id interne Apimo, toujours renseigné,
  // utilisé comme sourceRef pour le dédoublonnage (contrairement à "Référence",
  // la référence publique de l'annonce, moins systématiquement remplie).
  apinumber: string
  referenceProduit?: string
  etape?: string
  categorie?: string // "Vente" | "Location"
  typeBien?: string
  pays?: string
  adresse?: string
  adresseComplement?: string
  residence?: string
  codePostal?: string
  commune?: string
  quartier?: string
  prix?: string
  montantProprietaire?: string
  devise?: string
  pieces?: string
  chambres?: string
  surface?: string
  numeroClef?: string
  agence?: string
  utilisateur?: string
  origine?: string
  originePrecise?: string
  honorairesProprietaire?: string
  honorairesAcheteur?: string
  typeMandat?: string // "Simple" | "Exclusif" | ...
  demarrageMandat?: string
  finMandat?: string
  etage?: string
  montantCompromis?: string
  venduLe?: string
  attributs?: string
  titre?: string
  description?: string
  photos: string[]
  energieConsommation?: string
  energieEmission?: string
  creeLe?: string
  majLe?: string

  // Propriétaire — texte brut conservé sur le bien quel que soit le résultat du
  // rapprochement (co-propriétaires, raison sociale...), coordonnées utilisées
  // pour tenter de relier/créer une fiche contact (cf. run-import-biens.ts).
  proprietaireLabel?: string
  proprietaireTelephone?: string
  proprietaireEmail?: string
  coAgent?: string
}

// Les photos sont une liste d'URLs séparées par ", " dans la cellule Excel.
function parsePhotos(value: string | undefined): string[] {
  if (!value) return []
  return value
    .split(",")
    .map((url) => url.trim())
    .filter(Boolean)
}

export function mapApimoBienRow(headerIndex: HeaderIndex, row: unknown[]): ApimoBienRow | null {
  const apinumber = cell(row, at(headerIndex, "apinumber"))
  if (!apinumber) return null

  return {
    apinumber,
    referenceProduit: cell(row, at(headerIndex, "reference", 0)),
    etape: cell(row, at(headerIndex, "etape")),
    categorie: cell(row, at(headerIndex, "categorie")),
    typeBien: cell(row, at(headerIndex, "type")),
    pays: cell(row, at(headerIndex, "pays")),
    adresse: cell(row, at(headerIndex, "adresse", 0)),
    adresseComplement: cell(row, at(headerIndex, "adresse", 1)),
    residence: cell(row, at(headerIndex, "residence")),
    codePostal: cell(row, at(headerIndex, "codepostal")),
    commune: communeCell(row, at(headerIndex, "ville")),
    quartier: cell(row, at(headerIndex, "quartier")),
    prix: cell(row, at(headerIndex, "prix")),
    montantProprietaire: cell(row, at(headerIndex, "montantproprietaire")),
    devise: cell(row, at(headerIndex, "devise")),
    pieces: cell(row, at(headerIndex, "pieces")),
    chambres: cell(row, at(headerIndex, "chambres")),
    surface: cell(row, at(headerIndex, "surface")),
    numeroClef: cell(row, at(headerIndex, "numerodeclef")),
    agence: cell(row, at(headerIndex, "agence")),
    utilisateur: cell(row, at(headerIndex, "utilisateur")),
    origine: cell(row, at(headerIndex, "origine")),
    originePrecise: cell(row, at(headerIndex, "origineprecise")),
    honorairesProprietaire: cell(row, at(headerIndex, "honorairesproprietaire")),
    honorairesAcheteur: cell(row, at(headerIndex, "honorairesacheteur")),
    typeMandat: cell(row, at(headerIndex, "mandat")),
    demarrageMandat: cell(row, at(headerIndex, "demarragemandat")),
    finMandat: cell(row, at(headerIndex, "finmandat")),
    etage: cell(row, at(headerIndex, "etage")),
    montantCompromis: cell(row, at(headerIndex, "montantcompromis")),
    venduLe: cell(row, at(headerIndex, "vendule")),
    attributs: cell(row, at(headerIndex, "attributs")),
    titre: cell(row, at(headerIndex, "titrefr")),
    description: cell(row, at(headerIndex, "commentairefr")),
    photos: parsePhotos(cell(row, at(headerIndex, "photos"))),
    energieConsommation: cell(row, at(headerIndex, "energieconsommationconventionnelle")),
    energieEmission: cell(row, at(headerIndex, "energieestimationdesemissions")),
    creeLe: cell(row, at(headerIndex, "creele")),
    majLe: cell(row, at(headerIndex, "miseajourle")),

    proprietaireLabel: cell(row, at(headerIndex, "proprietaire")),
    proprietaireTelephone: cell(row, at(headerIndex, "telephone")),
    proprietaireEmail: cell(row, at(headerIndex, "email")),
    coAgent: cell(row, at(headerIndex, "coagent")),
  }
}
