import { describe, expect, it } from "vitest"
import {
  clockLabel,
  dayKey,
  dayLabel,
  daySummary,
  ecartesLabel,
  groupByDay,
  treatedToday,
} from "./days"

// Cayenne est en UTC-3 toute l'année (pas d'heure d'été).
const now = new Date("2026-10-28T15:00:00Z") // mercredi 28 octobre, 12:00 à Cayenne

type Item = { id: string; statut: string; traiteLe: string | null; receivedAt: string }

function item(id: string, statut: string, at: string): Item {
  return statut === "ignoree"
    ? { id, statut, traiteLe: null, receivedAt: at }
    : { id, statut, traiteLe: at, receivedAt: "2026-10-01T12:00:00Z" }
}

describe("jours à l'heure de Cayenne", () => {
  it("un mail traité à 1 h UTC appartient à la veille à Cayenne", () => {
    expect(dayKey("2026-10-28T01:00:00Z")).toBe("2026-10-27")
    expect(dayKey("2026-10-28T03:00:00Z")).toBe("2026-10-28")
    expect(clockLabel("2026-10-28T13:05:00Z")).toBe("10:05")
  })

  it("libellés Aujourd'hui, Hier, puis le jour en toutes lettres", () => {
    expect(dayLabel("2026-10-28T14:00:00Z", now)).toBe("Aujourd'hui · mercredi 28 octobre")
    expect(dayLabel("2026-10-28T02:00:00Z", now)).toBe("Hier · mardi 27 octobre")
    expect(dayLabel("2026-10-25T14:00:00Z", now)).toBe("Dimanche 25 octobre")
    expect(dayLabel("2025-12-31T14:00:00Z", now)).toBe("Mercredi 31 décembre 2025")
  })
})

describe("groupByDay", () => {
  it("validés, écartés par l'équipe (ignorés, erreurs) et par l'analyse, du plus récent au plus ancien", () => {
    const days = groupByDay([
      item("v1", "validee", "2026-10-28T13:00:00Z"),
      item("v2", "validee", "2026-10-27T13:00:00Z"),
      item("e1", "ignoree", "2026-10-28T11:00:00Z"),
      item("e2", "ignoree", "2026-10-28T12:00:00Z"),
      item("r1", "rejetee", "2026-10-28T14:00:00Z"),
      item("x1", "erreur", "2026-10-28T15:00:00Z"),
    ])
    expect(days.map((d) => d.key)).toEqual(["2026-10-28", "2026-10-27"])
    expect(days[0].validees.map((s) => s.id)).toEqual(["v1"])
    expect(days[0].parEquipe.map((s) => s.id)).toEqual(["x1", "r1"])
    expect(days[0].parAnalyse.map((s) => s.id)).toEqual(["e2", "e1"])
  })

  it("traités aujourd'hui : vide si rien ce jour-là", () => {
    expect(treatedToday([item("v2", "validee", "2026-10-27T13:00:00Z")], now)).toEqual({
      key: "2026-10-28",
      validees: [],
      parEquipe: [],
      parAnalyse: [],
    })
  })
})

describe("daySummary", () => {
  it("compte validés et écartés (par l'équipe et par l'analyse), singulier ou pluriel", () => {
    const [day] = groupByDay([
      item("v1", "validee", "2026-10-28T13:00:00Z"),
      item("v2", "validee", "2026-10-28T14:00:00Z"),
      item("r1", "rejetee", "2026-10-28T15:00:00Z"),
      item("e1", "ignoree", "2026-10-28T11:00:00Z"),
    ])
    expect(daySummary(day)).toEqual({ validees: "2 validés", ecartes: "2 écartés" })
  })

  it("sans validé : Aucun mail validé", () => {
    const [day] = groupByDay([item("e1", "ignoree", "2026-10-28T11:00:00Z")])
    expect(daySummary(day)).toEqual({ validees: "Aucun mail validé", ecartes: "1 écarté" })
  })
})

describe("ecartesLabel", () => {
  it("détaille par l'équipe / par l'analyse et omet la partie à 0", () => {
    expect(ecartesLabel(1, 3)).toBe("4 écartés · 1 par l'équipe, 3 par l'analyse")
    expect(ecartesLabel(0, 3)).toBe("3 écartés par l'analyse")
    expect(ecartesLabel(1, 0)).toBe("1 écarté par l'équipe")
  })
})
