import { Sidebar } from "@/components/sidebar"
import { IncomingCallBanner } from "@/components/incoming-call-banner"

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-screen">
      <Sidebar />
      <div className="flex flex-1 flex-col">
        <IncomingCallBanner />
        {children}
      </div>
    </div>
  )
}
