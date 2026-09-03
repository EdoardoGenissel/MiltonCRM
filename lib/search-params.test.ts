import { describe, expect, it } from "vitest"
import { buildQuery, toArray } from "@/lib/search-params"

describe("toArray", () => {
  it("normalise string / string[] / undefined", () => {
    expect(toArray(undefined)).toEqual([])
    expect(toArray("a")).toEqual(["a"])
    expect(toArray(["a", "b"])).toEqual(["a", "b"])
  })
})

describe("buildQuery", () => {
  it("recopie les params existants en retirant toujours page", () => {
    const q = buildQuery({ search: "x", commune: ["A", "B"], page: "3" })
    expect(q.get("search")).toBe("x")
    expect(q.getAll("commune")).toEqual(["A", "B"])
    expect(q.has("page")).toBe(false)
  })

  it("set écrase, undefined / chaîne vide retirent la clé", () => {
    expect(
      buildQuery({ sort: "nom", dir: "asc" }, { set: { sort: "prix", dir: "desc" } }).toString(),
    ).toBe("sort=prix&dir=desc")
    expect(buildQuery({ search: "x" }, { set: { search: undefined } }).has("search")).toBe(false)
    expect(buildQuery({ search: "x" }, { set: { search: "" } }).has("search")).toBe(false)
  })

  it("append remplace toutes les valeurs de la colonne ciblée", () => {
    const q = buildQuery({ commune: ["A", "B"], typeBien: "T" }, { append: { commune: ["C"] } })
    expect(q.getAll("commune")).toEqual(["C"])
    expect(q.get("typeBien")).toBe("T")
  })

  it("drop retire une clé sans la réécrire", () => {
    expect(
      buildQuery({ sort: "nom", dir: "asc", search: "x" }, { drop: ["sort", "dir"] }).toString(),
    ).toBe("search=x")
  })
})
