import { describe, expect, it } from "vitest"
import { buildPageList, parsePage, toPageResult } from "./pagination"

describe("parsePage", () => {
  it("valeur absente -> page 1", () => {
    expect(parsePage(undefined)).toBe(1)
  })

  it("valeur numérique valide", () => {
    expect(parsePage("3")).toBe(3)
  })

  it("valeur invalide ou négative -> page 1", () => {
    expect(parsePage("abc")).toBe(1)
    expect(parsePage("-2")).toBe(1)
    expect(parsePage("0")).toBe(1)
    expect(parsePage("1.5")).toBe(1)
  })
})

describe("toPageResult", () => {
  it("calcule totalPages en arrondissant au supérieur", () => {
    expect(toPageResult([1, 2], 101, 1).totalPages).toBe(3)
  })

  it("totalPages minimum 1 même si total = 0", () => {
    expect(toPageResult([], 0, 1).totalPages).toBe(1)
  })
})

describe("buildPageList", () => {
  it("une seule page -> [1]", () => {
    expect(buildPageList(1, 1)).toEqual([1])
  })

  it("peu de pages -> pas d'ellipsis", () => {
    expect(buildPageList(3, 5)).toEqual([1, 2, 3, 4, 5])
  })

  it("début de liste -> ellipsis seulement après", () => {
    expect(buildPageList(1, 20)).toEqual([1, 2, "ellipsis", 20])
  })

  it("fin de liste -> ellipsis seulement avant", () => {
    expect(buildPageList(20, 20)).toEqual([1, "ellipsis", 19, 20])
  })

  it("milieu de liste -> ellipsis des deux côtés", () => {
    expect(buildPageList(10, 20)).toEqual([1, "ellipsis", 9, 10, 11, "ellipsis", 20])
  })

  it("pas de doublon quand la page courante touche un bord", () => {
    expect(buildPageList(2, 20)).toEqual([1, 2, 3, "ellipsis", 20])
  })
})
