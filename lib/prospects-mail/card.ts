import type { SuggestionCarte, SuggestionSummary } from "./queries"

// Lecture d'une carte de la file "À traiter" : le type de demande, le bien ou
// la recherche en une ligne, et si le contact est déjà dans le CRM. Tout est
// déduit de l'extraction déjà stockée (cf. `toSummary`), sans autre requête.

export type ContactStatus = "nouveau" | "existant"

export type CardView = {
  typeLabel: string
  bienLine: string | null
  contactStatus: ContactStatus | null
}

const SOURCES_VISITE = ["plato", "calendly"]

// La première règle qui s'applique l'emporte.
function typeLabel(carte: SuggestionCarte | null): string {
  if (!carte) return "Demande à qualifier"
  const { personas, recherche, bien, aMandat, originePrecise } = carte
  if (personas.includes("vendeur") || aMandat) return "Projet de vente"
  if (personas.includes("bailleur")) return "Mise en location"
  if (originePrecise && SOURCES_VISITE.includes(originePrecise.trim().toLowerCase())) {
    return "Demande de visite"
  }
  if (bien?.role === "annonce_agence") return "Question sur une annonce"
  if (recherche) {
    if (recherche.categorie === "location" || personas.includes("locataire")) {
      return "Recherche de location"
    }
    if (recherche.categorie === "vente" || personas.includes("acheteur")) {
      return "Recherche d'achat"
    }
  }
  return "Demande à qualifier"
}

const NUMBER = new Intl.NumberFormat("fr-FR", { maximumFractionDigits: 0 })

function euros(value: number): string {
  return `${NUMBER.format(value)} €`
}

// Nombre seul (bien) : "3 pièces" ; sinon tel qu'extrait ("T4", "3 pièces").
function piecesLabel(pieces: string | number | null): string | null {
  const text = pieces === null ? "" : String(pieces).trim()
  if (!/^\d+$/.test(text)) return text || null
  return `${text} pièce${Number(text) > 1 ? "s" : ""}`
}

// "Appartement 3 pièces · Cayenne" - segments vides ignorés.
function line(segments: (string | null | undefined)[]): string | null {
  const text = segments
    .map((s) => s?.trim())
    .filter(Boolean)
    .join(" · ")
  return text ? text[0].toUpperCase() + text.slice(1) : null
}

function typeEtPieces(typeBien: string | null, pieces: string | number | null): string {
  return [typeBien?.trim(), piecesLabel(pieces)].filter(Boolean).join(" ")
}

function bienLine(carte: SuggestionCarte | null): string | null {
  if (!carte) return null
  const { bien, recherche } = carte
  const fromBien = bien && line([typeEtPieces(bien.typeBien, bien.pieces), bien.commune])
  if (fromBien) return fromBien
  if (!recherche) return null
  const budget = recherche.loyerMax
    ? `${euros(recherche.loyerMax)}/mois max`
    : recherche.prixMax
      ? `${euros(recherche.prixMax)} max`
      : null
  return line([typeEtPieces(recherche.typeBien, recherche.pieces), recherche.secteur, budget])
}

function contactStatus(actions: SuggestionSummary["actions"]): ContactStatus | null {
  const op = actions.find((a) => a.entity === "contact")?.op
  if (op === "create") return "nouveau"
  if (op === "update") return "existant"
  return null
}

export function cardView(summary: Pick<SuggestionSummary, "carte" | "actions">): CardView {
  return {
    typeLabel: typeLabel(summary.carte),
    bienLine: bienLine(summary.carte),
    contactStatus: contactStatus(summary.actions),
  }
}
