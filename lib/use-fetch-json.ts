"use client"

import { useCallback, useEffect, useState } from "react"

// Fetch client minimal partagé par les drawers d'entité (cf.
// components/entity-drawers/*) - pas de librairie de data-fetching dans le
// projet, un hook simple suffit pour un panneau qui charge une seule fiche.
export function useFetchJson<T>(url: string | null) {
  const [data, setData] = useState<T | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  // Incrémenté par `reload` (ex. après une modification depuis le drawer).
  const [version, setVersion] = useState(0)

  useEffect(() => {
    if (!url) return
    let cancelled = false

    // Les resets sont différés dans un microtask (plutôt qu'appelés en tête de
    // l'effet) pour satisfaire react-hooks/set-state-in-effect - un setState
    // synchrone en tête d'effet est considéré comme un signe qu'on devrait
    // calculer l'état pendant le rendu, ce qui n'est pas possible ici (fetch).
    Promise.resolve().then(() => {
      if (cancelled) return
      setLoading(true)
      setError(null)
      setData(null)
    })

    fetch(url)
      .then(async (res) => {
        if (!res.ok) {
          const body = await res.json().catch(() => null)
          throw new Error(body?.error ?? "Erreur de chargement.")
        }
        return (await res.json()) as T
      })
      .then((json) => {
        if (!cancelled) setData(json)
      })
      .catch((err: Error) => {
        if (!cancelled) setError(err.message)
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })

    return () => {
      cancelled = true
    }
  }, [url, version])

  const reload = useCallback(() => setVersion((v) => v + 1), [])

  return { data, error, loading, reload }
}
