import type { JotformAnswer, JotformSubmission } from "./api-client"

// Mapping construit à partir de la structure réelle du formulaire JotForm
// "ESTIMATION IMMOBILIERE" (form id cf. JOTFORM_ESTIMATION_FORM_ID), interrogée
// via GET /form/{id}/questions — les noms de champs (`name`) sont stables tant
// que le formulaire n'est pas remanié dans le builder JotForm, contrairement aux
// qid qui peuvent changer si des questions sont ajoutées/supprimées.

export type MappedEstimationSubmission = {
  submissionId: string
  submittedAt: Date
  contact: {
    prenom: string
    nom: string
    email: string | null
    telephone: string | null
    commune: string | null
  }
  bien: {
    adresse: string | null
    commune: string | null
    codePostal: string | null
    typeBien: string | null
    pieces: number | null
    surfaceTerrain: number | null
    referenceCadastrale: string | null
    taxeFonciere: number | null
    chargesCopropriete: number | null
    copropriete: boolean | null
    assainissement: string | null
    cuisineEquipements: string[]
    equipements: string[]
    pointsPositifs: string | null
    pointsNegatifs: string | null
    disponibilite: string | null
  } | null
  // Toutes les réponses lisibles (libellé de question -> valeur), pour ne perdre
  // aucune information saisie même sans colonne dédiée en base.
  answers: Record<string, string>
}

function answerByName(submission: JotformSubmission, name: string): JotformAnswer | undefined {
  return Object.values(submission.answers).find((a) => a.name === name)
}

function asFullname(answer?: JotformAnswer): { prenom: string; nom: string } {
  const value = answer?.answer as { first?: string; last?: string } | undefined
  return { prenom: value?.first?.trim() ?? "", nom: value?.last?.trim() ?? "" }
}

function asPhone(answer?: JotformAnswer): string | null {
  const value = answer?.answer as { full?: string } | undefined
  return value?.full?.trim() || null
}

function asEmail(answer?: JotformAnswer): string | null {
  const value = answer?.answer
  return typeof value === "string" && value.trim() ? value.trim() : null
}

function asAddress(answer?: JotformAnswer) {
  const value = answer?.answer as
    { addr_line1?: string; addr_line2?: string; city?: string; postal?: string } | undefined
  if (!value) return null
  const adresse =
    [value.addr_line1?.trim(), value.addr_line2?.trim()].filter(Boolean).join(" ") || null
  return {
    adresse,
    commune: value.city?.trim() || null,
    codePostal: value.postal?.trim() || null,
  }
}

function asChecklist(answer?: JotformAnswer): string | null {
  const value = answer?.answer
  if (Array.isArray(value)) return value.filter(Boolean).join(", ") || null
  if (typeof value === "string" && value.trim()) return value.trim()
  return null
}

function asStringList(answer?: JotformAnswer): string[] {
  const value = answer?.answer
  return Array.isArray(value)
    ? value.filter((v): v is string => typeof v === "string" && v.trim() !== "")
    : []
}

function asFreeText(answer?: JotformAnswer): string | null {
  const value = answer?.answer
  return typeof value === "string" && value.trim() ? value.trim() : null
}

function asNumberField(answer?: JotformAnswer): number | null {
  const value = answer?.answer
  if (typeof value !== "string" || !value.trim()) return null
  const n = Number(value.replace(",", "."))
  return Number.isFinite(n) ? n : null
}

// "Surface du terrain" est un champ texte libre côté JotForm (ex. "138m²",
// "138 m2", "environ 140m²") — on extrait le premier nombre trouvé plutôt que
// d'exiger un format strict.
function asSurfaceText(answer?: JotformAnswer): number | null {
  const value = answer?.answer
  if (typeof value !== "string") return null
  const match = value.replace(",", ".").match(/(\d+(\.\d+)?)/)
  return match ? Number(match[1]) : null
}

function asBooleanChecklist(answer?: JotformAnswer, trueValue = "Oui"): boolean | null {
  const value = answer?.answer
  if (!Array.isArray(value) || value.length === 0) return null
  return value.includes(trueValue)
}

// Types de champs sans réponse exploitable (titres de section, sauts de page,
// bouton de soumission) — exclus de `answers`.
const SKIP_TYPES = new Set(["control_head", "control_pagebreak", "control_button"])

export function extractAllAnswers(submission: JotformSubmission): Record<string, string> {
  const result: Record<string, string> = {}
  for (const answer of Object.values(submission.answers)) {
    if (SKIP_TYPES.has(answer.type)) continue
    const value =
      answer.prettyFormat?.trim() || (typeof answer.answer === "string" ? answer.answer.trim() : "")
    if (value) result[answer.text] = value
  }
  return result
}

export function mapEstimationSubmission(submission: JotformSubmission): MappedEstimationSubmission {
  const { prenom, nom } = asFullname(answerByName(submission, "nom"))
  const email = asEmail(answerByName(submission, "email"))
  const telephone = asPhone(answerByName(submission, "numeroDe"))
  const address = asAddress(answerByName(submission, "adresseDu"))
  const typeBien = asChecklist(answerByName(submission, "typeDe"))

  return {
    submissionId: submission.id,
    submittedAt: new Date(submission.created_at),
    contact: { prenom, nom, email, telephone, commune: address?.commune ?? null },
    bien: address
      ? {
          adresse: address.adresse,
          commune: address.commune,
          codePostal: address.codePostal,
          typeBien,
          pieces: asNumberField(answerByName(submission, "nombreDe")),
          surfaceTerrain: asSurfaceText(answerByName(submission, "surfaceDu")),
          referenceCadastrale: asFreeText(answerByName(submission, "referenceCadastrale")),
          taxeFonciere: asNumberField(answerByName(submission, "taxeFonciere")),
          chargesCopropriete: asNumberField(answerByName(submission, "chargesMensuelles")),
          copropriete: asBooleanChecklist(answerByName(submission, "copropriete")),
          assainissement: asChecklist(answerByName(submission, "assainissement")),
          cuisineEquipements: asStringList(answerByName(submission, "cuisine")),
          equipements: asStringList(answerByName(submission, "equipements61")),
          pointsPositifs: asFreeText(answerByName(submission, "saisissezUne50")),
          pointsNegatifs: asFreeText(answerByName(submission, "Points")),
          disponibilite: asChecklist(answerByName(submission, "disponibilite")),
        }
      : null,
    answers: extractAllAnswers(submission),
  }
}
