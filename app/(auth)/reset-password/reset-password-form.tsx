"use client"

import { useActionState, useEffect } from "react"
import { Input } from "@/components/ui/input"
import { FormField, FormError, SubmitButton } from "@/components/ui/form"
import { updatePassword, type AuthActionState } from "../actions"

const initialState: AuthActionState = { error: null }

export function ResetPasswordForm() {
  const [state, formAction, pending] = useActionState(updatePassword, initialState)

  useEffect(() => {
    if (state.redirectTo) {
      window.location.href = state.redirectTo
    }
  }, [state.redirectTo])

  return (
    <form action={formAction} className="mt-6 flex flex-col gap-4">
      <FormField label="Nouveau mot de passe" htmlFor="password">
        <Input
          id="password"
          name="password"
          type="password"
          autoComplete="new-password"
          required
          minLength={8}
        />
      </FormField>

      <FormField label="Confirmer le mot de passe" htmlFor="confirmPassword">
        <Input
          id="confirmPassword"
          name="confirmPassword"
          type="password"
          autoComplete="new-password"
          required
          minLength={8}
        />
      </FormField>

      <FormError>{state.error}</FormError>

      <SubmitButton pending={pending} pendingLabel="Mise à jour…" className="mt-2 w-full">
        Mettre à jour le mot de passe
      </SubmitButton>
    </form>
  )
}
