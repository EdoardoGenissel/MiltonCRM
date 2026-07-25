-- Écrite à la main (même limitation de shadow database que les migrations
-- précédentes — schéma `auth` absent d'une base fraîche). Appliquer avec
-- `prisma migrate deploy`.

-- AlterTable
ALTER TABLE "Bien"
ADD COLUMN "meuble" BOOLEAN;

-- AlterTable
ALTER TABLE "Mandat"
ADD COLUMN "locataireId" TEXT,
ADD COLUMN "numero" TEXT,
ADD COLUMN "typeBail" TEXT,
ADD COLUMN "usage" TEXT,
ADD COLUMN "regimeFiscal" TEXT,
ADD COLUMN "montantLoyer" DECIMAL(10,2),
ADD COLUMN "montantCharges" DECIMAL(10,2),
ADD COLUMN "montantDepotGarantie" DECIMAL(10,2),
ADD COLUMN "fraisAgence" DECIMAL(10,2),
ADD COLUMN "honorairesGestion" DECIMAL(10,2),
ADD COLUMN "pourcentageHonorairesGestion" DECIMAL(5,2);

-- AddForeignKey
ALTER TABLE "Mandat" ADD CONSTRAINT "Mandat_locataireId_fkey" FOREIGN KEY ("locataireId") REFERENCES "Contact"("id") ON DELETE SET NULL ON UPDATE CASCADE;
