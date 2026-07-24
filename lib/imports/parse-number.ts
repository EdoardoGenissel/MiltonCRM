// Les montants/surfaces de l'export Apimo sont des nombres déjà propres dans le
// classeur (pas de texte à nettoyer dans la plupart des cas), mais on tolère la
// virgule décimale et les caractères parasites au cas où la cellule est en texte.
export function parseNumber(value: string | undefined): number | undefined {
  if (!value) return undefined
  const n = Number(value.replace(",", ".").replace(/[^\d.]/g, ""))
  return Number.isFinite(n) ? n : undefined
}
