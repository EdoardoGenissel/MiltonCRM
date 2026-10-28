import type { SuggestionSummary } from "@/lib/prospects-mail/queries"

// L'agence est en Guyane : les jours et heures de l'historique sont ceux de
// Cayenne, quel que soit le fuseau du navigateur ou du serveur (rendu SSR).
export const TIME_ZONE = "America/Cayenne"

const KEY_FORMAT = new Intl.DateTimeFormat("en-US", {
  timeZone: TIME_ZONE,
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
})

// Jour calendaire à Cayenne, "AAAA-MM-JJ" (comparable et triable).
export function dayKey(value: string | Date): string {
  const parts = Object.fromEntries(
    KEY_FORMAT.formatToParts(new Date(value)).map((p) => [p.type, p.value]),
  )
  return `${parts.year}-${parts.month}-${parts.day}`
}

const DATE_FORMAT = new Intl.DateTimeFormat("fr-FR", {
  timeZone: TIME_ZONE,
  weekday: "long",
  day: "numeric",
  month: "long",
})
const DATE_YEAR_FORMAT = new Intl.DateTimeFormat("fr-FR", {
  timeZone: TIME_ZONE,
  weekday: "long",
  day: "numeric",
  month: "long",
  year: "numeric",
})

// "Aujourd'hui · mercredi 28 octobre", "Hier · mardi 27 octobre",
// "Dimanche 25 octobre" (année ajoutée hors de l'année en cours).
export function dayLabel(value: string | Date, now: Date = new Date()): string {
  const key = dayKey(value)
  const today = dayKey(now)
  const format = key.slice(0, 4) === today.slice(0, 4) ? DATE_FORMAT : DATE_YEAR_FORMAT
  const date = format.format(new Date(value))
  const days = Math.round((Date.parse(today) - Date.parse(key)) / 86_400_000)
  if (days === 0) return `Aujourd'hui · ${date}`
  if (days === 1) return `Hier · ${date}`
  return date[0].toUpperCase() + date.slice(1)
}

const CLOCK_FORMAT = new Intl.DateTimeFormat("fr-FR", {
  timeZone: TIME_ZONE,
  hour: "2-digit",
  minute: "2-digit",
})

export function clockLabel(value: string | Date): string {
  return CLOCK_FORMAT.format(new Date(value))
}

// "1 validé", "0 validé", "3 validés".
export function plural(n: number, one: string, many: string): string {
  return `${n} ${n > 1 ? many : one}`
}

type Dated = Pick<SuggestionSummary, "statut" | "traiteLe" | "receivedAt">

// Date qui range un mail dans l'historique : celle du traitement, ou celle de
// réception pour ce que l'analyse a écarté d'elle-même.
export function historyDate(s: Dated): string {
  return s.statut === "ignoree" ? s.receivedAt : (s.traiteLe ?? s.receivedAt)
}

export type HistoryDay<T extends Dated = SuggestionSummary> = {
  key: string
  // Chaque liste du plus récent au plus ancien.
  validees: T[]
  // Écartés par un commercial ("rejetee") ou faute d'analyse ("erreur").
  parEquipe: T[]
  // Écartés par l'analyse ("ignoree").
  parAnalyse: T[]
}

const emptyDay = <T extends Dated>(key: string): HistoryDay<T> => ({
  key,
  validees: [],
  parEquipe: [],
  parAnalyse: [],
})

// Jours du plus récent au plus ancien. `history` arrive paginé : le dernier
// jour chargé peut être incomplet.
export function groupByDay<T extends Dated>(items: T[]): HistoryDay<T>[] {
  const days = new Map<string, HistoryDay<T>>()
  for (const s of items) {
    const key = dayKey(historyDate(s))
    const day = days.get(key) ?? emptyDay<T>(key)
    if (s.statut === "validee") day.validees.push(s)
    else if (s.statut === "ignoree") day.parAnalyse.push(s)
    else day.parEquipe.push(s)
    days.set(key, day)
  }
  const recentFirst = (a: T, b: T) => historyDate(b).localeCompare(historyDate(a))
  return [...days.values()]
    .sort((a, b) => b.key.localeCompare(a.key))
    .map((day) => ({
      key: day.key,
      validees: day.validees.sort(recentFirst),
      parEquipe: day.parEquipe.sort(recentFirst),
      parAnalyse: day.parAnalyse.sort(recentFirst),
    }))
}

export function treatedToday<T extends Dated>(items: T[], now: Date = new Date()): HistoryDay<T> {
  const key = dayKey(now)
  return groupByDay(items).find((day) => day.key === key) ?? emptyDay<T>(key)
}

// En-tête d'un jour : "2 validés" (porte le statut de la liste) puis "4 écartés"
// (null si aucun) ; "Aucun mail validé" sans validé.
export function daySummary(day: HistoryDay<Dated>): { validees: string; ecartes: string | null } {
  const ecartes = day.parEquipe.length + day.parAnalyse.length
  return {
    validees:
      day.validees.length > 0
        ? plural(day.validees.length, "validé", "validés")
        : "Aucun mail validé",
    ecartes: ecartes > 0 ? plural(ecartes, "écarté", "écartés") : null,
  }
}

// "4 écartés · 1 par l'équipe, 3 par l'analyse" ; "3 écartés par l'analyse".
export function ecartesLabel(parEquipe: number, parAnalyse: number): string {
  const total = plural(parEquipe + parAnalyse, "écarté", "écartés")
  if (parEquipe === 0) return `${total} par l'analyse`
  if (parAnalyse === 0) return `${total} par l'équipe`
  return `${total} · ${parEquipe} par l'équipe, ${parAnalyse} par l'analyse`
}
