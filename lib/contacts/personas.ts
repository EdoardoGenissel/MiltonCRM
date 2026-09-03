// Source unique pour les 4 personas du CRM (cf. scope.md) — réutilisé par la page
// contacts, le filtre colonne (ColumnFilter) et le badge de fiche contact, pour
// éviter que le libellé "Propriétaire bailleur" etc. ne vive qu'à un seul endroit.
export const PERSONAS = [
  { value: "prospect", label: "Prospect" },
  { value: "acquereur", label: "Acquéreur" },
  { value: "locataire", label: "Locataire" },
  { value: "proprietaire_bailleur", label: "Propriétaire bailleur" },
] as const

export const PERSONA_LABELS: Record<string, string> = Object.fromEntries(
  PERSONAS.map((p) => [p.value, p.label]),
)
