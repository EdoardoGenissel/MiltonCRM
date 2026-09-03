import { describe, expect, it } from "vitest"
import { buildHeaderIndex } from "./header-index"
import { mapLoyerAppeleRow } from "./mapping-loyers-appeles"

// En-tête réel de `data/liste loyer appelé.csv` (avec BOM sur la 1ère colonne).
const HEADER =
  "﻿Numéro folio;Numéro pièce;Date écriture;Compte;Libellé compte;Auxiliaire;Libellé auxiliaire;Libellé écriture;Débit;Crédit;Société;Agence;Groupe de travail;Gestionnaire;Catégorie;Type;Surface".split(
    ";",
  )
const headerIndex = buildHeaderIndex(HEADER)

describe("mapLoyerAppeleRow", () => {
  it("mappe une ligne réelle (BOM neutralisé sur l'en-tête)", () => {
    const row =
      "11;6;28/02/2025;41120200;Locataires;L000307;JAMIN & DAUBY Gabriel & Nadia;Locataires;42,86;0,00;MILTON IMMOBILIER;;;WERCAUTRIN Taraïna;Maison individuelle;3 Pièces;0,00".split(
        ";",
      )
    expect(mapLoyerAppeleRow(headerIndex, row)).toEqual({
      numeroFolio: "11",
      numeroPiece: "6",
      dateEcriture: "28/02/2025",
      auxiliaire: "L000307",
      locataireLabel: "JAMIN & DAUBY Gabriel & Nadia",
      libelleEcriture: "Locataires",
      debit: "42,86",
      credit: "0,00",
      societe: "MILTON IMMOBILIER",
      gestionnaire: "WERCAUTRIN Taraïna",
      categorieLot: "Maison individuelle",
      typeLot: "3 Pièces",
    })
  })

  it("renvoie null sur une ligne sans folio ni pièce", () => {
    expect(mapLoyerAppeleRow(headerIndex, [";;;;".split(";")].flat())).toBeNull()
  })
})
