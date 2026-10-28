import { normalizeName } from "@/lib/contacts/dedupe"
import { FIELDS, toDisplay, type ProposalEntity } from "./fields"
import type { MailExtraction } from "./extract"

export type FieldChange = {
  key: string
  label: string
  current: string | null
  proposed: string
  // Coché par défaut quand le champ est vide en base ; décoché quand la
  // proposition écraserait une valeur existante (au commercial de trancher).
  selected: boolean
}

// "lien" : fiche existante simplement citée par le mail (ex. annonce de
// l'agence sur laquelle un acheteur se renseigne) - affichée, jamais modifiée.
export type ProposedAction = {
  entity: ProposalEntity
  op: "create" | "update" | "lien"
  targetId: string | null
  targetLabel: string | null
  matchReason: string | null
  fields: FieldChange[]
}

export type MatchedRecord = {
  id: string
  label: string
  reason: string
  values: Record<string, unknown>
}

// Fiches déjà en base rapprochées des informations extraites (cf.
// lib/prospects-mail/sync.ts `matchExtraction`).
export type MatchContext = {
  contact: MatchedRecord | null
  prospectDetail: Record<string, unknown> | null
  bien: MatchedRecord | null
  mandat: MatchedRecord | null
}

function comparable(key: string, value: string): string {
  // 9 derniers chiffres : neutralise l'indicatif, métropole (+33) comme
  // Guyane/Antilles (+594, +590, +596), que `normalizePhone` ne gère pas.
  if (key === "telephone") return value.replace(/\D/g, "").slice(-9)
  const asNumber = Number(value.replace(",", "."))
  if (value.trim() !== "" && Number.isFinite(asNumber)) return String(asNumber)
  return normalizeName(value)
}

// Champs à proposer pour une entité : ceux dont la valeur extraite est
// renseignée et diffère de la valeur actuelle (toutes en création).
export function diffFields(
  entity: ProposalEntity,
  proposed: Record<string, unknown>,
  current: Record<string, unknown> | null,
): FieldChange[] {
  const changes: FieldChange[] = []
  for (const def of FIELDS[entity]) {
    const next = toDisplay(proposed[def.key])
    if (next === null) continue
    const now = current ? toDisplay(current[def.key]) : null
    if (now !== null && comparable(def.key, now) === comparable(def.key, next)) continue
    changes.push({
      key: def.key,
      label: def.label,
      current: now,
      proposed: next,
      selected: now === null,
    })
  }
  return changes
}

function mergePersonas(current: unknown, incoming: string[]): string[] {
  const existing = Array.isArray(current) ? (current as string[]) : []
  return [...new Set([...existing, ...incoming])]
}

export function buildActions(extraction: MailExtraction, match: MatchContext): ProposedAction[] {
  if (!extraction.pertinent) return []
  const actions: ProposedAction[] = []
  // Source du prospect (portail, commercial...) - rangée dans les colonnes
  // Origine / Origine précise déjà alimentées par l'import Apimo.
  const origine = {
    origine: extraction.origine?.canal ?? null,
    originePrecise: extraction.origine?.precision ?? null,
  }

  const contact = extraction.contact
  if (contact && (contact.nom || contact.prenom || contact.email || contact.telephone)) {
    const proposed = {
      ...contact,
      // Les types de prospect s'ajoutent (un vendeur peut aussi être acheteur),
      // jamais retirés depuis un mail.
      personas: mergePersonas(match.contact?.values.personas, contact.personas),
    }
    actions.push({
      entity: "contact",
      op: match.contact ? "update" : "create",
      targetId: match.contact?.id ?? null,
      targetLabel: match.contact?.label ?? null,
      matchReason: match.contact?.reason ?? null,
      fields: diffFields("contact", proposed, match.contact?.values ?? null),
    })

    // La fiche prospect porte l'origine : proposée même sans critères de
    // recherche (ex. vendeur apporté par un commercial).
    if (extraction.recherche || origine.origine || origine.originePrecise) {
      const fields = diffFields(
        "prospectDetail",
        { ...origine, ...extraction.recherche },
        match.prospectDetail,
      )
      if (fields.length) {
        actions.push({
          entity: "prospectDetail",
          op: match.prospectDetail ? "update" : "create",
          targetId: null, // = le contact ci-dessus, résolu à la validation
          targetLabel: null,
          matchReason: null,
          fields,
        })
      }
    }
  }

  const bien = extraction.bien
  if (bien?.role === "annonce_agence") {
    if (match.bien) {
      actions.push({
        entity: "bien",
        op: "lien",
        targetId: match.bien.id,
        targetLabel: match.bien.label,
        matchReason: match.bien.reason,
        fields: [],
      })
    }
  } else if (bien && (bien.adresse || bien.commune || match.bien)) {
    const proposed = { ...bien, prix: bien.prix ?? extraction.mandat?.prix ?? null }
    const fields = diffFields("bien", proposed, match.bien?.values ?? null)
    if (fields.length || match.bien) {
      actions.push({
        entity: "bien",
        op: match.bien ? (fields.length ? "update" : "lien") : "create",
        targetId: match.bien?.id ?? null,
        targetLabel: match.bien?.label ?? null,
        matchReason: match.bien?.reason ?? null,
        fields,
      })
    }

    if (extraction.mandat) {
      // L'origine n'est reprise que sur un nouveau mandat : celle d'un mandat
      // existant décrit sa propre histoire, pas celle de ce mail.
      const fields = diffFields(
        "mandat",
        match.mandat ? extraction.mandat : { ...extraction.mandat, ...origine },
        match.mandat?.values ?? null,
      )
      if (fields.length || !match.mandat) {
        actions.push({
          entity: "mandat",
          op: match.mandat ? "update" : "create",
          targetId: match.mandat?.id ?? null,
          targetLabel: match.mandat?.label ?? null,
          matchReason: match.mandat?.reason ?? null,
          fields,
        })
      }
    }
  }

  return actions
}
