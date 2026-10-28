import { NextResponse, type NextRequest } from "next/server"
import { z } from "zod"
import { createClient } from "@/lib/supabase/server"
import {
  ApplyError,
  applySuggestion,
  rejectSuggestion,
  reopenSuggestion,
} from "@/lib/prospects-mail/apply"
import { getSuggestionDetail } from "@/lib/prospects-mail/details"

const bodySchema = z.discriminatedUnion("decision", [
  z.object({
    decision: z.literal("valider"),
    actions: z.array(z.object({ enabled: z.boolean(), fields: z.record(z.string(), z.string()) })),
  }),
  z.object({ decision: z.literal("rejeter") }),
  z.object({ decision: z.literal("rouvrir") }),
])

// Détail d'une proposition (modale de validation, drawer d'historique).
export async function GET(_request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const detail = await getSuggestionDetail(id)
  if (!detail) return NextResponse.json({ error: "Proposition introuvable." }, { status: 404 })
  return NextResponse.json(detail)
}

// Validation / rejet d'une proposition de la page Prospects.
export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const parsed = bodySchema.safeParse(await request.json().catch(() => null))
  if (!parsed.success) return NextResponse.json({ error: "Requête invalide." }, { status: 400 })

  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  const userEmail = user?.email ?? null

  try {
    const body = parsed.data
    if (body.decision === "valider") {
      const result = await applySuggestion(id, body.actions, userEmail)
      return NextResponse.json({ ok: true, result })
    }
    if (body.decision === "rejeter") await rejectSuggestion(id, userEmail)
    else await reopenSuggestion(id)
    return NextResponse.json({ ok: true })
  } catch (err) {
    if (err instanceof ApplyError) return NextResponse.json({ error: err.message }, { status: 409 })
    throw err
  }
}
