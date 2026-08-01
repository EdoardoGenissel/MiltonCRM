-- Colonnes additionnelles pour le sync JotForm par API (pull, cf.
-- lib/integrations/jotform/sync.ts) : date de soumission JotForm et
-- intégralité des réponses du formulaire (au-delà des champs déjà mappés sur
-- Contact/Bien) pour ne perdre aucune information saisie par le commercial.
ALTER TABLE "Estimation" ADD COLUMN "submittedAt" TIMESTAMP(3);
ALTER TABLE "Estimation" ADD COLUMN "answers" JSONB;
