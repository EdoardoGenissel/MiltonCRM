import { describe, expect, it } from "vitest"
import { formatPhone } from "./mapping-context"

describe("formatPhone", () => {
  it("met en forme un numéro international comme l'export", () => {
    expect(formatPhone("+594694247275")).toBe("+594 694 24 72 75")
    expect(formatPhone("+33612345678")).toBe("+33 6 12 34 56 78")
  })

  it("donne l'indicatif de la Guyane à un numéro national", () => {
    expect(formatPhone("0694247275")).toBe("+594 694 24 72 75")
    expect(formatPhone("696049923")).toBe("+594 696 04 99 23")
  })

  it("laisse tel quel un numéro au format inattendu", () => {
    expect(formatPhone("+59406949636739")).toBe("+59406949636739")
    expect(formatPhone("")).toBeUndefined()
  })
})
