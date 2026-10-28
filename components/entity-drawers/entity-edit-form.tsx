"use client"

import { useRouter } from "next/navigation"
import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/detail-card"
import { cn } from "@/lib/utils"
import { FieldInput } from "@/components/field-input"
import { EDIT_FIELDS, type EditableEntity } from "@/lib/entity-edit/fields"

const ENDPOINTS: Record<EditableEntity, string> = {
  contact: "/api/contacts",
  bien: "/api/biens",
  mandat: "/api/mandats",
}

// Formulaire du bouton "Modifier" des drawers - n'envoie que les champs
// réellement changés, pour ne pas réécrire (ex. reformater) le reste de la fiche.
export function EntityEditForm({
  entity,
  id,
  initial,
  onCancel,
  onSaved,
}: {
  entity: EditableEntity
  id: string
  // Données de la fiche telles que servies par la route GET (seules les clés
  // du registre sont lues ; nombres et tableaux convertis en texte).
  initial: Record<string, unknown>
  onCancel: () => void
  onSaved: () => void
}) {
  const router = useRouter()
  const fields = EDIT_FIELDS[entity]
  // Dates reçues en ISO complet : ramenées au format de <input type="date">.
  const start = Object.fromEntries(
    fields.map((f) => {
      const raw = initial[f.key]
      const value = Array.isArray(raw)
        ? raw.join(", ")
        : typeof raw === "string" || typeof raw === "number"
          ? String(raw)
          : ""
      return [f.key, f.type === "date" ? value.slice(0, 10) : value]
    }),
  )
  const [values, setValues] = useState<Record<string, string>>(start)
  const [pending, setPending] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function save(e: React.FormEvent) {
    e.preventDefault()
    const changed = Object.fromEntries(
      Object.entries(values).filter(([key, value]) => value !== start[key]),
    )
    if (Object.keys(changed).length === 0) {
      onCancel()
      return
    }
    setPending(true)
    setError(null)
    try {
      const res = await fetch(`${ENDPOINTS[entity]}/${id}`, {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ values: changed }),
      })
      if (!res.ok) {
        const data = await res.json().catch(() => ({}))
        setError(data.error ?? "Erreur lors de l'enregistrement.")
        return
      }
      onSaved()
      router.refresh() // la liste derrière le drawer reflète la modification
    } catch {
      setError("Erreur réseau.")
    } finally {
      setPending(false)
    }
  }

  return (
    <form onSubmit={save}>
      <Card>
        <div className="grid grid-cols-2 gap-4">
          {fields.map((def) => (
            <div key={def.key} className={cn("flex flex-col gap-1.5", def.wide && "col-span-2")}>
              <label htmlFor={`edit-${def.key}`} className="text-xs text-muted-foreground">
                {def.label}
              </label>
              <FieldInput
                id={`edit-${def.key}`}
                def={def}
                value={values[def.key]}
                onChange={(value) => setValues((prev) => ({ ...prev, [def.key]: value }))}
              />
            </div>
          ))}
        </div>
        {error && <p className="mt-4 text-sm text-danger">{error}</p>}
        <div className="mt-6 flex justify-end gap-2">
          <Button type="button" variant="outline" onClick={onCancel} disabled={pending}>
            Annuler
          </Button>
          <Button type="submit" disabled={pending}>
            {pending ? "Enregistrement…" : "Enregistrer"}
          </Button>
        </div>
      </Card>
    </form>
  )
}
