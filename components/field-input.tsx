"use client"

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
    const selected = new Set(
      value
        .split(",")
        .map((v) => v.trim())
        .filter(Boolean),
    )
    return (
      <div className={cn("flex min-h-9 flex-wrap items-center gap-x-4 gap-y-1.5", className)}>
        {def.options.map((option) => (
          <label key={option.value} className="flex cursor-pointer items-center gap-2 text-sm">
            <input
              type="checkbox"
              className="h-3.5 w-3.5 rounded border-input"
              checked={selected.has(option.value)}
              onChange={(e) => {
                const next = new Set(selected)
                if (e.target.checked) next.add(option.value)
                else next.delete(option.value)
                onChange([...next].join(", "))
              }}
            />
            {option.label}
          </label>
        ))}
      </div>
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
