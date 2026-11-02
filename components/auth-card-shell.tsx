import { MiltonLogo } from "@/components/milton-logo"

// Gabarit des pages d'auth secondaires (mot de passe oublié, réinitialisation) :
// logo centré au-dessus d'une carte titre + description + formulaire.
export function AuthCardShell({
  title,
  description,
  children,
}: {
  title: string
  description: string
  children: React.ReactNode
}) {
  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <div className="w-full max-w-sm">
        <div className="mb-8 flex items-center justify-center">
          <MiltonLogo />
        </div>
        <div className="rounded-md border border-border bg-card p-7 shadow-[var(--shadow-card)]">
          <h1 className="text-lg font-semibold tracking-tight text-foreground">{title}</h1>
          <p className="mt-1 text-sm text-muted-foreground">{description}</p>
          {children}
        </div>
      </div>
    </div>
  )
}
