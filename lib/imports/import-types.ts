// Types partagés entre les différents runners d'import (prospects/Septéo dans
// run-import.ts, biens/mandats dans run-import-biens.ts) — extraits ici pour que
// les deux fichiers puissent se référencer sans dépendance circulaire.
export type ImportResult = {
  status: "success" | "error"
  recordsUpserted: number
  duplicatesFound: number
  error?: string
}

// Chaque ligne fait plusieurs allers-retours DB, donc un import de plusieurs
// milliers de lignes (cf. export Apimo réel, ~3 700 lignes) prend un temps notable
// — le callback permet à la route API de streamer une progression plutôt que de
// laisser l'utilisateur face à un écran figé.
export type ImportProgress = { processed: number; total: number }
export type OnProgress = (progress: ImportProgress) => void
