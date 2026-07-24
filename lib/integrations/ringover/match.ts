import { normalizePhone } from "@/lib/contacts/dedupe"

export type CallMatchCandidate = {
  id: string
  nom: string
  prenom: string
  telephone: string | null
}

export type IncomingCall = {
  phoneNumber: string
  callerName?: string | null // "Prénom Nom" tel que fourni par Ringover
}

// Matching à l'appel entrant — cf. scope.md : "le matching se fait sur les 3 seules
// données Ringover (nom, prénom, numéro)". Le numéro est la donnée la plus fiable
// (le nom transmis par l'opérateur peut être absent ou mal formaté), donc priorité
// au téléphone, avec le nom en confirmation/fallback si plusieurs contacts
// partagent un numéro (rare mais possible, ex. couple).
export function matchContactByCall(
  candidates: CallMatchCandidate[],
  call: IncomingCall
): string | null {
  const incomingPhone = normalizePhone(call.phoneNumber)
  const byPhone = candidates.filter((c) => c.telephone && normalizePhone(c.telephone) === incomingPhone)

  if (byPhone.length === 1) return byPhone[0].id
  if (byPhone.length === 0) return null

  if (call.callerName) {
    const normalizedCallerName = call.callerName.trim().toLowerCase()
    const byName = byPhone.find(
      (c) => `${c.prenom} ${c.nom}`.trim().toLowerCase() === normalizedCallerName
    )
    if (byName) return byName.id
  }

  return byPhone[0].id
}
