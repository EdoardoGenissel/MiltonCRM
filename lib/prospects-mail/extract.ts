import { generateJson } from "@/lib/integrations/gemini/client"
import { ORIGINE_CANAUX } from "@/lib/contacts/origines"

// Ce que Gemini extrait d'un fil de mails (cf. EXTRACTION_SCHEMA). Toutes les
// valeurs sont "ce que dit le mail" - le rapprochement avec les fiches
// existantes et le calcul des propositions se font ensuite côté code (cf.
// lib/prospects-mail/proposals.ts), jamais par l'IA.
export type MailExtraction = {
  pertinent: boolean
  raison: string
  resume: string
  contact: {
    civilite: string | null
    prenom: string | null
    nom: string | null
    email: string | null
    telephone: string | null
    commune: string | null
    personas: string[]
  } | null
  origine: {
    canal: (typeof ORIGINE_CANAUX)[number] | null
    precision: string | null
  } | null
  recherche: {
    categorie: "vente" | "location" | null
    typeBien: string | null
    prixMin: number | null
    prixMax: number | null
    loyerMax: number | null
    surfaceMin: number | null
    surfaceMax: number | null
    pieces: string | null
    secteur: string | null
    commentaire: string | null
  } | null
  bien: {
    role: "propriete_du_contact" | "annonce_agence"
    reference: string | null
    adresse: string | null
    codePostal: string | null
    commune: string | null
    typeBien: string | null
    surface: number | null
    pieces: number | null
    chambres: number | null
    prix: number | null
    description: string | null
  } | null
  mandat: {
    type: "simple" | "exclusif" | null
    categorie: "Vente" | "Location" | null
    prix: number | null
    montantLoyer: number | null
    dateSignature: string | null
  } | null
}

const str = { type: "string", nullable: true }
const num = { type: "number", nullable: true }
const int = { type: "integer", nullable: true }

const EXTRACTION_SCHEMA = {
  type: "object",
  properties: {
    pertinent: {
      type: "boolean",
      description:
        "true seulement si le fil concerne un client/prospect immobilier réel (projet de vente, achat, location, mise en gestion, demande d'estimation, demande sur une annonce, rendez-vous...). false pour newsletters, publicité, notifications techniques, factures fournisseurs, prospection commerciale reçue, échanges internes.",
    },
    raison: { type: "string", description: "Justification courte de `pertinent`." },
    resume: {
      type: "string",
      description:
        "Résumé en 1 à 3 phrases, en français, du besoin du client et de l'état de l'échange.",
    },
    contact: {
      type: "object",
      nullable: true,
      description:
        "Le client/prospect externe (jamais un collaborateur de l'agence, ni le portail ou le service qui a relayé le message). null si non identifiable.",
      properties: {
        civilite: { ...str, description: "M. | Mme" },
        prenom: str,
        nom: str,
        email: str,
        telephone: {
          ...str,
          description: "Tel qu'écrit dans le mail, indicatif compris (+594...).",
        },
        commune: { ...str, description: "Commune de résidence du contact." },
        personas: {
          type: "array",
          items: { type: "string", enum: ["vendeur", "acheteur", "bailleur", "locataire"] },
          description:
            "vendeur = veut vendre un bien ; acheteur = cherche à acheter ; bailleur = veut louer son bien / le mettre en gestion ; locataire = cherche un bien à louer.",
        },
      },
      required: ["personas"],
    },
    origine: {
      type: "object",
      nullable: true,
      description:
        "Comment ce prospect est arrivé à l'agence. null si le fil ne permet pas de le savoir.",
      properties: {
        canal: {
          type: "string",
          nullable: true,
          enum: [...ORIGINE_CANAUX],
          description:
            "Internet = portail d'annonces, site web, réseaux sociaux, formulaire en ligne ; Prospection = trouvé ou apporté par un commercial de l'agence ; Relation = recommandé par une connaissance ; Apporteur = apporteur d'affaires externe ; Ancien client = déjà client de l'agence ; Collaboration = autre agence / confrère.",
        },
        precision: {
          type: "string",
          nullable: true,
          description:
            "Le nom précis de la source : portail ou outil (Leboncoin, SeLoger, Bien'ici, Properstar, Plato, Logic-Immo, Calendly, Facebook, site Milton...), ou le nom complet du commercial tel qu'écrit dans la liste fournie (ex. \"Johan MILTON\"), ou le nom de la personne / agence qui recommande.",
        },
      },
    },
    recherche: {
      type: "object",
      nullable: true,
      description: "Critères de recherche si le contact est acheteur ou locataire, sinon null.",
      properties: {
        categorie: { type: "string", nullable: true, enum: ["vente", "location"] },
        typeBien: { ...str, description: "maison | appartement | terrain | local | ..." },
        prixMin: num,
        prixMax: num,
        loyerMax: { ...num, description: "Loyer mensuel maximum (location)." },
        surfaceMin: num,
        surfaceMax: num,
        pieces: { ...str, description: 'Ex. "3 pièces", "T4", ">= 3".' },
        secteur: { ...str, description: "Communes / quartiers recherchés." },
        commentaire: { ...str, description: "Autres critères utiles, en une phrase." },
      },
    },
    bien: {
      type: "object",
      nullable: true,
      description: "Le bien concerné par l'échange, s'il est identifiable. null sinon.",
      properties: {
        role: {
          type: "string",
          enum: ["propriete_du_contact", "annonce_agence"],
          description:
            "propriete_du_contact = bien appartenant au contact (à vendre / louer / estimer) ; annonce_agence = annonce de l'agence sur laquelle le contact se renseigne.",
        },
        reference: { ...str, description: "Référence d'annonce ou de mandat citée." },
        adresse: { ...str, description: "Numéro et voie uniquement." },
        codePostal: str,
        commune: str,
        typeBien: str,
        surface: { ...num, description: "Surface habitable en m²." },
        pieces: int,
        chambres: int,
        prix: { ...num, description: "Prix de vente (ou loyer si location) annoncé ou souhaité." },
        description: {
          ...str,
          description: "Description factuelle du bien en une ou deux phrases.",
        },
      },
      required: ["role"],
    },
    mandat: {
      type: "object",
      nullable: true,
      description:
        "Uniquement si le fil mentionne explicitement un mandat signé ou en cours de signature avec l'agence. null sinon.",
      properties: {
        type: { type: "string", nullable: true, enum: ["simple", "exclusif"] },
        categorie: { type: "string", nullable: true, enum: ["Vente", "Location"] },
        prix: num,
        montantLoyer: num,
        dateSignature: { ...str, description: "AAAA-MM-JJ" },
      },
    },
  },
  required: ["pertinent", "raison", "resume"],
}

const SYSTEM = `Tu es l'assistant CRM de Milton Immobilier, agence immobilière en Guyane (transaction et gestion locative).
On te donne un fil de mails reçu sur une boîte de l'agence. Tu dois :
1. décider s'il concerne un client ou prospect immobilier réel ;
2. si oui, extraire les informations du client, de sa recherche, du bien concerné et d'un éventuel mandat.

Règles :
- N'invente rien : un champ absent du mail vaut null. Ne déduis pas un nom d'une adresse email sauf si c'est évident (prenom.nom@...).
- Le contact est toujours la personne extérieure à l'agence. Les collaborateurs ont une adresse @miltonimmobilier.fr ou signent "Milton Immobilier" : ce ne sont jamais des contacts.
- Pour les mails relayés par un portail (Leboncoin, SeLoger, Bien'ici, Logic-Immo, Calendly, formulaire du site...), le contact est la personne dont les coordonnées figurent dans le corps du message, pas l'expéditeur technique.
- Montants en euros, nombres sans unité.
- Origine : un mail transféré, envoyé ou mis en copie par un commercial qui présente le prospect indique en général une origine "Prospection" (le commercial en précision). Un mail relayé par un portail indique "Internet" (le portail en précision).`

// `commerciaux` : "Prénom NOM (email)" des collaborateurs, pour que l'origine
// "Prospection" cite le commercial sous le même libellé que dans Apimo.
export async function extractFromThread(
  mailbox: string,
  threadText: string,
  commerciaux: string[] = [],
): Promise<MailExtraction> {
  const team = commerciaux.length
    ? `Commerciaux de l'agence :\n${commerciaux.map((c) => `- ${c}`).join("\n")}\n\n`
    : ""
  const result = await generateJson<MailExtraction>({
    system: SYSTEM,
    prompt: `Boîte mail de l'agence : ${mailbox}\n\n${team}Fil de mails (du plus ancien au plus récent) :\n\n${threadText}`,
    schema: EXTRACTION_SCHEMA,
  })
  // Gemini peut omettre `personas` malgré `required` dans de rares cas.
  if (result.contact && !Array.isArray(result.contact.personas)) result.contact.personas = []
  return result
}
