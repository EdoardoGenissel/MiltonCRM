-- CreateEnum
CREATE TYPE "Role" AS ENUM ('CEO', 'MANAGER_TRANSACTION', 'MANAGER_GESTION_LOCATIVE', 'ADMIN');

-- CreateEnum
CREATE TYPE "Pole" AS ENUM ('TRANSACTION', 'GESTION_LOCATIVE', 'LOCATION_DEV', 'ESTIMATION');

-- CreateEnum
CREATE TYPE "Source" AS ENUM ('PENNYLANE', 'APIMO', 'SEPTEO', 'NOTION', 'RINGOVER', 'CALCULE');

-- CreateTable
CREATE TABLE "Profile" (
    "id" UUID NOT NULL,
    "email" TEXT NOT NULL,
    "fullName" TEXT NOT NULL,
    "role" "Role" NOT NULL,
    "pole" "Pole",
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Profile_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SyncRun" (
    "id" TEXT NOT NULL,
    "source" "Source" NOT NULL,
    "startedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "finishedAt" TIMESTAMP(3),
    "status" TEXT NOT NULL,
    "recordsUpserted" INTEGER NOT NULL DEFAULT 0,
    "error" TEXT,

    CONSTRAINT "SyncRun_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "FactCa" (
    "id" TEXT NOT NULL,
    "periodMonth" TIMESTAMP(3) NOT NULL,
    "pole" "Pole" NOT NULL,
    "amountEur" DECIMAL(12,2) NOT NULL,
    "source" "Source" NOT NULL DEFAULT 'PENNYLANE',
    "syncedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "FactCa_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "FactContrat" (
    "id" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "pole" "Pole" NOT NULL,
    "commercialId" TEXT,
    "commercialName" TEXT,
    "signedAt" TIMESTAMP(3) NOT NULL,
    "source" "Source" NOT NULL,

    CONSTRAINT "FactContrat_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "FactPipeline" (
    "id" TEXT NOT NULL,
    "pole" "Pole" NOT NULL,
    "commercialId" TEXT NOT NULL,
    "commercialName" TEXT NOT NULL,
    "metric" TEXT NOT NULL,
    "period" TIMESTAMP(3) NOT NULL,
    "periodType" TEXT NOT NULL,
    "value" INTEGER NOT NULL,
    "source" "Source" NOT NULL,

    CONSTRAINT "FactPipeline_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "FactLotGere" (
    "id" TEXT NOT NULL,
    "snapshotDate" TIMESTAMP(3) NOT NULL,
    "count" INTEGER NOT NULL,
    "gained" INTEGER NOT NULL DEFAULT 0,
    "lost" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "FactLotGere_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "FactIncident" (
    "id" TEXT NOT NULL,
    "openedAt" TIMESTAMP(3) NOT NULL,
    "closedAt" TIMESTAMP(3),
    "pole" "Pole" NOT NULL DEFAULT 'GESTION_LOCATIVE',

    CONSTRAINT "FactIncident_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "FactImpaye" (
    "id" TEXT NOT NULL,
    "periodMonth" TIMESTAMP(3) NOT NULL,
    "amountEur" DECIMAL(12,2) NOT NULL,
    "ratePct" DECIMAL(5,2) NOT NULL,

    CONSTRAINT "FactImpaye_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "FactAppel" (
    "id" TEXT NOT NULL,
    "periodWeek" TIMESTAMP(3) NOT NULL,
    "entrants" INTEGER NOT NULL,
    "manques" INTEGER NOT NULL,
    "traites" INTEGER NOT NULL,

    CONSTRAINT "FactAppel_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Objectif" (
    "id" TEXT NOT NULL,
    "kpiId" TEXT NOT NULL,
    "pole" "Pole",
    "commercialId" TEXT,
    "period" TIMESTAMP(3) NOT NULL,
    "value" DECIMAL(12,2) NOT NULL,

    CONSTRAINT "Objectif_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "KpiSnapshot" (
    "id" TEXT NOT NULL,
    "kpiId" TEXT NOT NULL,
    "pole" "Pole",
    "commercialId" TEXT,
    "period" TIMESTAMP(3) NOT NULL,
    "value" DECIMAL(12,2) NOT NULL,
    "status" TEXT,
    "computedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "KpiSnapshot_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Profile_email_key" ON "Profile"("email");

-- CreateIndex
CREATE UNIQUE INDEX "FactCa_periodMonth_pole_key" ON "FactCa"("periodMonth", "pole");

-- CreateIndex
CREATE INDEX "FactContrat_pole_signedAt_idx" ON "FactContrat"("pole", "signedAt");

-- CreateIndex
CREATE INDEX "FactContrat_commercialId_idx" ON "FactContrat"("commercialId");

-- CreateIndex
CREATE UNIQUE INDEX "FactPipeline_pole_commercialId_metric_period_key" ON "FactPipeline"("pole", "commercialId", "metric", "period");

-- CreateIndex
CREATE UNIQUE INDEX "FactLotGere_snapshotDate_key" ON "FactLotGere"("snapshotDate");

-- CreateIndex
CREATE INDEX "FactIncident_closedAt_idx" ON "FactIncident"("closedAt");

-- CreateIndex
CREATE UNIQUE INDEX "FactImpaye_periodMonth_key" ON "FactImpaye"("periodMonth");

-- CreateIndex
CREATE UNIQUE INDEX "FactAppel_periodWeek_key" ON "FactAppel"("periodWeek");

-- CreateIndex
CREATE UNIQUE INDEX "Objectif_kpiId_pole_commercialId_period_key" ON "Objectif"("kpiId", "pole", "commercialId", "period");

-- CreateIndex
CREATE UNIQUE INDEX "KpiSnapshot_kpiId_pole_commercialId_period_key" ON "KpiSnapshot"("kpiId", "pole", "commercialId", "period");
