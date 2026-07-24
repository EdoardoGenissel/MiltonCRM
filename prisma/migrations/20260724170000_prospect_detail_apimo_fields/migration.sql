-- Écrite à la main plutôt que générée via `prisma migrate dev` : même limitation
-- de shadow database que 20260723090000_crm_lot1_contact_mandat_bien (schéma
-- `auth` absent d'une base fraîche). Appliquer avec `prisma migrate deploy`.

-- AlterTable
ALTER TABLE "ProspectDetail"
ADD COLUMN "coAgence" TEXT,
ADD COLUMN "prixMin" DECIMAL(12,2),
ADD COLUMN "prixMax" DECIMAL(12,2),
ADD COLUMN "devise" TEXT,
ADD COLUMN "pieces" TEXT,
ADD COLUMN "surfaceMin" DECIMAL(8,2),
ADD COLUMN "surfaceMax" DECIMAL(8,2),
ADD COLUMN "secteur" TEXT,
ADD COLUMN "quartier" TEXT,
ADD COLUMN "derniereAction" TIMESTAMP(3),
ADD COLUMN "commentaire" TEXT,
ADD COLUMN "creeLe" TIMESTAMP(3),
ADD COLUMN "utilisateur" TEXT,
ADD COLUMN "emailingAbonne" BOOLEAN,
ADD COLUMN "magazineAbonne" BOOLEAN,
ADD COLUMN "originePrecise" TEXT,
ADD COLUMN "languesParlees" TEXT[],
ADD COLUMN "dateNaissance" TIMESTAMP(3),
ADD COLUMN "lieuNaissance" TEXT,
ADD COLUMN "adressePersonnelle" TEXT,
ADD COLUMN "adresseComplement" TEXT,
ADD COLUMN "codePostal" TEXT,
ADD COLUMN "villePersonnelle" TEXT,
ADD COLUMN "pays" TEXT,
ADD COLUMN "agence" TEXT,
ADD COLUMN "referenceProduit" TEXT,
ADD COLUMN "criteresComplementaires" TEXT,
ADD COLUMN "attributs" TEXT,
ADD COLUMN "majLe" TIMESTAMP(3),
ADD COLUMN "majPar" TEXT;
