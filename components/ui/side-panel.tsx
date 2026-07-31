"use client"

import { useEffect, useState } from "react"
import { createPortal } from "react-dom"
import { ArrowLeft, X } from "lucide-react"
import { cn } from "@/lib/utils"

// Panneau latéral générique (drawer) utilisé par les fiches contact/bien/mandat
// (cf. components/entity-drawers/*) — remplace la navigation vers une page
// dédiée par un panneau qui s'ouvre par-dessus la liste courante.
export function SidePanel({
  open,
  onClose,
  onBack,
  title,
  subtitle,
  children,
}: {
  open: boolean
  onClose: () => void
  onBack?: () => void
  title: React.ReactNode
  subtitle?: React.ReactNode
  children: React.ReactNode
}) {
  const [mounted, setMounted] = useState(false)

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
        open ? "pointer-events-auto opacity-100" : "pointer-events-none opacity-0"
      )}
    >
      <div className="absolute inset-0 bg-black/30" onClick={onClose} />
      <aside
        role="dialog"
        aria-modal="true"
        className={cn(
          "absolute top-0 right-0 flex h-full w-full max-w-xl flex-col border-l border-border bg-background shadow-2xl transition-transform duration-300 ease-out",
          open ? "translate-x-0" : "translate-x-full"
        )}
      >
        <div className="flex shrink-0 items-center justify-between gap-3 border-b border-border bg-card px-6 py-4">
          <div className="flex min-w-0 items-center gap-2">
            {onBack && (
              <button
                type="button"
                onClick={onBack}
                aria-label="Retour"
                className="flex h-8 w-8 shrink-0 items-center justify-center rounded-[8px] text-muted-foreground hover:bg-muted hover:text-foreground"
              >
                <ArrowLeft className="h-4 w-4" />
              </button>
            )}
            <div className="min-w-0">
              <h2 className="truncate text-base font-semibold tracking-tight text-foreground">{title}</h2>
              {subtitle && <p className="truncate text-xs text-muted-foreground">{subtitle}</p>}
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Fermer"
            className="flex h-8 w-8 shrink-0 items-center justify-center rounded-[8px] text-muted-foreground hover:bg-muted hover:text-foreground"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
        <div className="flex-1 overflow-auto p-6">{children}</div>
      </aside>
    </div>,
    document.body
  )
}
