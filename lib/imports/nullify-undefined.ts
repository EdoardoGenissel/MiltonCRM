// Pour un `update` Prisma, une propriété à `undefined` signifie "ne pas
// toucher ce champ" - pas "l'effacer" (contrairement à `create`/`createMany`,
// où `undefined` équivaut à `null` sur une colonne optionnelle). Les mappers
// d'import (`parseNumber`, `parseFrDate`...) renvoient `undefined` quand la
// cellule source est vide ou non numérique - sans ce filtre, une valeur déjà
// en base qui disparaît d'un export suivant (ex. une surface corrigée à vide,
// ou une valeur aberrante corrigée côté source) ne serait *jamais* effacée par
// un ré-import, aucune erreur ne le signalant. Bug réel rencontré en
// développant l'import biens Septéo (cf. run-import-biens-septeo.ts) : un
// correctif de `parseNumber` ne se propageait pas sur les lignes déjà
// importées tant que ce filtre n'existait pas.
// Ne widen le type vers `| null` que pour les propriétés réellement
// optionnelles (`undefined extends T[K]`) - les champs NOT NULL du schéma
// (ex. `Mandat.type`, `Bien.photos`) ne sont jamais `undefined` dans ces objets
// mappés, leur type reste inchangé et Prisma continue de les accepter tels quels.
type NullifyUndefined<T> = {
  [K in keyof T]: undefined extends T[K] ? Exclude<T[K], undefined> | null : T[K]
}

export function nullifyUndefined<T extends object>(obj: T): NullifyUndefined<T> {
  const result = { ...obj } as Record<string, unknown>
  for (const key of Object.keys(result)) {
    if (result[key] === undefined) result[key] = null
  }
  return result as NullifyUndefined<T>
}
