import { describe, expect, it } from "vitest"
import { PersonResolver } from "./person-resolver"
import type { IdentityMatchCandidate } from "@/lib/contacts/dedupe"

describe("PersonResolver", () => {
  it("réutilise un contact déjà en base (par email) et planifie un tag de persona", () => {
    const existing: IdentityMatchCandidate = {
      id: "c1",
      email: "marie@example.com",
      telephone: null,
      nom: "Dupont",
      prenom: "Marie",
    }
    const resolver = new PersonResolver([existing])

    const id = resolver.resolve({
      nom: "Dupont",
      email: "marie@example.com",
      persona: "proprietaire_bailleur",
    })

    expect(id).toBe("c1")
    expect(resolver.toCreate).toHaveLength(0)
    expect(resolver.idsToTagPersonas.get("c1")).toEqual(new Set(["proprietaire_bailleur"]))
  })

  it("planifie une création pour une personne inconnue", () => {
    const resolver = new PersonResolver([])
    const id = resolver.resolve({
      nom: "Martin",
      prenom: "Julie",
      email: "julie@example.com",
      persona: "locataire",
    })

    expect(resolver.toCreate).toEqual([
      {
        id,
        civilite: undefined,
        prenom: "Julie",
        nom: "Martin",
        telephone: undefined,
        email: "julie@example.com",
        commune: undefined,
        personas: ["locataire"],
      },
    ])
  })

  it("fusionne deux personas pour la même personne planifiée dans le même import (ex. propriétaire de 2 lots)", () => {
    const resolver = new PersonResolver([])
    const id1 = resolver.resolve({
      nom: "Kong",
      email: "kong@example.com",
      persona: "proprietaire_bailleur",
    })
    const id2 = resolver.resolve({
      nom: "Kong",
      email: "kong@example.com",
      persona: "proprietaire_bailleur",
    })

    expect(id2).toBe(id1)
    expect(resolver.toCreate).toHaveLength(1)
    expect(resolver.toCreate[0].personas).toEqual(["proprietaire_bailleur"])
  })

  it("ajoute un second persona à une création planifiée (même personne, rôles différents)", () => {
    const resolver = new PersonResolver([])
    const id1 = resolver.resolve({
      nom: "Kong",
      email: "kong@example.com",
      persona: "proprietaire_bailleur",
    })
    const id2 = resolver.resolve({ nom: "Kong", email: "kong@example.com", persona: "locataire" })

    expect(id2).toBe(id1)
    expect(resolver.toCreate[0].personas).toEqual(["proprietaire_bailleur", "locataire"])
  })

  it("renvoie null sans rien planifier quand le nom est absent (ex. lot vacant)", () => {
    const resolver = new PersonResolver([])
    const id = resolver.resolve({ persona: "locataire" })

    expect(id).toBeNull()
    expect(resolver.toCreate).toHaveLength(0)
  })
})
