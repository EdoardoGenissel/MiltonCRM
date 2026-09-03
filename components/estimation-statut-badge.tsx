import { cn } from "@/lib/utils"
import { ESTIMATION_STATUT_LABELS } from "@/lib/estimations/statuts"

// Pastille de statut d'estimation — même gabarit que PersonaBadge / SourceBadge.
// Une teinte par statut (secondaire par défaut pour un statut inconnu).
const STYLES: Record<string, string> = {
  en_attente: "bg-secondary text-secondary-foreground",
  genere: "bg-primary/10 text-primary",
  envoye_commercial: "bg-success-bg text-success-foreground",
  envoye_client: "bg-success-bg text-success-foreground",
}

export function EstimationStatutBadge({
  statut,
  className,
}: {
  statut: string
  className?: string
}) {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-md px-2 py-0.5 text-xs font-medium",
        STYLES[statut] ?? "bg-secondary text-secondary-foreground",
        className,
      )}
    >
      {ESTIMATION_STATUT_LABELS[statut] ?? statut}
    </span>
  )
}
