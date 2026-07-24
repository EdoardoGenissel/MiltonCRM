import { describe, expect, it } from "vitest"
import { chunk } from "./batch"

describe("chunk", () => {
  it("découpe en lots de taille fixe", () => {
    expect(chunk([1, 2, 3, 4, 5], 2)).toEqual([[1, 2], [3, 4], [5]])
  })

  it("un seul lot si size >= length", () => {
    expect(chunk([1, 2, 3], 10)).toEqual([[1, 2, 3]])
  })

  it("tableau vide -> aucun lot", () => {
    expect(chunk([], 5)).toEqual([])
  })
})
