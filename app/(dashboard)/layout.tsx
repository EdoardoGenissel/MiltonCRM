import { Sidebar } from "@/components/sidebar"
import { SidebarProvider } from "@/components/sidebar-context"
import { IncomingCallBanner } from "@/components/incoming-call-banner"
import { EntityDrawerProvider } from "@/components/entity-drawers/entity-drawer-provider"
import { createClient } from "@/lib/supabase/server"
import { prisma } from "@/lib/db/prisma"

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  // Le proxy a déjà validé la session via `getUser()` (aller-retour Supabase) :
  // ici `getClaims()` suffit - vérification locale du JWT, sans nouvel appel réseau
  // tant que le projet signe ses JWT en asymétrique (sinon repli sur `getUser()`).
  const supabase = await createClient()
  const { data } = await supabase.auth.getClaims()
  const claims = data?.claims
  const user = claims ? { id: claims.sub, email: claims.email } : null
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
