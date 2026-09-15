import { Badge } from "@/components/ui/badge"
import { STATUT_LABELS, type ContactStatut } from "@/lib/contacts/statut"

export function StatutBadge({ statut, className }: { statut: ContactStatut; className?: string }) {
  return (
    <Badge variant={statut === "client" ? "success" : "outline"} className={className}>
      {STATUT_LABELS[statut]}
    </Badge>
  )
}
