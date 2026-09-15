// La colonne "Type interlocuteur" des exports Septéo est multi-valuée (valeurs
// séparées par une virgule à l'intérieur de la cellule, ex. "Locataire
// Gérance,Propriétaire Gérance" pour quelqu'un qui cumule les deux - même logique
// que "un prospect peut aussi être propriétaire" côté Apimo, cf. scope.md). Les
// libellés exacts observés dans les exports réels ("Propriétaire Gérance",
// "Propriétaire Location simple", "Locataire Gérance", "Locataire mandat simple",
// "Colocataire", "Fournisseur", "Allocations Familliales"...) ne correspondent pas
// tous à un type de prospect du CRM (vendeur/acheteur/bailleur/locataire) -
// "Fournisseur" et "Allocations Familliales" sont donc ignorés plutôt que forcés
// dans un type qui ne convient pas. Cet export étant 100% gestion locative, un
// "Propriétaire ..." y est toujours un bailleur (jamais un vendeur).
export function parseSepteoPersonas(typeInterlocuteur: string | undefined): string[] {
  if (!typeInterlocuteur) return []

  const personas = new Set<string>()
  for (const rawToken of typeInterlocuteur.split(",")) {
    const token = rawToken.trim().toLowerCase()
    if (!token) continue
    if (token.includes("propriétaire") || token.includes("proprietaire")) {
      personas.add("bailleur")
    } else if (token.includes("locataire") || token.includes("colocataire")) {
      personas.add("locataire")
    }
  }
  return [...personas]
}
