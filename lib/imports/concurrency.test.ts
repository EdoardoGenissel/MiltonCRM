import { describe, expect, it } from "vitest"
import { mapWithConcurrency } from "./concurrency"

describe("mapWithConcurrency", () => {
  it("traite tous les items", async () => {
    const results: number[] = []
    await mapWithConcurrency([1, 2, 3, 4, 5], 2, async (item) => {
      results.push(item)
    })
    expect(results.sort((a, b) => a - b)).toEqual([1, 2, 3, 4, 5])
  })

  it("ne dépasse jamais la limite de concurrence", async () => {
    let inFlight = 0
    let maxInFlight = 0

    await mapWithConcurrency(
      Array.from({ length: 20 }, (_, i) => i),
      3,
      async () => {
        inFlight++
        maxInFlight = Math.max(maxInFlight, inFlight)
        await new Promise((resolve) => setTimeout(resolve, 5))
        inFlight--
      },
    )

    expect(maxInFlight).toBeLessThanOrEqual(3)
  })

  it("fonctionne avec une limite supérieure au nombre d'items", async () => {
    const results: number[] = []
    await mapWithConcurrency([1, 2], 10, async (item) => {
      results.push(item)
    })
    expect(results).toHaveLength(2)
  })

  it("tableau vide -> ne fait rien", async () => {
    let called = false
    await mapWithConcurrency([], 5, async () => {
      called = true
    })
    expect(called).toBe(false)
  })
})
