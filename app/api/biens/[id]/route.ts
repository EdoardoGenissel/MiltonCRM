import { NextRequest } from "next/server"
import { getBienById } from "@/lib/biens/queries"
import { serializeMandat } from "@/lib/mandats/serialize"

// Sert la fiche bien complète au drawer client (cf.
// components/entity-drawers/bien-drawer-content.tsx), même logique que
// app/api/contacts/[id]/route.ts pour la fiche contact.
export async function GET(_request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const bien = await getBienById(id)
  if (!bien) return Response.json({ error: "Bien introuvable." }, { status: 404 })

  return Response.json({
    id: bien.id,
    adresse: bien.adresse,
    adresseComplement: bien.adresseComplement,
    commune: bien.commune,
    codePostal: bien.codePostal,
    typeBien: bien.typeBien,
    surface: bien.surface?.toString() ?? null,
    prix: bien.prix?.toString() ?? null,
    devise: bien.devise,
    statut: bien.statut,
    source: bien.source,
    titre: bien.titre,
    description: bien.description,
    photos: bien.photos,
    pieces: bien.pieces,
    chambres: bien.chambres,
    etage: bien.etage,
    residence: bien.residence,
    quartier: bien.quartier,
    pays: bien.pays,
    numeroClef: bien.numeroClef,
    meuble: bien.meuble,
    energieConsommation: bien.energieConsommation?.toString() ?? null,
    energieEmission: bien.energieEmission?.toString() ?? null,
    attributs: bien.attributs,
    agence: bien.agence,
    utilisateur: bien.utilisateur,
    referenceProduit: bien.referenceProduit,
    proprietaireLabel: bien.proprietaireLabel,
    creeLe: bien.creeLe?.toISOString() ?? null,
    majLe: bien.majLe?.toISOString() ?? null,
    updatedAt: bien.updatedAt.toISOString(),
    mandats: bien.mandats.map(serializeMandat),
    estimations: bien.estimations.map((estimation) => ({
      id: estimation.id,
      statut: estimation.statut,
      cityscanReportUrl: estimation.cityscanReportUrl,
    })),
  })
}
