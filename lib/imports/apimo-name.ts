// L'export Apimo ne fournit pas prénom/nom/civilité en colonnes séparées : tout
// est concaténé dans une seule colonne "Contact" (ex. "Madame Sabrina MOZONOE",
// "Annamet CEDER", "Madame BETSHA"). Format observé : civilité optionnelle, puis
// "Prénom NOM" où NOM est en capitales - on s'appuie sur la casse pour séparer les
// deux plutôt que sur une position fixe, sinon les entrées à un seul mot (nom
// seul) ou à nom composé cassent tout.
const CIVILITES = ["Madame", "Monsieur", "Mademoiselle"]

export type ParsedApimoName = {
  civilite?: string
  prenom: string
  nom: string
}

function isUppercaseWord(token: string): boolean {
  return /[A-ZÀ-Ý]/.test(token) && token === token.toUpperCase()
}

export function parseApimoContactName(raw: string): ParsedApimoName {
  let rest = raw.trim()
  let civilite: string | undefined

  for (const c of CIVILITES) {
    if (rest.startsWith(`${c} `)) {
      civilite = c
      rest = rest.slice(c.length).trim()
      break
    }
  }

  const tokens = rest.split(/\s+/).filter(Boolean)
  if (tokens.length === 0) return { civilite, prenom: "", nom: "" }

  let splitIndex = tokens.length
  for (let i = tokens.length - 1; i >= 0; i--) {
    if (isUppercaseWord(tokens[i])) {
      splitIndex = i
    } else {
      break
    }
  }
  // Aucun token en capitales trouvé (nom mal formaté) : on retombe sur le
  // dernier mot comme nom plutôt que de tout mettre en prénom.
  if (splitIndex === tokens.length) splitIndex = tokens.length - 1

  const nom = tokens.slice(splitIndex).join(" ")
  const prenom = tokens.slice(0, splitIndex).join(" ")

  return { civilite, prenom, nom }
}
