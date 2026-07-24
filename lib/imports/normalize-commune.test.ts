import { describe, expect, it } from "vitest"
import { normalizeCommune } from "./normalize-commune"

describe("normalizeCommune", () => {
  it("met en majuscules", () => {
    expect(normalizeCommune("cayenne")).toBe("CAYENNE")
    expect(normalizeCommune("Cayenne")).toBe("CAYENNE")
  })

  it("retire les espaces superflus", () => {
    expect(normalizeCommune("  Rémire-Montjoly  ")).toBe("RÉMIRE-MONTJOLY")
    expect(normalizeCommune("Le   Lamentin")).toBe("LE LAMENTIN")
  })

  it("conserve une liste de communes séparées par des virgules (zone Apimo)", () => {
    expect(normalizeCommune("Remire-Montjoly, Matoury, Cayenne")).toBe(
      "REMIRE-MONTJOLY, MATOURY, CAYENNE"
    )
  })
})
