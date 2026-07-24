-- Écrite à la main + appliquée via `prisma migrate deploy` (shadow-db bloquée par
-- la migration profile_auth_fk, cf. README.md). Ajoute à CallLog les champs
-- nécessaires pour exploiter le vrai schéma webhook Ringover (direction,
-- enregistrement, transcription) découvert via developer.ringover.com/web/
-- openapi_public.yml.

-- AlterTable
ALTER TABLE "CallLog"
  ADD COLUMN "direction" TEXT,
  ADD COLUMN "recordUrl" TEXT,
  ADD COLUMN "transcriptionUrl" TEXT;
