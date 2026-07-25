import { describe, expect, it } from "vitest"
import {
  normalizePhone,
  resolveContactMatch,
  resolveContactByIdentity,
  type ContactMatchCandidate,
  type IdentityMatchCandidate,
} from "./dedupe"

function candidate(overrides: Partial<ContactMatchCandidate> = {}): ContactMatchCandidate {
  return {
    id: "c1",
    source: "APIMO",
    sourceRef: "apimo-42",
    nom: "Dupont",
    prenom: "Marie",
    telephone: "06 12 34 56 78",
    ...overrides,
  }
}

describe("normalizePhone", () => {
  it("supprime espaces/points/tirets", () => {
    expect(normalizePhone("06 12 34 56 78")).toBe("0612345678")
    expect(normalizePhone("06.12.34.56.78")).toBe("0612345678")
    expect(normalizePhone("06-12-34-56-78")).toBe("0612345678")
  })

  it("normalise l'indicatif +33/0033 vers 0", () => {
    expect(normalizePhone("+33612345678")).toBe("0612345678")
    expect(normalizePhone("0033612345678")).toBe("0612345678")
  })
})

describe("resolveContactMatch", () => {
  it("priorité 1 : même source + même sourceRef", () => {
    const candidates = [candidate()]
    const matchId = resolveContactMatch(candidates, {
      source: "APIMO",
      sourceRef: "apimo-42",
      nom: "Autre nom", // même sourceRef, nom différent → doit quand même matcher
      prenom: "Autre prénom",
    })
    expect(matchId).toBe("c1")
  })

  it("le sourceRef n'est comparé qu'au sein de la même source (priorité 1)", () => {
    const candidates = [candidate({ source: "APIMO", sourceRef: "42" })]
    const matchId = resolveContactMatch(candidates, {
      source: "SEPTEO",
      sourceRef: "42",
      nom: "Homonyme",
      prenom: "Sans lien",
    })
    // Pas de match priorité 1 (source différente) ; le fallback nom+prénom ne
    // matche pas non plus ici puisque l'identité diffère aussi.
    expect(matchId).toBeNull()
  })

  it("le fallback identité ne filtre pas par source — les candidats doivent déjà être pré-filtrés par l'appelant (cf. loadCandidates)", () => {
    const candidates = [candidate({ source: "APIMO", sourceRef: "42" })]
    const matchId = resolveContactMatch(candidates, {
      source: "SEPTEO",
      sourceRef: "99",
      nom: "Dupont",
      prenom: "Marie",
    })
    expect(matchId).toBe("c1")
  })

  it("fallback nom+prénom+téléphone quand pas de sourceRef", () => {
    const candidates = [candidate({ sourceRef: null })]
    const matchId = resolveContactMatch(candidates, {
      source: "APIMO",
      nom: "dupont",
      prenom: "marie",
      telephone: "0612345678",
    })
    expect(matchId).toBe("c1")
  })

  it("fallback ne matche pas si le téléphone diffère", () => {
    const candidates = [candidate({ sourceRef: null })]
    const matchId = resolveContactMatch(candidates, {
      source: "APIMO",
      nom: "Dupont",
      prenom: "Marie",
      telephone: "0699999999",
    })
    expect(matchId).toBeNull()
  })

  it("fallback ne matche pas sur un nom seul si un homonyme a un téléphone différent", () => {
    const candidates = [candidate({ sourceRef: null, telephone: null })]
    const matchId = resolveContactMatch(candidates, {
      source: "APIMO",
      nom: "Dupont",
      prenom: "Marie",
      telephone: "0612345678",
    })
    expect(matchId).toBeNull()
  })

  it("retourne null si aucun candidat ne correspond", () => {
    const matchId = resolveContactMatch([candidate()], {
      source: "APIMO",
      nom: "Inconnu",
      prenom: "Personne",
    })
    expect(matchId).toBeNull()
  })
})

function identityCandidate(overrides: Partial<IdentityMatchCandidate> = {}): IdentityMatchCandidate {
  return {
    id: "c1",
    email: "marie.dupont@example.com",
    telephone: "06 12 34 56 78",
    nom: "Dupont",
    prenom: "Marie",
    ...overrides,
  }
}

describe("resolveContactByIdentity", () => {
  it("priorité 1 : email (insensible à la casse)", () => {
    const matchId = resolveContactByIdentity([identityCandidate()], {
      email: "Marie.Dupont@EXAMPLE.com",
      nom: "Nom tronqué différent",
    })
    expect(matchId).toBe("c1")
  })

  it("priorité 2 : téléphone si pas d'email fourni ou pas de match email", () => {
    const matchId = resolveContactByIdentity([identityCandidate()], {
      telephone: "0612345678",
    })
    expect(matchId).toBe("c1")
  })

  it("priorité 3 : nom + prénom si ni email ni téléphone ne matchent", () => {
    const matchId = resolveContactByIdentity([identityCandidate({ email: null, telephone: null })], {
      nom: "Dupont",
      prenom: "Marie",
    })
    expect(matchId).toBe("c1")
  })

  it("ne matche pas sur le nom seul (sans prénom) — trop peu fiable", () => {
    const matchId = resolveContactByIdentity([identityCandidate({ email: null, telephone: null })], {
      nom: "Dupont",
    })
    expect(matchId).toBeNull()
  })

  it("retourne null si aucun candidat ne correspond", () => {
    const matchId = resolveContactByIdentity([identityCandidate()], {
      email: "inconnu@example.com",
      telephone: "0700000000",
      nom: "Inconnu",
      prenom: "Personne",
    })
    expect(matchId).toBeNull()
  })
})
