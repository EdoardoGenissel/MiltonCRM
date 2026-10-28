import { describe, expect, it } from "vitest"
import { buildActions, diffFields, type MatchContext } from "./proposals"
import type { MailExtraction } from "./extract"

const empty: MatchContext = { contact: null, prospectDetail: null, bien: null, mandat: null }

function extraction(overrides: Partial<MailExtraction> = {}): MailExtraction {
  return {
    pertinent: true,
    raison: "",
    resume: "",
    contact: {
      civilite: "Mme",
      prenom: "Hélène",
      nom: "Orange",
      email: "orange.helene@outlook.fr",
      telephone: "06 12 34 56 78",
      commune: null,
      personas: ["locataire"],
    },
    origine: null,
    recherche: null,
    bien: null,
    mandat: null,
    ...overrides,
  }
}

describe("diffFields", () => {
  it("ignore les valeurs identiques à normalisation près (accents, casse, téléphone)", () => {
    const changes = diffFields(
      "contact",
      { prenom: "Helene", telephone: "+33 6 12 34 56 78", commune: "Lyon" },
      { prenom: "Hélène", telephone: "0612345678", commune: null },
    )
    expect(changes).toEqual([
      { key: "commune", label: "Commune", current: null, proposed: "Lyon", selected: true },
    ])
  })

  it("compare les téléphones sans indicatif (Guyane +594)", () => {
    expect(
      diffFields("contact", { telephone: "0694 12 13 92" }, { telephone: "+594 694121392" }),
    ).toEqual([])
  })

  it("décoche par défaut un champ qui écraserait une valeur existante", () => {
    const [change] = diffFields("contact", { email: "new@x.fr" }, { email: "old@x.fr" })
    expect(change).toMatchObject({ current: "old@x.fr", proposed: "new@x.fr", selected: false })
  })

  it("compare les nombres numériquement (Decimal Prisma vs nombre extrait)", () => {
    expect(diffFields("bien", { surface: 85 }, { surface: "85.00" })).toEqual([])
  })
})

describe("buildActions", () => {
  it("ne propose rien pour un mail non pertinent", () => {
    expect(buildActions(extraction({ pertinent: false }), empty)).toEqual([])
  })

  it("propose la création du contact et de sa recherche", () => {
    const actions = buildActions(
      extraction({
        recherche: {
          categorie: "location",
          typeBien: "appartement",
          prixMin: null,
          prixMax: null,
          loyerMax: 900,
          surfaceMin: null,
          surfaceMax: null,
          pieces: null,
          secteur: "Lyon 6",
          commentaire: null,
        },
      }),
      empty,
    )
    expect(actions.map((a) => [a.entity, a.op])).toEqual([
      ["contact", "create"],
      ["prospectDetail", "create"],
    ])
    expect(actions[0].fields.find((f) => f.key === "personas")?.proposed).toBe("locataire")
  })

  it("ajoute les types de prospect à ceux du contact existant sans en retirer", () => {
    const [contact] = buildActions(extraction(), {
      ...empty,
      contact: {
        id: "c1",
        label: "Hélène Orange (Apimo)",
        reason: "email identique",
        values: {
          prenom: "Hélène",
          nom: "Orange",
          email: "orange.helene@outlook.fr",
          telephone: "0612345678",
          civilite: "Mme",
          personas: ["vendeur"],
        },
      },
    })
    expect(contact.op).toBe("update")
    expect(contact.fields).toEqual([
      {
        key: "personas",
        label: "Types",
        current: "vendeur",
        proposed: "vendeur, locataire",
        selected: false,
      },
    ])
  })

  it("ne crée jamais un bien annonce de l'agence, le lie seulement s'il est connu", () => {
    const bien: MailExtraction["bien"] = {
      role: "annonce_agence",
      reference: "MIL-123",
      adresse: "2 rue X",
      codePostal: null,
      commune: null,
      typeBien: null,
      surface: null,
      pieces: null,
      chambres: null,
      prix: null,
      description: null,
    }
    expect(buildActions(extraction({ bien }), empty).map((a) => a.entity)).toEqual(["contact"])
    const linked = buildActions(extraction({ bien }), {
      ...empty,
      bien: { id: "b1", label: "2 rue X", reason: "référence identique", values: {} },
    })
    expect(linked[1]).toMatchObject({ entity: "bien", op: "lien", targetId: "b1", fields: [] })
  })

  it("propose bien + mandat pour un vendeur qui signe, le prix du mandat allant sur le bien", () => {
    const actions = buildActions(
      extraction({
        bien: {
          role: "propriete_du_contact",
          reference: null,
          adresse: "12 avenue Foch",
          codePostal: "69006",
          commune: "Lyon",
          typeBien: "appartement",
          surface: 85,
          pieces: 4,
          chambres: null,
          prix: null,
          description: null,
        },
        mandat: {
          type: "exclusif",
          categorie: "Vente",
          prix: 450000,
          montantLoyer: null,
          dateSignature: null,
        },
      }),
      empty,
    )
    expect(actions.map((a) => [a.entity, a.op])).toEqual([
      ["contact", "create"],
      ["bien", "create"],
      ["mandat", "create"],
    ])
    expect(actions[1].fields.find((f) => f.key === "prix")?.proposed).toBe("450000")
  })

  it("propose l'origine sur la fiche prospect, même sans critères de recherche", () => {
    const actions = buildActions(
      extraction({ origine: { canal: "Prospection", precision: "Johan MILTON" } }),
      empty,
    )
    expect(actions[1]).toMatchObject({ entity: "prospectDetail", op: "create" })
    expect(actions[1].fields.map((f) => [f.key, f.proposed])).toEqual([
      ["origine", "Prospection"],
      ["originePrecise", "Johan MILTON"],
    ])
  })

  it("n'écrase pas par défaut l'origine déjà connue d'un contact", () => {
    const actions = buildActions(
      extraction({ origine: { canal: "Internet", precision: "Leboncoin" } }),
      { ...empty, prospectDetail: { origine: "Salon / Evenement", originePrecise: null } },
    )
    const fields = actions.find((a) => a.entity === "prospectDetail")!.fields
    expect(fields.map((f) => [f.key, f.selected])).toEqual([
      ["origine", false],
      ["originePrecise", true],
    ])
  })
})
