-- Écrite à la main + appliquée via `prisma migrate deploy` (pas `migrate dev`) —
-- même limitation shadow-db documentée dans la migration profile_auth_fk et dans
-- README.md. Ne porte que l'ajout de RingoverEvent : le schema.prisma contient par
-- ailleurs des changements en cours (extension Role, colonnes ProspectDetail) qui
-- ne sont pas encore migrés et ne sont pas concernés par cette migration.

-- CreateTable
CREATE TABLE "RingoverEvent" (
    "id" TEXT NOT NULL,
    "event" TEXT,
    "payload" JSONB NOT NULL,
    "matchedContactId" TEXT,
    "receivedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "RingoverEvent_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "RingoverEvent_event_idx" ON "RingoverEvent"("event");

-- CreateIndex
CREATE INDEX "RingoverEvent_receivedAt_idx" ON "RingoverEvent"("receivedAt");

-- AddForeignKey
ALTER TABLE "RingoverEvent" ADD CONSTRAINT "RingoverEvent_matchedContactId_fkey" FOREIGN KEY ("matchedContactId") REFERENCES "Contact"("id") ON DELETE SET NULL ON UPDATE CASCADE;
