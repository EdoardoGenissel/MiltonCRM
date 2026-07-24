import { type EmailOtpType } from "@supabase/supabase-js"
import { redirect } from "next/navigation"
import { type NextRequest } from "next/server"
import { createClient } from "@/lib/supabase/server"

// Cible du lien envoyé par `resetPasswordForEmail` (cf. app/(auth)/actions.ts).
// Le template d'email Supabase (Auth > Templates > Reset password) doit utiliser
// `{{ .ConfirmationURL }}` — Supabase pointe alors vers cette route avec
// `token_hash` + `type=recovery`, qu'on échange ici contre une session avant de
// rediriger vers /reset-password pour saisir le nouveau mot de passe.
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const tokenHash = searchParams.get("token_hash")
  const type = searchParams.get("type") as EmailOtpType | null
  const next = searchParams.get("next") ?? "/reset-password"

  if (tokenHash && type) {
    const supabase = await createClient()
    const { error } = await supabase.auth.verifyOtp({ type, token_hash: tokenHash })
    if (!error) {
      redirect(next)
    }
  }

  redirect("/login?error=lien_invalide")
}
