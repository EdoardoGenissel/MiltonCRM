// Les dates de l'export Apimo "Produits" (biens/mandats) sont au format ISO-like
// "aaaa-mm-jj" ou "aaaa-mm-jj hh:mm:ss" (ex. "2023-08-03 22:46:34", "2023-03-02") -
// différent du format "jj/mm/aa" de l'export prospects (cf. parse-date.ts).
export function parseApimoDateTime(value: string | undefined): Date | undefined {
  if (!value) return undefined
  const match = value.trim().match(/^(\d{4})-(\d{2})-(\d{2})(?:[ T](\d{2}):(\d{2}):(\d{2}))?$/)
  if (!match) return undefined

  const [, year, month, day, hour = "0", minute = "0", second = "0"] = match
  const date = new Date(
    Date.UTC(
      Number(year),
      Number(month) - 1,
      Number(day),
      Number(hour),
      Number(minute),
      Number(second),
    ),
  )
  return Number.isNaN(date.getTime()) ? undefined : date
}

// Les dates des exports Septéo "gestion locative" (impayés, incidents) sont au
// format français "jj/mm/aaaa" éventuellement suivi d'une heure "hh:mm:ss" (ex.
// "01/06/2024 00:00:00", "10/07/2026 16:30:07") - `parseFrDate` (parse-date.ts)
// a une regex stricte qui rejette la partie heure, d'où ce parseur dédié.
export function parseFrDateTime(value: string | undefined): Date | undefined {
  if (!value) return undefined
  const match = value
    .trim()
    .match(/^(\d{1,2})\/(\d{1,2})\/(\d{2}|\d{4})(?:[ T](\d{1,2}):(\d{2})(?::(\d{2}))?)?$/)
  if (!match) return undefined

  const [, day, month, rawYear, hour = "0", minute = "0", second = "0"] = match
  const year = rawYear.length === 2 ? 2000 + Number(rawYear) : Number(rawYear)
  const date = new Date(
    Date.UTC(year, Number(month) - 1, Number(day), Number(hour), Number(minute), Number(second)),
  )
  return Number.isNaN(date.getTime()) ? undefined : date
}
