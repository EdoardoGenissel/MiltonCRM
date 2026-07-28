"use client"

import Image from "next/image"
import Link from "next/link"
import { usePathname } from "next/navigation"
import { cn } from "@/lib/utils"
import { Users, FileText, Building2, Upload, Calculator, LogOut } from "lucide-react"
import { signOut } from "@/app/(auth)/actions"

type SidebarUser = { fullName: string; email: string }

const AVATAR_PALETTE = [
  { bg: "#e0f2fd", fg: "#1565c0" },
  { bg: "#fce4ec", fg: "#ad1457" },
  { bg: "#fff3e0", fg: "#e65100" },
  { bg: "#f3e5f5", fg: "#6a1b9a" },
  { bg: "#e8f5e9", fg: "#2e7d32" },
  { bg: "#ede7f6", fg: "#4527a0" },
]

function initialsFor(name: string): string {
  const parts = name.trim().split(/\s+/)
  const initials = parts.length > 1 ? `${parts[0][0]}${parts[parts.length - 1][0]}` : name.slice(0, 2)
  return initials.toUpperCase() || "?"
}

function hashString(value: string): number {
  let h = 0
  for (let i = 0; i < value.length; i++) h = (h * 31 + value.charCodeAt(i)) | 0
  return Math.abs(h)
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
        "flex items-center gap-3 rounded-[8px] px-3 py-2.5 text-sm font-medium transition-colors",
        active
          ? "bg-muted text-foreground"
          : "text-muted-foreground hover:bg-muted hover:text-foreground"
      )}
    >
      <Icon className={cn("h-[18px] w-[18px]", active ? "text-primary" : "text-muted-foreground")} />
      {label}
    </Link>
  )
}

export function Sidebar({ user }: { user: SidebarUser | null }) {
  const pathname = usePathname()
  const avatarColor = user ? AVATAR_PALETTE[hashString(user.email) % AVATAR_PALETTE.length] : null

  return (
    <aside className="sticky top-0 flex h-screen w-64 shrink-0 flex-col border-r border-border bg-card">
      <div className="flex items-center gap-2.5 px-6 py-5">
        <Image src="/logo-mark.png" alt="Milton Immobilier" width={36} height={36} className="h-9 w-9" />
        <span className="text-[15px] font-semibold tracking-tight text-foreground">
          Milton CRM
        </span>
      </div>

      <nav className="flex flex-1 flex-col gap-1 px-3.5 py-1.5">
        {navItems.map((item) => (
          <NavLink key={item.label} {...item} active={Boolean(pathname?.startsWith(item.href))} />
        ))}
      </nav>

      <div className="px-3.5 py-1.5">
        <NavLink label="Imports" href="/imports" icon={Upload} active={Boolean(pathname?.startsWith("/imports"))} />
      </div>

      <div className="flex items-center gap-2 border-t border-border p-3.5">
        {user && (
          <div className="flex min-w-0 flex-1 items-center gap-2.5 rounded-[8px] px-1 py-1">
            <div
              className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-xs font-semibold"
              style={{ backgroundColor: avatarColor?.bg, color: avatarColor?.fg }}
            >
              {initialsFor(user.fullName)}
            </div>
            <div className="min-w-0">
              <p className="truncate text-sm font-medium text-foreground">{user.fullName}</p>
              <p className="truncate text-xs text-muted-foreground">{user.email}</p>
            </div>
          </div>
        )}
        <form action={signOut}>
          <button
            type="submit"
            title="Déconnexion"
            className="flex shrink-0 items-center justify-center rounded-[8px] p-2 text-muted-foreground hover:bg-muted hover:text-foreground"
          >
            <LogOut className="h-4 w-4" />
          </button>
        </form>
      </div>
    </aside>
  )
}
