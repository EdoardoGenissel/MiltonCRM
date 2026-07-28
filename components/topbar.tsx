import { NotificationBell } from "@/components/notification-bell"

export function Topbar({ title }: { title: string }) {
  return (
    <header className="flex h-16 shrink-0 items-center justify-between border-b border-border bg-card px-8">
      <h1 className="text-base font-semibold tracking-tight text-foreground">{title}</h1>
      <NotificationBell />
    </header>
  )
}
