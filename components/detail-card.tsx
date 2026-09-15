// Card/Field/EmptyState partagés par les drawers d'entité (cf.
// components/entity-drawers/*) - extraits des anciennes pages de détail
// (contacts/[id], biens/[id]) pour éviter la duplication une fois leur contenu
// porté dans des drawers.

// Ré-export : `Badge` reste importable depuis ce module pour ne pas casser les
// appels existants (cf. components/ui/badge.tsx).
export { Badge } from "@/components/ui/badge"

export function Card({
  title,
  icon: Icon,
  children,
}: {
  // Titre optionnel : sans titre, simple panneau (remplace les `<div>` de carte
  // recopiés en tête des drawers).
  title?: string
  icon?: React.ComponentType<{ className?: string }>
  children: React.ReactNode
}) {
  return (
    <div className="rounded-md border border-border bg-card p-6 shadow-[var(--shadow-card)]">
      {title && (
        <h2 className="mb-4 flex items-center gap-2 text-sm font-semibold text-foreground">
          {Icon && <Icon className="h-4 w-4 text-muted-foreground" />}
          {title}
        </h2>
      )}
      {children}
    </div>
  )
}

export function Field({
  label,
  value,
  icon: Icon,
  wrap,
}: {
  label: string
  value: React.ReactNode
  icon?: React.ComponentType<{ className?: string }>
  wrap?: boolean
}) {
  return (
    <div>
      <dt className="flex items-center gap-1.5 text-xs text-muted-foreground">
        {Icon && <Icon className="h-3 w-3" />}
        {label}
      </dt>
      <dd className={`mt-0.5 text-foreground ${wrap ? "whitespace-pre-wrap" : ""}`}>
        {value || "-"}
      </dd>
    </div>
  )
}

export function EmptyState({ label }: { label: string }) {
  return <p className="text-sm text-muted-foreground">{label}</p>
}
