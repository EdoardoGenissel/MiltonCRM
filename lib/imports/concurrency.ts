// Exécute `fn` sur chaque item avec au plus `limit` appels en vol simultanément.
// Sert aux updates DB de l'import (une requête par ligne, mais chaque ligne cible
// un contact distinct — sans risque de collision, donc parallélisable sans risque).
// ~15 lignes, pas besoin d'une dépendance externe (p-limit) pour ça.
export async function mapWithConcurrency<T>(
  items: T[],
  limit: number,
  fn: (item: T, index: number) => Promise<void>
): Promise<void> {
  let cursor = 0
  async function worker() {
    while (cursor < items.length) {
      const index = cursor++
      await fn(items[index], index)
    }
  }
  await Promise.all(Array.from({ length: Math.min(limit, items.length) }, worker))
}
