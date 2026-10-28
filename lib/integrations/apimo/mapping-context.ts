import { parseApimoDateTime } from "@/lib/imports/parse-datetime"
import type { ApimoCatalogs } from "./catalogs"
import type { ApimoContact } from "./types"

// Référentiels chargés une fois par synchro (cf. sync.ts) et partagés par les
// conversions bien (map-property.ts) et prospect (map-request.ts).
export type ApimoMappingContext = {
  catalogs: ApimoCatalogs
  agencyName: string
  // id utilisateur Apimo → "Prénom NOM", comme la colonne "Utilisateur" de l'export.
  users: Map<number, string>
  residences: Map<number, string>
  contacts: Map<number, ApimoContact>
  // Emails portés par plusieurs contacts Apimo (couple, société, adresse
  // générique de l'agence...) : inutilisables pour reconnaître une personne.
  sharedEmails: Set<string>
}

const countryNames = new Intl.DisplayNames(["fr"], { type: "region" })

// Code pays ISO ("GF") → libellé de l'export ("Guyane française").
export function countryLabel(code: string | null | undefined): string | undefined {
  if (!code) return undefined
  try {
    return countryNames.of(code.toUpperCase()) ?? undefined
  } catch {
    return undefined
  }
}

// Chaîne vide côté API ("address": "") = absent, comme une cellule Excel vide.
// Fins de ligne Windows ramenées à "\n", comme dans les textes issus de l'export.
export function text(value: string | null | undefined): string | undefined {
  const trimmed = value?.replace(/\r\n?/g, "\n").trim()
  return trimmed ? trimmed : undefined
}

export function fullName(firstname: string | null, lastname: string | null): string | undefined {
  return text(
    [firstname, lastname]
      .map((part) => part?.trim())
      .filter(Boolean)
      .join(" "),
  )
}

// Montants/surfaces : nombre ou string numérique ("500") selon l'endpoint.
export function amount(value: number | string | null | undefined): number | undefined {
  if (value === null || value === undefined || value === "") return undefined
  const n = Number(value)
  return Number.isFinite(n) ? n : undefined
}

// Critère/valeur à 0 = non renseigné côté Apimo (surface min, nombre de pièces...)
// - l'export laissait la cellule vide.
export function positiveAmount(value: number | string | null | undefined): number | undefined {
  const n = amount(value)
  return n ? n : undefined
}

// Les dates API ont le même format que l'export "Produits" ("2024-07-30
// 14:31:31", "2023-03-02") et sont stockées pareil : heure Apimo telle quelle.
export function apimoDateTime(value: string | null | undefined): Date | undefined {
  return parseApimoDateTime(value ?? undefined)
}

// Date sans heure (création/mise à jour d'une recherche, date de vente...) :
// minuit, comme les colonnes date seule de l'export.
export function apimoDate(value: string | null | undefined): Date | undefined {
  return parseApimoDateTime(value?.slice(0, 10))
}

// L'export formatait les numéros ("+594 694 24 72 75", "+33 6 12 34 56 78") là
// où l'API les renvoie bruts ("+594694247275", "0694247275") - on reproduit ce
// format pour que les fiches ne changent pas d'aspect. Comme l'export, un numéro
// national ("0694...", "694...") reçoit l'indicatif de la Guyane (+594), y compris
// un 06 métropolitain - comportement observé sur 189 fiches, conservé tel quel.
export function formatPhone(value: string | null | undefined): string | undefined {
  const raw = text(value)
  if (!raw) return undefined
  const digits = raw.replace(/\D/g, "")

  let countryCode: string | undefined
  let national: string | undefined
  if (raw.startsWith("+") || raw.startsWith("00")) {
    const international = raw.startsWith("00") ? digits.slice(2) : digits
    countryCode = international.startsWith("33") ? "33" : international.slice(0, 3)
    national = international.slice(countryCode.length)
  } else if (digits.length === 10 && digits.startsWith("0")) {
    countryCode = "594"
    national = digits.slice(1)
  } else if (digits.length === 9) {
    countryCode = "594"
    national = digits
  }
  if (!countryCode || national?.length !== 9) return raw

  const head = countryCode === "33" ? national.slice(0, 1) : national.slice(0, 3)
  const pairs = national.slice(head.length).match(/\d{2}/g) ?? []
  return [`+${countryCode}`, head, ...pairs].join(" ")
}

// Email exploitable pour reconnaître une personne (cf. `sharedEmails`).
export function identityEmail(
  value: string | null | undefined,
  ctx: ApimoMappingContext,
): string | undefined {
  const email = text(value)
  return email && !ctx.sharedEmails.has(email.toLowerCase()) ? email : undefined
}
