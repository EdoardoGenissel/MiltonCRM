import { prisma } from "@/lib/db/prisma"
import { resolveContactByIdentity, type IdentityMatchCandidate } from "@/lib/contacts/dedupe"
import { normalizeAddress, resolveBienMatch, type BienMatchCandidate } from "@/lib/biens/dedupe"
import { SOURCE_LABELS } from "@/lib/contacts/sources"
import type { MailExtraction } from "./extract"
import type { MatchContext, MatchedRecord } from "./proposals"

export type BienCandidate = BienMatchCandidate & {
  referenceProduit: string | null
  referenceLot: string | null
  sourceRef: string | null
}

export type MatchCandidates = {
  contacts: IdentityMatchCandidate[]
  biens: BienCandidate[]
}

// Chargés une fois par sync (et une fois par validation) puis interrogés en
// mémoire - même approche que les imports (cf. lib/integrations/jotform/sync.ts).
export async function loadCandidates(): Promise<MatchCandidates> {
  const [contacts, biens] = await Promise.all([
    prisma.contact.findMany({
      select: { id: true, email: true, telephone: true, nom: true, prenom: true },
    }),
    prisma.bien.findMany({
      select: {
        id: true,
        source: true,
        adresse: true,
        commune: true,
        referenceProduit: true,
        referenceLot: true,
        sourceRef: true,
      },
    }),
  ])
  return { contacts, biens }
}

export function matchContactId(
  candidates: IdentityMatchCandidate[],
  contact: {
    email?: string | null
    telephone?: string | null
    nom?: string | null
    prenom?: string | null
  },
): { id: string; reason: string } | null {
  const byEmail = resolveContactByIdentity(candidates, { email: contact.email ?? undefined })
  if (byEmail) return { id: byEmail, reason: "email identique" }

  // 9 derniers chiffres plutôt que `normalizePhone` (qui ne connaît que +33) :
  // la clientèle est en Guyane, numéros saisis tantôt en 0694…, tantôt en +594 694….
  const phone = contact.telephone?.replace(/\D/g, "").slice(-9)
  if (phone && phone.length === 9) {
    const byPhone = candidates.find((c) => c.telephone?.replace(/\D/g, "").slice(-9) === phone)
    if (byPhone) return { id: byPhone.id, reason: "téléphone identique" }
  }

  const byName = resolveContactByIdentity(candidates, {
    nom: contact.nom ?? undefined,
    prenom: contact.prenom ?? undefined,
  })
  return byName ? { id: byName, reason: "nom et prénom identiques" } : null
}

function matchBienId(
  candidates: BienCandidate[],
  bien: NonNullable<MailExtraction["bien"]>,
): { id: string; reason: string } | null {
  if (bien.reference) {
    const ref = normalizeAddress(bien.reference)
    const byRef = candidates.find((c) =>
      [c.referenceProduit, c.referenceLot, c.sourceRef].some(
        (r) => r && normalizeAddress(r) === ref,
      ),
    )
    if (byRef) return { id: byRef.id, reason: "référence identique" }
  }
  const id = resolveBienMatch(candidates, { adresse: bien.adresse, commune: bien.commune })
  return id ? { id, reason: "adresse identique" } : null
}

export async function matchExtraction(
  extraction: MailExtraction,
  candidates: MatchCandidates,
): Promise<MatchContext> {
  const ctx: MatchContext = { contact: null, prospectDetail: null, bien: null, mandat: null }

  if (extraction.contact) {
    const found = matchContactId(candidates.contacts, extraction.contact)
    if (found) {
      const contact = await prisma.contact.findUnique({
        where: { id: found.id },
        include: { prospectDetail: true },
      })
      if (contact) {
        const { prospectDetail, ...values } = contact
        ctx.contact = {
          id: contact.id,
          label:
            `${contact.prenom} ${contact.nom}`.trim() +
            ` (${SOURCE_LABELS[contact.source] ?? contact.source})`,
          reason: found.reason,
          values,
        }
        ctx.prospectDetail = prospectDetail
      }
    }
  }

  if (extraction.bien) {
    const found = matchBienId(candidates.biens, extraction.bien)
    if (found) {
      const bien = await prisma.bien.findUnique({
        where: { id: found.id },
        include: { mandats: { orderBy: { updatedAt: "desc" } } },
      })
      if (bien) {
        const { mandats, ...values } = bien
        ctx.bien = {
          id: bien.id,
          label: [bien.adresse ?? bien.titre ?? "Bien", bien.commune].filter(Boolean).join(", "),
          reason: found.reason,
          values,
        }
        const mandat =
          mandats.find((m) => ctx.contact && m.proprietaireId === ctx.contact.id) ??
          mandats.find((m) => m.statut !== "termine" && m.statut !== "annule")
        if (mandat) {
          ctx.mandat = {
            id: mandat.id,
            label: `Mandat ${mandat.numero ?? mandat.type}`,
            reason: "mandat du bien",
            values: mandat,
          } satisfies MatchedRecord
        }
      }
    }
  }

  return ctx
}
