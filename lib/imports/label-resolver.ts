import { normalizeName } from "@/lib/contacts/dedupe"

// Résolution d'un contact à partir d'un simple libellé texte (nom concaténé),
// pour les exports Septéo "gestion locative" (impayés, incidents, loyers
// appelés) qui ne portent NI email NI téléphone - le nom seul est le signal le
// plus faible du système (cf. `resolveContactByIdentity` qui ne l'utilise qu'en
// dernier recours). On reste donc volontairement strict :
//
// - match uniquement si le libellé pointe vers *exactement un* contact ;
// - on ne crée jamais de fiche (contrairement à `PersonResolver`) - si rien ou
//   trop de candidats, on renvoie null et l'appelant conserve le libellé brut.
//
// Les libellés Septéo mêlent personnes physiques ("SAGNE Eric", "ROMNEY Kévin"
// - NOM en tête) et personnes morales ("GENDARMERIE NATIONALE", "TECHNIPRO
// GUYANE" - stockées côté Contact avec `prenom` vide). On indexe donc plusieurs
// formes par contact et on teste le libellé entier contre cet index.

export type LabelCandidate = { id: string; nom: string; prenom: string }

export type ContactLabelIndex = Map<string, Set<string>>

function keysForContact(nom: string, prenom: string): string[] {
  const n = normalizeName(nom)
  const p = normalizeName(prenom)
  if (!n) return []
  if (!p) return [n]
  // "prenom nom" et "nom prenom" - l'ordre varie selon la source du libellé.
  return [`${p} ${n}`, `${n} ${p}`]
}

export function buildContactLabelIndex(candidates: LabelCandidate[]): ContactLabelIndex {
  const index: ContactLabelIndex = new Map()
  for (const c of candidates) {
    for (const key of keysForContact(c.nom, c.prenom)) {
      const set = index.get(key) ?? new Set<string>()
      set.add(c.id)
      index.set(key, set)
    }
  }
  return index
}

export function resolveContactByLabel(
  index: ContactLabelIndex,
  rawLabel: string | undefined,
): string | null {
  if (!rawLabel) return null
  const key = normalizeName(rawLabel)
  if (!key) return null
  const matches = index.get(key)
  if (!matches || matches.size !== 1) return null
  return [...matches][0]
}
