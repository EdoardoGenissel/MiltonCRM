import { Sidebar } from "@/components/sidebar"
import { IncomingCallBanner } from "@/components/incoming-call-banner"
import { createClient } from "@/lib/supabase/server"
import { prisma } from "@/lib/db/prisma"

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  const profile = user
    ? await prisma.profile.findUnique({ where: { id: user.id }, select: { fullName: true, email: true } })
    : null

  return (
    <div className="flex min-h-screen">
      <Sidebar user={profile ?? (user ? { fullName: user.email ?? "", email: user.email ?? "" } : null)} />
      <div className="flex flex-1 flex-col">
        <IncomingCallBanner />
        {children}
      </div>
    </div>
  )
}
