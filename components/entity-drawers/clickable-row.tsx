"use client"

import { cn } from "@/lib/utils"

// Ligne de liste (mandat, estimation, propriétaire…) entièrement cliquable dans
// les drawers, pas seulement le lien texte. Les éléments interactifs imbriqués
// (lien "Rapport CityScan", bouton "ouvrir le contact"…) doivent appeler
// e.stopPropagation() pour ne pas déclencher l'ouverture de la ligne.
export function ClickableRow({
  onClick,
  className,
  children,
}: {
  onClick: () => void
  className?: string
  children: React.ReactNode
}) {
  return (
    <div
      role="button"
      tabIndex={0}
      onClick={onClick}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault()
          onClick()
        }
      }}
      className={cn(
        "cursor-pointer rounded-[8px] border border-border p-3 text-sm transition-colors hover:bg-muted/50",
        className
      )}
    >
      {children}
    </div>
  )
}
