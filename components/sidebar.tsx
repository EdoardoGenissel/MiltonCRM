"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { cn } from "@/lib/utils"
import { Users, FileText, Building2, Upload, Calculator, LogOut } from "lucide-react"
import { signOut } from "@/app/(auth)/actions"

const navItems = [
  { label: "Contacts", href: "/contacts", icon: Users },
  { label: "Mandats", href: "/mandats", icon: FileText },
  { label: "Biens", href: "/biens", icon: Building2 },
  { label: "Imports", href: "/imports", icon: Upload },
  { label: "Estimations", href: "/estimations", icon: Calculator },
]

export function Sidebar() {
  const pathname = usePathname()

  return (
    <aside className="sticky top-0 flex h-screen w-64 shrink-0 flex-col border-r border-border bg-card">
      <div className="flex items-center gap-3 px-6 py-5">
        <div className="flex h-9 w-9 items-center justify-center">
          <MiltonLogo />
        </div>
        <span className="text-[15px] font-semibold tracking-tight text-foreground">
          Milton CRM
        </span>
      </div>

      <nav className="flex flex-1 flex-col gap-1 px-3.5 py-1.5">
        {navItems.map((item) => {
          const active = pathname?.startsWith(item.href)
          return (
            <Link
              key={item.label}
              href={item.href}
              className={cn(
                "flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors",
                active
                  ? "bg-muted text-foreground"
                  : "text-muted-foreground hover:bg-muted hover:text-foreground"
              )}
            >
              <item.icon
                className={cn("h-[18px] w-[18px]", active ? "text-primary" : "text-muted-foreground")}
              />
              {item.label}
            </Link>
          )
        })}
      </nav>

      <div className="border-t border-border p-3.5">
        <form action={signOut}>
          <button
            type="submit"
            className="flex w-full items-center gap-2.5 rounded-lg px-3 py-2 text-left text-sm text-muted-foreground hover:bg-muted hover:text-foreground"
          >
            <LogOut className="h-4 w-4" />
            Déconnexion
          </button>
        </form>
      </div>
    </aside>
  )
}

function MiltonLogo() {
  return (
    <svg viewBox="0 0 40 40" fill="none" xmlns="http://www.w3.org/2000/svg" className="h-9 w-9">
      <defs>
        <linearGradient id="miltonG" x1="4" y1="6" x2="36" y2="34" gradientUnits="userSpaceOnUse">
          <stop stopColor="#00a19a" />
          <stop offset="1" stopColor="#8cc63f" />
        </linearGradient>
      </defs>
      <path
        d="M8 4h24a4 4 0 0 1 4 4v18a4 4 0 0 1-4 4H18l-7 6v-6H8a4 4 0 0 1-4-4V8a4 4 0 0 1 4-4Z"
        fill="url(#miltonG)"
      />
      <path
        d="M12 25V13l8 8 8-8v12"
        stroke="#fff"
        strokeWidth="3"
        strokeLinecap="round"
        strokeLinejoin="round"
        fill="none"
      />
    </svg>
  )
}
