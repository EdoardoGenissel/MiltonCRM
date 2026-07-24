import { describe, expect, it } from "vitest"
import { loyerMaxWithMargin } from "./loyer-max"

describe("loyerMaxWithMargin", () => {
  it("ajoute 10 % au loyer max déclaré", () => {
    expect(loyerMaxWithMargin(900)).toBe(990)
  })

  it("arrondit à l'euro", () => {
    expect(loyerMaxWithMargin(658)).toBe(724) // 723.8 -> 724
  })

  it("gère 0", () => {
    expect(loyerMaxWithMargin(0)).toBe(0)
  })
})
