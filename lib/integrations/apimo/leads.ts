import { apimoPost } from "./client"

// Apimo/Cityscan n'exposent pas d'API AVM directe (confirmé par le support Apimo,
// 2026-09-13) : la voie officielle est d'injecter les données du formulaire dans
// Apimo pour que l'agent lance l'estimation depuis la fiche bien, sans ressaisie.
// On pousse donc chaque soumission d'estimation JotForm comme un Lead Apimo (POST
// /agencies/{agency_id}/leads) plutôt que de créer directement une fiche Bien : le
// lead porte contact + adresse/besoin, et évite d'avoir à mapper nous-mêmes les
// catalogues Apimo (type de bien, commune...) que demanderait une fiche Bien
// complète. L'agent transforme ensuite le lead en fiche bien dans Apimo (flux
// natif) puis lance l'AVM dessus.
//
// Valeurs de catalogue confirmées via scripts/test-apimo-push-lead.ts (GET
// /catalogs/lead_type et /catalogs/referral) - pas de texte libre accepté ("Please
// check your token" côté auth mais 422 "The value of referral is invalid." si on
// passe autre chose qu'un id de catalogue).
const LEAD_TYPE_ESTIMATION = "6" // catalog lead_type: "Estimation"
const REFERRAL_ESTIMATION = "19" // catalog referral: "Estimation"

export type EstimationLeadInput = {
  // Sert de `reference` Apimo : dédup naturelle (un push par soumission), cf.
  // pushEstimationLead qui stocke l'id de lead retourné sur Estimation.apimoLeadId
  // pour ne pousser qu'une fois.
  jotformSubmissionId: string
  contact: {
    prenom: string
    nom: string
    email: string | null
    telephone: string | null
  }
  bien: {
    adresse: string | null
    commune: string | null
    codePostal: string | null
  } | null
}

export type EstimationLeadResult = {
  id: number
  created_at: string
  updated_at: string
}

export function buildEstimationLeadPayload(input: EstimationLeadInput): Record<string, unknown> {
  return {
    reference: input.jotformSubmissionId,
    type: LEAD_TYPE_ESTIMATION,
    referral: REFERRAL_ESTIMATION,
    firstname: input.contact.prenom || undefined,
    lastname: input.contact.nom || undefined,
    email: input.contact.email ?? undefined,
    phone: input.contact.telephone ?? undefined,
    message: "Demande d'estimation reçue via le formulaire JotForm.",
    property_address: input.bien?.adresse ?? undefined,
    property_city: input.bien?.commune ?? undefined,
    property_zipcode: input.bien?.codePostal ?? undefined,
    property_country: "FR",
    // Vente uniquement : le formulaire d'estimation ne sert qu'à ce persona
    // (cf. lib/integrations/jotform/sync.ts, personas: ["vendeur"]).
    property_category: 1,
  }
}

export async function pushEstimationLead(input: EstimationLeadInput): Promise<EstimationLeadResult> {
  return apimoPost<EstimationLeadResult>("/leads", buildEstimationLeadPayload(input))
}
