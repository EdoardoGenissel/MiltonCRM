import Link from "next/link"
import { MiltonLogo } from "@/components/milton-logo"
import { ForgotPasswordForm } from "./forgot-password-form"

export default function ForgotPasswordPage() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <div className="w-full max-w-sm">
        <div className="mb-8 flex items-center justify-center">
          <MiltonLogo className="h-14 w-auto" />
        </div>

        <div className="rounded-[8px] border border-border bg-card p-7 shadow-[var(--shadow-card)]">
          <h1 className="text-lg font-semibold tracking-tight text-foreground">
            Mot de passe oublié
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Indiquez votre email, vous recevrez un lien pour réinitialiser votre mot de
            passe.
          </p>

          <ForgotPasswordForm />

          <Link
            href="/login"
            className="mt-4 block text-center text-sm text-muted-foreground hover:text-foreground"
          >
            Retour à la connexion
          </Link>
        </div>
      </div>
    </div>
  )
}
