// Next.js App Router ne renvoie un tableau pour une clé de searchParams que si
// elle apparaît plusieurs fois dans l'URL (une seule occurrence -> string simple)
// — à normaliser systématiquement pour les filtres multi-valeurs (cf.
// components/column-filter.tsx).
export function toArray(value: string | string[] | undefined): string[] {
  if (!value) return []
  return Array.isArray(value) ? value : [value]
}
