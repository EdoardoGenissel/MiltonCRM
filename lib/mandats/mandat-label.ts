// Type vs catégorie d'un mandat : pour un mandat Septéo, `type` vaut
// « Gestion locative » et recoupe `categorie` (« Location ») ; côté Apimo `type`
// vaut « simple »/« exclusif » et complète utilement la catégorie
// (« Vente »/« Location »). On affiche donc la catégorie en info principale et on
// ne garde le type qu'en complément quand il apporte autre chose
// (cf. feedback : « garder catégorie, alléger type »).

type MandatLike = { type: string; categorie: string | null }

// Types qui n'ajoutent rien à la catégorie correspondante.
const REDUNDANT_TYPES = new Set(["gestion locative", "vente", "location"])

// Libellé principal (badge) : la catégorie si elle existe, sinon le type.
export function mandatBadgeLabel({ type, categorie }: MandatLike): string {
  return categorie?.trim() || type
}

// Complément affiché à côté du badge, ou null quand le type est redondant avec
// la catégorie (ou absent).
export function mandatTypeComplement({ type, categorie }: MandatLike): string | null {
  const t = type?.trim()
  if (!t) return null
  const c = categorie?.trim().toLowerCase() ?? ""
  if (!c) return null // pas de catégorie : le type est déjà porté par le badge
  const tl = t.toLowerCase()
  if (tl === c || REDUNDANT_TYPES.has(tl)) return null
  return t
}
