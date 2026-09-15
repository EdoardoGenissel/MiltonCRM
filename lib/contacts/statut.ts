// Distinction prospect / client (cf. [[prospect-types]]) - "client" signifie
// qu'un mandat signé relie le contact à un bien (propriétaire ou locataire),
// "prospect" qu'il n'y a que des critères de recherche (ProspectDetail), sans
// mandat. Un acheteur n'a aujourd'hui aucun lien en DB vers un bien/mandat -
// il ne peut donc jamais ressortir "client" par ce biais.
export type ContactStatut = "prospect" | "client"

export const STATUTS = [
  { value: "prospect", label: "Prospect" },
  { value: "client", label: "Client" },
] as const

export const STATUT_LABELS: Record<ContactStatut, string> = {
  prospect: "Prospect",
  client: "Client",
}

type StatutContact = {
  mandats: unknown[]
  mandatsLocataire: unknown[]
}

export function contactStatut(contact: StatutContact): ContactStatut {
  return contact.mandats.length > 0 || contact.mandatsLocataire.length > 0 ? "client" : "prospect"
}
