import { cn } from "@/lib/utils"

// Action présentée comme un lien texte dans une ligne dense (« Ouvrir la
// fiche », « Tout sélectionner »...) - là où un <Button variant="link"> serait
// trop haut. `muted` pour une action secondaire (« Effacer »).
export function TextLink({
  tone = "link",
  className,
  ...props
}: React.ComponentProps<"button"> & { tone?: "link" | "muted" }) {
  return (
    <button
      type="button"
      className={cn(
        "text-left hover:underline",
        tone === "link" ? "text-primary-strong" : "text-muted-foreground hover:text-foreground",
        className,
      )}
      {...props}
    />
  )
}
