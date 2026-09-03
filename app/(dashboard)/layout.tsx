import { Sidebar } from "@/components/sidebar"
import { SidebarProvider } from "@/components/sidebar-context"
import { IncomingCallBanner } from "@/components/incoming-call-banner"
import { EntityDrawerProvider } from "@/components/entity-drawers/entity-drawer-provider"
import { createClient } from "@/lib/supabase/server"
import { prisma } from "@/lib/db/prisma"

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  const profile = user
    ? await prisma.profile.findUnique({
        where: { id: user.id },
        select: { fullName: true, email: true },
      })
    : null

  return (
    <SidebarProvider>
      <EntityDrawerProvider>
        <div className="flex min-h-screen">
          <Sidebar
            user={
              profile ?? (user ? { fullName: user.email ?? "", email: user.email ?? "" } : null)
            }
          />
          <div className="flex min-w-0 flex-1 flex-col">
            <IncomingCallBanner />
            {children}
          </div>
        </div>
      </EntityDrawerProvider>
    </SidebarProvider>
  )
}
