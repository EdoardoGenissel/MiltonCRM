import { describe, expect, it } from "vitest"
import { parseFrDate } from "./parse-date"

describe("parseFrDate", () => {
  it("parses jj/mm/aa dates as UTC", () => {
    const date = parseFrDate("12/07/23")
    expect(date?.toISOString()).toBe("2023-07-12T00:00:00.000Z")
  })

  it("returns undefined for empty or malformed values", () => {
    expect(parseFrDate(undefined)).toBeUndefined()
    expect(parseFrDate("")).toBeUndefined()
    expect(parseFrDate("not a date")).toBeUndefined()
  })
})
