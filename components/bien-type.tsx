import { Home, Building, Building2, type LucideIcon } from "lucide-react"

// Habillage de la colonne "Type" des biens : une icône + un libellé en casse
// normale (les imports fournissent souvent des valeurs en MAJUSCULES).
function iconFor(normalized: string): LucideIcon | null {
  if (normalized.includes("maison")) return Home
  if (normalized.includes("appartement") || normalized.includes("appart")) return Building2
  if (normalized.includes("immeuble")) return Building
  return null
}

function label(value: string): string {
  const lower = value.toLocaleLowerCase("fr-FR").trim()
  return lower.charAt(0).toUpperCase() + lower.slice(1)
}

export function BienType({ value }: { value: string | null | undefined }) {
  if (!value) return <span className="text-muted-foreground">-</span>
  const Icon = iconFor(value.toLocaleLowerCase("fr-FR"))
  return (
    <span className="inline-flex items-center gap-1.5 text-muted-foreground">
      {Icon && <Icon className="size-4 shrink-0 text-muted-foreground/70" aria-hidden />}
      {label(value)}
    </span>
  )
}
