"use client"

import * as React from "react"

type SidebarContextValue = {
  open: boolean
  toggle: () => void
}

const SidebarContext = React.createContext<SidebarContextValue | null>(null)

export function SidebarProvider({ children }: { children: React.ReactNode }) {
  const [open, setOpen] = React.useState(true)
  const toggle = React.useCallback(() => setOpen((v) => !v), [])

  return <SidebarContext.Provider value={{ open, toggle }}>{children}</SidebarContext.Provider>
}

export function useSidebar() {
  const ctx = React.useContext(SidebarContext)
  if (!ctx) throw new Error("useSidebar must be used within a SidebarProvider")
  return ctx
}
