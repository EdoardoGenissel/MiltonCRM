// Les dates texte "jj/mm/aa" ou "jj/mm/aaaa" des exports Apimo/Septéo (ex.
// "12/07/23", "19/01/2024") - année sur 2 ou 4 chiffres selon l'export
// (prospects Apimo : 2 chiffres ; mandats Septéo : 4 chiffres), toujours dans
// les années 2000 vu la période couverte par les exports Milton.
export function parseFrDate(value: string | undefined): Date | undefined {
  if (!value) return undefined
  const match = value.trim().match(/^(\d{1,2})\/(\d{1,2})\/(\d{2}|\d{4})$/)
  if (!match) return undefined

  const [, day, month, rawYear] = match
  const year = rawYear.length === 2 ? 2000 + Number(rawYear) : Number(rawYear)
  const date = new Date(Date.UTC(year, Number(month) - 1, Number(day)))
  return Number.isNaN(date.getTime()) ? undefined : date
}
