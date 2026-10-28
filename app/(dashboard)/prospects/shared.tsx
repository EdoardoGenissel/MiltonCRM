"use client"

import { cn } from "@/lib/utils"
import type { ProposalEntity } from "@/lib/prospects-mail/fields"
import type { ProposedAction } from "@/lib/prospects-mail/proposals"

// Vocabulaire et petites briques communes à la page Prospects (file, historique,
// fenêtre de validation, drawer). Parti pris : du texte plutôt que des
// pastilles - la couleur est réservée à l'action principale, aux lignes
// modifiées et au point de statut de l'historique.

type Action = Pick<ProposedAction, "entity" | "op">

export const STATUTS: Record<string, { label: string; dot: string }> = {
  en_attente: { label: "À traiter", dot: "bg-primary" },
  validee: { label: "Validé", dot: "bg-success" },
  rejetee: { label: "Rejeté", dot: "bg-danger" },
  ignoree: { label: "Non pertinent", dot: "bg-muted-foreground/60" },
  erreur: { label: "Erreur d'analyse", dot: "bg-warning" },
}

export function StatutDot({ statut, className }: { statut: string; className?: string }) {
  return (
    <span
      aria-hidden
      className={cn(
        "inline-block h-2 w-2 shrink-0 rounded-full",
        (STATUTS[statut] ?? STATUTS.en_attente).dot,
        className,
      )}
    />
  )
}

const NOUNS: Record<ProposalEntity, { one: string; feminine: boolean }> = {
  contact: { one: "contact", feminine: false },
  prospectDetail: { one: "qualification", feminine: true },
  bien: { one: "bien", feminine: false },
  mandat: { one: "mandat", feminine: false },
}

// "Nouveau contact", "Mise à jour du bien", "Bien concerné"...
export function actionLabel({ entity, op }: Action): string {
  const { one, feminine } = NOUNS[entity]
  if (op === "create") return `${feminine ? "Nouvelle" : "Nouveau"} ${one}`
  if (op === "update") return `Mise à jour ${feminine ? "de la" : "du"} ${one}`
  return `${one[0].toUpperCase()}${one.slice(1)} ${feminine ? "concernée" : "concerné"}`
}

// Au passé, pour l'historique : "contact créé, bien mis à jour".
export function appliedLabel(actions: Action[]): string {
  const parts = actions
    .filter((a) => a.op !== "lien")
    .map(({ entity, op }) => {
      const { one, feminine } = NOUNS[entity]
      const verb =
        op === "create" ? (feminine ? "créée" : "créé") : feminine ? "mise à jour" : "mis à jour"
      return `${one} ${verb}`
    })
  if (parts.length === 0) return "aucune fiche modifiée"
  return parts.join(", ")
}

export function plannedLabel(actions: Action[]): string {
  return actions
    .filter((a) => a.op !== "lien")
    .map(actionLabel)
    .join(" · ")
}

const RELATIVE = new Intl.RelativeTimeFormat("fr", { numeric: "auto" })

// "il y a 5 minutes", "hier"... - au-delà d'une semaine, la date courte.
export function relativeDate(iso: string): string {
  const diffMs = new Date(iso).getTime() - Date.now()
  const minutes = Math.round(diffMs / 60_000)
  if (Math.abs(minutes) < 60) return RELATIVE.format(minutes, "minute")
  const hours = Math.round(minutes / 60)
  if (Math.abs(hours) < 24) return RELATIVE.format(hours, "hour")
  const days = Math.round(hours / 24)
  if (Math.abs(days) < 7) return RELATIVE.format(days, "day")
  return new Date(iso).toLocaleDateString("fr-FR", { day: "numeric", month: "short" })
}

export function TimeAgo({ iso, className }: { iso: string; className?: string }) {
  return (
    <time
      dateTime={iso}
      title={new Date(iso).toLocaleString("fr-FR")}
      className={cn("tabular-nums", className)}
      suppressHydrationWarning
    >
      {relativeDate(iso)}
    </time>
  )
}

// Libellé de jour pour regrouper l'historique : "Aujourd'hui", "Hier",
// "jeudi 22 octobre".
export function dayLabel(iso: string): string {
  const date = new Date(iso)
  const today = new Date()
  const startOf = (d: Date) => new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime()
  const days = Math.round((startOf(today) - startOf(date)) / 86_400_000)
  if (days === 0) return "Aujourd'hui"
  if (days === 1) return "Hier"
  const label = date.toLocaleDateString("fr-FR", {
    weekday: "long",
    day: "numeric",
    month: "long",
    ...(date.getFullYear() !== today.getFullYear() ? { year: "numeric" } : {}),
  })
  return label[0].toUpperCase() + label.slice(1)
}

export function clockLabel(iso: string): string {
  return new Date(iso).toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" })
}

export type ThreadMessage = { headers: Record<string, string>; body: string }

// Le texte envoyé à l'analyse (cf. lib/prospects-mail/sync.ts `threadText`)
// est un fil "De : / À : / Date : / Objet :" + corps, messages séparés par
// "-----" : on le redécoupe pour l'afficher comme une conversation.
export function parseThread(excerpt: string | null): ThreadMessage[] {
  if (!excerpt) return []
  return excerpt
    .replace(/^…/, "")
    .split(/\n\n-----\n\n/)
    .map((block) => {
      const lines = block.split("\n")
      const headers: Record<string, string> = {}
      let i = 0
      for (; i < lines.length; i++) {
        const match = lines[i].match(/^(De|À|Date|Objet|Pièces jointes) : (.*)$/)
        if (!match) break
        headers[match[1]] = match[2]
      }
      return { headers, body: lines.slice(i).join("\n").trim() }
    })
}

// "Jean Dupont <jean@x.fr>" -> "Jean Dupont"
export function senderName(from: string | undefined): string {
  if (!from) return "Expéditeur inconnu"
  const match = from.match(/^\s*"?([^"<]*?)"?\s*<([^>]+)>/)
  return match?.[1]?.trim() || match?.[2] || from
}
