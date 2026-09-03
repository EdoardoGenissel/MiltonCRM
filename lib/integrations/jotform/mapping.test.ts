import { describe, expect, it } from "vitest"
import { extractAllAnswers, mapEstimationSubmission } from "./mapping"
import type { JotformSubmission } from "./api-client"

// Fixture calquée sur une vraie soumission du formulaire "ESTIMATION IMMOBILIERE"
// (récupérée via GET /form/{id}/submissions), simplifiée aux questions
// pertinentes pour ne pas alourdir le test.
function submission(overrides: Partial<JotformSubmission["answers"]> = {}): JotformSubmission {
  return {
    id: "6613360133127517253",
    form_id: "240225221809044",
    created_at: "2026-07-31 15:40:13",
    status: "ACTIVE",
    answers: {
      "1": { name: "heading", text: "ESTIMATION IMMOBILIERE", type: "control_head" },
      "9": {
        name: "typeDe",
        text: "Type de bien",
        type: "control_checkbox",
        answer: ["MAISON"],
        prettyFormat: "MAISON",
      },
      "13": {
        name: "nom",
        text: "Nom",
        type: "control_fullname",
        answer: { first: "Mélanie", last: "COLLOMBON" },
        prettyFormat: "Mélanie COLLOMBON",
      },
      "14": { name: "email", text: "Email", type: "control_email", answer: "collombon@orange.fr" },
      "15": {
        name: "numeroDe",
        text: "Numéro de téléphone",
        type: "control_phone",
        answer: { full: "0642-95-20-44" },
        prettyFormat: "0642-95-20-44",
      },
      "16": {
        name: "adresseDu",
        text: "Adresse du bien ",
        type: "control_address",
        answer: {
          addr_line1: "17 rue des Pluviers",
          addr_line2: "",
          city: "Rémire-Montjoly",
          postal: "97354",
        },
      },
      "45": { name: "nombreDe", text: "Nombre de pièce", type: "control_dropdown", answer: "4" },
      "66": { name: "taxeFonciere", text: "Taxe foncière", type: "control_number", answer: "1575" },
      "11": { name: "sautDe", text: "Saut de page", type: "control_pagebreak" },
      "2": { name: "submit2", text: "Soumission", type: "control_button" },
      ...overrides,
    },
  }
}

describe("mapEstimationSubmission", () => {
  it("mappe contact et bien depuis les réponses JotForm", () => {
    const mapped = mapEstimationSubmission(submission())

    expect(mapped.submissionId).toBe("6613360133127517253")
    expect(mapped.contact).toEqual({
      prenom: "Mélanie",
      nom: "COLLOMBON",
      email: "collombon@orange.fr",
      telephone: "0642-95-20-44",
      commune: "Rémire-Montjoly",
    })
    expect(mapped.bien).toEqual({
      adresse: "17 rue des Pluviers",
      commune: "Rémire-Montjoly",
      codePostal: "97354",
      typeBien: "MAISON",
      pieces: 4,
      surfaceTerrain: null,
      referenceCadastrale: null,
      taxeFonciere: 1575,
      chargesCopropriete: null,
      copropriete: null,
      assainissement: null,
      cuisineEquipements: [],
      equipements: [],
      pointsPositifs: null,
      pointsNegatifs: null,
      disponibilite: null,
    })
  })

  it("parse les champs complémentaires du bien (surface, copropriété, équipements, points +/-)", () => {
    const mapped = mapEstimationSubmission(
      submission({
        "83": {
          name: "surfaceDu",
          text: "Surface du terrain",
          type: "control_textbox",
          answer: "138m²",
        },
        "68": {
          name: "copropriete",
          text: "Copropriété",
          type: "control_checkbox",
          answer: ["Non"],
          prettyFormat: "Non",
        },
        "62": {
          name: "assainissement",
          text: "Assainissement  :",
          type: "control_checkbox",
          answer: ["Tout-à-l'égout"],
          prettyFormat: "Tout-à-l'égout",
        },
        "58": {
          name: "cuisine",
          text: "Cuisine :",
          type: "control_checkbox",
          answer: ["Aménagée", "Équipée"],
          prettyFormat: "Aménagée; Équipée",
        },
        "61": {
          name: "equipements61",
          text: "Équipements  :",
          type: "control_checkbox",
          answer: ["Piscine", "Climatisation"],
          prettyFormat: "Piscine; Climatisation",
        },
        "50": {
          name: "saisissezUne50",
          text: "+ Points positifs :",
          type: "control_widget",
          answer: "Secteur apprécié",
        },
        "51": {
          name: "Points",
          text: "- Points négatifs :",
          type: "control_widget",
          answer: "Cuisine à moderniser",
        },
      }),
    )

    expect(mapped.bien).toMatchObject({
      surfaceTerrain: 138,
      copropriete: false,
      assainissement: "Tout-à-l'égout",
      cuisineEquipements: ["Aménagée", "Équipée"],
      equipements: ["Piscine", "Climatisation"],
      pointsPositifs: "Secteur apprécié",
      pointsNegatifs: "Cuisine à moderniser",
    })
  })

  it("ne retient pas de bien si l'adresse est absente", () => {
    const raw = submission()
    delete raw.answers["16"]
    const mapped = mapEstimationSubmission(raw)
    expect(mapped.bien).toBeNull()
  })
})

describe("extractAllAnswers", () => {
  it("conserve toutes les réponses hors titres/sauts de page/bouton", () => {
    const answers = extractAllAnswers(submission())

    expect(answers).toMatchObject({
      "Type de bien": "MAISON",
      Nom: "Mélanie COLLOMBON",
      Email: "collombon@orange.fr",
      "Numéro de téléphone": "0642-95-20-44",
      "Nombre de pièce": "4",
      "Taxe foncière": "1575",
    })
    expect(answers).not.toHaveProperty("ESTIMATION IMMOBILIERE")
    expect(answers).not.toHaveProperty("Soumission")
  })
})
