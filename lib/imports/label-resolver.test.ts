import { describe, expect, it } from "vitest"
import { buildContactLabelIndex, resolveContactByLabel } from "./label-resolver"

const contacts = [
  { id: "c1", nom: "SAGNE", prenom: "Eric" },
  { id: "c2", nom: "ROMNEY", prenom: "Kévin" },
  { id: "c3", nom: "GENDARMERIE NATIONALE", prenom: "" },
  { id: "d1", nom: "MARTIN", prenom: "Paul" },
  { id: "d2", nom: "MARTIN", prenom: "Paul" }, // homonyme -> ambigu
]

describe("resolveContactByLabel", () => {
  const index = buildContactLabelIndex(contacts)

  it("matche une personne physique quel que soit l'ordre nom/prénom", () => {
    expect(resolveContactByLabel(index, "SAGNE Eric")).toBe("c1")
    expect(resolveContactByLabel(index, "Eric SAGNE")).toBe("c1")
  })

  it("ignore les accents et la casse", () => {
    expect(resolveContactByLabel(index, "romney kevin")).toBe("c2")
  })

  it("matche une personne morale sur le nom seul", () => {
    expect(resolveContactByLabel(index, "GENDARMERIE NATIONALE")).toBe("c3")
  })

  it("renvoie null si le libellé est ambigu (homonymes)", () => {
    expect(resolveContactByLabel(index, "MARTIN Paul")).toBeNull()
  })

  it("renvoie null si aucun match ou libellé vide", () => {
    expect(resolveContactByLabel(index, "INCONNU Machin")).toBeNull()
    expect(resolveContactByLabel(index, undefined)).toBeNull()
    expect(resolveContactByLabel(index, "  ")).toBeNull()
  })

  it("ne matche pas une personne physique sur le nom seul", () => {
    expect(resolveContactByLabel(index, "SAGNE")).toBeNull()
  })
})
