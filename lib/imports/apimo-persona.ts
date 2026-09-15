// L'export Apimo "prospects" ne dit pas explicitement le type de prospect : on le
// déduit de la colonne "Catégorie" ("Vente" | "Location" | "Programme"). "Vente"
// et "Programme" (achat dans le neuf) => acheteur ; "Location" => locataire ;
// valeur absente ou inconnue => acheteur, cas le plus courant côté transaction.
// Cf. lib/contacts/personas.ts pour les 4 types.
export function apimoProspectPersona(categorie: string | undefined): string {
  const value = categorie?.trim().toLowerCase() ?? ""
  if (value.startsWith("location")) return "locataire"
  return "acheteur"
}

// Un propriétaire rencontré via l'export Apimo "Produits" (biens + mandats) est
// vendeur ou bailleur selon la catégorie du mandat : "Location" => bailleur,
// tout le reste ("Vente", vide...) => vendeur (la transaction est le cas par
// défaut de cet export). L'export Septéo, lui, est 100% gestion locative -
// cf. run-import-biens-septeo.ts qui force "bailleur" en dur.
export function apimoOwnerPersona(mandatCategorie: string | undefined): string {
  const value = mandatCategorie?.trim().toLowerCase() ?? ""
  if (value.startsWith("location")) return "bailleur"
  return "vendeur"
}
