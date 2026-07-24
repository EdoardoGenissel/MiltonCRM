-- Écrite à la main plutôt que générée via `prisma migrate dev` : même limitation
-- de shadow database que 20260723090000_crm_lot1_contact_mandat_bien (schéma
-- `auth` absent d'une base fraîche). Appliquer avec `prisma migrate deploy`.

-- AlterTable
ALTER TABLE "Mandat"
ADD COLUMN "categorie" TEXT,
ADD COLUMN "coAgent" TEXT,
ADD COLUMN "finMandat" TIMESTAMP(3),
ADD COLUMN "origine" TEXT,
ADD COLUMN "originePrecise" TEXT,
ADD COLUMN "honorairesProprietaire" DECIMAL(12,2),
ADD COLUMN "honorairesAcheteur" DECIMAL(12,2),
ADD COLUMN "montantProprietaire" DECIMAL(12,2),
ADD COLUMN "montantCompromis" DECIMAL(12,2),
ADD COLUMN "venduLe" TIMESTAMP(3);

-- AlterTable
ALTER TABLE "Bien"
ADD COLUMN "codePostal" TEXT,
ADD COLUMN "quartier" TEXT,
ADD COLUMN "pays" TEXT,
ADD COLUMN "residence" TEXT,
ADD COLUMN "adresseComplement" TEXT,
ADD COLUMN "etage" TEXT,
ADD COLUMN "numeroClef" TEXT,
ADD COLUMN "pieces" INTEGER,
ADD COLUMN "chambres" INTEGER,
ADD COLUMN "devise" TEXT,
ADD COLUMN "attributs" TEXT,
ADD COLUMN "titre" TEXT,
ADD COLUMN "description" TEXT,
ADD COLUMN "photos" TEXT[],
ADD COLUMN "energieConsommation" DECIMAL(8,2),
ADD COLUMN "energieEmission" DECIMAL(8,2),
ADD COLUMN "agence" TEXT,
ADD COLUMN "utilisateur" TEXT,
ADD COLUMN "referenceProduit" TEXT,
ADD COLUMN "proprietaireLabel" TEXT,
ADD COLUMN "creeLe" TIMESTAMP(3),
ADD COLUMN "majLe" TIMESTAMP(3);
