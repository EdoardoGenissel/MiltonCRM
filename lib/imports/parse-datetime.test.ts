import { describe, expect, it } from "vitest"
import { parseApimoDateTime, parseFrDateTime } from "./parse-datetime"

describe("parseApimoDateTime", () => {
  it("parses a date with time", () => {
    expect(parseApimoDateTime("2023-08-03 22:46:34")?.toISOString()).toBe(
      "2023-08-03T22:46:34.000Z",
    )
  })

  it("parses a date-only value", () => {
    expect(parseApimoDateTime("2023-03-02")?.toISOString()).toBe("2023-03-02T00:00:00.000Z")
  })

  it("returns undefined for empty or malformed values", () => {
    expect(parseApimoDateTime(undefined)).toBeUndefined()
    expect(parseApimoDateTime("")).toBeUndefined()
    expect(parseApimoDateTime("12/07/23")).toBeUndefined()
  })
})

describe("parseFrDateTime", () => {
  it("parses a fr date with time", () => {
    expect(parseFrDateTime("10/07/2026 16:30:07")?.toISOString()).toBe("2026-07-10T16:30:07.000Z")
  })

  it("parses a fr date with midnight time", () => {
    expect(parseFrDateTime("01/06/2024 00:00:00")?.toISOString()).toBe("2024-06-01T00:00:00.000Z")
  })

  it("parses a date-only fr value", () => {
    expect(parseFrDateTime("18/07/2025")?.toISOString()).toBe("2025-07-18T00:00:00.000Z")
  })

  it("returns undefined for empty or malformed values", () => {
    expect(parseFrDateTime(undefined)).toBeUndefined()
    expect(parseFrDateTime("")).toBeUndefined()
    expect(parseFrDateTime("2025-07-18")).toBeUndefined()
  })
})
