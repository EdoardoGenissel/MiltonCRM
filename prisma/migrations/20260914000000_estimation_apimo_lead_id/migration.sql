-- Id du lead Apimo créé pour cette estimation (POST /agencies/{agency_id}/leads,
-- cf. lib/integrations/apimo/leads.ts) - remplace l'attente d'un accès API
-- CityScan direct (jamais obtenu, cf. lib/integrations/jotform/sync.ts).
ALTER TABLE "Estimation" ADD COLUMN "apimoLeadId" INTEGER;
