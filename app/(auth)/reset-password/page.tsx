import { MiltonLogo } from "@/components/milton-logo"
import { ResetPasswordForm } from "./reset-password-form"

export default function ResetPasswordPage() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <div className="w-full max-w-sm">
        <div className="mb-8 flex items-center justify-center">
          <MiltonLogo className="h-14 w-auto" />
        </div>

        <div className="rounded-[8px] border border-border bg-card p-7 shadow-[var(--shadow-card)]">
          <h1 className="text-lg font-semibold tracking-tight text-foreground">
            Nouveau mot de passe
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Choisissez un nouveau mot de passe pour votre compte.
          </p>

          <ResetPasswordForm />
        </div>
      </div>
    </div>
  )
}
