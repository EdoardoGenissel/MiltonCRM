import { NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"
import { triggerApimoSync } from "@/lib/integrations/apimo/trigger-sync"

// Bouton "Synchroniser maintenant" de la page Imports : lance la synchro Apimo en
// arrière-plan (cf. lib/integrations/apimo/trigger-sync.ts) et rend la main tout
// de suite - le résultat apparaît dans l'historique des imports une fois terminé.
export async function POST() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: "Non autorisé." }, { status: 401 })

  try {
    await triggerApimoSync()
    return NextResponse.json({ status: "started" }, { status: 202 })
  } catch (err) {
    const message = err instanceof Error ? err.message : "Erreur inconnue"
    return NextResponse.json({ error: message }, { status: 502 })
  }
}
