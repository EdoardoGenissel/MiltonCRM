// Valeurs du menu Filtres de la page Prospects - module sans dépendance
// serveur, importable par la barre d'outils (composant client) comme par les
// requêtes (cf. lib/prospects-mail/queries.ts).

// Statuts de la colonne Historique (tout ce qui n'est plus "en_attente"),
// filtrables depuis le bouton Filtres de la page.
export const HISTORY_STATUTS = [
  { value: "validee", label: "Validés" },
  { value: "rejetee", label: "Ignorés" },
  { value: "ignoree", label: "Écartés par l'analyse" },
  { value: "erreur", label: "Erreurs d'analyse" },
] as const

export const PERIODES = [
  { value: "7", label: "7 derniers jours" },
  { value: "30", label: "30 derniers jours" },
  { value: "90", label: "90 derniers jours" },
] as const
