import Link from "next/link"
import { cn } from "@/lib/utils"

// Barre d'onglets à soulignement - apparence commune aux onglets internes des
// drawers (DrawerTabs, état local) et aux filtres en onglets (FilterTabs, URL).
// Chaque item porte soit `href` (rendu <Link>), soit `onClick` (rendu <button>).
export type TabStripItem = {
  key: string
  label: React.ReactNode
  active: boolean
  href?: string
  onClick?: () => void
}

const itemClass = (active: boolean) =>
  cn(
    "relative px-3 py-2 text-sm font-medium transition-colors after:absolute after:inset-x-0 after:-bottom-px after:h-0.5 after:rounded-full after:opacity-0 after:transition-opacity",
    active
      ? "text-foreground after:bg-foreground after:opacity-100"
      : "text-foreground/60 hover:text-foreground",
  )

export function TabStrip({ items, className }: { items: TabStripItem[]; className?: string }) {
  return (
    <div className={cn("flex items-center gap-1 border-b border-border", className)}>
      {items.map((item) =>
        item.href !== undefined ? (
          <Link key={item.key} href={item.href} className={itemClass(item.active)}>
            {item.label}
          </Link>
        ) : (
          <button
            key={item.key}
            type="button"
            onClick={item.onClick}
            className={itemClass(item.active)}
          >
            {item.label}
          </button>
        ),
      )}
    </div>
  )
}
