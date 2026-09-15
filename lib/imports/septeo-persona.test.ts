import { describe, expect, it } from "vitest"
import { parseSepteoPersonas } from "./septeo-persona"

describe("parseSepteoPersonas", () => {
  it("propriétaire gérance", () => {
    expect(parseSepteoPersonas("Propriétaire Gérance")).toEqual(["bailleur"])
  })

  it("locataire gérance", () => {
    expect(parseSepteoPersonas("Locataire Gérance")).toEqual(["locataire"])
  })

  it("cumul propriétaire + locataire sur la même fiche", () => {
    expect(parseSepteoPersonas("Locataire Gérance,Propriétaire Gérance")).toEqual(
      expect.arrayContaining(["locataire", "bailleur"]),
    )
  })

  it("colocataire compte comme locataire", () => {
    expect(parseSepteoPersonas("Locataire Gérance,Colocataire")).toEqual(["locataire"])
  })

  it("ignore les valeurs hors périmètre CRM (fournisseur, allocations)", () => {
    expect(parseSepteoPersonas("Fournisseur")).toEqual([])
    expect(parseSepteoPersonas("Allocations Familliales")).toEqual([])
  })

  it("tolère une virgule en tête (valeur vide) et les espaces superflus", () => {
    expect(parseSepteoPersonas(",Propriétaire Gérance")).toEqual(["bailleur"])
    expect(parseSepteoPersonas("Propriétaire Location simple ")).toEqual(["bailleur"])
  })

  it("valeur absente", () => {
    expect(parseSepteoPersonas(undefined)).toEqual([])
  })
})
