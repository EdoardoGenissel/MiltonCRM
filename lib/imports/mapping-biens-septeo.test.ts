import { describe, expect, it } from "vitest"
import { buildHeaderIndex } from "./header-index"
import { mapSepteoBienRow } from "./mapping-biens-septeo"

const HEADER = [
  "Destinataire_Nom",
  "Proprietaire_Nom",
  "Proprietaire_CiviliteLongue",
  "Proprietaire_Prenom",
  "Proprietaire_TelephoneA",
  "Proprietaire_Portable",
  "Proprietaire_Email",
  "Immeuble_Nom",
  "Mandat_IDMandat",
  "Mandat_Numero",
  "Mandat_Debut",
  "Mandat_DateEch",
  "Mandat_TypeBailDefaut",
  "Mandat_TypeUsageDefaut",
  "MandatLot_IDMandatLot",
  "MandatLot_IDLot",
  "MandatLot_AdrA",
  "MandatLot_AdrB",
  "MandatLot_AdrC",
  "MandatLot_CodePostal",
  "MandatLot_Ville",
  "MandatLot_Pays",
  "MandatLot_TypeLot",
  "MandatLot_NatureLot",
  "MandatLot_Meuble",
  "MandatLot_RegimeFiscal",
  "MandatLot_MontantLoyer",
  "MandatLot_MontantProv",
  "MandatLot_MontantDg",
  "MandatLot_FraisAgence",
  "MandatLot_HonorairesGestion",
  "MandatLot_PourcentageHonoGestion",
  "MandatLot_LocataireActuelNom",
  "MandatLot_LocataireActuelPrenom",
  "MandatLot_LocataireActuelCivLongue",
  "MandatLot_LocataireActuelTelephoneA",
  "MandatLot_LocataireActuelPortable",
  "MandatLot_LocataireActuelEmail",
  "MandatLot_SurfaceHabitable",
  "MandatLot_SurfaceUtile",
  "MandatLot_ConsommationEnergetique",
  "MandatLot_ConsommationEnergetiqueFinale",
  "MandatLot_EmissionGaz",
  "Agence_Libelle",
]

function row(overrides: Record<string, unknown> = {}): unknown[] {
  const base: Record<string, unknown> = {
    Destinataire_Nom: "AUDUREAU",
    Proprietaire_Nom: "AUDUREAU",
    Proprietaire_CiviliteLongue: "Monsieur",
    Proprietaire_Prenom: "Thomas",
    Proprietaire_Portable: "+33 789 21 69 07",
    Proprietaire_Email: "t.audureau@wanadoo.fr",
    Immeuble_Nom: "Les Jardins de l'Oyack",
    Mandat_IDMandat: "9001",
    Mandat_Numero: "M-2024-01",
    Mandat_Debut: "19/01/2024",
    Mandat_DateEch: "19/01/2027",
    Mandat_TypeBailDefaut: "*Bail 3 ans IRL Rév: Annuelle",
    Mandat_TypeUsageDefaut: "Habitation",
    MandatLot_IDMandatLot: "5001",
    MandatLot_IDLot: "4001",
    MandatLot_AdrA: "3 Résidence Les Jardins de l'Oyack",
    MandatLot_CodePostal: "97354",
    MandatLot_Ville: "Remire-Montjoly",
    MandatLot_Pays: "France",
    MandatLot_TypeLot: "4 Pièces",
    MandatLot_NatureLot: "Maison",
    MandatLot_Meuble: "Non",
    MandatLot_RegimeFiscal: "Droit Commun",
    MandatLot_MontantLoyer: "1580.46",
    MandatLot_MontantProv: "40.00",
    MandatLot_MontantDg: "0.00",
    MandatLot_FraisAgence: "0.00",
    MandatLot_HonorairesGestion: "0.00",
    MandatLot_PourcentageHonoGestion: "7.00",
    MandatLot_LocataireActuelNom: "MARTIN",
    MandatLot_LocataireActuelPrenom: "Julie",
    MandatLot_LocataireActuelCivLongue: "Madame",
    MandatLot_LocataireActuelPortable: "+33 694 00 00 00",
    MandatLot_LocataireActuelEmail: "julie.martin@example.com",
    MandatLot_SurfaceHabitable: "99.40",
    Agence_Libelle: "Milton Immobilier",
  }
  Object.assign(base, overrides)
  return HEADER.map((h) => base[h] ?? null)
}

describe("mapSepteoBienRow", () => {
  it("mappe les champs bien/mandat/propriétaire/locataire", () => {
    const headerIndex = buildHeaderIndex(HEADER)
    const mapped = mapSepteoBienRow(headerIndex, row())
    expect(mapped).toMatchObject({
      idLot: "4001",
      idMandatLot: "5001",
      numero: "M-2024-01",
      residence: "Les Jardins de l'Oyack",
      adresse: "3 Résidence Les Jardins de l'Oyack",
      commune: "Remire-Montjoly",
      natureLot: "Maison",
      meuble: "Non",
      dateSignature: "19/01/2024",
      finMandat: "19/01/2027",
      montantLoyer: "1580.46",
      proprietaireNom: "AUDUREAU",
      proprietairePrenom: "Thomas",
      proprietaireTelephone: "+33 789 21 69 07",
      locataireNom: "MARTIN",
      locatairePrenom: "Julie",
      locataireEmail: "julie.martin@example.com",
    })
  })

  it("retombe sur TelephoneA quand Portable est absent", () => {
    const headerIndex = buildHeaderIndex(HEADER)
    const mapped = mapSepteoBienRow(
      headerIndex,
      row({ Proprietaire_Portable: undefined, Proprietaire_TelephoneA: "0594000000" }),
    )
    expect(mapped?.proprietaireTelephone).toBe("0594000000")
  })

  it("retombe sur ConsommationEnergetique quand la valeur finale est absente", () => {
    const headerIndex = buildHeaderIndex(HEADER)
    const mapped = mapSepteoBienRow(
      headerIndex,
      row({
        MandatLot_ConsommationEnergetiqueFinale: undefined,
        MandatLot_ConsommationEnergetique: "180",
      }),
    )
    expect(mapped?.energieConsommation).toBe("180")
  })

  it("renvoie null sans IDLot/IDMandatLot", () => {
    const headerIndex = buildHeaderIndex(HEADER)
    expect(mapSepteoBienRow(headerIndex, row({ MandatLot_IDLot: undefined }))).toBeNull()
  })
})
