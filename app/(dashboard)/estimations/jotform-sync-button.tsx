"use client"

import { useRouter } from "next/navigation"
import { useState } from "react"
import { Button } from "@/components/ui/button"
import type { JotformSyncResult } from "@/lib/integrations/jotform/sync"

type SyncState = { phase: "idle" } | { phase: "running" } | { phase: "done"; result: JotformSyncResult }

export function JotformSyncButton() {
  const router = useRouter()
  const [state, setState] = useState<SyncState>({ phase: "idle" })

  async function handleClick() {
    setState({ phase: "running" })
    const res = await fetch("/api/jotform/sync", { method: "POST" })
    const result: JotformSyncResult = await res.json().catch(() => ({
      status: "error",
      total: 0,
      created: 0,
      updated: 0,
      error: "Réponse invalide.",
    }))
    setState({ phase: "done", result })
    router.refresh()
  }

  const pending = state.phase === "running"

  return (
    <div className="flex flex-col items-end gap-1.5">
      <Button variant="outline" size="sm" onClick={handleClick} disabled={pending}>
        {pending ? "Synchronisation…" : "Synchroniser JotForm"}
      </Button>
      {state.phase === "done" && (
        <p
          className={`text-xs ${state.result.status === "error" ? "text-danger" : "text-muted-foreground"}`}
        >
          {state.result.status === "success"
            ? `${state.result.total} soumission(s) — ${state.result.created} créée(s), ${state.result.updated} mise(s) à jour.`
            : `Erreur : ${state.result.error ?? "sync échoué."}`}
        </p>
      )}
    </div>
  )
}
