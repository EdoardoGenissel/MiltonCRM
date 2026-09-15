"use client"

import { cn } from "@/lib/utils"
import { useEntityDrawers } from "@/components/entity-drawers/entity-drawer-provider"

type TriggerProps = {
  id: string
  className?: string
  children: React.ReactNode
}

// Remplace les <Link href="/contacts/:id"> etc. des listes par l'ouverture du
// drawer correspondant - mêmes styles (hover:underline) que les anciens liens.
export function ContactTrigger({ id, className, children }: TriggerProps) {
  const { openContact } = useEntityDrawers()
  return (
    <button type="button" onClick={() => openContact(id)} className={cn("text-left", className)}>
      {children}
    </button>
  )
}

export function BienTrigger({ id, className, children }: TriggerProps) {
  const { openBien } = useEntityDrawers()
  return (
    <button type="button" onClick={() => openBien(id)} className={cn("text-left", className)}>
      {children}
    </button>
  )
}

export function MandatTrigger({ id, className, children }: TriggerProps) {
  const { openMandat } = useEntityDrawers()
  return (
    <button type="button" onClick={() => openMandat(id)} className={cn("text-left", className)}>
      {children}
    </button>
  )
}

// Ligne de tableau entièrement cliquable ouvrant un drawer - équivalent de
// components/clickable-row.tsx mais sans navigation (cf. son commentaire pour
// la logique de stopPropagation sur les liens/boutons imbriqués).
export function DrawerRow({
  onOpen,
  className,
  children,
}: {
  onOpen: () => void
  className?: string
  children: React.ReactNode
}) {
  function handleClick(e: React.MouseEvent<HTMLTableRowElement>) {
    if ((e.target as HTMLElement).closest("button, a")) return
    onOpen()
  }

  return (
    <tr onClick={handleClick} className={cn("cursor-pointer", className)}>
      {children}
    </tr>
  )
}

// Ligne de la liste des mandats - ouvre le drawer du mandat correspondant.
// Composant client dédié car la page /mandats reste une Server Component.
export function MandatDrawerRow({
  mandatId,
  className,
  children,
}: {
  mandatId: string
  className?: string
  children: React.ReactNode
}) {
  const { openMandat } = useEntityDrawers()
  return (
    <DrawerRow onOpen={() => openMandat(mandatId)} className={className}>
      {children}
    </DrawerRow>
  )
}
