import { describe, expect, it } from "vitest"
import { buildEstimationLeadPayload } from "./leads"

describe("buildEstimationLeadPayload", () => {
  it("mappe contact + bien vers un payload Lead Apimo valide", () => {
    const payload = buildEstimationLeadPayload({
      jotformSubmissionId: "6613360133127517253",
      contact: { prenom: "Mélanie", nom: "COLLOMBON", email: "collombon@orange.fr", telephone: "0642952044" },
      bien: { adresse: "12 rue Gambetta", commune: "Nice", codePostal: "06000" },
    })

    expect(payload).toMatchObject({
      reference: "6613360133127517253",
      type: "6",
      referral: "19",
      firstname: "Mélanie",
      lastname: "COLLOMBON",
      email: "collombon@orange.fr",
      phone: "0642952044",
      property_address: "12 rue Gambetta",
      property_city: "Nice",
      property_zipcode: "06000",
      property_country: "FR",
      property_category: 1,
    })
  })

  it("omet les champs bien quand aucune adresse n'a été saisie", () => {
    const payload = buildEstimationLeadPayload({
      jotformSubmissionId: "abc",
      contact: { prenom: "Jean", nom: "Dupont", email: null, telephone: null },
      bien: null,
    })

    expect(payload.property_address).toBeUndefined()
    expect(payload.property_city).toBeUndefined()
    expect(payload.email).toBeUndefined()
    expect(payload.phone).toBeUndefined()
  })
})
