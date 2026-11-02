import { cn } from "@/lib/utils"

// Case à cocher native au style commun (taille + couleur primaire) - évite de
// recopier la chaîne de classes dans chaque liste de filtres ou formulaire.
export function Checkbox({ className, ...props }: Omit<React.ComponentProps<"input">, "type">) {
  return (
    <input
      type="checkbox"
      className={cn("size-3.5 shrink-0 accent-primary", className)}
      {...props}
    />
  )
}
