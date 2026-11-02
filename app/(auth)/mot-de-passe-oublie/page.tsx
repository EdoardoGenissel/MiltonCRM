import Link from "next/link"
import { AuthCardShell } from "@/components/auth-card-shell"
import { ForgotPasswordForm } from "./forgot-password-form"

export default function ForgotPasswordPage() {
  return (
    <AuthCardShell
      title="Mot de passe oublié"
      description="Indiquez votre email, vous recevrez un lien pour réinitialiser votre mot de passe."
    >
      <ForgotPasswordForm />

      <Link
        href="/login"
        className="mt-4 block text-center text-sm text-muted-foreground hover:text-foreground"
      >
        Retour à la connexion
      </Link>
    </AuthCardShell>
  )
}
