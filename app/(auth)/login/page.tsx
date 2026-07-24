import Link from "next/link"
import { LoginForm } from "./login-form"

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ next?: string }>
}) {
  const { next } = await searchParams

  return (
    <div className="rounded-2xl border border-border bg-card p-7 shadow-[var(--shadow-card)]">
      <h1 className="text-lg font-semibold tracking-tight text-foreground">Connexion</h1>
      <p className="mt-1 text-sm text-muted-foreground">Accédez au CRM Milton Immobilier.</p>

      <LoginForm next={next} />

      <Link
        href="/mot-de-passe-oublie"
        className="mt-4 block text-center text-sm text-muted-foreground hover:text-foreground"
      >
        Mot de passe oublié ?
      </Link>
    </div>
  )
}
