"use client"

import { useActionState, useEffect } from "react"
import { Input } from "@/components/ui/input"
import { FormField, FormError, SubmitButton } from "@/components/ui/form"
import { signIn, type AuthActionState } from "../actions"

const initialState: AuthActionState = { error: null }

export function LoginForm({ next }: { next?: string }) {
  const [state, formAction, pending] = useActionState(signIn, initialState)

  useEffect(() => {
    if (state.redirectTo) {
      window.location.href = state.redirectTo
    }
  }, [state.redirectTo])

  return (
    <form action={formAction} className="mt-6 flex flex-col gap-4">
      <input type="hidden" name="next" value={next ?? ""} />

      <FormField label="Email" htmlFor="email">
        <Input id="email" name="email" type="email" autoComplete="email" required />
      </FormField>

      <FormField label="Mot de passe" htmlFor="password">
        <Input
          id="password"
          name="password"
          type="password"
          autoComplete="current-password"
          required
        />
      </FormField>

      <FormError>{state.error}</FormError>

      <SubmitButton pending={pending} pendingLabel="Connexion…" className="mt-2 w-full">
        Se connecter
      </SubmitButton>
    </form>
  )
}
