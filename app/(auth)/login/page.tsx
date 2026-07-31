import Link from "next/link"
import { MiltonLogo } from "@/components/milton-logo"
import { LoginForm } from "./login-form"

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ next?: string }>
}) {
  const { next } = await searchParams

  return (
    <div className="grid min-h-screen lg:grid-cols-2">
      <div className="relative hidden lg:block">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src="/login-cover.svg"
          alt=""
          className="absolute inset-0 h-full w-full object-cover"
        />
        <div className="absolute inset-0 flex flex-col justify-end p-12">
          <p className="max-w-md text-2xl font-semibold leading-snug text-white">
            Le pilotage temps réel de l&apos;activité Milton Immobilier, pôle par pôle.
          </p>
          <p className="mt-3 text-sm text-white/70">
            Transaction · Gestion locative · Location-Développement · Estimation
          </p>
        </div>
      </div>

      <div className="flex items-center justify-center bg-background px-4 py-12">
        <div className="w-full max-w-sm">
          <div className="mb-8 flex items-center">
            <MiltonLogo />
          </div>

          <h1 className="text-lg font-semibold tracking-tight text-foreground">
            Connexion
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Accédez à votre cockpit Milton Immobilier.
          </p>

          <LoginForm next={next} />

          <Link
            href="/mot-de-passe-oublie"
            className="mt-4 block text-center text-sm text-muted-foreground hover:text-foreground"
          >
            Mot de passe oublié ?
          </Link>
        </div>
      </div>
    </div>
  )
}
