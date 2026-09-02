-- Écrite à la main (même limitation de shadow database que les migrations
-- précédentes — schéma `auth` absent d'une base fraîche). Appliquer avec
-- `prisma migrate deploy`.
--
-- Imports manuels Septéo "gestion locative" (détail) : impayés de loyer,
-- incidents, loyers appelés. Modèles propres au CRM — les tables Fact* (agrégats
-- KPI Cockpit) ne sont pas touchées.

-- AlterTable
ALTER TABLE "Bien"
ADD COLUMN "referenceLot" TEXT;

-- CreateTable
CREATE TABLE "Impaye" (
    "id" TEXT NOT NULL,
    "source" "Source" NOT NULL DEFAULT 'SEPTEO',
    "sourceRef" TEXT NOT NULL,
    "refLot" TEXT NOT NULL,
    "locataireLabel" TEXT,
    "proprietaireLabel" TEXT,
    "dateEntree" TIMESTAMP(3),
    "dateFinPreavis" TIMESTAMP(3),
    "solde" DECIMAL(12,2) NOT NULL,
    "niveau" INTEGER,
    "dateDerniereRelance" TIMESTAMP(3),
    "niveauDerniereRelance" INTEGER,
    "ecartNiveau" BOOLEAN,
    "frais" DECIMAL(12,2),
    "codeGli" TEXT,
    "procedureRelance" TEXT,
    "typeEnvoi" TEXT,
    "locataireId" TEXT,
    "proprietaireId" TEXT,
    "bienId" TEXT,
    "mandatId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Impaye_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Incident" (
    "id" TEXT NOT NULL,
    "source" "Source" NOT NULL DEFAULT 'SEPTEO',
    "sourceRef" TEXT NOT NULL,
    "tiersLabel" TEXT,
    "objet" TEXT,
    "creeLe" TIMESTAMP(3),
    "responsable" TEXT,
    "etat" TEXT,
    "derniereEtape" TEXT,
    "contactId" TEXT,
    "bienId" TEXT,
    "mandatId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Incident_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "LoyerAppele" (
    "id" TEXT NOT NULL,
    "source" "Source" NOT NULL DEFAULT 'SEPTEO',
    "sourceRef" TEXT NOT NULL,
    "numeroFolio" TEXT,
    "numeroPiece" TEXT,
    "dateEcriture" TIMESTAMP(3),
    "auxiliaire" TEXT,
    "locataireLabel" TEXT,
    "gestionnaire" TEXT,
    "societe" TEXT,
    "categorieLot" TEXT,
    "typeLot" TEXT,
    "montantAppele" DECIMAL(12,2) NOT NULL,
    "montantRegle" DECIMAL(12,2) NOT NULL,
    "contactId" TEXT,
    "bienId" TEXT,
    "mandatId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "LoyerAppele_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "Impaye_bienId_idx" ON "Impaye"("bienId");

-- CreateIndex
CREATE UNIQUE INDEX "Impaye_source_sourceRef_key" ON "Impaye"("source", "sourceRef");

-- CreateIndex
CREATE INDEX "Incident_contactId_idx" ON "Incident"("contactId");

-- CreateIndex
CREATE UNIQUE INDEX "Incident_source_sourceRef_key" ON "Incident"("source", "sourceRef");

-- CreateIndex
CREATE INDEX "LoyerAppele_contactId_idx" ON "LoyerAppele"("contactId");

-- CreateIndex
CREATE UNIQUE INDEX "LoyerAppele_source_sourceRef_key" ON "LoyerAppele"("source", "sourceRef");

-- AddForeignKey
ALTER TABLE "Impaye" ADD CONSTRAINT "Impaye_locataireId_fkey" FOREIGN KEY ("locataireId") REFERENCES "Contact"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Impaye" ADD CONSTRAINT "Impaye_proprietaireId_fkey" FOREIGN KEY ("proprietaireId") REFERENCES "Contact"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Impaye" ADD CONSTRAINT "Impaye_bienId_fkey" FOREIGN KEY ("bienId") REFERENCES "Bien"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Impaye" ADD CONSTRAINT "Impaye_mandatId_fkey" FOREIGN KEY ("mandatId") REFERENCES "Mandat"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Incident" ADD CONSTRAINT "Incident_contactId_fkey" FOREIGN KEY ("contactId") REFERENCES "Contact"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Incident" ADD CONSTRAINT "Incident_bienId_fkey" FOREIGN KEY ("bienId") REFERENCES "Bien"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Incident" ADD CONSTRAINT "Incident_mandatId_fkey" FOREIGN KEY ("mandatId") REFERENCES "Mandat"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LoyerAppele" ADD CONSTRAINT "LoyerAppele_contactId_fkey" FOREIGN KEY ("contactId") REFERENCES "Contact"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LoyerAppele" ADD CONSTRAINT "LoyerAppele_bienId_fkey" FOREIGN KEY ("bienId") REFERENCES "Bien"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LoyerAppele" ADD CONSTRAINT "LoyerAppele_mandatId_fkey" FOREIGN KEY ("mandatId") REFERENCES "Mandat"("id") ON DELETE SET NULL ON UPDATE CASCADE;
