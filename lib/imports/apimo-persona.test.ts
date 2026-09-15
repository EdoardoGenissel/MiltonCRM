import { describe, expect, it } from "vitest"
import { apimoOwnerPersona, apimoProspectPersona } from "./apimo-persona"

describe("apimoProspectPersona", () => {
  it("Vente -> acheteur", () => {
    expect(apimoProspectPersona("Vente")).toBe("acheteur")
  })

  it("Programme (neuf) -> acheteur", () => {
    expect(apimoProspectPersona("Programme")).toBe("acheteur")
  })

  it("Location -> locataire", () => {
    expect(apimoProspectPersona("Location")).toBe("locataire")
    expect(apimoProspectPersona("location saisonnière")).toBe("locataire")
  })

  it("valeur absente ou inconnue -> acheteur par défaut", () => {
    expect(apimoProspectPersona(undefined)).toBe("acheteur")
    expect(apimoProspectPersona("")).toBe("acheteur")
    expect(apimoProspectPersona("Autre")).toBe("acheteur")
  })
})

describe("apimoOwnerPersona", () => {
  it("mandat de location -> bailleur", () => {
    expect(apimoOwnerPersona("Location")).toBe("bailleur")
  })

  it("mandat de vente ou catégorie absente -> vendeur", () => {
    expect(apimoOwnerPersona("Vente")).toBe("vendeur")
    expect(apimoOwnerPersona(undefined)).toBe("vendeur")
  })
})
