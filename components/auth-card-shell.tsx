import { MiltonLogo } from "@/components/milton-logo"

export function AuthCardShell({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <div className="w-full max-w-sm">
        <div className="mb-8 flex items-center justify-center">
          <MiltonLogo />
        </div>
        {children}
      </div>
    </div>
  )
}
