"use client"

import { useState } from "react"
import { TabStrip } from "@/components/ui/tab-strip"

export type DrawerTab = {
  value: string
  label: string
  content: React.ReactNode
}

// Tabs internes aux drawers (fiche contact / bien) : découpe le contenu par
// type (Coordonnées, Mandats, Estimations, Historique des appels…) plutôt que
// d'empiler toutes les cartes. État local, aucun passage par l'URL.
export function DrawerTabs({ tabs }: { tabs: DrawerTab[] }) {
  const [active, setActive] = useState(tabs[0]?.value)
  const current = tabs.find((tab) => tab.value === active) ?? tabs[0]

  if (tabs.length === 0) return null

  return (
    <div className="flex flex-col gap-6">
      <TabStrip
        items={tabs.map((tab) => ({
          key: tab.value,
          label: tab.label,
          active: tab.value === current?.value,
          onClick: () => setActive(tab.value),
        }))}
      />
      <div className="flex flex-col gap-6">{current?.content}</div>
    </div>
  )
}
