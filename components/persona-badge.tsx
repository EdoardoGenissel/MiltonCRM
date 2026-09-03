import { Badge } from "@/components/ui/badge"
import { PERSONA_LABELS } from "@/lib/contacts/personas"

export function PersonaBadge({ persona, className }: { persona: string; className?: string }) {
  return (
    <Badge variant="secondary" className={className}>
      {PERSONA_LABELS[persona] ?? persona}
    </Badge>
  )
}
