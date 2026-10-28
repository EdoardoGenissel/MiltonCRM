import { describe, expect, it } from "vitest"
import { mapApimoRequest } from "./map-request"
import { buildContact, buildRequest, buildTestContext } from "./test-fixtures"

const contact = buildContact({
  id: 26566698,
  firstname: "Aissia",
  lastname: "ABOEKA",
  mobile: null,
})

describe("mapApimoRequest", () => {
  it("reproduit une ligne de l'export prospects", () => {
    const item = mapApimoRequest(buildRequest(), contact, buildTestContext())

    expect(item).toMatchObject({
      sourceRef: "26566698",
      civilite: "Madame",
      prenom: "Aissia",
      nom: "ABOEKA",
      // id de commune décroissant, comme l'export
      commune: "REMIRE-MONTJOLY, CAYENNE",
      persona: "locataire",
    })
    expect(item.detail).toMatchObject({
      alerteAbonne: true,
      categorie: "Location",
      typeBien: "Appartement Maison",
      loyerMax: 500,
      prixMax: 500,
      pieces: "≥ 3.0 pièces",
      surfaceMin: 52,
      emailingAbonne: true,
      magazineAbonne: false,
      languesParlees: ["français"],
      pays: "Guyane française",
      utilisateur: "Contact MILTON IMMOBILIER",
      majPar: "Bot",
      referenceProduit: "12219138",
    })
    expect(item.detail.creeLe?.toISOString()).toBe("2025-04-15T00:00:00.000Z")
  })

  it("donne le loyer max seulement pour une recherche en location", () => {
    const item = mapApimoRequest(buildRequest({ category: 1 }), contact, buildTestContext())

    expect(item.persona).toBe("acheteur")
    expect(item.detail.loyerMax).toBeUndefined()
    expect(item.detail.prixMax).toBe(500)
  })

  it("préfère les chambres aux pièces dans le critère", () => {
    const item = mapApimoRequest(
      buildRequest({ rooms_operator: "3", bedrooms: 1 }),
      contact,
      buildTestContext(),
    )

    expect(item.detail.pieces).toBe("≤ 1.0 chambre")
  })

  it("traduit le classement en classification", () => {
    const item = mapApimoRequest(buildRequest({ ranking: 1 }), contact, buildTestContext())

    expect(item.detail.classification).toBe("Très actif")
  })

  it("ignore les critères à 0 (non renseignés)", () => {
    const item = mapApimoRequest(
      buildRequest({
        area: { min: "0", max: null },
        price: { min: "0", max: null, currency: "EUR" },
      }),
      contact,
      buildTestContext(),
    )

    expect(item.detail.surfaceMin).toBeUndefined()
    expect(item.detail.prixMin).toBeUndefined()
  })
})
