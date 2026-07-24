-- Écrite à la main plutôt que générée via `prisma migrate dev` : le shadow
-- database de Prisma échoue sur la migration `20260712203504_profile_auth_fk`
-- (le schéma `auth` de Supabase n'existe pas dans une base fraîche), même
-- limitation que celle documentée pour cette migration (cf. schema.prisma
-- ligne 1-4). Appliquer avec `prisma migrate deploy` (pas de shadow db).

-- AlterEnum
ALTER TYPE "Source" ADD VALUE 'JOTFORM';
ALTER TYPE "Source" ADD VALUE 'CITYSCAN';
ALTER TYPE "Source" ADD VALUE 'MANUEL';

-- AlterTable
ALTER TABLE "SyncRun" ADD COLUMN "fileName" TEXT,
ADD COLUMN "duplicatesFound" INTEGER NOT NULL DEFAULT 0;

-- CreateTable
CREATE TABLE "Contact" (
    "id" TEXT NOT NULL,
    "civilite" TEXT,
    "prenom" TEXT NOT NULL,
    "nom" TEXT NOT NULL,
    "email" TEXT,
    "telephone" TEXT,
    "personas" TEXT[],
    "commune" TEXT,
    "source" "Source" NOT NULL,
    "sourceRef" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Contact_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ProspectDetail" (
    "id" TEXT NOT NULL,
    "contactId" TEXT NOT NULL,
    "alerteAbonne" BOOLEAN NOT NULL DEFAULT false,
    "classification" TEXT,
    "origine" TEXT,
    "categorie" TEXT,
    "typeBien" TEXT,
    "loyerMax" DECIMAL(10,2),
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ProspectDetail_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Mandat" (
    "id" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "statut" TEXT,
    "proprietaireId" TEXT,
    "bienId" TEXT,
    "dateSignature" TIMESTAMP(3),
    "source" "Source" NOT NULL,
    "sourceRef" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Mandat_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Bien" (
    "id" TEXT NOT NULL,
    "adresse" TEXT,
    "commune" TEXT,
    "typeBien" TEXT,
    "surface" DECIMAL(8,2),
    "prix" DECIMAL(12,2),
    "statut" TEXT,
    "source" "Source" NOT NULL,
    "sourceRef" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Bien_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CallLog" (
    "id" TEXT NOT NULL,
    "ringoverCallId" TEXT NOT NULL,
    "phoneNumber" TEXT NOT NULL,
    "callerName" TEXT,
    "matchedContactId" TEXT,
    "receivedAt" TIMESTAMP(3) NOT NULL,
    "transcript" TEXT,
    "transcriptSummary" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "CallLog_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Estimation" (
    "id" TEXT NOT NULL,
    "contactId" TEXT,
    "bienId" TEXT,
    "jotformSubmissionId" TEXT NOT NULL,
    "cityscanReportUrl" TEXT,
    "statut" TEXT NOT NULL DEFAULT 'en_attente',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Estimation_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Contact_source_sourceRef_key" ON "Contact"("source", "sourceRef");

-- CreateIndex
CREATE INDEX "Contact_nom_prenom_idx" ON "Contact"("nom", "prenom");

-- CreateIndex
CREATE INDEX "Contact_telephone_idx" ON "Contact"("telephone");

-- CreateIndex
CREATE UNIQUE INDEX "ProspectDetail_contactId_key" ON "ProspectDetail"("contactId");

-- CreateIndex
CREATE UNIQUE INDEX "Mandat_source_sourceRef_key" ON "Mandat"("source", "sourceRef");

-- CreateIndex
CREATE UNIQUE INDEX "Bien_source_sourceRef_key" ON "Bien"("source", "sourceRef");

-- CreateIndex
CREATE UNIQUE INDEX "CallLog_ringoverCallId_key" ON "CallLog"("ringoverCallId");

-- CreateIndex
CREATE INDEX "CallLog_phoneNumber_idx" ON "CallLog"("phoneNumber");

-- CreateIndex
CREATE UNIQUE INDEX "Estimation_jotformSubmissionId_key" ON "Estimation"("jotformSubmissionId");

-- AddForeignKey
ALTER TABLE "ProspectDetail" ADD CONSTRAINT "ProspectDetail_contactId_fkey" FOREIGN KEY ("contactId") REFERENCES "Contact"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Mandat" ADD CONSTRAINT "Mandat_proprietaireId_fkey" FOREIGN KEY ("proprietaireId") REFERENCES "Contact"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Mandat" ADD CONSTRAINT "Mandat_bienId_fkey" FOREIGN KEY ("bienId") REFERENCES "Bien"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CallLog" ADD CONSTRAINT "CallLog_matchedContactId_fkey" FOREIGN KEY ("matchedContactId") REFERENCES "Contact"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Estimation" ADD CONSTRAINT "Estimation_contactId_fkey" FOREIGN KEY ("contactId") REFERENCES "Contact"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Estimation" ADD CONSTRAINT "Estimation_bienId_fkey" FOREIGN KEY ("bienId") REFERENCES "Bien"("id") ON DELETE SET NULL ON UPDATE CASCADE;
