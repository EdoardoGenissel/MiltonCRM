import { describe, expect, it } from "vitest"
import { mapApimoProperty } from "./map-property"
import { buildContact, buildProperty, buildTestContext } from "./test-fixtures"

describe("mapApimoProperty", () => {
  it("traduit les ids de catalogue avec les libellés de l'export Excel", () => {
    const item = mapApimoProperty(buildProperty(), buildTestContext([buildContact()]))

    expect(item.sourceRef).toBe("83148568")
    expect(item.bien).toMatchObject({
      typeBien: "Maison jumelée", // sous-type prioritaire sur le type
      statut: "Attente mandat",
      commune: "REMIRE-MONTJOLY",
      codePostal: "97354",
      pays: "Guyane française",
      residence: "CLOS DE MONTJOLY",
      etage: "Plain-pied",
      agence: "Milton Immobilier",
      utilisateur: "Contact MILTON IMMOBILIER",
      attributs: "Prospect directeur d'agence",
    })
    expect(item.mandat).toMatchObject({
      type: "Non précisé",
      statut: "Attente mandat",
      categorie: "Vente",
    })
  })

  it("garde l'heure Apimo telle quelle, comme l'import Excel", () => {
    const item = mapApimoProperty(buildProperty(), buildTestContext())

    expect(item.bien.creeLe?.toISOString()).toBe("2023-08-03T22:46:34.000Z")
  })

  it("trie les photos par rang et normalise les fins de ligne", () => {
    const item = mapApimoProperty(buildProperty(), buildTestContext())

    expect(item.bien.photos).toEqual([
      "https://media.apimo.pro/a.jpg",
      "https://media.apimo.pro/b.jpg",
    ])
    expect(item.bien.description).toBe("Venez découvrir\ncette villa")
  })

  it("ignore un DPE non applicable (-1) et les montants à 0", () => {
    const item = mapApimoProperty(buildProperty(), buildTestContext())

    expect(item.bien.energieConsommation).toBeUndefined()
    expect(item.bien.energieEmission).toBe(12)
    expect(item.mandat.montantProprietaire).toBeUndefined()
    expect(item.mandat.honorairesProprietaire).toBe(0)
  })

  it("rattache le propriétaire par son id de contact Apimo", () => {
    const item = mapApimoProperty(buildProperty(), buildTestContext([buildContact()]))

    expect(item.owners).toEqual([
      {
        apimoContactId: "21930454",
        civilite: "Madame",
        prenom: "Marie",
        nom: "LAMBERT",
        email: "marie.lambert@example.com",
        telephone: "+594 694 24 72 75",
      },
    ])
    expect(item.bien.proprietaireLabel).toBe("Mme Marie LAMBERT")
  })

  it("ajoute la raison sociale au libellé et écarte un email partagé", () => {
    const owner = buildContact({ name: "SCI INNA", email: "contact@miltonimmobilier.fr" })
    const item = mapApimoProperty(buildProperty(), buildTestContext([owner]))

    expect(item.bien.proprietaireLabel).toBe("Mme Marie LAMBERT (SCI INNA)")
    expect(item.owners[0].email).toBeUndefined()
  })

  it("n'a pas de propriétaire quand le contact est absent de l'API", () => {
    const item = mapApimoProperty(buildProperty({ owner: 999 }), buildTestContext())

    expect(item.owners).toEqual([])
    expect(item.bien.proprietaireLabel).toBeUndefined()
  })

  it("prend le type et les dates du mandat", () => {
    const item = mapApimoProperty(
      buildProperty({
        agreement: { type: 3, reference: "", start_at: "2026-02-10", end_at: "2027-02-09" },
      }),
      buildTestContext(),
    )

    expect(item.mandat.type).toBe("Exclusif")
    expect(item.mandat.dateSignature?.toISOString()).toBe("2026-02-10T00:00:00.000Z")
    expect(item.mandat.finMandat?.toISOString()).toBe("2027-02-09T00:00:00.000Z")
  })
})
