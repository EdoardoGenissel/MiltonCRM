// Mapping colonnes → champs CRM pour les deux exports manuels du cadrage
// (scope.md §"Cadrage de la fiche") : "Export APIMMO.xlsx" (prospects) et les
// exports Septéo "Propriétaires"/"Locataires" (mêmes colonnes dans les deux
// fichiers, seul "Type interlocuteur" varie). Basé sur les fichiers réels transmis
// par Milton — cf. `data/` à la racine du dépôt pour les exemples de référence.
import { parseApimoContactName } from "./apimo-name"
import { parseSepteoPersonas } from "./septeo-persona"
import { at, buildHeaderIndex, cell, communeCell, type HeaderIndex } from "./header-index"

export type { HeaderIndex }
export { buildHeaderIndex }

export type ImportKind = "apimo_prospects" | "septeo_contacts" | "apimo_biens" | "septeo_biens"

export type ApimoProspectRow = {
  sourceRef?: string
  civilite?: string
  prenom: string
  nom: string
  telephone?: string
  email?: string
  commune?: string // "Ville" (zone de recherche), 1ère colonne de ce nom — pas l'adresse perso
  classification?: string // valeurs réelles : "Très actif" | "Normal" | "Actif"
  categorie?: string // "Location" | "Vente" | "Programme"
  typeBien?: string // valeur brute Apimo, potentiellement multi-valeurs ("Maison Appartement")
  loyerMax?: string // "Prix max", uniquement pertinent quand categorie = Location
  origine?: string
  alerteAbonne: boolean // colonne "Mailing" = "Abonné"

  // Champs supplémentaires (au-delà du socle acté dans scope.md) — le reste des
  // colonnes de l'export Apimo, importées pour une fiche prospect complète.
  coAgence?: string
  prixMin?: string
  prixMax?: string
  devise?: string
  pieces?: string
  surfaceMin?: string
  surfaceMax?: string
  secteur?: string
  quartier?: string
  derniereAction?: string // "Action" — date de la dernière action commerciale
  commentaire?: string
  creeLe?: string
  utilisateur?: string
  emailingAbonne?: boolean
  magazineAbonne?: boolean
  originePrecise?: string
  languesParlees: string[]
  dateNaissance?: string
  lieuNaissance?: string
  adressePersonnelle?: string
  adresseComplement?: string
  codePostal?: string
  villePersonnelle?: string
  pays?: string
  agence?: string
  referenceProduit?: string // 2ème colonne "Référence" (id produit/lead Apimo)
  criteresComplementaires?: string
  attributs?: string
  majLe?: string
  majPar?: string
}

export type SepteoContactRow = {
  nom: string
  prenom: string
  telephone?: string
  email?: string
  commune?: string // "Ville"
  personas: string[] // dérivés de "Type interlocuteur", cf. parseSepteoPersonas
}

export function mapApimoRow(headerIndex: HeaderIndex, row: unknown[]): ApimoProspectRow | null {
  const contactRaw = cell(row, at(headerIndex, "contact"))
  if (!contactRaw) return null

  const { civilite, prenom, nom } = parseApimoContactName(contactRaw)
  const categorie = cell(row, at(headerIndex, "categorie"))
  const mailing = cell(row, at(headerIndex, "mailing"))
  const emailing = cell(row, at(headerIndex, "emailing"))
  const magazine = cell(row, at(headerIndex, "magazine"))
  const langue1 = cell(row, at(headerIndex, "langueparlee1"))
  const langue2 = cell(row, at(headerIndex, "langueparlee2"))

  return {
    sourceRef: cell(row, at(headerIndex, "contactreference")),
    civilite,
    prenom,
    nom,
    telephone: cell(row, at(headerIndex, "telephone")),
    email: cell(row, at(headerIndex, "email")),
    commune: communeCell(row, at(headerIndex, "ville", 0)),
    classification: cell(row, at(headerIndex, "classification")),
    categorie,
    typeBien: cell(row, at(headerIndex, "type")),
    loyerMax: cell(row, at(headerIndex, "prixmax")),
    origine: cell(row, at(headerIndex, "origine")),
    alerteAbonne: mailing?.toLowerCase() === "abonné",

    coAgence: cell(row, at(headerIndex, "coagence")),
    prixMin: cell(row, at(headerIndex, "prixmin")),
    prixMax: cell(row, at(headerIndex, "prixmax")),
    devise: cell(row, at(headerIndex, "devise")),
    pieces: cell(row, at(headerIndex, "pieces")),
    surfaceMin: cell(row, at(headerIndex, "surfacemin")),
    surfaceMax: cell(row, at(headerIndex, "surfacemax")),
    secteur: cell(row, at(headerIndex, "secteur")),
    quartier: cell(row, at(headerIndex, "quartier")),
    derniereAction: cell(row, at(headerIndex, "action")),
    commentaire: cell(row, at(headerIndex, "commentaire")),
    creeLe: cell(row, at(headerIndex, "creele")),
    utilisateur: cell(row, at(headerIndex, "utilisateur")),
    emailingAbonne: emailing ? emailing.toLowerCase() === "abonné" : undefined,
    magazineAbonne: magazine ? magazine.toLowerCase() === "abonné" : undefined,
    originePrecise: cell(row, at(headerIndex, "origineprecise")),
    languesParlees: [langue1, langue2].filter((v): v is string => Boolean(v)),
    dateNaissance: cell(row, at(headerIndex, "datedenaissance")),
    lieuNaissance: cell(row, at(headerIndex, "lieudenaissance")),
    adressePersonnelle: cell(row, at(headerIndex, "adresse", 0)),
    adresseComplement: cell(row, at(headerIndex, "adresse", 1)),
    codePostal: cell(row, at(headerIndex, "codepostal")),
    villePersonnelle: communeCell(row, at(headerIndex, "ville", 1)),
    pays: cell(row, at(headerIndex, "pays")),
    agence: cell(row, at(headerIndex, "agence")),
    referenceProduit: cell(row, at(headerIndex, "reference", 0)),
    criteresComplementaires: cell(row, at(headerIndex, "criterescomplementaires")),
    attributs: cell(row, at(headerIndex, "attributs")),
    majLe: cell(row, at(headerIndex, "miseajourle")),
    majPar: cell(row, at(headerIndex, "misajourpar")),
  }
}

export function mapSepteoRow(headerIndex: HeaderIndex, row: unknown[]): SepteoContactRow | null {
  const nom = cell(row, at(headerIndex, "nom"))
  // Le prénom peut être absent : de nombreuses fiches propriétaire/locataire sont
  // des personnes morales (SCI, sociétés — "CRM MAHURY", "G&H PATRIMOINE"...) où
  // seul le nom (raison sociale) est renseigné.
  if (!nom) return null
  const prenom = cell(row, at(headerIndex, "prenom")) ?? ""

  const portable = cell(row, at(headerIndex, "portable"))
  const telephone1 = cell(row, at(headerIndex, "telephone1"))
  const typeInterlocuteur = cell(row, at(headerIndex, "typeinterlocuteur"))

  return {
    nom,
    prenom,
    telephone: portable ?? telephone1,
    email: cell(row, at(headerIndex, "email")),
    commune: communeCell(row, at(headerIndex, "ville")),
    personas: parseSepteoPersonas(typeInterlocuteur),
  }
}
