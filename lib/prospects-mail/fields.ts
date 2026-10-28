// Registre des champs proposables par entité - source unique pour le calcul du
// diff (lib/prospects-mail/proposals.ts), l'affichage des libellés (page
// Prospects) et la conversion des valeurs saisies avant écriture en base
// (lib/prospects-mail/apply.ts). Un champ absent d'ici n'est jamais écrit.

export type FieldType = "text" | "number" | "int" | "date" | "list"

import { PERSONAS } from "@/lib/contacts/personas"
import { ORIGINE_CANAUX, ORIGINE_PRECISIONS } from "@/lib/contacts/origines"

export type FieldDef = {
  key: string
  label: string
  type: FieldType
  // Affichage du formulaire (cf. components/field-input.tsx) : liste fermée
  // (select / cases à cocher pour "list"), suggestions libres (datalist),
  // texte long (textarea), champ pleine largeur.
  options?: readonly { value: string; label: string }[]
  suggestions?: readonly string[]
  multiline?: boolean
  wide?: boolean
}

export const asOptions = (values: readonly string[]) =>
  values.map((value) => ({ value, label: value }))

export type ProposalEntity = "contact" | "prospectDetail" | "bien" | "mandat"

export const FIELDS: Record<ProposalEntity, FieldDef[]> = {
  contact: [
    { key: "civilite", label: "Civilité", type: "text", options: asOptions(["M.", "Mme"]) },
    { key: "prenom", label: "Prénom", type: "text" },
    { key: "nom", label: "Nom", type: "text" },
    { key: "email", label: "Email", type: "text" },
    { key: "telephone", label: "Téléphone", type: "text" },
    { key: "commune", label: "Commune", type: "text" },
    { key: "personas", label: "Types", type: "list", options: PERSONAS, wide: true },
  ],
  prospectDetail: [
    { key: "origine", label: "Origine", type: "text", options: asOptions(ORIGINE_CANAUX) },
    {
      key: "originePrecise",
      label: "Origine précise",
      type: "text",
      suggestions: ORIGINE_PRECISIONS,
    },
    {
      key: "categorie",
      label: "Catégorie",
      type: "text",
      options: asOptions(["vente", "location"]),
    },
    { key: "typeBien", label: "Type de bien", type: "text" },
    { key: "prixMin", label: "Prix min", type: "number" },
    { key: "prixMax", label: "Prix max", type: "number" },
    { key: "loyerMax", label: "Loyer max", type: "number" },
    { key: "surfaceMin", label: "Surface min", type: "number" },
    { key: "surfaceMax", label: "Surface max", type: "number" },
    { key: "pieces", label: "Pièces", type: "text" },
    { key: "secteur", label: "Secteur", type: "text" },
    { key: "commentaire", label: "Commentaire", type: "text", multiline: true, wide: true },
  ],
  bien: [
    { key: "adresse", label: "Adresse", type: "text", wide: true },
    { key: "codePostal", label: "Code postal", type: "text" },
    { key: "commune", label: "Commune", type: "text" },
    { key: "typeBien", label: "Type", type: "text" },
    { key: "surface", label: "Surface", type: "number" },
    { key: "pieces", label: "Pièces", type: "int" },
    { key: "chambres", label: "Chambres", type: "int" },
    { key: "prix", label: "Prix", type: "number" },
    { key: "description", label: "Description", type: "text", multiline: true, wide: true },
  ],
  mandat: [
    { key: "type", label: "Type", type: "text", options: asOptions(["simple", "exclusif"]) },
    {
      key: "categorie",
      label: "Catégorie",
      type: "text",
      options: asOptions(["Vente", "Location"]),
    },
    { key: "montantLoyer", label: "Loyer", type: "number" },
    { key: "dateSignature", label: "Date de signature", type: "date" },
    { key: "origine", label: "Origine", type: "text", options: asOptions(ORIGINE_CANAUX) },
    {
      key: "originePrecise",
      label: "Origine précise",
      type: "text",
      suggestions: ORIGINE_PRECISIONS,
    },
  ],
}

export function fieldDef(entity: ProposalEntity, key: string): FieldDef | undefined {
  return FIELDS[entity].find((f) => f.key === key)
}

// Valeur en base (string, Decimal Prisma, Date, tableau...) -> texte affichable
// et éditable, `null` si vide.
export function toDisplay(value: unknown): string | null {
  if (value === null || value === undefined) return null
  if (Array.isArray(value)) return value.length ? value.join(", ") : null
  if (value instanceof Date) return value.toISOString().slice(0, 10)
  const text = String(value).trim()
  return text === "" ? null : text
}

// Texte saisi/validé -> valeur à écrire en base selon le type du champ.
// `undefined` = valeur invalide (champ ignoré), `null` = vider le champ.
export function fromDisplay(type: FieldType, value: string): unknown {
  const text = value.trim()
  if (text === "") return null
  switch (type) {
    case "number": {
      const n = Number(text.replace(/\s/g, "").replace(",", "."))
      return Number.isFinite(n) ? n : undefined
    }
    case "int": {
      const n = Number.parseInt(text, 10)
      return Number.isFinite(n) ? n : undefined
    }
    case "date": {
      const d = new Date(text)
      return Number.isNaN(d.getTime()) ? undefined : d
    }
    case "list":
      return text
        .split(",")
        .map((v) => v.trim())
        .filter(Boolean)
    default:
      return text
  }
}
