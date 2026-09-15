// Statuts d'estimation - source unique (libellés + ordre), sans dépendance
// Prisma pour rester importable côté client (badge, drawers) comme côté serveur
// (queries, route column-values). Cf. lib/contacts/personas.ts pour le même
// pattern.
export const ESTIMATION_STATUTS = [
  { value: "en_attente", label: "En attente" },
  { value: "envoye_apimo", label: "Envoyé vers Apimo" },
  { value: "envoye_commercial", label: "Envoyé au commercial" },
  { value: "envoye_client", label: "Envoyé au client" },
] as const

export const ESTIMATION_STATUT_LABELS: Record<string, string> = Object.fromEntries(
  ESTIMATION_STATUTS.map((s) => [s.value, s.label]),
)
