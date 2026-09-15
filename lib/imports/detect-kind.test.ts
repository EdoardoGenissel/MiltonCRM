import { describe, expect, it } from "vitest"
import { detectImportKind } from "./detect-kind"

// En-têtes réels des exports de Milton (cf. data/).
const HEADERS = {
  apimo_prospects: [
    "Contact Référence",
    "Contact",
    "Classification",
    "Téléphone",
    "e-mail",
    "Co-agence",
    "Catégorie",
    "Type",
    "Prix min",
    "Prix max",
    "Ville",
    "Origine",
    "Mailing",
    "Langue parlée 1",
    "Attributs",
    "Mise à jour le",
  ],
  apimo_biens: [
    "Apinumber",
    "Référence",
    "Étape",
    "Catégorie",
    "Type",
    "Pays",
    "Adresse",
    "Résidence",
    "Propriétaire",
    "Téléphone",
    "e-mail",
    "Prix",
    "Mandat",
    "Démarrage mandat",
    "Vendu le",
  ],
  septeo_contacts: [
    "Nom",
    "Prénom",
    "Code postal",
    "Ville",
    "Téléphone 1",
    "Portable",
    "Email",
    "Type interlocuteur",
  ],
  septeo_biens: [
    "Destinataire_Nom",
    "MandatLot_IDLot",
    "MandatLot_IDMandatLot",
    "Mandat_Numero",
    "MandatLot_AdrA",
    "MandatLot_Ville",
    "Proprietaire_Nom",
    "MandatLot_LocataireActuelNom",
  ],
  septeo_impayes: [
    "Colonne Selection",
    "Nom Locataire",
    "Ref. Lot",
    "Date entrée",
    "Solde",
    "Niv",
    "Propriétaire",
    "Procédure de relance",
    "Type envoi",
  ],
  septeo_incidents: [
    "Tiers",
    "Objet / Libellé",
    "Créé le",
    "Responsable",
    "État de l'événement",
    "Dernière Etape",
    "Référence",
  ],
  septeo_loyers_appeles: [
    "Numéro folio",
    "Numéro pièce",
    "Date écriture",
    "Compte",
    "Libellé compte",
    "Auxiliaire",
    "Libellé auxiliaire",
    "Libellé écriture",
    "Débit",
    "Crédit",
    "Société",
    "Catégorie",
    "Type",
  ],
} as const

describe("detectImportKind", () => {
  for (const [kind, header] of Object.entries(HEADERS)) {
    it(`détecte ${kind}`, () => {
      expect(detectImportKind([...header])).toBe(kind)
    })
  }

  it("tolère l'ordre des colonnes et les accents/casse", () => {
    expect(detectImportKind(["APINUMBER", "prix", "mandat"])).toBe("apimo_biens")
  })

  it("renvoie null sur un fichier non reconnu", () => {
    expect(detectImportKind(["foo", "bar", "baz"])).toBeNull()
    expect(detectImportKind([])).toBeNull()
  })

  it("ne confond pas prospects et biens Apimo (Apinumber tranche)", () => {
    expect(detectImportKind(["Contact", "Classification", "Apinumber"])).toBe("apimo_biens")
  })
})
