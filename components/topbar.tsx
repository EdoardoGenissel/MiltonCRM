"use client"

import { PanelLeft } from "lucide-react"
import { NotificationBell } from "@/components/notification-bell"
import { useSidebar } from "@/components/sidebar-context"
import { Button } from "@/components/ui/button"

export function Topbar({ title }: { title: string }) {
  const { toggle } = useSidebar()

  return (
    <header className="flex h-16 shrink-0 items-center justify-between border-b border-border bg-card px-8">
      <div className="flex items-center gap-3.5">
        <Button
          variant="ghost"
          size="icon"
          onClick={toggle}
          className="text-nav-icon"
          aria-label="Afficher/masquer le menu"
        >
          <PanelLeft className="size-4.5" />
        </Button>
        <h1 className="text-base font-semibold tracking-tight text-foreground">{title}</h1>
      </div>
      <NotificationBell />
    </header>
  )
}
