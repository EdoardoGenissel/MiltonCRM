"use client"

import { createContext, useCallback, useContext, useMemo, useState } from "react"
import { Pencil } from "lucide-react"
import { SidePanel } from "@/components/ui/side-panel"
import { Button } from "@/components/ui/button"
import { ContactDrawerContent } from "@/components/entity-drawers/contact-drawer-content"
import { BienDrawerContent } from "@/components/entity-drawers/bien-drawer-content"
import { MandatDrawerContent } from "@/components/entity-drawers/mandat-drawer-content"

type DrawerEntry =
  { type: "contact"; id: string } | { type: "bien"; id: string } | { type: "mandat"; id: string }

type EntityDrawerContextValue = {
  openContact: (id: string) => void
  openBien: (id: string) => void
  openMandat: (id: string) => void
}

const EntityDrawerContext = createContext<EntityDrawerContextValue | null>(null)

// Pile de panneaux : ouvrir une fiche depuis une autre (ex. propriétaire depuis
// un mandat) empile un nouveau panneau par-dessus plutôt que de remplacer la
// navigation courante - "Retour" dépile, la croix ferme tout.
export function EntityDrawerProvider({ children }: { children: React.ReactNode }) {
  const [stack, setStack] = useState<DrawerEntry[]>([])

  const push = useCallback((entry: DrawerEntry) => {
    setStack((prev) => {
      const top = prev[prev.length - 1]
      if (top && top.type === entry.type && top.id === entry.id) return prev
      return [...prev, entry]
    })
  }, [])

  const value = useMemo<EntityDrawerContextValue>(
    () => ({
      openContact: (id) => push({ type: "contact", id }),
      openBien: (id) => push({ type: "bien", id }),
      openMandat: (id) => push({ type: "mandat", id }),
    }),
    [push],
  )

  const top = stack[stack.length - 1]

  function handleClose() {
    setStack([])
  }

  function handleBack() {
    setStack((prev) => prev.slice(0, -1))
  }

  return (
    <EntityDrawerContext.Provider value={value}>
      {children}
      <SidePanelRouter
        entry={top}
        onClose={handleClose}
        onBack={stack.length > 1 ? handleBack : undefined}
      />
    </EntityDrawerContext.Provider>
  )
}

function SidePanelRouter({
  entry,
  onClose,
  onBack,
}: {
  entry: DrawerEntry | undefined
  onClose: () => void
  onBack: (() => void) | undefined
}) {
  const { openContact, openBien, openMandat } = useEntityDrawers()

  if (!entry) {
    return (
      <SidePanel open={false} onClose={onClose} title="">
        {null}
      </SidePanel>
    )
  }

  // `key` : changer de fiche (empiler / dépiler) repart en lecture seule.
  return (
    <EntityPanel key={`${entry.type}-${entry.id}`} entry={entry} onClose={onClose} onBack={onBack}>
      {(editing, setEditing) =>
        entry.type === "contact" ? (
          <ContactDrawerContent
            id={entry.id}
            onOpenBien={openBien}
            editing={editing}
            onEditingChange={setEditing}
          />
        ) : entry.type === "bien" ? (
          <BienDrawerContent
            id={entry.id}
            onOpenContact={openContact}
            onOpenMandat={openMandat}
            editing={editing}
            onEditingChange={setEditing}
          />
        ) : (
          <MandatDrawerContent
            id={entry.id}
            onOpenContact={openContact}
            onOpenBien={openBien}
            editing={editing}
            onEditingChange={setEditing}
          />
        )
      }
    </EntityPanel>
  )
}

const PANEL_TITLES: Record<DrawerEntry["type"], string> = {
  contact: "Contact",
  bien: "Bien",
  mandat: "Mandat",
}

// Panneau d'une fiche + bouton "Modifier" d'en-tête : le mode édition est
// porté ici, le contenu (qui a les données chargées) affiche le formulaire.
function EntityPanel({
  entry,
  onClose,
  onBack,
  children,
}: {
  entry: DrawerEntry
  onClose: () => void
  onBack: (() => void) | undefined
  children: (editing: boolean, setEditing: (editing: boolean) => void) => React.ReactNode
}) {
  const [editing, setEditing] = useState(false)

  return (
    <SidePanel
      open
      onClose={onClose}
      onBack={onBack}
      title={
        editing ? `Modifier - ${PANEL_TITLES[entry.type].toLowerCase()}` : PANEL_TITLES[entry.type]
      }
      actions={
        !editing && (
          <Button
            variant="ghost"
            size="default"
            onClick={() => setEditing(true)}
            className="text-muted-foreground"
          >
            <Pencil className="size-3.5" />
            Modifier
          </Button>
        )
      }
    >
      {children(editing, setEditing)}
    </SidePanel>
  )
}

export function useEntityDrawers() {
  const ctx = useContext(EntityDrawerContext)
  if (!ctx) throw new Error("useEntityDrawers must be used within EntityDrawerProvider")
  return ctx
}
