// La colonne "Propriétaire" de l'export Apimo "Produits" (biens/mandats) est bien
// plus pauvre que la colonne "Contact" de l'export prospects (cf. apimo-name.ts) :
// souvent juste "Mme NOM" ou "M. NOM" sans prénom, parfois un prénom réduit à une
// initiale ("Mme M. BERGAUD"), parfois plusieurs co-propriétaires séparés par
// " - " ("M. CHATAIGNE - M. GOILLOT"), parfois une raison sociale nue ("COETA").
// On n'essaie de résoudre/créer un contact que pour le cas simple (un seul
// propriétaire) — au-delà, le risque de mal attribuer une fiche est trop élevé
// (cf. décision produit : le texte brut reste affiché sur la fiche bien via
// `Bien.proprietaireLabel`, que la résolution réussisse ou non).
const CIVILITES: Record<string, string> = {
  "Mme": "Madame",
  "M.": "Monsieur",
  "Mlle": "Mademoiselle",
}

export type ParsedApimoProprietaire = {
  civilite?: string
  prenom: string
  nom: string
}

function isInitiale(token: string): boolean {
  return /^[A-ZÀ-Ý]\.$/.test(token)
}

// `null` = plusieurs propriétaires (texte non résolvable en une seule fiche).
export function parseApimoProprietaire(raw: string | undefined): ParsedApimoProprietaire | null {
  if (!raw) return null
  if (raw.includes(" - ")) return null

  let rest = raw.trim()
  let civilite: string | undefined

  for (const [abbrev, full] of Object.entries(CIVILITES)) {
    if (rest.startsWith(`${abbrev} `)) {
      civilite = full
      rest = rest.slice(abbrev.length).trim()
      break
    }
  }

  const tokens = rest.split(/\s+/).filter(Boolean)
  if (tokens.length === 0) return null

  // Prénom réduit à une initiale en tête ("M. BERGAUD" une fois la civilité
  // retirée) : le reste est le nom.
  if (tokens.length > 1 && isInitiale(tokens[0])) {
    return { civilite, prenom: tokens[0], nom: tokens.slice(1).join(" ") }
  }

  return { civilite, prenom: "", nom: tokens.join(" ") }
}
