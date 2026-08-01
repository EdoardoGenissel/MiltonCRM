import { NextRequest } from "next/server"
import { getContactById } from "@/lib/contacts/queries"

// Sert la fiche contact complète au drawer client (cf.
// components/entity-drawers/contact-drawer-content.tsx) — remplace la
// Server Component app/(dashboard)/contacts/[id]/page.tsx comme source de
// données pour un affichage sans navigation. Les Decimal/Date Prisma sont
// converties en string pour rester JSON-safe (mêmes conversions que faisait la
// page de détail via .toString()/toLocaleDateString()).
export async function GET(_request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const contact = await getContactById(id)
  if (!contact) return Response.json({ error: "Contact introuvable." }, { status: 404 })

  return Response.json({
    id: contact.id,
    civilite: contact.civilite,
    prenom: contact.prenom,
    nom: contact.nom,
    telephone: contact.telephone,
    email: contact.email,
    commune: contact.commune,
    source: contact.source,
    personas: contact.personas,
    createdAt: contact.createdAt.toISOString(),
    updatedAt: contact.updatedAt.toISOString(),
    prospectDetail: contact.prospectDetail
      ? {
          alerteAbonne: contact.prospectDetail.alerteAbonne,
          classification: contact.prospectDetail.classification,
          origine: contact.prospectDetail.origine,
          originePrecise: contact.prospectDetail.originePrecise,
          coAgence: contact.prospectDetail.coAgence,
          categorie: contact.prospectDetail.categorie,
          typeBien: contact.prospectDetail.typeBien,
          loyerMax: contact.prospectDetail.loyerMax?.toString() ?? null,
          prixMin: contact.prospectDetail.prixMin?.toString() ?? null,
          prixMax: contact.prospectDetail.prixMax?.toString() ?? null,
          devise: contact.prospectDetail.devise,
          pieces: contact.prospectDetail.pieces,
          surfaceMin: contact.prospectDetail.surfaceMin?.toString() ?? null,
          surfaceMax: contact.prospectDetail.surfaceMax?.toString() ?? null,
          secteur: contact.prospectDetail.secteur,
          quartier: contact.prospectDetail.quartier,
          agence: contact.prospectDetail.agence,
          referenceProduit: contact.prospectDetail.referenceProduit,
          utilisateur: contact.prospectDetail.utilisateur,
          creeLe: contact.prospectDetail.creeLe?.toISOString() ?? null,
          derniereAction: contact.prospectDetail.derniereAction?.toISOString() ?? null,
          majLe: contact.prospectDetail.majLe?.toISOString() ?? null,
          majPar: contact.prospectDetail.majPar,
          attributs: contact.prospectDetail.attributs,
          commentaire: contact.prospectDetail.commentaire,
          criteresComplementaires: contact.prospectDetail.criteresComplementaires,
          emailingAbonne: contact.prospectDetail.emailingAbonne,
          magazineAbonne: contact.prospectDetail.magazineAbonne,
          dateNaissance: contact.prospectDetail.dateNaissance?.toISOString() ?? null,
          lieuNaissance: contact.prospectDetail.lieuNaissance,
          languesParlees: contact.prospectDetail.languesParlees,
          adressePersonnelle: contact.prospectDetail.adressePersonnelle,
          adresseComplement: contact.prospectDetail.adresseComplement,
          codePostal: contact.prospectDetail.codePostal,
          villePersonnelle: contact.prospectDetail.villePersonnelle,
          pays: contact.prospectDetail.pays,
        }
      : null,
    mandats: contact.mandats.map((mandat) => ({
      id: mandat.id,
      type: mandat.type,
      statut: mandat.statut,
      montantLoyer: mandat.montantLoyer?.toString() ?? null,
      finMandat: mandat.finMandat?.toISOString() ?? null,
      bien: mandat.bien
        ? {
            id: mandat.bien.id,
            titre: mandat.bien.titre,
            adresse: mandat.bien.adresse,
            commune: mandat.bien.commune,
          }
        : null,
    })),
    mandatsLocataire: contact.mandatsLocataire.map((mandat) => ({
      id: mandat.id,
      type: mandat.type,
      montantLoyer: mandat.montantLoyer?.toString() ?? null,
      finMandat: mandat.finMandat?.toISOString() ?? null,
      bien: mandat.bien
        ? {
            id: mandat.bien.id,
            titre: mandat.bien.titre,
            adresse: mandat.bien.adresse,
            commune: mandat.bien.commune,
          }
        : null,
    })),
    callLogs: contact.callLogs.map((call) => ({
      id: call.id,
      receivedAt: call.receivedAt.toISOString(),
      transcriptSummary: call.transcriptSummary,
    })),
    estimations: contact.estimations.map((estimation) => ({
      id: estimation.id,
      statut: estimation.statut,
      cityscanReportUrl: estimation.cityscanReportUrl,
      bien: estimation.bien
        ? {
            id: estimation.bien.id,
            titre: estimation.bien.titre,
            adresse: estimation.bien.adresse,
            commune: estimation.bien.commune,
            codePostal: estimation.bien.codePostal,
          }
        : null,
    })),
  })
}
