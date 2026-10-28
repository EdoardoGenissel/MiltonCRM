import * as React from "react"
import { ChevronDown } from "lucide-react"
import { cn } from "@/lib/utils"

// <select> natif au même style que <Input> (cf. components/ui/input.tsx) - évite
// de recopier la chaîne de classes dans chaque formulaire. La flèche native est
// masquée au profit d'un chevron placé à la même distance du bord droit que le
// texte du bord gauche (12px).
function Select({ className, ...props }: React.ComponentProps<"select">) {
  return (
    <div className="relative w-full">
      <select
        data-slot="select"
        className={cn(
          "peer flex h-10 w-full appearance-none rounded-md border border-input bg-background pr-9 pl-3 text-sm outline-none transition-colors focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 disabled:cursor-not-allowed disabled:opacity-50",
          className,
        )}
        {...props}
      />
      <ChevronDown
        aria-hidden
        className="pointer-events-none absolute top-1/2 right-3 size-4 -translate-y-1/2 text-muted-foreground peer-disabled:opacity-50"
      />
    </div>
  )
}

export { Select }
