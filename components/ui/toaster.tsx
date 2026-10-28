"use client"

import { Toast } from "@base-ui/react/toast"
import { X } from "lucide-react"
import { cn } from "@/lib/utils"

export const useToast = Toast.useToastManager

function ToastList() {
  const { toasts } = Toast.useToastManager()
  return toasts.map((toast) => (
    <Toast.Root
      key={toast.id}
      toast={toast}
      className={cn(
        "flex w-[360px] max-w-[calc(100vw-2rem)] items-start gap-3 rounded-md border border-border bg-card px-4 py-3 shadow-lg transition-[opacity,transform] duration-200 data-[ending-style]:translate-y-2 data-[ending-style]:opacity-0 data-[starting-style]:translate-y-2 data-[starting-style]:opacity-0",
        toast.type === "error" && "border-danger/40",
      )}
    >
      <div className="min-w-0 flex-1">
        <Toast.Title
          className={cn(
            "text-sm font-medium",
            toast.type === "error" ? "text-danger" : "text-foreground",
          )}
        />
        <Toast.Description className="mt-0.5 text-sm text-muted-foreground" />
      </div>
      {toast.actionProps && (
        <Toast.Action className="shrink-0 text-sm font-medium text-primary hover:underline focus-visible:underline focus-visible:outline-none" />
      )}
      <Toast.Close
        aria-label="Fermer la notification"
        className="-mr-1 flex h-6 w-6 shrink-0 items-center justify-center rounded text-muted-foreground hover:bg-muted hover:text-foreground"
      >
        <X className="h-3.5 w-3.5" />
      </Toast.Close>
    </Toast.Root>
  ))
}

// Notifications de confirmation (ex. "Contact créé · Ouvrir la fiche",
// "Mail ignoré · Annuler") - fournisseur + zone d'affichage en bas à droite.
// Les composants enfants publient via `useToast().add({...})`.
export function ToastProvider({ children }: { children: React.ReactNode }) {
  return (
    <Toast.Provider timeout={6000} limit={3}>
      {children}
      <Toast.Portal>
        <Toast.Viewport className="fixed right-4 bottom-4 z-[60] flex flex-col items-end gap-2 outline-none">
          <ToastList />
        </Toast.Viewport>
      </Toast.Portal>
    </Toast.Provider>
  )
}
