-- Écrite à la main (même limitation de shadow database, cf. migrations
-- précédentes). Élargit la précision des colonnes surface : un terrain réel de
-- l'export Apimo "Produits" dépasse 999 999,99 m² (DECIMAL(8,2)), ex. un grand
-- terrain agricole en Guyane. Élargissement pur, aucune perte de données.

-- AlterTable
ALTER TABLE "Bien" ALTER COLUMN "surface" TYPE DECIMAL(10,2);

-- AlterTable
ALTER TABLE "ProspectDetail" ALTER COLUMN "surfaceMin" TYPE DECIMAL(10,2);
ALTER TABLE "ProspectDetail" ALTER COLUMN "surfaceMax" TYPE DECIMAL(10,2);
