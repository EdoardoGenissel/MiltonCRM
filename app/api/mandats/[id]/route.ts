import { NextRequest } from "next/server"
import { getMandatById } from "@/lib/mandats/queries"
import { serializeMandat } from "@/lib/mandats/serialize"

// Sert la fiche mandat autonome au drawer client (cf.
// components/entity-drawers/mandat-drawer-content.tsx) — le mandat n'a pas de
// page dédiée dans l'app (cf. son affichage intégré à la fiche bien), d'où
// cette route dédiée pour l'ouvrir en drawer depuis /mandats.
export async function GET(_request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const mandat = await getMandatById(id)
  if (!mandat) return Response.json({ error: "Mandat introuvable." }, { status: 404 })

  return Response.json(serializeMandat(mandat))
}
