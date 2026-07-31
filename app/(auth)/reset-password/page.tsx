import { AuthCardShell } from "@/components/auth-card-shell"
import { ResetPasswordForm } from "./reset-password-form"

export default function ResetPasswordPage() {
  return (
    <AuthCardShell>
      <div className="rounded-2xl border border-border bg-card p-7 shadow-[var(--shadow-card)]">
        <h1 className="text-lg font-semibold tracking-tight text-foreground">
          Nouveau mot de passe
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Choisissez un nouveau mot de passe pour votre compte.
        </p>

        <ResetPasswordForm />
      </div>
    </AuthCardShell>
  )
}
