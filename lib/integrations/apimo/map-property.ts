import { normalizeCommune } from "@/lib/imports/normalize-commune"
import {
  MANDAT_TYPE_INCONNU,
  type ApimoBienItem,
  type ApimoOwnerInput,
} from "@/lib/imports/apimo-bien-item"
import { catalogLabel } from "./catalogs"
import {
  amount,
  apimoDate,
  apimoDateTime,
  countryLabel,
  formatPhone,
  fullName,
  identityEmail,
  positiveAmount,
  text,
  type ApimoMappingContext,
} from "./mapping-context"
import type { ApimoContact, ApimoProperty } from "./types"

// Conversion d'un bien de l'API (GET /properties) vers le même item que celui
// produit par une ligne de l'export Excel "Produits" (cf. run-import-biens.ts),
// pour que les deux passent par la même écriture en base.

// Catalogue property_regulation : 1 = consommation (kWh/m².an), 2 = émissions
// (kg CO2/m².an). "-1" = "Not applicable".
const REGULATION_ENERGIE_CONSOMMATION = 1
const REGULATION_ENERGIE_EMISSION = 2

function regulation(property: ApimoProperty, type: number): number | undefined {
  const value = amount(property.regulations?.find((r) => r.type === type)?.value)
  return value !== undefined && value >= 0 ? value : undefined
}

export function mapApimoOwner(
  contact: ApimoContact,
  ctx: ApimoMappingContext,
): ApimoOwnerInput | null {
  const nom = text(contact.lastname)
  if (!nom) return null
  return {
    apimoContactId: String(contact.id),
    civilite: catalogLabel(ctx.catalogs, "contact_title", contact.title),
    prenom: text(contact.firstname) ?? "",
    nom,
    // Email partagé (adresse de la société, du couple...) écarté : il ferait
    // rattacher le bien au premier contact venu portant ce même email.
    email: identityEmail(contact.email, ctx),
    telephone: formatPhone(contact.mobile) ?? formatPhone(contact.phone),
  }
}

// Même forme que la colonne "Propriétaire" de l'export ("Mme Marie LAMBERT"),
// avec la raison sociale quand le propriétaire est une société ("M. Rene VERNHET
// (SARL KARINVEST)") - l'export n'affichait parfois que l'une ou l'autre.
function contactLabel(contact: ApimoContact, ctx: ApimoMappingContext): string | undefined {
  const abbreviation = contact.title
    ? ctx.catalogs.contact_title.get(contact.title)?.name_plurial
    : undefined
  const person = text(
    [abbreviation, fullName(contact.firstname, contact.lastname)].filter(Boolean).join(" "),
  )
  const company = text(contact.name)
  if (person && company) return `${person} (${company})`
  return person ?? company
}

export function mapApimoProperty(property: ApimoProperty, ctx: ApimoMappingContext): ApimoBienItem {
  const { catalogs } = ctx
  const status = catalogLabel(catalogs, "property_status", property.status)
  const comment =
    property.comments?.find((c) => c.language === "fr") ?? property.comments?.[0] ?? null
  const ownerContact = property.owner ? ctx.contacts.get(property.owner) : undefined
  const owner = ownerContact ? mapApimoOwner(ownerContact, ctx) : null
  const coAgency = property.agency_co_id ? ctx.contacts.get(property.agency_co_id) : undefined

  return {
    sourceRef: String(property.id),
    bien: {
      adresse: text(property.address),
      commune: property.city?.name ? normalizeCommune(property.city.name) : undefined,
      // Le sous-type est le plus précis ("Maison jumelée", "Local commercial") -
      // c'est lui que l'export affichait dans la colonne "Type" quand il existe.
      typeBien:
        catalogLabel(catalogs, "property_subtype", property.subtype) ??
        catalogLabel(catalogs, "property_type", property.type),
      surface: positiveAmount(property.area?.value),
      prix: positiveAmount(property.price?.value),
      statut: status,
      codePostal: text(property.city?.zipcode),
      quartier: text(property.district?.name),
      pays: countryLabel(property.country),
      residence: property.residence?.id ? ctx.residences.get(property.residence.id) : undefined,
      adresseComplement: text(property.address_more),
      etage: catalogLabel(catalogs, "property_floor", property.floor?.type),
      numeroClef: text(property.visit?.key_number),
      pieces: positiveAmount(property.rooms),
      chambres: positiveAmount(property.bedrooms),
      devise: text(property.price?.currency),
      attributs: text(
        (property.tags_customized ?? [])
          .map((tag) => tag.value ?? tag.label)
          .filter(Boolean)
          .join(", "),
      ),
      titre: text(comment?.title),
      description: text(comment?.comment),
      photos: [...(property.pictures ?? [])].sort((a, b) => a.rank - b.rank).map((p) => p.url),
      energieConsommation: regulation(property, REGULATION_ENERGIE_CONSOMMATION),
      energieEmission: regulation(property, REGULATION_ENERGIE_EMISSION),
      agence: ctx.agencyName,
      utilisateur: property.user
        ? fullName(property.user.firstname, property.user.lastname)
        : undefined,
      proprietaireLabel: ownerContact ? contactLabel(ownerContact, ctx) : undefined,
      creeLe: apimoDateTime(property.created_at),
      majLe: apimoDateTime(property.updated_at),
    },
    mandat: {
      type:
        catalogLabel(catalogs, "property_agreement", property.agreement?.type) ??
        MANDAT_TYPE_INCONNU,
      statut: status,
      dateSignature: apimoDate(property.agreement?.start_at),
      categorie: catalogLabel(catalogs, "property_category", property.category),
      // Confrère : la raison sociale de l'agence ("2R IMMOBILIER") prime.
      coAgent: coAgency ? (text(coAgency.name) ?? contactLabel(coAgency, ctx)) : undefined,
      finMandat: apimoDate(property.agreement?.end_at),
      origine: catalogLabel(catalogs, "referral", property.referral),
      honorairesProprietaire: amount(property.price?.commission_owner),
      honorairesAcheteur: amount(property.price?.commission_customer),
      montantProprietaire: positiveAmount(property.price?.net_seller),
      montantCompromis: positiveAmount(property.price?.sold),
      venduLe: apimoDate(property.price?.sold_at),
    },
    owners: owner ? [owner] : [],
  }
}
