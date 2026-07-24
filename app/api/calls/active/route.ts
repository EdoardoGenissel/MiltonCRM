import { getActiveCall } from "@/lib/calls/queries"

// Consommée par le polling du bandeau d'appel entrant (components/incoming-call-
// banner.tsx). Route "normale" (passe par le proxy, session Supabase requise) —
// à ne pas confondre avec le webhook Ringover (app/api/ringover/webhook), qui lui
// est public et protégé par secret.
export async function GET() {
  const call = await getActiveCall()
  return Response.json({ call })
}
