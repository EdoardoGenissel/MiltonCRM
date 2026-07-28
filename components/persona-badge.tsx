import { cn } from "@/lib/utils"
import { PERSONA_LABELS } from "@/lib/contacts/personas"

export function PersonaBadge({ persona, className }: { persona: string; className?: string }) {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-[8px] bg-secondary px-2 py-0.5 text-xs font-medium text-secondary-foreground",
        className
      )}
    >
      {PERSONA_LABELS[persona] ?? persona}
    </span>
  )
}
