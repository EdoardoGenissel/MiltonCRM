-- AlterTable
ALTER TABLE "FactContrat" ADD COLUMN "externalId" TEXT;

-- CreateIndex
CREATE UNIQUE INDEX "FactContrat_source_externalId_key" ON "FactContrat"("source", "externalId");
