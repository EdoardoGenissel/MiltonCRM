"use client"

import { useEffect, useState } from "react"
import { Popover } from "@base-ui/react/popover"
import { Bell } from "lucide-react"
import { cn } from "@/lib/utils"

type NotificationItem = { id: string; message: string; createdAt: string }

const POLL_INTERVAL_MS = 60_000
const LAST_SEEN_KEY = "milton-crm:notifications-last-seen-at"

function relativeTime(iso: string): string {
  const diffMs = Date.now() - new Date(iso).getTime()
  const diffMin = Math.round(diffMs / 60_000)
  if (diffMin < 1) return "à l'instant"
  if (diffMin < 60) return `il y a ${diffMin} min`
  const diffH = Math.round(diffMin / 60)
  if (diffH < 24) return `il y a ${diffH} h`
  const diffJ = Math.round(diffH / 24)
  return `il y a ${diffJ} j`
}

// Cloche de notifications "best-effort" (cf. lib/notifications/queries) — pas de
// table "vu/non vu" côté serveur : le dernier horodatage consulté est gardé en
// localStorage, comme pour un simple indicateur de nouveauté, pas un centre de
// notifications complet.
export function NotificationBell() {
  const [items, setItems] = useState<NotificationItem[]>([])
  const [lastSeenAt, setLastSeenAt] = useState<string | null>(null)
  // Snapshot de `lastSeenAt` pris à l'ouverture — sert à garder les items
  // surlignés "nouveaux" pendant la consultation, alors que `lastSeenAt` (qui
  // pilote le point rouge) est déjà mis à jour dès l'ouverture.
  const [viewingSinceAt, setViewingSinceAt] = useState<string | null>(null)
  const [open, setOpen] = useState(false)

  useEffect(() => {
    setLastSeenAt(localStorage.getItem(LAST_SEEN_KEY))
  }, [])

  useEffect(() => {
    let cancelled = false

    async function poll() {
      try {
        const res = await fetch("/api/notifications")
        if (!res.ok) return
        const data: { items: NotificationItem[] } = await res.json()
        if (!cancelled) setItems(data.items)
      } catch {
        // Un échec de polling ne doit pas casser le dashboard - on retentera au
        // prochain intervalle.
      }
    }

    poll()
    const interval = setInterval(poll, POLL_INTERVAL_MS)
    return () => {
      cancelled = true
      clearInterval(interval)
    }
  }, [])

  const hasUnseen = items.some((item) => !lastSeenAt || item.createdAt > lastSeenAt)

  function handleOpenChange(next: boolean) {
    setOpen(next)
    if (next) {
      setViewingSinceAt(lastSeenAt)
      const now = new Date().toISOString()
      localStorage.setItem(LAST_SEEN_KEY, now)
      setLastSeenAt(now)
    }
  }

  return (
    <Popover.Root open={open} onOpenChange={handleOpenChange}>
      <Popover.Trigger
        className="relative flex h-9 w-9 items-center justify-center rounded-[8px] text-muted-foreground hover:bg-muted hover:text-foreground"
        aria-label="Notifications"
      >
        <Bell className="h-[18px] w-[18px]" />
        {hasUnseen && (
          <span className="absolute right-2 top-2 h-2 w-2 rounded-full bg-danger ring-2 ring-card" />
        )}
      </Popover.Trigger>
      <Popover.Portal>
        <Popover.Positioner sideOffset={8} align="end">
          <Popover.Popup className="w-80 rounded-xl border border-border bg-popover p-2 text-popover-foreground shadow-lg">
            <p className="px-2 py-1.5 text-xs font-medium text-muted-foreground">Notifications</p>
            {items.length === 0 ? (
              <p className="px-2 py-4 text-center text-sm text-muted-foreground">
                Rien de nouveau pour le moment.
              </p>
            ) : (
              <ul className="flex flex-col gap-0.5">
                {items.map((item) => (
                  <li
                    key={item.id}
                    className={cn(
                      "flex flex-col gap-0.5 rounded-lg px-2 py-2 text-sm",
                      !viewingSinceAt || item.createdAt > viewingSinceAt ? "bg-muted/60" : ""
                    )}
                  >
                    <span className="text-foreground">{item.message}</span>
                    <span className="text-xs text-muted-foreground">{relativeTime(item.createdAt)}</span>
                  </li>
                ))}
              </ul>
            )}
          </Popover.Popup>
        </Popover.Positioner>
      </Popover.Portal>
    </Popover.Root>
  )
}
