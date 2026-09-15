-- Colonnes alimentées par le formulaire JotForm "ESTIMATION IMMOBILIERE"
-- (cf. lib/integrations/jotform/sync.ts) - remplies seulement si vides,
-- Apimo/Septéo priment en cas de conflit (cf. lib/biens/dedupe.ts).
ALTER TABLE "Bien" ADD COLUMN "surfaceTerrain" DECIMAL(10,2);
ALTER TABLE "Bien" ADD COLUMN "referenceCadastrale" TEXT;
ALTER TABLE "Bien" ADD COLUMN "taxeFonciere" DECIMAL(12,2);
ALTER TABLE "Bien" ADD COLUMN "chargesCopropriete" DECIMAL(10,2);
ALTER TABLE "Bien" ADD COLUMN "copropriete" BOOLEAN;
ALTER TABLE "Bien" ADD COLUMN "assainissement" TEXT;
ALTER TABLE "Bien" ADD COLUMN "cuisineEquipements" TEXT[];
ALTER TABLE "Bien" ADD COLUMN "equipements" TEXT[];
ALTER TABLE "Bien" ADD COLUMN "pointsPositifs" TEXT;
ALTER TABLE "Bien" ADD COLUMN "pointsNegatifs" TEXT;
ALTER TABLE "Bien" ADD COLUMN "disponibilite" TEXT;
