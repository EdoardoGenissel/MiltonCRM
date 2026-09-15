import { describe, expect, it } from "vitest"
import { parseTabularBuffer } from "./excel-parser"

function csv(text: string) {
  return parseTabularBuffer(new TextEncoder().encode(text).buffer as ArrayBuffer, "x.csv")
}

describe("parseTabularBuffer - CSV", () => {
  it("parse un CSV point-virgule non quoté (forme Septéo)", async () => {
    const { headerRow, rows } = await csv(
      "Nom;Prénom;Ville;;Email\r\nDUPONT;Jean;Cayenne;;jean@ex.fr\r\nSCI MAHURY;;;;\r\n",
    )
    expect(headerRow).toEqual(["Nom", "Prénom", "Ville", "", "Email"])
    expect(rows).toEqual([
      ["DUPONT", "Jean", "Cayenne", "", "jean@ex.fr"],
      ["SCI MAHURY", "", "", "", ""],
    ])
  })

  it("gère les champs quotés, séparateurs et retours-ligne embarqués, guillemets échappés", async () => {
    const { headerRow, rows } = await csv(
      '"Tiers";"Objet / Libellé";"Référence"\r\n' +
        '"MILTON Johan";"Honoraires; et divers";"340"\r\n' +
        '"";"Bonjour\r\nC\'est l\'agence ""Milton""";"1291"\r\n',
    )
    expect(headerRow).toEqual(["Tiers", "Objet / Libellé", "Référence"])
    expect(rows).toEqual([
      ["MILTON Johan", "Honoraires; et divers", "340"],
      ["", "Bonjour\nC'est l'agence \"Milton\"", "1291"],
    ])
  })

  it("retire le BOM en tête de fichier", async () => {
    const { headerRow } = await csv("﻿Numéro folio;Numéro pièce\r\n1;6\r\n")
    expect(headerRow[0]).toBe("Numéro folio")
  })

  it("détecte le séparateur virgule", async () => {
    const { rows } = await csv("a,b,c\n1,2,3\n")
    expect(rows).toEqual([["1", "2", "3"]])
  })
})
