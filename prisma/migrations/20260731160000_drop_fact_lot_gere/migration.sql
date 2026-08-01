-- "Lots gérés" est désormais calculé en direct depuis les vraies lignes `Mandat`
-- (SEPTEO, importées côté CRM, table partagée) - cf. lib/kpis/septeo-lots.ts.
-- FactLotGere ne contenait que des données mock (prisma/seed.ts), plus utilisé.
DROP TABLE "FactLotGere";
