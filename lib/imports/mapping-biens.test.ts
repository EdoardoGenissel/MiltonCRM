import { describe, expect, it } from "vitest"
import { buildHeaderIndex } from "./header-index"
import { mapApimoBienRow } from "./mapping-biens"

const HEADER = [
  "Apinumber",
  "Référence",
  "Étape",
  "Catégorie",
  "Type",
  "Pays",
  "Adresse",
  "Adresse",
  "Résidence",
  "Code postal",
  "Ville",
  "Quartier",
  "Propriétaire",
  "Téléphone",
  "e-mail",
  "Co-agent",
  "Prix",
  "Montant propriétaire",
  "Devise",
  "Pièces",
  "Chambres",
  "Surface",
  "Lot",
  "Numéro de clef",
  "Agence",
  "Utilisateur",
  "Origine",
  "Origine précise",
  "Honoraires propriétaire",
  "Honoraires acheteur",
  "Mandat",
  "Référence",
  "Démarrage mandat",
  "Fin mandat",
  "Étage",
  "Montant compromis",
  "Vendu le",
  "Groupe",
  "Attributs",
  "Note",
  "Titre En",
  "Titre Fr",
  "Commentaire Fr",
  "Photos",
  "Énergie - Consommation conventionnelle",
  "Énergie - Estimation des émissions",
  "Créé le",
  "Mise à jour le",
]

function row(overrides: Record<string, unknown> = {}): unknown[] {
  const base: Record<string, unknown> = {
    Apinumber: "83148568",
    Référence: "160",
    Étape: "Attente mandat",
    Catégorie: "Vente",
    Type: "Maison jumelée",
    Pays: "Guyane française",
    Adresse: "4 Rue des Spatules",
    Résidence: "CLOS DE MONTJOLY",
    "Code postal": "97354",
    Ville: "Remire-Montjoly",
    Propriétaire: "Mme M. LAMBERT",
    Téléphone: "+594 694 06 71 26",
    "e-mail": "fredericlambert722@gmail.com",
    Prix: "300000",
    Devise: "EUR",
    Pièces: "5",
    Chambres: "4",
    Surface: "99.4",
    Agence: "Milton Immobilier",
    Utilisateur: "Contact MILTON IMMOBILIER",
    Mandat: "Simple",
    "Démarrage mandat": "2023-03-02",
    Photos: "https://a.example/1.jpg, https://a.example/2.jpg",
    "Créé le": "2023-08-03 22:46:34",
    "Mise à jour le": "2026-03-05 20:50:19",
  }
  Object.assign(base, overrides)
  return HEADER.map((h) => base[h] ?? null)
}

describe("mapApimoBienRow", () => {
  it("mappe les champs de base", () => {
    const headerIndex = buildHeaderIndex(HEADER)
    const mapped = mapApimoBienRow(headerIndex, row())
    expect(mapped).toMatchObject({
      apinumber: "83148568",
      referenceProduit: "160",
      etape: "Attente mandat",
      categorie: "Vente",
      typeBien: "Maison jumelée",
      adresse: "4 Rue des Spatules",
      residence: "CLOS DE MONTJOLY",
      commune: "REMIRE-MONTJOLY",
      proprietaireLabel: "Mme M. LAMBERT",
      proprietaireTelephone: "+594 694 06 71 26",
      proprietaireEmail: "fredericlambert722@gmail.com",
      typeMandat: "Simple",
      demarrageMandat: "2023-03-02",
    })
    expect(mapped?.photos).toEqual(["https://a.example/1.jpg", "https://a.example/2.jpg"])
  })

  it("désambiguïse les deux colonnes 'Adresse' (complément en 2ème occurrence)", () => {
    const headerIndex = buildHeaderIndex(HEADER)
    const raw = row()
    raw[HEADER.indexOf("Adresse")] = "4 Rue des Spatules"
    // 2ème "Adresse" est à l'index suivant dans le header (complément)
    const secondAdresseIndex = HEADER.indexOf("Adresse", HEADER.indexOf("Adresse") + 1)
    raw[secondAdresseIndex] = "Bât B"
    const mapped = mapApimoBienRow(headerIndex, raw)
    expect(mapped?.adresse).toBe("4 Rue des Spatules")
    expect(mapped?.adresseComplement).toBe("Bât B")
  })

  it("renvoie null sans Apinumber", () => {
    const headerIndex = buildHeaderIndex(HEADER)
    const raw = row({ Apinumber: undefined })
    expect(mapApimoBienRow(headerIndex, raw)).toBeNull()
  })

  it("renvoie une liste de photos vide si absente", () => {
    const headerIndex = buildHeaderIndex(HEADER)
    const mapped = mapApimoBienRow(headerIndex, row({ Photos: undefined }))
    expect(mapped?.photos).toEqual([])
  })
})
