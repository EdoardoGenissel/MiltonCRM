"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { cn } from "@/lib/utils"
import { Users, FileText, Building2, Upload, Calculator, LogOut } from "lucide-react"
import { signOut } from "@/app/(auth)/actions"
import { useSidebar } from "@/components/sidebar-context"

type SidebarUser = { fullName: string; email: string }

function initialsFor(name: string): string {
  const parts = name.trim().split(/\s+/)
  const initials =
    parts.length > 1 ? `${parts[0][0]}${parts[parts.length - 1][0]}` : name.slice(0, 2)
  return initials.toUpperCase() || "?"
}

const navItems = [
  { label: "Contacts", href: "/contacts", icon: Users },
  { label: "Mandats", href: "/mandats", icon: FileText },
  { label: "Biens", href: "/biens", icon: Building2 },
  { label: "Estimations", href: "/estimations", icon: Calculator },
]

function NavLink({
  label,
  href,
  icon: Icon,
  active,
}: {
  label: string
  href: string
  icon: typeof Upload
  active: boolean
}) {
  return (
    <Link
      href={href}
      className={cn(
        "flex items-center gap-3 rounded-[9px] px-3 py-2.5 text-sm font-medium transition-colors",
        active
          ? "bg-[#f1f3f5] text-foreground"
          : "text-[#4b5563] hover:bg-[#f5f6f8] hover:text-foreground",
      )}
    >
      <Icon className={cn("h-[18px] w-[18px]", active ? "text-primary" : "text-[#8b93a1]")} />
      {label}
    </Link>
  )
}

export function Sidebar({ user }: { user: SidebarUser | null }) {
  const { open } = useSidebar()
  const pathname = usePathname()

  return (
    <aside
      className={cn(
        "sticky top-0 h-screen shrink-0 overflow-hidden border-r border-border bg-card transition-[width] duration-200 ease-in-out",
        open ? "w-[264px]" : "w-0 border-r-0",
      )}
      aria-hidden={!open}
    >
      <div className="flex h-full w-[264px] flex-col">
        <div className="flex items-center justify-center px-6 py-5">
          <img src="/logo.png" alt="Milton Immobilier" className="h-[42px] w-auto object-contain" />
        </div>

        <nav className="flex flex-1 flex-col gap-1 px-3.5 py-1.5">
          {navItems.map((item) => (
            <NavLink key={item.label} {...item} active={Boolean(pathname?.startsWith(item.href))} />
          ))}
        </nav>

        <div className="px-3.5 pb-1.5">
          <NavLink
            label="Imports"
            href="/imports"
            icon={Upload}
            active={Boolean(pathname?.startsWith("/imports"))}
          />
        </div>

        {user && (
          <div className="flex items-center gap-3 border-t border-border p-3.5">
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-[9px] bg-primary text-xs font-bold text-primary-foreground">
              {initialsFor(user.fullName)}
            </div>
            <div className="min-w-0 flex-1 text-left">
              <div className="truncate text-[13.5px] font-semibold text-foreground">
                {user.fullName}
              </div>
              <div className="truncate text-xs text-muted-foreground">{user.email}</div>
            </div>
            <form action={signOut}>
              <button
                type="submit"
                className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-muted hover:text-danger"
                aria-label="Déconnexion"
                title="Déconnexion"
              >
                <LogOut className="h-4 w-4" />
              </button>
            </form>
          </div>
        )}
      </div>
    </aside>
  )
}
