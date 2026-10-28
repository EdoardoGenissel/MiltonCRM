import { describe, expect, it } from "vitest"
import { cardView } from "./card"
import type { SuggestionCarte, SuggestionSummary } from "./queries"

type Actions = SuggestionSummary["actions"]

function carte(overrides: Partial<SuggestionCarte> = {}): SuggestionCarte {
  return {
    personas: [],
    recherche: null,
    bien: null,
    aMandat: false,
    originePrecise: null,
    ...overrides,
  }
}

function recherche(
  overrides: Partial<NonNullable<SuggestionCarte["recherche"]>> = {},
): SuggestionCarte["recherche"] {
  return {
    categorie: null,
    typeBien: null,
    pieces: null,
    prixMax: null,
    loyerMax: null,
    secteur: null,
    ...overrides,
  }
}

function bien(
  overrides: Partial<NonNullable<SuggestionCarte["bien"]>> = {},
): SuggestionCarte["bien"] {
  return { role: "propriete_du_contact", typeBien: null, pieces: null, commune: null, ...overrides }
}

function view(c: SuggestionCarte | null, actions: Actions = []) {
  return cardView({ carte: c, actions })
}

// Intl fr-FR sépare les milliers par une espace fine insécable : on compare
// avec des espaces simples pour garder les attentes lisibles.
const plain = (s: string | null) => s?.replace(/[  ]/g, " ") ?? null

describe("cardView - typeLabel", () => {
  it("vendeur ou mandat → Projet de vente, avant toute autre règle", () => {
    expect(view(carte({ personas: ["acheteur", "vendeur"] })).typeLabel).toBe("Projet de vente")
    expect(
      view(carte({ aMandat: true, originePrecise: "Calendly", recherche: recherche() })).typeLabel,
    ).toBe("Projet de vente")
  })

  it("bailleur → Mise en location", () => {
    expect(view(carte({ personas: ["bailleur"], originePrecise: "Plato" })).typeLabel).toBe(
      "Mise en location",
    )
  })

  it("Plato ou Calendly, sans tenir compte de la casse → Demande de visite", () => {
    expect(view(carte({ originePrecise: "plato" })).typeLabel).toBe("Demande de visite")
    expect(
      view(carte({ originePrecise: "CALENDLY", bien: bien({ role: "annonce_agence" }) })).typeLabel,
    ).toBe("Demande de visite")
    expect(view(carte({ originePrecise: "Leboncoin" })).typeLabel).toBe("Demande à qualifier")
  })

  it("annonce de l'agence → Question sur une annonce, avant la recherche", () => {
    expect(
      view(
        carte({
          personas: ["acheteur"],
          bien: bien({ role: "annonce_agence" }),
          recherche: recherche({ categorie: "vente" }),
        }),
      ).typeLabel,
    ).toBe("Question sur une annonce")
  })

  it("recherche : catégorie ou persona décide entre location et achat", () => {
    expect(view(carte({ recherche: recherche({ categorie: "location" }) })).typeLabel).toBe(
      "Recherche de location",
    )
    expect(view(carte({ personas: ["locataire"], recherche: recherche() })).typeLabel).toBe(
      "Recherche de location",
    )
    expect(view(carte({ recherche: recherche({ categorie: "vente" }) })).typeLabel).toBe(
      "Recherche d'achat",
    )
    expect(view(carte({ personas: ["acheteur"], recherche: recherche() })).typeLabel).toBe(
      "Recherche d'achat",
    )
  })

  it("sans recherche, un persona acheteur ou locataire ne suffit pas", () => {
    expect(view(carte({ personas: ["acheteur"] })).typeLabel).toBe("Demande à qualifier")
    expect(view(carte({ recherche: recherche() })).typeLabel).toBe("Demande à qualifier")
  })

  it("mail sans extraction → Demande à qualifier", () => {
    expect(view(null).typeLabel).toBe("Demande à qualifier")
  })
})

describe("cardView - bienLine", () => {
  it("bien : type, pièces et commune, première lettre en majuscule", () => {
    expect(
      view(carte({ bien: bien({ typeBien: "appartement", pieces: 3, commune: "Cayenne" }) }))
        .bienLine,
    ).toBe("Appartement 3 pièces · Cayenne")
    expect(view(carte({ bien: bien({ typeBien: "studio", pieces: 1 }) })).bienLine).toBe(
      "Studio 1 pièce",
    )
  })

  it("le bien l'emporte sur la recherche", () => {
    expect(
      view(
        carte({
          bien: bien({ commune: "Kourou" }),
          recherche: recherche({ typeBien: "maison", secteur: "Cayenne" }),
        }),
      ).bienLine,
    ).toBe("Kourou")
  })

  it("recherche de location : type, pièces, secteur et loyer mensuel", () => {
    const line = view(
      carte({
        recherche: recherche({
          categorie: "location",
          typeBien: "appartement",
          pieces: "T3",
          secteur: "Rémire-Montjoly",
          loyerMax: 1025,
        }),
      }),
    ).bienLine
    expect(plain(line)).toBe("Appartement T3 · Rémire-Montjoly · 1 025 €/mois max")
  })

  it("recherche d'achat : budget en prix, segments vides ignorés", () => {
    const line = view(
      carte({ recherche: recherche({ typeBien: "maison", prixMax: 250000 }) }),
    ).bienLine
    expect(plain(line)).toBe("Maison · 250 000 € max")
    expect(plain(view(carte({ recherche: recherche({ prixMax: 250000 }) })).bienLine)).toBe(
      "250 000 € max",
    )
  })

  it("un bien vide laisse la place à la recherche", () => {
    expect(
      view(carte({ bien: bien(), recherche: recherche({ secteur: "matoury" }) })).bienLine,
    ).toBe("Matoury")
  })

  it("rien d'exploitable → null", () => {
    expect(view(null).bienLine).toBeNull()
    expect(view(carte()).bienLine).toBeNull()
    expect(view(carte({ bien: bien(), recherche: recherche() })).bienLine).toBeNull()
  })
})

describe("cardView - contactStatus", () => {
  it("création → nouveau, mise à jour → existant", () => {
    expect(view(carte(), [{ entity: "contact", op: "create" }]).contactStatus).toBe("nouveau")
    expect(
      view(carte(), [
        { entity: "bien", op: "create" },
        { entity: "contact", op: "update" },
      ]).contactStatus,
    ).toBe("existant")
  })

  it("aucune action sur le contact → null", () => {
    expect(view(carte(), [{ entity: "bien", op: "lien" }]).contactStatus).toBeNull()
    expect(view(null).contactStatus).toBeNull()
  })
})
