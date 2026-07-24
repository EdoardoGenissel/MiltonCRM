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
})
