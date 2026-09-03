// Formatters partagés entre les pages de détail et les drawers (cf.
// components/entity-drawers/*) — les données arrivant du client (JSON, via les
// routes /api/*/[id]) portent des dates en string ISO et des Decimal Prisma en
// string, d'où les signatures acceptant `string | Date | null | undefined`.

export function dateLabel(value: string | Date | null | undefined): string | undefined {
  if (!value) return undefined
  return new Date(value).toLocaleDateString("fr-FR")
}

export function dateTimeLabel(value: string | Date | null | undefined): string | undefined {
  if (!value) return undefined
  return new Date(value).toLocaleString("fr-FR")
}

export function boolLabel(value: boolean | null | undefined): string | undefined {
  if (value === null || value === undefined) return undefined
  return value ? "Abonné" : "Non abonné"
}

export function boolLabelOuiNon(value: boolean | null | undefined): string | undefined {
  if (value === null || value === undefined) return undefined
  return value ? "Oui" : "Non"
}

export function moneyLabel(
  value: string | number | null | undefined,
  devise?: string | null,
): string | undefined {
  if (value === null || value === undefined || value === "") return undefined
  const amount = Number(value)
  try {
    return new Intl.NumberFormat("fr-FR", { style: "currency", currency: devise ?? "EUR" }).format(
      amount,
    )
  } catch {
    return `${amount} ${devise ?? ""}`.trim()
  }
}

export function surfaceLabel(value: string | number | null | undefined): string | undefined {
  if (value === null || value === undefined || value === "") return undefined
  return `${value} m²`
}
