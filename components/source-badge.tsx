import { Badge } from "@/components/ui/badge"
import { SOURCE_LABELS } from "@/lib/contacts/sources"

export function SourceBadge({ source, className }: { source: string; className?: string }) {
  return (
    <Badge variant="outline" className={className}>
      {SOURCE_LABELS[source] ?? source}
    </Badge>
  )
}
