import { Badge, type BadgeVariant } from "@/components/ui/badge"
import {
  VISITE_RETOUR_LABELS,
  VISITE_STATUT_LABELS,
  type VisiteRetour,
  type VisiteStatut,
} from "@/lib/visites/statuts"

const STATUT_VARIANT: Record<VisiteStatut, BadgeVariant> = {
  planifiee: "primary",
  effectuee: "success",
  reportee: "secondary",
  annulee: "outline",
}

const RETOUR_VARIANT: Record<VisiteRetour, BadgeVariant> = {
  offre: "success",
  interesse: "primary",
  a_relancer: "secondary",
  pas_interesse: "outline",
}

export function VisiteStatutBadge({
  statut,
  className,
}: {
  statut: VisiteStatut
  className?: string
}) {
  return (
    <Badge variant={STATUT_VARIANT[statut]} className={className}>
      {VISITE_STATUT_LABELS[statut]}
    </Badge>
  )
}

export function VisiteRetourBadge({
  retour,
  className,
}: {
  retour: VisiteRetour | null
  className?: string
}) {
  if (!retour) return <span className="text-muted-foreground">-</span>
  return (
    <Badge variant={RETOUR_VARIANT[retour]} className={className}>
      {VISITE_RETOUR_LABELS[retour]}
    </Badge>
  )
}
