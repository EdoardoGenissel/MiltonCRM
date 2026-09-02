import { describe, expect, it } from "vitest"
import { buildHeaderIndex } from "./header-index"
import { mapImpayeRow } from "./mapping-impayes"

// En-tête réel de `data/liste impayés loyers.csv`.
const HEADER =
  "Colonne Selection;Nom Locataire;Ref. Lot;Date entrée;Date fin préavis;Solde;Niv;Date dernière relance;Niveau derniere relance;Ecart Niveau;Frais;Code GLI;Propriétaire;Procédure de relance;Type envoi".split(
    ";"
  )
const headerIndex = buildHeaderIndex(HEADER)

describe("mapImpayeRow", () => {
  it("mappe une ligne réelle", () => {
    const row =
      "True;KOMAL Einerika;SAGER;15/10/2023 00:00:00;;5108,8;4;06/07/2026 17:50:42;4;False;0;GLImp;SAGNE Eric;Relance Standard;EMail".split(
        ";"
      )
    expect(mapImpayeRow(headerIndex, row)).toEqual({
      refLot: "SAGER",
      locataireLabel: "KOMAL Einerika",
      proprietaireLabel: "SAGNE Eric",
      dateEntree: "15/10/2023 00:00:00",
      dateFinPreavis: undefined,
      solde: "5108,8",
      niveau: "4",
      dateDerniereRelance: "06/07/2026 17:50:42",
      niveauDerniereRelance: "4",
      ecartNiveau: "False",
      frais: "0",
      codeGli: "GLImp",
      procedureRelance: "Relance Standard",
      typeEnvoi: "EMail",
    })
  })

  it("renvoie null sans Ref. Lot", () => {
    const row = "True;KOMAL Einerika;;15/10/2023 00:00:00;;5108,8".split(";")
    expect(mapImpayeRow(headerIndex, row)).toBeNull()
  })
})
