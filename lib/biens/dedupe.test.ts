import { describe, expect, it } from "vitest"
import { fillBlanks, normalizeAddress, resolveBienMatch, type BienMatchCandidate } from "./dedupe"

function candidate(overrides: Partial<BienMatchCandidate> = {}): BienMatchCandidate {
  return {
    id: "b1",
    source: "APIMO",
    adresse: "17 rue des Pluviers",
    commune: "Rémire-Montjoly",
    ...overrides,
  }
}

describe("normalizeAddress", () => {
  it("ignore accents, casse et ponctuation", () => {
    expect(normalizeAddress("17 rue des Pluviers")).toBe(normalizeAddress("17 RUE DES PLUVIERS"))
    expect(normalizeAddress("Rémire-Montjoly")).toBe(normalizeAddress("Remire Montjoly"))
  })
})

describe("resolveBienMatch", () => {
  it("matche sur adresse + commune normalisées", () => {
    const match = resolveBienMatch([candidate()], {
      adresse: "17 RUE DES PLUVIERS",
      commune: "REMIRE-MONTJOLY",
    })
    expect(match).toBe("b1")
  })

  it("ne matche pas si l'adresse diffère", () => {
    const match = resolveBienMatch([candidate()], { adresse: "2 rue Autre", commune: "Cayenne" })
    expect(match).toBeNull()
  })

  it("ne matche pas si la commune diffère alors que les deux la renseignent", () => {
    const match = resolveBienMatch([candidate()], {
      adresse: "17 rue des Pluviers",
      commune: "Cayenne",
    })
    expect(match).toBeNull()
  })

  it("retourne null sans adresse entrante", () => {
    expect(resolveBienMatch([candidate()], { adresse: null, commune: null })).toBeNull()
  })
})

describe("fillBlanks", () => {
  it("ne retient que les champs vides côté existant", () => {
    const existing = { adresse: "17 rue des Pluviers", taxeFonciere: null, equipements: [] as string[] }
    const incoming = { adresse: "AUTRE", taxeFonciere: 1575, equipements: ["Piscine"] }

    expect(fillBlanks(existing, incoming)).toEqual({ taxeFonciere: 1575, equipements: ["Piscine"] })
  })

  it("ignore les valeurs entrantes null/undefined/tableau vide", () => {
    const existing = { taxeFonciere: null, equipements: [] as string[] }
    const incoming = { taxeFonciere: null, equipements: [] as string[] }

    expect(fillBlanks(existing, incoming)).toEqual({})
  })
})
