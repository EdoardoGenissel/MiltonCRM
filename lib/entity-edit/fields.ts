import { PERSONAS } from "@/lib/contacts/personas"
import { ORIGINE_CANAUX, ORIGINE_PRECISIONS } from "@/lib/contacts/origines"
import { asOptions, type FieldDef } from "@/lib/prospects-mail/fields"

// Champs modifiables depuis le bouton "Modifier" des drawers (cf.
// components/entity-drawers/entity-edit-form.tsx) - source unique pour le
// formulaire et pour la route PATCH (lib/entity-edit/update.ts), qui n'écrit
// jamais un champ absent d'ici.
export type EditableEntity = "contact" | "bien" | "mandat"

export type EditFieldDef = FieldDef & {
  // Colonne portée par ProspectDetail (1-1 avec le contact) et non par Contact.
  onProspectDetail?: boolean
}

export const EDIT_FIELDS: Record<EditableEntity, EditFieldDef[]> = {
  contact: [
    { key: "civilite", label: "Civilité", type: "text", options: asOptions(["M.", "Mme"]) },
    { key: "prenom", label: "Prénom", type: "text" },
    { key: "nom", label: "Nom", type: "text" },
    { key: "email", label: "Email", type: "text" },
    { key: "telephone", label: "Téléphone", type: "text" },
    { key: "commune", label: "Commune", type: "text" },
    { key: "personas", label: "Types", type: "list", options: PERSONAS, wide: true },
    {
      key: "origine",
      label: "Origine",
      type: "text",
      options: asOptions(ORIGINE_CANAUX),
      onProspectDetail: true,
    },
    {
      key: "originePrecise",
      label: "Origine précise",
      type: "text",
      suggestions: ORIGINE_PRECISIONS,
      onProspectDetail: true,
    },
  ],
  bien: [
    { key: "adresse", label: "Adresse", type: "text", wide: true },
    { key: "codePostal", label: "Code postal", type: "text" },
    { key: "commune", label: "Commune", type: "text" },
    { key: "typeBien", label: "Type", type: "text" },
    { key: "statut", label: "Statut", type: "text" },
    { key: "surface", label: "Surface (m²)", type: "number" },
    { key: "prix", label: "Prix", type: "number" },
    { key: "pieces", label: "Pièces", type: "int" },
    { key: "chambres", label: "Chambres", type: "int" },
  ],
  mandat: [
    { key: "type", label: "Type", type: "text", options: asOptions(["simple", "exclusif"]) },
    { key: "statut", label: "Statut", type: "text" },
    { key: "numero", label: "Numéro de mandat", type: "text" },
    { key: "coAgent", label: "Co-agent", type: "text" },
    { key: "dateSignature", label: "Démarrage", type: "date" },
    { key: "finMandat", label: "Fin", type: "date" },
    { key: "origine", label: "Origine", type: "text", options: asOptions(ORIGINE_CANAUX) },
    {
      key: "originePrecise",
      label: "Origine précise",
      type: "text",
      suggestions: ORIGINE_PRECISIONS,
    },
  ],
}
