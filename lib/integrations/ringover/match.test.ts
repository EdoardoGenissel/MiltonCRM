import { describe, expect, it } from "vitest"
import { matchContactByCall, type CallMatchCandidate } from "./match"

const marie: CallMatchCandidate = {
  id: "c1",
  nom: "Dupont",
  prenom: "Marie",
  telephone: "0612345678",
}
const jean: CallMatchCandidate = {
  id: "c2",
  nom: "Martin",
  prenom: "Jean",
  telephone: "0698765432",
}

describe("matchContactByCall", () => {
  it("matche sur le numéro de téléphone normalisé", () => {
    const id = matchContactByCall([marie, jean], { phoneNumber: "+33 6 12 34 56 78" })
    expect(id).toBe("c1")
  })

  it("retourne null si aucun contact ne partage ce numéro", () => {
    const id = matchContactByCall([marie, jean], { phoneNumber: "0600000000" })
    expect(id).toBeNull()
  })

  it("désambiguïse par le nom quand plusieurs contacts partagent le numéro", () => {
    const sameNumber: CallMatchCandidate = { ...jean, id: "c3", telephone: marie.telephone }
    const id = matchContactByCall([marie, sameNumber], {
      phoneNumber: marie.telephone!,
      callerName: "Jean Martin",
    })
    expect(id).toBe("c3")
  })

  it("retombe sur le premier candidat si le nom ne permet pas de trancher", () => {
    const sameNumber: CallMatchCandidate = { ...jean, id: "c3", telephone: marie.telephone }
    const id = matchContactByCall([marie, sameNumber], { phoneNumber: marie.telephone! })
    expect(id).toBe("c1")
  })
})
