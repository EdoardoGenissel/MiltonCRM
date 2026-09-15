// Détection automatique du type d'export à partir de la ligne d'en-tête, pour
// éviter à l'utilisateur de choisir dans une liste (source d'erreurs : un import
// "impayés" lancé en "loyers appelés" échoue silencieusement au rattachement).
//
// Chaque règle repose sur des en-têtes *signature* propres à un seul export réel
// de Milton (cf. data/) - normalisés comme dans buildHeaderIndex ("Ref. Lot" ->
// "reflot", "Type interlocuteur" -> "typeinterlocuteur", "e-mail" -> "email"...).
import { buildHeaderIndex } from "./header-index"
import type { ImportKind } from "./mapping"

type DetectionRule = {
  kind: ImportKind
  requires: string[] // tous présents (en-têtes normalisés)
  excludes?: string[] // aucun présent
}

// Ordre = priorité : le premier `requires` entièrement satisfait gagne.
const RULES: DetectionRule[] = [
  // Apimo "Produits" (biens + mandats) - "Apinumber" n'existe que là.
  { kind: "apimo_biens", requires: ["apinumber"] },
  // Apimo "Contacts/Prospects" - colonne "Contact" + "Classification", et surtout
  // pas d'"Apinumber" (qui trancherait vers l'export biens).
  { kind: "apimo_prospects", requires: ["contact", "classification"], excludes: ["apinumber"] },
  // Septéo gestion locative (lot + mandat) - "MandatLot_IDMandatLot".
  { kind: "septeo_biens", requires: ["mandatlotidmandatlot"] },
  // Septéo propriétaires / locataires - "Type interlocuteur" + "Portable".
  { kind: "septeo_contacts", requires: ["typeinterlocuteur", "portable"] },
  // Septéo impayés de loyer - "Ref. Lot" + "Procédure de relance".
  { kind: "septeo_impayes", requires: ["reflot", "procedurederelance"] },
  // Septéo incidents - "Objet / Libellé" + "État de l'événement".
  { kind: "septeo_incidents", requires: ["objetlibelle", "etatdelevenement"] },
  // Septéo loyers appelés (écritures comptables) - "Numéro folio" + "Libellé écriture".
  { kind: "septeo_loyers_appeles", requires: ["numerofolio", "libelleecriture"] },
]

export function detectImportKind(headerRow: unknown[]): ImportKind | null {
  const index = buildHeaderIndex(headerRow)
  const has = (key: string) => index.has(key)

  for (const rule of RULES) {
    if (rule.requires.every(has) && !(rule.excludes ?? []).some(has)) {
      return rule.kind
    }
  }
  return null
}

// Libellés lisibles (repris de la liste déroulante historique) - pour l'UI.
export const IMPORT_KIND_LABELS: Record<ImportKind, string> = {
  apimo_prospects: "Apimo - prospects",
  apimo_biens: "Apimo - biens et mandats",
  septeo_contacts: "Septéo - propriétaires / locataires",
  septeo_biens: "Septéo - biens et mandats",
  septeo_impayes: "Septéo - impayés de loyer",
  septeo_incidents: "Septéo - incidents",
  septeo_loyers_appeles: "Septéo - loyers appelés",
}
