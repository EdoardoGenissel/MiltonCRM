import { NextResponse, type NextRequest } from "next/server"
import { createClient } from "@/lib/supabase/server"
import { syncJotformEstimations } from "@/lib/integrations/jotform/sync"

// Un sync complet tourne sur ~500 soumissions avec plusieurs upserts DB chacune
// (cf. imports Excel, même contrainte) — au-delà du timeout par défaut Vercel.
export const maxDuration = 300

// Déclenché soit manuellement (bouton page Estimations, session Supabase, POST),
// soit par le cron Vercel (cf. vercel.json, requêtes GET authentifiées par
// `Authorization: Bearer $CRON_SECRET` ajouté automatiquement par Vercel). La
// route est dans la liste de bypass de proxy.ts (comme les webhooks) car un
// appel cron n'a pas de cookie de session : l'authentification est donc vérifiée
// ici plutôt que dans le proxy.
async function handleSync(request: NextRequest) {
  const cronSecret = process.env.CRON_SECRET
  const authHeader = request.headers.get("authorization")
  const isCron = Boolean(cronSecret) && authHeader === `Bearer ${cronSecret}`

  if (!isCron) {
    const supabase = await createClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()
    if (!user) {
      return NextResponse.json({ error: "Non autorisé." }, { status: 401 })
    }
  }

  const result = await syncJotformEstimations()
  return NextResponse.json(result, { status: result.status === "success" ? 200 : 502 })
}

export const GET = handleSync
export const POST = handleSync
