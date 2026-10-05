import { describe, expect, it } from "vitest"
import { parseApimoProprietaire, parseApimoProprietaires } from "./apimo-proprietaire"

describe("parseApimoProprietaire", () => {
  it("parses civilité + nom seul", () => {
    expect(parseApimoProprietaire("Mme MATHURIN")).toEqual({
      civilite: "Madame",
      prenom: "",
      nom: "MATHURIN",
    })
  })

  it("parses civilité + initiale de prénom + nom", () => {
    expect(parseApimoProprietaire("Mme M. BERGAUD")).toEqual({
      civilite: "Madame",
      prenom: "M.",
      nom: "BERGAUD",
    })
  })

  it("parses M. + nom composé", () => {
    expect(parseApimoProprietaire("M. GIRIER-DUFOURNIER")).toEqual({
      civilite: "Monsieur",
      prenom: "",
      nom: "GIRIER-DUFOURNIER",
    })
  })

  it("renvoie null pour plusieurs co-propriétaires", () => {
    expect(parseApimoProprietaire("M. CHATAIGNE - M. GOILLOT")).toBeNull()
  })

  it("traite une raison sociale nue comme un nom seul", () => {
    expect(parseApimoProprietaire("COETA")).toEqual({
      civilite: undefined,
      prenom: "",
      nom: "COETA",
    })
  })

  it("renvoie null pour une valeur vide", () => {
    expect(parseApimoProprietaire(undefined)).toBeNull()
    expect(parseApimoProprietaire("")).toBeNull()
  })
})

describe("parseApimoProprietaires", () => {
  it("renvoie un propriétaire par co-propriétaire", () => {
    expect(parseApimoProprietaires("M. CHATAIGNE - Mme GOILLOT")).toEqual([
      { civilite: "Monsieur", prenom: "", nom: "CHATAIGNE" },
      { civilite: "Madame", prenom: "", nom: "GOILLOT" },
    ])
  })

  it("renvoie [] pour une valeur vide", () => {
    expect(parseApimoProprietaires(undefined)).toEqual([])
  })
})
