import type { Source } from "@/lib/generated/prisma/enums"

export type BienMatchCandidate = {
  id: string
  source: Source
  adresse: string | null
  commune: string | null
}

export type IncomingBienAddress = {
  adresse: string | null
  commune: string | null
}

// Normalise une adresse pour comparaison (accents, casse, ponctuation, espaces
// multiples) — un même bien n'est pas forcément saisi de façon identique entre
// un export Apimo/Septéo et une saisie libre JotForm.
export function normalizeAddress(value: string): string {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toUpperCase()
    .replace(/[^A-Z0-9]+/g, " ")
    .trim()
}

// Résout un bien issu du formulaire JotForm contre les biens déjà importés
// depuis Apimo/Septéo (seules sources faisant foi pour la fiche bien, cf. demande
// "favoriser Apimo/Septéo") — pour éviter de créer un doublon quand un commercial
// a rempli le formulaire pour un bien déjà en mandat. Correspondance stricte sur
// l'adresse normalisée (+ commune si les deux la renseignent) : pas de fuzzy
// matching, un faux positif fusionnerait les données de deux biens différents.
export function resolveBienMatch(
  candidates: BienMatchCandidate[],
  incoming: IncomingBienAddress,
): string | null {
  if (!incoming.adresse) return null
  const incomingAddress = normalizeAddress(incoming.adresse)
  // Comparaison accent/casse-insensible aussi pour la commune (contrairement à
  // `normalizeCommune`, qui uppercase sans retirer les accents et sert
  // uniquement à l'affichage/filtre des imports — cf. lib/imports/normalize-commune.ts).
  const incomingCommune = incoming.commune ? normalizeAddress(incoming.commune) : null

  const match = candidates.find((c) => {
    if (!c.adresse || normalizeAddress(c.adresse) !== incomingAddress) return false
    if (incomingCommune && c.commune) return normalizeAddress(c.commune) === incomingCommune
    return true
  })

  return match?.id ?? null
}

// Ne retient, parmi `incoming`, que les champs actuellement vides sur `existing`
// — c'est ce qui matérialise la priorité Apimo/Septéo : une valeur déjà présente
// (donc issue d'Apimo/Septéo, seules sources qui écrivent sur un bien matché)
// n'est jamais écrasée par une donnée JotForm.
// `E` (le type "lu" en base, ex. Decimal pour un champ numérique Prisma) et `I`
// (le type "écrit", ex. number — Prisma accepte les deux en entrée) diffèrent
// volontairement : on ne compare que la présence de valeur, jamais le type.
export function fillBlanks<
  E extends Record<string, unknown>,
  I extends Partial<Record<keyof E, unknown>>,
>(existing: E, incoming: I): Partial<I> {
  const update: Partial<I> = {}
  for (const key of Object.keys(incoming) as (keyof I)[]) {
    const value = incoming[key]
    if (value === null || value === undefined) continue
    if (Array.isArray(value) && value.length === 0) continue

    const currentValue = existing[key as unknown as keyof E]
    const isEmpty =
      currentValue === null ||
      currentValue === undefined ||
      (Array.isArray(currentValue) && currentValue.length === 0)
    if (isEmpty) update[key] = value
  }
  return update
}
