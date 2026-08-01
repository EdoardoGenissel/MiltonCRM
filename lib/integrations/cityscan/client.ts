// Pont vers CityScan (génération du rapport d'estimation) — cf. scope.md
// §"Automatisation des estimations" : "CityScan sélectionne automatiquement des
// biens comparables par type/localisation". Accès API à demander via Septéo, pas
// encore disponible au moment de l'écriture (cf. scope.md §"État des accès API").
// Pas de mode mock : tant que l'accès n'est pas branché, l'estimation reste
// "en_attente" sans lien de rapport plutôt que d'afficher une URL factice
// (cf. app/api/jotform/sync/route.ts, app/api/jotform/webhook/route.ts).
export type CityScanEstimationInput = {
  bienAdresse?: string | null
  bienCommune?: string | null
  bienType?: string | null
  bienSurface?: number | null
}

export type CityScanEstimationResult = {
  reportUrl: string
}

export async function generateEstimationReport(
  _input: CityScanEstimationInput
): Promise<CityScanEstimationResult> {
  throw new Error(
    "Accès API CityScan pas encore branché — brancher ici une fois l'accès obtenu (cf. scope.md)."
  )
}
