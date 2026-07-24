const MARGIN_RATE = 0.1

// Marge appliquée au loyer max déclaré par un prospect pour élargir la recherche
// de biens correspondants (cf. scope.md : "montant de loyer max avec marge de
// 10 %"). Centralisé ici plutôt que calculé en ligne dans la fiche : c'est la même
// règle qui alimentera le croisement prospect/produit une fois construit.
export function loyerMaxWithMargin(loyerMax: number): number {
  return Math.round(loyerMax * (1 + MARGIN_RATE))
}
