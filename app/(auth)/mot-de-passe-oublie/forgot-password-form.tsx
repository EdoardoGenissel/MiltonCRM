"use client"

import { useActionState } from "react"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { requestPasswordReset, type AuthActionState } from "../actions"

const initialState: AuthActionState = { error: null }

export function ForgotPasswordForm() {
  const [state, formAction, pending] = useActionState(requestPasswordReset, initialState)

  if (state.error === null && state !== initialState) {
    return (
      <p className="mt-6 text-sm text-foreground">
        Si un compte existe avec cet email, un lien de réinitialisation vient de lui être envoyé.
      </p>
    )
  }

  return (
    <form action={formAction} className="mt-6 flex flex-col gap-4">
      <div className="flex flex-col gap-1.5">
        <label htmlFor="email" className="text-sm font-medium text-foreground">
          Email
        </label>
        <Input id="email" name="email" type="email" autoComplete="email" required />
      </div>

      {state.error && <p className="text-sm text-danger">{state.error}</p>}

      <Button type="submit" disabled={pending} className="mt-2 w-full">
        {pending ? "Envoi…" : "Envoyer le lien"}
      </Button>
    </form>
  )
}
