import { AuthCardShell } from "@/components/auth-card-shell"
import { ResetPasswordForm } from "./reset-password-form"

export default function ResetPasswordPage() {
  return (
    <AuthCardShell
      title="Nouveau mot de passe"
      description="Choisissez un nouveau mot de passe pour votre compte."
    >
      <ResetPasswordForm />
    </AuthCardShell>
  )
}
