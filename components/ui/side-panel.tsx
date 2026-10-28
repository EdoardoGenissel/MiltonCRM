"use client"

import { useEffect, useId, useState } from "react"
import { createPortal } from "react-dom"
import { ArrowLeft, X } from "lucide-react"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"

// Panneau latéral générique (drawer) utilisé par les fiches contact/bien/mandat
// (cf. components/entity-drawers/*) - remplace la navigation vers une page
// dédiée par un panneau qui s'ouvre par-dessus la liste courante.
export function SidePanel({
  open,
  onClose,
  onBack,
  title,
  subtitle,
  actions,
  toolbar,
  footer,
  children,
}: {
  open: boolean
  onClose: () => void
  onBack?: () => void
  title: React.ReactNode
  subtitle?: React.ReactNode
  // Boutons d'en-tête à gauche de la croix (ex. "Modifier").
  actions?: React.ReactNode
  // Bandeau fixe sous l'en-tête (ex. navigation entre mails à traiter).
  toolbar?: React.ReactNode
  // Pied fixe sous la zone qui défile, toujours visible (ex. boutons d'action).
  footer?: React.ReactNode
  children: React.ReactNode
}) {
  const [mounted, setMounted] = useState(false)
  const titleId = useId()

  useEffect(() => {
    setMounted(true)
  }, [])

  useEffect(() => {
    if (!open) return
    function handleKey(e: KeyboardEvent) {
      if (e.key === "Escape") onClose()
    }
    document.addEventListener("keydown", handleKey)
    document.body.style.overflow = "hidden"
    return () => {
      document.removeEventListener("keydown", handleKey)
      document.body.style.overflow = ""
    }
  }, [open, onClose])

  if (!mounted) return null

  return createPortal(
    <div
      aria-hidden={!open}
      className={cn(
        "fixed inset-0 z-50 transition-opacity",
        open ? "pointer-events-auto opacity-100" : "pointer-events-none opacity-0",
      )}
    >
      <div className="absolute inset-0 bg-black/30" onClick={onClose} />
      <aside
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        className={cn(
          "absolute top-0 right-0 flex h-full w-full max-w-xl flex-col border-l border-border bg-background shadow-2xl transition-transform duration-300 ease-out",
          open ? "translate-x-0" : "translate-x-full",
        )}
      >
        <div className="flex shrink-0 items-center justify-between gap-3 border-b border-border bg-card px-6 py-4">
          <div className="flex min-w-0 items-center gap-2">
            {onBack && (
              <Button
                variant="ghost"
                size="icon"
                onClick={onBack}
                aria-label="Retour"
                className="text-muted-foreground"
              >
                <ArrowLeft />
              </Button>
            )}
            <div className="min-w-0">
              {/* tabIndex -1 : le titre peut recevoir le focus par script (ex.
                  après un changement de mail), sans entrer dans la tabulation. */}
              <h2
                id={titleId}
                tabIndex={-1}
                className="truncate text-base font-semibold tracking-tight text-foreground outline-none"
              >
                {title}
              </h2>
              {subtitle && <p className="truncate text-xs text-muted-foreground">{subtitle}</p>}
            </div>
          </div>
          <div className="flex shrink-0 items-center gap-1">
            {actions}
            <Button
              variant="ghost"
              size="icon"
              onClick={onClose}
              aria-label="Fermer"
              className="text-muted-foreground"
            >
              <X />
            </Button>
          </div>
        </div>
        {toolbar && <div className="shrink-0">{toolbar}</div>}
        <div className="flex-1 overflow-auto p-6">{children}</div>
        {footer && (
          <div className="shrink-0 border-t border-border bg-card shadow-[var(--shadow-panel-footer)]">
            {footer}
          </div>
        )}
      </aside>
    </div>,
    document.body,
  )
}
