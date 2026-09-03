"use client"

import { useActionState } from "react"
import { Input } from "@/components/ui/input"
import { FormField, FormError, SubmitButton } from "@/components/ui/form"
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
      <FormField label="Email" htmlFor="email">
        <Input id="email" name="email" type="email" autoComplete="email" required />
      </FormField>

      <FormError>{state.error}</FormError>

      <SubmitButton pending={pending} pendingLabel="Envoi…" className="mt-2 w-full">
        Envoyer le lien
      </SubmitButton>
    </form>
  )
}
