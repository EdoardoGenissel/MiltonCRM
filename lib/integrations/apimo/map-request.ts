import { apimoProspectPersona } from "@/lib/imports/apimo-persona"
import { normalizeCommune } from "@/lib/imports/normalize-commune"
import type { ApimoProspectItem } from "@/lib/imports/run-import"
import { catalogLabel } from "./catalogs"
import {
  amount,
  apimoDate,
  countryLabel,
  formatPhone,
  positiveAmount,
  text,
  type ApimoMappingContext,
} from "./mapping-context"
import type { ApimoContact, ApimoRequest } from "./types"

// Conversion d'une recherche de l'API (GET /requests) + de son contact (GET
// /contacts) vers le même item qu'une ligne de l'export Excel "prospects" (cf.
// run-import.ts) : l'export est une ligne par recherche, avec les colonnes du
// contact répétées - vérifié sur la base, 3 005 des 3 013 fiches importées ont
// leur "Référence" égale à l'id d'une recherche Apimo.

// "Classification" de l'export = `ranking` de la recherche (pas de catalogue
// exposé par l'API pour ce champ).
const RANKING_LABELS: Record<number, string> = {
  1: "Très actif",
  2: "Actif",
  3: "Normal",
}

// `rooms_operator` : opérateur de comparaison du critère pièces/chambres.
const ROOMS_OPERATORS: Record<string, string> = {
  "1": "=",
  "2": "≥",
  "3": "≤",
}

// Catalogue mailing/emailing/magazine : 2 = abonné ("Abonné" dans l'export).
const SUBSCRIBED = 2

// L'utilisateur système d'Apimo (mises à jour automatiques) n'est pas renvoyé
// par GET /users ; l'export l'affichait "Bot".
const APIMO_BOT_USER_ID = 1

const languageNames = new Intl.DisplayNames(["fr"], { type: "language" })

function languageLabel(code: string): string {
  try {
    return languageNames.of(code) ?? code
  } catch {
    return code
  }
}

function userLabel(id: number | null, ctx: ApimoMappingContext): string | undefined {
  if (id === null) return undefined
  if (id === APIMO_BOT_USER_ID) return "Bot"
  return ctx.users.get(id)
}

// Même texte que la colonne "Pièces" de l'export : "≥ 3.0 pièces", "≤ 1.0 chambre"
// - les chambres priment quand elles sont renseignées.
function piecesLabel(request: ApimoRequest): string | undefined {
  const operator = ROOMS_OPERATORS[request.rooms_operator ?? ""]
  if (!operator) return undefined
  const bedrooms = amount(request.bedrooms)
  const rooms = amount(request.rooms)
  const [count, unit] = bedrooms ? [bedrooms, "chambre"] : rooms ? [rooms, "pièce"] : []
  if (count === undefined) return undefined
  return `${operator} ${count.toFixed(1)} ${unit}${count >= 2 ? "s" : ""}`
}

function joinNames(names: (string | null | undefined)[], separator: string): string | undefined {
  return text(names.filter(Boolean).join(separator))
}

export function mapApimoRequest(
  request: ApimoRequest,
  contact: ApimoContact,
  ctx: ApimoMappingContext,
): ApimoProspectItem {
  const { catalogs } = ctx
  const categorie = catalogLabel(catalogs, "property_category", request.category)
  const prixMax = positiveAmount(request.price?.max)
  const locations = request.locations ?? []

  return {
    sourceRef: String(contact.id),
    civilite: catalogLabel(catalogs, "contact_title", contact.title),
    prenom: text(contact.firstname) ?? "",
    nom: text(contact.lastname) ?? "",
    telephone: formatPhone(contact.mobile) ?? formatPhone(contact.phone),
    email: text(contact.email),
    // Ordre de l'export : id de commune décroissant ("REMIRE-MONTJOLY, MATOURY,
    // CAYENNE"), l'API les renvoyant dans l'ordre de saisie.
    commune: joinNames(
      [...locations]
        .sort((a, b) => (b.city?.id ?? 0) - (a.city?.id ?? 0))
        .map((l) => (l.city?.name ? normalizeCommune(l.city.name) : null)),
      ", ",
    ),
    persona: apimoProspectPersona(categorie),
    detail: {
      alerteAbonne: contact.mailing?.subscription === SUBSCRIBED,
      classification: request.ranking ? RANKING_LABELS[request.ranking] : undefined,
      origine: catalogLabel(catalogs, "referral", request.referral),
      categorie,
      typeBien: joinNames(
        (request.types ?? []).map((type) => catalogLabel(catalogs, "property_type", type)),
        " ",
      ),
      loyerMax: categorie?.toLowerCase() === "location" ? prixMax : undefined,
      prixMin: positiveAmount(request.price?.min),
      prixMax,
      devise: text(request.price?.currency),
      pieces: piecesLabel(request),
      surfaceMin: positiveAmount(request.area?.min),
      surfaceMax: positiveAmount(request.area?.max),
      secteur: text(request.sector),
      quartier: joinNames(
        locations.map((l) => l.district?.name),
        ", ",
      ),
      derniereAction: apimoDate(request.last_action),
      commentaire: text(request.comment),
      creeLe: apimoDate(request.created_at),
      utilisateur: userLabel(request.user, ctx),
      emailingAbonne: contact.emailing ? contact.emailing.subscription === SUBSCRIBED : undefined,
      magazineAbonne: contact.magazine ? contact.magazine.subscription === SUBSCRIBED : undefined,
      languesParlees: (contact.language ?? []).filter(Boolean).map(languageLabel),
      dateNaissance: apimoDate(contact.birthday_at),
      lieuNaissance: text(contact.birthplace),
      adressePersonnelle: text(contact.address),
      adresseComplement: text(contact.address_more),
      codePostal: text(contact.city?.zipcode),
      villePersonnelle: contact.city?.name ? normalizeCommune(contact.city.name) : undefined,
      pays: countryLabel(contact.country),
      agence: ctx.agencyName,
      referenceProduit: String(request.id),
      criteresComplementaires: text(request.free_criteria),
      majLe: apimoDate(request.updated_at),
      majPar: userLabel(request.updated_by, ctx),
    },
  }
}
