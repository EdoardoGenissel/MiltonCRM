// Pont vers CityScan (génération du rapport d'estimation) — cf. scope.md
// §"Automatisation des estimations" : "CityScan sélectionne automatiquement des
// biens comparables par type/localisation". Accès API à demander via Septéo, pas
// encore disponible au moment de l'écriture (cf. scope.md §"État des accès API") —
// mode mock par défaut, même principe adapter mock/live que Cockpit.
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
  input: CityScanEstimationInput
): Promise<CityScanEstimationResult> {
  if (process.env.CITYSCAN_API_KEY) {
    throw new Error(
      "CITYSCAN_API_KEY présent mais l'appel live n'est pas encore implémenté — brancher ici une fois l'accès API CityScan obtenu (cf. scope.md)."
    )
  }

  // Mode mock : pas de génération réelle, juste un URL de rapport factice pour ne
  // pas bloquer le développement du reste du flux JotForm → estimation → archivage.
  const slug = encodeURIComponent(`${input.bienAdresse ?? input.bienCommune ?? "bien"}`)
  return { reportUrl: `https://cityscan.mock/reports/${slug}-${Date.now()}` }
}
