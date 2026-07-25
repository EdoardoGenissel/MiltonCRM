import { describe, expect, it } from "vitest"
import { nullifyUndefined } from "./nullify-undefined"

describe("nullifyUndefined", () => {
  it("remplace les propriétés undefined par null", () => {
    expect(nullifyUndefined({ a: 1, b: undefined, c: "x" })).toEqual({ a: 1, b: null, c: "x" })
  })

  it("laisse les valeurs déjà null ou falsy intactes", () => {
    expect(nullifyUndefined({ a: null, b: 0, c: "", d: false })).toEqual({
      a: null,
      b: 0,
      c: "",
      d: false,
    })
  })

  it("n'affecte pas l'objet passé en entrée (copie superficielle)", () => {
    const input = { a: undefined as number | undefined }
    const result = nullifyUndefined(input)
    expect(input.a).toBeUndefined()
    expect(result.a).toBeNull()
  })
})
