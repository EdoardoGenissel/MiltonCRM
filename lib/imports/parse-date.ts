// Les dates de l'export Apimo sont au format texte "jj/mm/aa" (ex. "12/07/23",
// "20/07/26") — deux chiffres d'année, toujours dans les années 2000 vu la
// période couverte par les exports Milton.
export function parseFrDate(value: string | undefined): Date | undefined {
  if (!value) return undefined
  const match = value.trim().match(/^(\d{1,2})\/(\d{1,2})\/(\d{2})$/)
  if (!match) return undefined

  const [, day, month, year] = match
  const date = new Date(Date.UTC(2000 + Number(year), Number(month) - 1, Number(day)))
  return Number.isNaN(date.getTime()) ? undefined : date
}
