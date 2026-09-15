import { z } from "zod"

// Payload normalisé attendu du formulaire JotForm rempli par le commercial en RDV
// (cf. scope.md §"Automatisation des estimations"). Le mapping exact des champs
// JotForm (question IDs) n'était pas encore transmis par Milton - cette route
// suppose un webhook JotForm configuré pour poster ces clés directement
// (JotForm permet de renommer les clés du payload webhook), à ajuster sinon.
export const jotformSubmissionSchema = z.object({
  submissionID: z.string(),
  contactPrenom: z.string(),
  contactNom: z.string(),
  contactTelephone: z.string().optional(),
  contactEmail: z.string().optional(),
  bienAdresse: z.string().optional(),
  bienCommune: z.string().optional(),
  bienType: z.string().optional(),
  bienSurface: z.string().optional(),
})

export type JotformSubmission = z.infer<typeof jotformSubmissionSchema>
