-- Table propre au CRM (non partagée avec Cockpit) : statistiques détaillées
-- d'un import réussi (créés/mis à jour, par type contacts vs biens/mandats),
-- en complément de SyncRun (partagé) sans le modifier.
CREATE TABLE "ImportLog" (
    "id" TEXT NOT NULL,
    "syncRunId" TEXT NOT NULL,
    "source" "Source" NOT NULL,
    "kind" TEXT NOT NULL,
    "fileName" TEXT,
    "created" INTEGER NOT NULL DEFAULT 0,
    "updated" INTEGER NOT NULL DEFAULT 0,
    "total" INTEGER NOT NULL DEFAULT 0,
    "startedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ImportLog_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "ImportLog_syncRunId_key" ON "ImportLog"("syncRunId");
