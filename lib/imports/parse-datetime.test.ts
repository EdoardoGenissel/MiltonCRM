import { describe, expect, it } from "vitest"
import { parseApimoDateTime } from "./parse-datetime"

describe("parseApimoDateTime", () => {
  it("parses a date with time", () => {
    expect(parseApimoDateTime("2023-08-03 22:46:34")?.toISOString()).toBe(
      "2023-08-03T22:46:34.000Z"
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
