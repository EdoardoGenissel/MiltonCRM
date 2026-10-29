export const VISITE_STATUTS = [
  { value: "planifiee", label: "Planifiée" },
  { value: "effectuee", label: "Effectuée" },
  { value: "reportee", label: "Reportée" },
  { value: "annulee", label: "Annulée" },
] as const

export type VisiteStatut = (typeof VISITE_STATUTS)[number]["value"]

export const VISITE_STATUT_LABELS: Record<string, string> = Object.fromEntries(
  VISITE_STATUTS.map((s) => [s.value, s.label]),
)

export const VISITE_RETOURS = [
  { value: "offre", label: "Offre déposée" },
  { value: "interesse", label: "Intéressé" },
  { value: "a_relancer", label: "À relancer" },
  { value: "pas_interesse", label: "Pas intéressé" },
] as const

export type VisiteRetour = (typeof VISITE_RETOURS)[number]["value"]

export const VISITE_RETOUR_LABELS: Record<string, string> = Object.fromEntries(
  VISITE_RETOURS.map((r) => [r.value, r.label]),
)
