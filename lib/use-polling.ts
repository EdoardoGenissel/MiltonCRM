"use client"

import { useEffect, useState } from "react"

// Interroge une route JSON à intervalle régulier (pas de WebSocket/SSE dans le
// projet, cohérent avec « pas de worker séparé pour ce volume »). Partagé par la
// cloche de notifications et le bandeau d'appel entrant. Un échec réseau est
// silencieux : on retentera au prochain tick.
export function usePolling<T>(url: string, intervalMs: number): { data: T | null } {
  const [data, setData] = useState<T | null>(null)

  useEffect(() => {
    let cancelled = false

    async function poll() {
      try {
        const res = await fetch(url)
        if (!res.ok) return
        const json = (await res.json()) as T
        if (!cancelled) setData(json)
      } catch {
        // ignoré volontairement — le dashboard ne doit pas casser sur un tick raté
      }
    }

    poll()
    const interval = setInterval(poll, intervalMs)
    return () => {
      cancelled = true
      clearInterval(interval)
    }
  }, [url, intervalMs])

  return { data }
}
