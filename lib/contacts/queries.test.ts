import { describe, expect, it } from "vitest"
import { buildContactWhere, buildOrderBy } from "./queries"

describe("buildOrderBy", () => {
  it("aucun tri demandé -> updatedAt desc par défaut", () => {
    expect(buildOrderBy(undefined, undefined)).toEqual([{ updatedAt: "desc" }])
  })

  it("tri nom, direction par défaut asc", () => {
    expect(buildOrderBy("nom", undefined)).toEqual([{ nom: "asc" }, { prenom: "asc" }])
  })

  it("tri nom, direction desc explicite", () => {
    expect(buildOrderBy("nom", "desc")).toEqual([{ nom: "desc" }, { prenom: "desc" }])
  })

  it("tri commune", () => {
    expect(buildOrderBy("commune", "asc")).toEqual([{ commune: "asc" }])
  })

  it("tri source", () => {
    expect(buildOrderBy("source", "desc")).toEqual([{ source: "desc" }])
  })

  it("tri téléphone", () => {
    expect(buildOrderBy("telephone", "asc")).toEqual([{ telephone: "asc" }])
  })

  it("tri email", () => {
    expect(buildOrderBy("email", "desc")).toEqual([{ email: "desc" }])
  })

  it("clé de tri inconnue -> retombe sur le tri par défaut", () => {
    expect(buildOrderBy("personas", "asc")).toEqual([{ updatedAt: "desc" }])
  })
})

describe("buildContactWhere", () => {
  it("aucun filtre -> AND de conditions vides", () => {
    const where = buildContactWhere({})
    expect(where.AND.every((condition) => Object.keys(condition).length === 0)).toBe(true)
  })

  it("filtre commune multi-valeurs -> IN", () => {
    const where = buildContactWhere({ commune: ["CAYENNE", "MATOURY"] })
    expect(where.AND).toContainEqual({ commune: { in: ["CAYENNE", "MATOURY"] } })
  })

  it("filtre persona -> hasSome (tableau)", () => {
    const where = buildContactWhere({ persona: ["acheteur", "locataire"] })
    expect(where.AND).toContainEqual({ personas: { hasSome: ["acheteur", "locataire"] } })
  })

  it("filtre source ignore les valeurs hors enum", () => {
    const where = buildContactWhere({ source: ["APIMO", "PAS_UNE_SOURCE"] })
    expect(where.AND).toContainEqual({ source: { in: ["APIMO"] } })
  })

  it("excludeColumn retire le filtre de cette colonne uniquement", () => {
    const where = buildContactWhere({ commune: ["CAYENNE"], source: ["APIMO"] }, "commune")
    expect(where.AND).not.toContainEqual({ commune: { in: ["CAYENNE"] } })
    expect(where.AND).toContainEqual({ source: { in: ["APIMO"] } })
  })

  it("search alimente un OR nom/prenom/telephone/email", () => {
    const where = buildContactWhere({ search: "dupont" })
    expect(where.AND).toContainEqual({
      OR: [
        { nom: { contains: "dupont", mode: "insensitive" } },
        { prenom: { contains: "dupont", mode: "insensitive" } },
        { telephone: { contains: "dupont" } },
        { email: { contains: "dupont", mode: "insensitive" } },
      ],
    })
  })
})
