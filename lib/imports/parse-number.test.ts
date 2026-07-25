import { describe, expect, it } from "vitest"
import { parseNumber } from "./parse-number"

describe("parseNumber", () => {
  it("parses plain numeric strings", () => {
    expect(parseNumber("500")).toBe(500)
  })

  it("tolerates a decimal comma and surrounding text", () => {
    expect(parseNumber("52,5 m²")).toBe(52.5)
  })

  it("returns undefined for empty values", () => {
    expect(parseNumber(undefined)).toBeUndefined()
    expect(parseNumber("")).toBeUndefined()
  })

  it("extracts the leading number from a free-text range", () => {
    expect(parseNumber("≥ 3.0 pièces")).toBeCloseTo(3.0)
  })

  it("returns undefined for text with no digit at all (ne doit pas devenir 0)", () => {
    // Number("") vaut 0 en JS — régression réelle : "Local commercial" comme
    // valeur de "Pièces" affichait "0" au lieu de "—" sur une fiche bien.
    expect(parseNumber("Local commercial")).toBeUndefined()
    expect(parseNumber("m²")).toBeUndefined()
  })
})
