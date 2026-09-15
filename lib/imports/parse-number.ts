// Les montants/surfaces de l'export Apimo sont des nombres déjà propres dans le
// classeur (pas de texte à nettoyer dans la plupart des cas), mais on tolère la
// virgule décimale et les caractères parasites au cas où la cellule est en texte.
export function parseNumber(value: string | undefined): number | undefined {
  if (!value) return undefined
  const stripped = value.replace(",", ".").replace(/[^\d.]/g, "")
  // Une valeur sans aucun chiffre (ex. "Local commercial", "Studio") ne doit
  // pas devenir 0 : `Number("")` vaut 0 en JS, ce qui ferait passer un champ
  // absent pour une vraie valeur nulle (déjà vu en prod : "Pièces"/DPE affichés
  // à "0" au lieu de "-" sur une fiche bien Septéo).
  if (stripped === "" || stripped === ".") return undefined
  const n = Number(stripped)
  return Number.isFinite(n) ? n : undefined
}
