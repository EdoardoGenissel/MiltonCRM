import { cn } from "@/lib/utils"

// Pastille de base — gabarit commun (forme, taille, typo) des badges du CRM.
// Les badges sémantiques (PersonaBadge, SourceBadge, EstimationStatutBadge,
// MandatTypeBadge) composent celui-ci au lieu de recopier la chaîne de classes.
const VARIANTS = {
  secondary: "bg-secondary text-secondary-foreground",
  outline: "border border-border text-muted-foreground",
  primary: "bg-primary/10 text-primary",
  success: "bg-success-bg text-success-foreground",
} as const

export type BadgeVariant = keyof typeof VARIANTS

export function Badge({
  variant = "secondary",
  className,
  style,
  children,
}: {
  variant?: BadgeVariant
  className?: string
  // Utilisé par MandatTypeBadge : couleur hors palette de thème, dérivée par hash.
  style?: React.CSSProperties
  children: React.ReactNode
}) {
  return (
    <span
      style={style}
      className={cn(
        "inline-flex items-center rounded-md px-2 py-0.5 text-xs font-medium",
        !style && VARIANTS[variant],
        className,
      )}
    >
      {children}
    </span>
  )
}
