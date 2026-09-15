import { Button } from "@/components/ui/button"

// Primitives de formulaire partagées par les pages d'auth et l'import - même
// gabarit label + champ, message d'erreur et bouton de soumission avec libellé
// « en cours ».

export function FormField({
  label,
  htmlFor,
  hint,
  children,
}: {
  label: string
  htmlFor: string
  hint?: React.ReactNode
  children: React.ReactNode
}) {
  return (
    <div className="flex flex-col gap-1.5">
      <label htmlFor={htmlFor} className="text-sm font-medium text-foreground">
        {label}
      </label>
      {children}
      {hint && <p className="text-xs text-muted-foreground">{hint}</p>}
    </div>
  )
}

export function FormError({ children }: { children: React.ReactNode }) {
  if (!children) return null
  return <p className="text-sm text-danger">{children}</p>
}

export function SubmitButton({
  pending,
  children,
  pendingLabel,
  className,
}: {
  pending: boolean
  children: React.ReactNode
  pendingLabel: string
  className?: string
}) {
  return (
    <Button type="submit" disabled={pending} className={className}>
      {pending ? pendingLabel : children}
    </Button>
  )
}
