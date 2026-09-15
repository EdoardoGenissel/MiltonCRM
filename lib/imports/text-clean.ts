// L'export Apimo entoure certaines valeurs (téléphone notamment) de guillemets
// littéraux (ex. cellule contenant le texte `"+594 694 07 24 89"`, guillemets
// inclus) - probablement pour forcer Excel à traiter la valeur comme du texte.
// Une valeur réduite à `""` (deux guillemets, rien entre) doit être traitée comme
// vide plutôt que comme la chaîne littérale `""`.
export function unwrapQuotes(value: string): string {
  const trimmed = value.trim()
  if (trimmed.length >= 2 && trimmed.startsWith('"') && trimmed.endsWith('"')) {
    return trimmed.slice(1, -1).trim()
  }
  return trimmed
}
