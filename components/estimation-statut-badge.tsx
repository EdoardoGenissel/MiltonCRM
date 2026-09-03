import { Badge, type BadgeVariant } from "@/components/ui/badge"
import { ESTIMATION_STATUT_LABELS } from "@/lib/estimations/statuts"

// Une teinte par statut (secondaire par défaut pour un statut inconnu).
const VARIANT: Record<string, BadgeVariant> = {
  en_attente: "secondary",
  genere: "primary",
  envoye_commercial: "success",
  envoye_client: "success",
}

export function EstimationStatutBadge({
  statut,
  className,
}: {
  statut: string
  className?: string
}) {
  return (
    <Badge variant={VARIANT[statut] ?? "secondary"} className={className}>
      {ESTIMATION_STATUT_LABELS[statut] ?? statut}
    </Badge>
  )
}
