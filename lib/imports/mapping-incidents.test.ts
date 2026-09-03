import { describe, expect, it } from "vitest"
import { buildHeaderIndex } from "./header-index"
import { mapIncidentRow } from "./mapping-incidents"

const HEADER = [
  "Tiers",
  "Objet / Libellé",
  "Créé le",
  "Responsable",
  "État de l'événement",
  "Dernière Etape",
  "Référence",
]
const headerIndex = buildHeaderIndex(HEADER)

describe("mapIncidentRow", () => {
  it("mappe une ligne réelle", () => {
    const row = [
      "IZARRA",
      "Entretien climatisation ",
      "19/06/2025",
      "WERCAUTRIN Taraïna",
      "Cloture",
      "Suivi de travaux",
      "651",
    ]
    expect(mapIncidentRow(headerIndex, row)).toEqual({
      sourceRef: "651",
      tiersLabel: "IZARRA",
      objet: "Entretien climatisation",
      creeLe: "19/06/2025",
      responsable: "WERCAUTRIN Taraïna",
      etat: "Cloture",
      derniereEtape: "Suivi de travaux",
    })
  })

  it("garde la ligne même sans Tiers, préserve les retours-ligne de l'objet", () => {
    const row = [
      "",
      "Bonjour\nC'est l'agence Milton Immobilier ",
      "13/10/2025",
      "WERCAUTRIN Taraïna",
      "Cloture",
      "",
      "1291",
    ]
    const mapped = mapIncidentRow(headerIndex, row)
    expect(mapped?.tiersLabel).toBeUndefined()
    expect(mapped?.objet).toBe("Bonjour\nC'est l'agence Milton Immobilier")
    expect(mapped?.sourceRef).toBe("1291")
  })

  it("renvoie null sans Référence", () => {
    expect(mapIncidentRow(headerIndex, ["IZARRA", "x", "19/06/2025", "", "", "", ""])).toBeNull()
  })
})
