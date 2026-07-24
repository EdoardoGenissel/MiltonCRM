// Les exports Apimo/Septéo ne sont pas cohérents en casse pour un même nom de
// commune (ex. "cayenne" / "Cayenne" / "CAYENNE" trouvés dans le même export
// Septéo réel) — ça casse le filtre colonne "à la Excel" (3 valeurs distinctes au
// lieu d'une) et la recherche par commune. Normalisation en majuscules : c'est déjà
// la convention majoritaire dans les deux sources, la plus simple à appliquer sans
// se heurter aux règles de capitalisation des noms composés français (particules
// "de"/"du"/"des" en minuscule dans l'usage officiel, ex. Saint-Laurent-du-Maroni).
export function normalizeCommune(value: string): string {
  return value.trim().replace(/\s+/g, " ").toUpperCase()
}
