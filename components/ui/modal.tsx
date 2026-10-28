"use client"

import { Dialog } from "@base-ui/react/dialog"
import { X } from "lucide-react"
import { cn } from "@/lib/utils"

// Fenêtre modale centrée - pendant de SidePanel (components/ui/side-panel.tsx)
// pour les tâches qui demandent toute l'attention (ex. validation d'une
// proposition de la page Prospects). Repose sur Dialog de Base UI : focus
// piégé dans la fenêtre puis rendu à l'élément d'origine, titre/description
// annoncés aux lecteurs d'écran.
//
// Échap, clic à l'extérieur et la croix appellent tous `onClose` : c'est à
// l'appelant de décider s'il ferme réellement (en repassant `open` à false),
// par exemple pour ne pas perdre des saisies non enregistrées.
export function Modal({
  open,
  onClose,
  title,
  subtitle,
  className,
  children,
}: {
  open: boolean
  onClose: () => void
  title: React.ReactNode
  subtitle?: React.ReactNode
  className?: string
  children: React.ReactNode
}) {
  return (
    <Dialog.Root
      open={open}
      onOpenChange={(next) => {
        if (!next) onClose()
      }}
    >
      <Dialog.Portal>
        <Dialog.Backdrop className="fixed inset-0 z-50 bg-black/40 transition-opacity duration-150 data-[ending-style]:opacity-0 data-[starting-style]:opacity-0" />
        <Dialog.Popup
          className={cn(
            "fixed top-1/2 left-1/2 z-50 flex max-h-[calc(100vh-2rem)] w-[calc(100vw-2rem)] max-w-3xl -translate-x-1/2 -translate-y-1/2 flex-col overflow-hidden rounded-md border border-border bg-background shadow-2xl transition-[opacity,transform] duration-150 outline-none data-[ending-style]:scale-[0.98] data-[ending-style]:opacity-0 data-[starting-style]:scale-[0.98] data-[starting-style]:opacity-0",
            className,
          )}
        >
          <div className="flex shrink-0 items-start justify-between gap-3 border-b border-border bg-card px-6 py-4">
            <div className="min-w-0">
              <Dialog.Title className="truncate text-base font-semibold tracking-tight text-foreground">
                {title}
              </Dialog.Title>
              {subtitle && (
                <Dialog.Description className="truncate text-xs text-muted-foreground">
                  {subtitle}
                </Dialog.Description>
              )}
            </div>
            <Dialog.Close
              aria-label="Fermer"
              className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md text-muted-foreground hover:bg-muted hover:text-foreground focus-visible:ring-3 focus-visible:ring-ring/50 focus-visible:outline-none"
            >
              <X className="h-4 w-4" />
            </Dialog.Close>
          </div>
          <div className="min-h-0 flex-1 overflow-hidden">{children}</div>
        </Dialog.Popup>
      </Dialog.Portal>
    </Dialog.Root>
  )
}
