import { NextResponse, type NextRequest } from "next/server"
import { createClient } from "@/lib/supabase/server"
import { syncProspectMails } from "@/lib/prospects-mail/sync"

export const maxDuration = 60

// Analyse IA des nouveaux mails (cf. lib/prospects-mail/sync.ts). Même double
// authentification que /api/jotform/sync : cron (Bearer $CRON_SECRET, cf.
// netlify/functions/prospects-mail-cron.mts) ou bouton "Analyser" de la page
// Prospects (session Supabase).
async function handleSync(request: NextRequest) {
  const cronSecret = process.env.CRON_SECRET
  const isCron =
    Boolean(cronSecret) && request.headers.get("authorization") === `Bearer ${cronSecret}`

  if (!isCron) {
    const supabase = await createClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: "Non autorisé." }, { status: 401 })
  }

  const result = await syncProspectMails({ timeBudgetMs: 40_000 })
  return NextResponse.json(result, { status: result.status === "success" ? 200 : 502 })
}

export const GET = handleSync
export const POST = handleSync
