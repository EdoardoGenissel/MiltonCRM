import type { Contact, Bien, Mandat } from "@/lib/generated/prisma/client"

type MandatWithRelations = Mandat & {
  proprietaire?: Contact | null
  locataire?: Contact | null
  bien?: Bien | null
}

// Conversion Decimal/Date -> JSON-safe, partagée par app/api/biens/[id] et
// app/api/mandats/[id] (le mandat est rendu dans les deux drawers : intégré à
// la fiche bien, et en tant que fiche autonome).
export function serializeMandat(mandat: MandatWithRelations) {
  return {
    id: mandat.id,
    type: mandat.type,
    statut: mandat.statut,
    categorie: mandat.categorie,
    coAgent: mandat.coAgent,
    numero: mandat.numero,
    dateSignature: mandat.dateSignature?.toISOString() ?? null,
    finMandat: mandat.finMandat?.toISOString() ?? null,
    origine: mandat.origine,
    originePrecise: mandat.originePrecise,
    honorairesProprietaire: mandat.honorairesProprietaire?.toString() ?? null,
    honorairesAcheteur: mandat.honorairesAcheteur?.toString() ?? null,
    montantProprietaire: mandat.montantProprietaire?.toString() ?? null,
    montantCompromis: mandat.montantCompromis?.toString() ?? null,
    venduLe: mandat.venduLe?.toISOString() ?? null,
    typeBail: mandat.typeBail,
    usage: mandat.usage,
    regimeFiscal: mandat.regimeFiscal,
    montantLoyer: mandat.montantLoyer?.toString() ?? null,
    montantCharges: mandat.montantCharges?.toString() ?? null,
    montantDepotGarantie: mandat.montantDepotGarantie?.toString() ?? null,
    fraisAgence: mandat.fraisAgence?.toString() ?? null,
    honorairesGestion: mandat.honorairesGestion?.toString() ?? null,
    pourcentageHonorairesGestion: mandat.pourcentageHonorairesGestion?.toString() ?? null,
    proprietaire: mandat.proprietaire
      ? { id: mandat.proprietaire.id, prenom: mandat.proprietaire.prenom, nom: mandat.proprietaire.nom }
      : null,
    locataire: mandat.locataire
      ? { id: mandat.locataire.id, prenom: mandat.locataire.prenom, nom: mandat.locataire.nom }
      : null,
    bien: mandat.bien
      ? {
          id: mandat.bien.id,
          titre: mandat.bien.titre,
          adresse: mandat.bien.adresse,
          commune: mandat.bien.commune,
          devise: mandat.bien.devise,
        }
      : null,
  }
}
