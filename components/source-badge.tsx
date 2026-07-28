import { cn } from "@/lib/utils"
import { SOURCE_LABELS } from "@/lib/contacts/sources"

export function SourceBadge({ source, className }: { source: string; className?: string }) {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-[8px] border border-border px-2 py-0.5 text-xs font-medium text-muted-foreground",
        className
      )}
    >
      {SOURCE_LABELS[source] ?? source}
    </span>
  )
}
