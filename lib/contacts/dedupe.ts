import type { Source } from "@/lib/generated/prisma/enums"

export type ContactMatchCandidate = {
  id: string
  source: Source
  sourceRef: string | null
  nom: string
  prenom: string
  telephone: string | null
}

export type IncomingContact = {
  source: Source
  sourceRef?: string | null
  nom: string
  prenom: string
  telephone?: string | null
}

// Normalise un numéro de téléphone français pour comparaison (espaces, points,
// tirets, indicatif +33/0033 ignorés) — évite les faux négatifs de dédup entre
// exports Apimo/Septéo qui ne formatent pas les numéros de la même façon.
export function normalizePhone(phone: string): string {
  const digits = phone.replace(/\D/g, "")
  if (digits.startsWith("33") && digits.length === 11) return "0" + digits.slice(2)
  if (digits.startsWith("0033")) return "0" + digits.slice(4)
  return digits
}

// Normalise un nom/prénom pour comparaison : trim, minuscules, accents retirés,
// espaces multiples réduits. Utilisé par `sameName` et par le resolver de
// contact par libellé (imports gestion locative).
export function normalizeName(value: string): string {
  return value.normalize("NFD").replace(/[̀-ͯ]/g, "").trim().toLowerCase().replace(/\s+/g, " ")
}

export function sameName(a: string, b: string): boolean {
  return a.trim().toLowerCase() === b.trim().toLowerCase()
}

// Résout un contact entrant (ligne d'import Excel) contre les contacts déjà en
// base. Priorité 1 : même source + même identifiant externe (sourceRef) —
// réconciliation exacte pour les imports successifs. Priorité 2 (fallback,
// pas de sourceRef ou 1er import) : nom + prénom + téléphone identiques.
export function resolveContactMatch(
  candidates: ContactMatchCandidate[],
  incoming: IncomingContact,
): string | null {
  if (incoming.sourceRef) {
    const bySourceRef = candidates.find(
      (c) => c.source === incoming.source && c.sourceRef === incoming.sourceRef,
    )
    if (bySourceRef) return bySourceRef.id
  }

  const incomingPhone = incoming.telephone ? normalizePhone(incoming.telephone) : null

  const byIdentity = candidates.find((c) => {
    if (!sameName(c.nom, incoming.nom) || !sameName(c.prenom, incoming.prenom)) return false
    if (!incomingPhone) return true
    if (!c.telephone) return false
    return normalizePhone(c.telephone) === incomingPhone
  })

  return byIdentity?.id ?? null
}

export type IdentityMatchCandidate = {
  id: string
  email: string | null
  telephone: string | null
  nom: string
  prenom: string
}

export type IncomingIdentity = {
  email?: string
  telephone?: string
  nom?: string
  prenom?: string
}

// Résolution d'une personne physique (propriétaire OU locataire, exports Apimo
// "Produits" et Septéo "biens/mandats") contre les contacts déjà en base, tous
// pôles ET toutes sources confondus (cf. "fiche contact unifiée cross-pôle" —
// un même propriétaire peut déjà exister comme prospect Apimo, un même locataire
// peut réapparaître d'un import Septéo à l'autre, etc.). Contrairement à
// `resolveContactMatch` (imports "personnes" où nom+prénom sont la donnée la
// plus fiable), ces colonnes sont parfois tronquées côté Apimo ("Mme M.
// BERGAUD", pas de prénom du tout) — on priorise donc email puis téléphone, le
// nom seul en dernier recours seulement s'il y a aussi un prénom.
export function resolveContactByIdentity(
  candidates: IdentityMatchCandidate[],
  incoming: IncomingIdentity,
): string | null {
  if (incoming.email) {
    const email = incoming.email.trim().toLowerCase()
    const byEmail = candidates.find((c) => c.email?.trim().toLowerCase() === email)
    if (byEmail) return byEmail.id
  }

  if (incoming.telephone) {
    const phone = normalizePhone(incoming.telephone)
    const byPhone = candidates.find((c) => c.telephone && normalizePhone(c.telephone) === phone)
    if (byPhone) return byPhone.id
  }

  if (incoming.nom && incoming.prenom) {
    const byName = candidates.find(
      (c) => sameName(c.nom, incoming.nom!) && sameName(c.prenom, incoming.prenom!),
    )
    if (byName) return byName.id
  }

  return null
}
