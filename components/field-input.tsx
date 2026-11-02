"use client"

import { Check } from "lucide-react"
import { Toggle } from "@base-ui/react/toggle"
import { ToggleGroup } from "@base-ui/react/toggle-group"
import { Input } from "@/components/ui/input"
import { Select } from "@/components/ui/select"
import { cn } from "@/lib/utils"
import type { FieldDef } from "@/lib/prospects-mail/fields"

// Saisie d'un champ décrit par le registre (cf. lib/prospects-mail/fields.ts) -
// partagée par le bouton "Modifier" des drawers et la modale de validation de
// la page Prospects. La valeur est toujours du texte (conversion côté serveur,
// cf. `fromDisplay`) ; une liste = valeurs séparées par des virgules.
export function FieldInput({
  id,
  def,
  value,
  onChange,
  className,
}: {
  id: string
  def: FieldDef
  value: string
  onChange: (value: string) => void
  className?: string
}) {
  if (def.type === "list" && def.options) {
    const selected = value
      .split(",")
      .map((v) => v.trim())
      .filter(Boolean)
    // Puces sélectionnables (plusieurs à la fois), comportement ToggleGroup :
    // aria-pressed, flèches pour passer d'une puce à l'autre. La hauteur passée
    // par l'appelant (ex. h-9) est ignorée : les puces peuvent passer à la ligne.
    return (
      <ToggleGroup
        id={id}
        multiple
        value={selected}
        onValueChange={(next) => onChange(next.join(", "))}
        aria-label={def.label}
        className={cn("flex min-h-9 flex-wrap items-center gap-1.5", className, "h-auto")}
      >
        {def.options.map((option) => (
          <Toggle
            key={option.value}
            value={option.value}
            className="group/chip inline-flex h-7 items-center gap-1 rounded-full border border-border bg-background px-3 text-sm text-foreground transition-colors hover:bg-muted focus-visible:ring-3 focus-visible:ring-ring/50 focus-visible:outline-none data-[pressed]:border-primary data-[pressed]:bg-primary/10 data-[pressed]:font-medium data-[pressed]:text-primary-strong"
          >
            <Check aria-hidden className="hidden size-3.5 group-data-[pressed]/chip:block" />
            {option.label}
          </Toggle>
        ))}
      </ToggleGroup>
    )
  }

  if (def.options) {
    // Une valeur importée hors liste (ancienne saisie Apimo...) reste affichée
    // et conservée telle quelle tant qu'on ne la change pas.
    const known = def.options.some((o) => o.value === value)
    return (
      <Select
        id={id}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className={className}
      >
        <option value="">-</option>
        {!known && value && <option value={value}>{value}</option>}
        {def.options.map((o) => (
          <option key={o.value} value={o.value}>
            {o.label}
          </option>
        ))}
      </Select>
    )
  }

  if (def.multiline) {
    return (
      <textarea
        id={id}
        value={value}
        rows={3}
        onChange={(e) => onChange(e.target.value)}
        className={cn(
          "w-full rounded-md border border-input bg-background px-3 py-2 text-sm outline-none transition-colors focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50",
          className,
        )}
      />
    )
  }

  return (
    <>
      <Input
        id={id}
        type={def.type === "date" ? "date" : "text"}
        inputMode={def.type === "number" || def.type === "int" ? "decimal" : undefined}
        list={def.suggestions ? `${id}-suggestions` : undefined}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className={className}
      />
      {def.suggestions && (
        <datalist id={`${id}-suggestions`}>
          {def.suggestions.map((s) => (
            <option key={s} value={s} />
          ))}
        </datalist>
      )}
    </>
  )
}
