// Source unique pour les 4 types de prospect du CRM - réutilisé par la page
// contacts, le filtre colonne (ColumnFilter) et le badge de fiche contact, pour
// éviter que le libellé "Bailleur" etc. ne vive qu'à un seul endroit.
//
// Les 4 types répondent aux 4 intentions immobilières, deux à deux symétriques :
// - vendeur   : veut vendre un bien              (côté transaction, offre)
// - acheteur  : veut acheter un bien             (côté transaction, demande)
// - bailleur  : veut mettre un bien en location  (côté location, offre)
// - locataire : cherche un bien à louer          (côté location, demande)
// Un contact peut en cumuler plusieurs (ex. un vendeur également acheteur).
// Les imports dérivent le type de la catégorie Apimo / du type de mandat -
// cf. lib/imports/apimo-persona.ts et lib/imports/septeo-persona.ts.
export const PERSONAS = [
  { value: "vendeur", label: "Vendeur" },
  { value: "acheteur", label: "Acheteur" },
  { value: "bailleur", label: "Bailleur" },
  { value: "locataire", label: "Locataire" },
] as const

export const PERSONA_LABELS: Record<string, string> = Object.fromEntries(
  PERSONAS.map((p) => [p.value, p.label]),
)
