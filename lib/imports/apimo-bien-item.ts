// Types partagés entre l'import Excel "Produits" (run-import-biens.ts) et la
// synchro API (lib/integrations/apimo/map-property.ts) - module sans dépendance
// à la base pour que les conversions restent testables en isolation.

// Mandat.type est NOT NULL : valeur affichée quand Apimo ne précise pas le type
// de mandat (~36% des biens, étapes amont comme "Attente mandat").
export const MANDAT_TYPE_INCONNU = "Non précisé"

// Champs Bien/Mandat déjà typés (nombres, dates) - produits soit depuis une ligne
// de l'export Excel "Produits" (buildBienData/buildMandatData ci-dessous), soit
// depuis l'API (lib/integrations/apimo/map-property.ts) : `upsertApimoBiens` ne
// sait pas d'où ils viennent.
export type ApimoBienFields = {
  adresse?: string
  commune?: string
  typeBien?: string
  surface?: number
  prix?: number
  statut?: string
  codePostal?: string
  quartier?: string
  pays?: string
  residence?: string
  adresseComplement?: string
  etage?: string
  numeroClef?: string
  pieces?: number
  chambres?: number
  devise?: string
  attributs?: string
  titre?: string
  description?: string
  photos: string[]
  energieConsommation?: number
  energieEmission?: number
  agence?: string
  utilisateur?: string
  referenceProduit?: string
  proprietaireLabel?: string
  creeLe?: Date
  majLe?: Date
}

export type ApimoMandatFields = {
  type: string
  statut?: string
  dateSignature?: Date
  categorie?: string
  coAgent?: string
  finMandat?: Date
  origine?: string
  originePrecise?: string
  honorairesProprietaire?: number
  honorairesAcheteur?: number
  montantProprietaire?: number
  montantCompromis?: number
  venduLe?: Date
}

export type ApimoOwnerInput = {
  // Id du contact Apimo (API uniquement) : rapprochement exact sur
  // Contact.sourceRef, l'export Excel ne donnant que le texte "Mme NOM".
  apimoContactId?: string
  civilite?: string
  prenom: string
  nom: string
  email?: string
  telephone?: string
}

// Un bien + son mandat (un couple par "Apinumber"/property.id) et ses
// propriétaires, le premier étant celui relié au mandat.
export type ApimoBienItem = {
  sourceRef: string
  bien: ApimoBienFields
  mandat: ApimoMandatFields
  owners: ApimoOwnerInput[]
}
