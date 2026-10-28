-- AlterEnum
ALTER TYPE "Source" ADD VALUE 'GMAIL';

-- CreateTable
CREATE TABLE "MailSuggestion" (
    "id" TEXT NOT NULL,
    "mailbox" TEXT NOT NULL,
    "gmailMessageId" TEXT NOT NULL,
    "gmailThreadId" TEXT NOT NULL,
    "fromName" TEXT,
    "fromEmail" TEXT,
    "subject" TEXT,
    "receivedAt" TIMESTAMP(3) NOT NULL,
    "excerpt" TEXT,
    "pertinent" BOOLEAN NOT NULL DEFAULT false,
    "resume" TEXT,
    "extraction" JSONB,
    "actions" JSONB NOT NULL DEFAULT '[]',
    "resultat" JSONB,
    "statut" TEXT NOT NULL DEFAULT 'en_attente',
    "error" TEXT,
    "traiteLe" TIMESTAMP(3),
    "traitePar" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "MailSuggestion_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "MailSuggestion_mailbox_gmailMessageId_key" ON "MailSuggestion"("mailbox", "gmailMessageId");

-- CreateIndex
CREATE INDEX "MailSuggestion_statut_receivedAt_idx" ON "MailSuggestion"("statut", "receivedAt");

-- CreateIndex
CREATE INDEX "MailSuggestion_gmailThreadId_idx" ON "MailSuggestion"("gmailThreadId");
