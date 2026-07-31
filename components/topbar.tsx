"use client"

import { PanelLeft } from "lucide-react"
import { NotificationBell } from "@/components/notification-bell"
import { useSidebar } from "@/components/sidebar-context"

export function Topbar({ title }: { title: string }) {
  const { toggle } = useSidebar()

  return (
    <header className="flex h-16 shrink-0 items-center justify-between border-b border-border bg-card px-8">
      <div className="flex items-center gap-3.5">
        <button
          onClick={toggle}
          className="cursor-pointer text-[#aab0ba] hover:text-foreground"
          aria-label="Afficher/masquer le menu"
        >
          <PanelLeft className="h-4.5 w-4.5" />
        </button>
        <h1 className="text-base font-semibold tracking-tight text-foreground">{title}</h1>
      </div>
      <NotificationBell />
    </header>
  )
}
