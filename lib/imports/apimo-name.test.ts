import { describe, expect, it } from "vitest"
import { parseApimoContactName } from "./apimo-name"

describe("parseApimoContactName", () => {
  it("civilité + prénom + nom (cas standard)", () => {
    expect(parseApimoContactName("Madame Sabrina MOZONOE")).toEqual({
      civilite: "Madame",
      prenom: "Sabrina",
      nom: "MOZONOE",
    })
  })

  it("sans civilité", () => {
    expect(parseApimoContactName("Annamet CEDER")).toEqual({
      civilite: undefined,
      prenom: "Annamet",
      nom: "CEDER",
    })
  })

  it("civilité + nom seul (pas de prénom)", () => {
    expect(parseApimoContactName("Madame BETSHA")).toEqual({
      civilite: "Madame",
      prenom: "",
      nom: "BETSHA",
    })
  })

  it("prénom identique au nom", () => {
    expect(parseApimoContactName("Francisca FRANCISCA")).toEqual({
      civilite: undefined,
      prenom: "Francisca",
      nom: "FRANCISCA",
    })
  })

  it("Monsieur + prénom composé", () => {
    expect(parseApimoContactName("Monsieur Juan Carlos ALANIS")).toEqual({
      civilite: "Monsieur",
      prenom: "Juan Carlos",
      nom: "ALANIS",
    })
  })

  it("nom composé en capitales (plusieurs tokens uppercase consécutifs)", () => {
    expect(parseApimoContactName("Jean THELIN CAMILLE")).toEqual({
      civilite: undefined,
      prenom: "Jean",
      nom: "THELIN CAMILLE",
    })
  })

  it("chaîne vide", () => {
    expect(parseApimoContactName("")).toEqual({ civilite: undefined, prenom: "", nom: "" })
  })
})
