"use client"

import { useState } from "react"
import { cn } from "@/lib/utils"

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
      <div className="flex items-center gap-1 border-b border-border">
        {tabs.map((tab) => {
          const isActive = tab.value === current?.value
          return (
            <button
              key={tab.value}
              type="button"
              onClick={() => setActive(tab.value)}
              className={cn(
                "relative px-3 py-2 text-sm font-medium transition-colors after:absolute after:inset-x-0 after:-bottom-px after:h-0.5 after:rounded-full after:opacity-0 after:transition-opacity",
                isActive
                  ? "text-foreground after:bg-foreground after:opacity-100"
                  : "text-foreground/60 hover:text-foreground",
              )}
            >
              {tab.label}
            </button>
          )
        })}
      </div>
      <div className="flex flex-col gap-6">{current?.content}</div>
    </div>
  )
}
