import { cn } from "@/lib/utils"

// Coquille de tableau partagée par les pages liste (Contacts, Biens, Mandats,
// Estimations, Imports) — carte à bord arrondi + ombre, `<table>` pleine largeur.
export function TableCard({
  children,
  className,
}: {
  children: React.ReactNode
  className?: string
}) {
  return (
    <div
      className={cn(
        "overflow-hidden rounded-md border border-border bg-card shadow-[var(--shadow-card)]",
        className,
      )}
    >
      <table className="w-full text-sm">{children}</table>
    </div>
  )
}

// `<thead>` + `<tr>` d'en-tête au style commun (le contenu des `<th>` reste
// propre à chaque page).
export function TableHeadRow({ children }: { children: React.ReactNode }) {
  return (
    <thead>
      <tr className="border-b border-border text-left text-xs font-medium text-muted-foreground">
        {children}
      </tr>
    </thead>
  )
}

// Ligne "aucun résultat" — icône optionnelle + libellé, centrée sur toute la
// largeur du tableau.
export function TableEmpty({
  icon: Icon,
  label,
  colSpan,
}: {
  icon?: React.ComponentType<{ className?: string }>
  label: string
  colSpan: number
}) {
  return (
    <tr>
      <td colSpan={colSpan} className="px-16 py-14 text-center">
        <div className="flex flex-col items-center gap-2 text-muted-foreground">
          {Icon && <Icon className="h-8 w-8 opacity-40" />}
          <p>{label}</p>
        </div>
      </td>
    </tr>
  )
}
