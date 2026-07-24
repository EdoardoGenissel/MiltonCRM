import { describe, expect, it } from "vitest"
import { unwrapQuotes } from "./text-clean"

describe("unwrapQuotes", () => {
  it("retire les guillemets qui entourent une valeur (export Apimo)", () => {
    expect(unwrapQuotes('"+594 694 07 24 89"')).toBe("+594 694 07 24 89")
  })

  it("ne touche pas une valeur sans guillemets", () => {
    expect(unwrapQuotes("sabrina.mazonoe@gmail.com")).toBe("sabrina.mazonoe@gmail.com")
  })

  it("réduit une valeur entièrement vide entre guillemets à une chaîne vide", () => {
    expect(unwrapQuotes('""')).toBe("")
  })
})
