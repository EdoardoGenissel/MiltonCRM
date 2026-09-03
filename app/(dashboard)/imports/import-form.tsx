"use client"

import { useRouter } from "next/navigation"
import { useState } from "react"
import { Button } from "@/components/ui/button"
import type { ImportResult } from "@/lib/imports/run-import"

type StreamEvent =
  { type: "progress"; processed: number; total: number } | { type: "done"; result: ImportResult }

type ImportState =
  | { phase: "idle" }
  | { phase: "running"; processed: number; total: number }
  | { phase: "done"; result: ImportResult }

export function ImportForm() {
  const router = useRouter()
  const [state, setState] = useState<ImportState>({ phase: "idle" })

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    const form = e.currentTarget
    const formData = new FormData(form)
    setState({ phase: "running", processed: 0, total: 0 })

    const res = await fetch("/api/imports", { method: "POST", body: formData })
    if (!res.ok || !res.body) {
      const data = await res.json().catch(() => ({}))
      setState({
        phase: "done",
        result: { status: "error", recordsUpserted: 0, duplicatesFound: 0, error: data.error },
      })
      return
    }

    // Réponse NDJSON streamée (cf. app/api/imports/route.ts) : une ligne JSON par
    // événement de progression, terminée par un événement "done". On bufferise
    // les chunks reçus car une ligne peut être coupée en deux morceaux réseau.
    const reader = res.body.getReader()
    const decoder = new TextDecoder()
    let buffer = ""

    while (true) {
      const { value, done } = await reader.read()
      if (done) break

      buffer += decoder.decode(value, { stream: true })
      const lines = buffer.split("\n")
      buffer = lines.pop() ?? ""

      for (const line of lines) {
        if (!line.trim()) continue
        const event: StreamEvent = JSON.parse(line)
        if (event.type === "progress") {
          setState({ phase: "running", processed: event.processed, total: event.total })
        } else {
          setState({ phase: "done", result: event.result })
        }
      }
    }

    form.reset()
    router.refresh()
  }

  const pending = state.phase === "running"
  const pct =
    state.phase === "running" && state.total > 0
      ? Math.round((state.processed / state.total) * 100)
      : state.phase === "done"
        ? 100
        : 0
  const isError = state.phase === "done" && state.result.status === "error"

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-4">
      <div className="flex flex-col gap-1.5">
        <label htmlFor="kind" className="text-sm font-medium text-foreground">
          Type d&apos;export
        </label>
        <select
          id="kind"
          name="kind"
          required
          disabled={pending}
          className="h-10 rounded-[8px] border border-input bg-background px-3 text-sm outline-none focus-visible:border-ring disabled:opacity-50"
        >
          <option value="apimo_prospects">Apimo - prospects (.xlsx)</option>
          <option value="apimo_biens">Apimo - biens et mandats (.xlsx)</option>
          <option value="septeo_contacts">Septéo - propriétaires ou locataires (.csv)</option>
          <option value="septeo_biens">Septéo - biens et mandats (.csv)</option>
          <option value="septeo_impayes">Septéo - impayés de loyer (.csv)</option>
          <option value="septeo_incidents">Septéo - incidents (.csv)</option>
          <option value="septeo_loyers_appeles">Septéo - loyers appelés (.csv)</option>
        </select>
        <p className="text-xs text-muted-foreground">
          Les imports impayés / incidents / loyers appelés se rattachent aux biens et contacts
          existants : importer d&apos;abord « Septéo - biens et mandats » et les contacts.
        </p>
      </div>

      <div className="flex flex-col gap-1.5">
        <label htmlFor="file" className="text-sm font-medium text-foreground">
          Fichier
        </label>
        <input
          id="file"
          name="file"
          type="file"
          accept=".xlsx,.xls,.csv"
          required
          disabled={pending}
          className="text-sm text-foreground file:mr-3 file:rounded-[8px] file:border-0 file:bg-secondary file:px-3 file:py-1.5 file:text-sm file:font-medium file:text-secondary-foreground disabled:opacity-50"
        />
      </div>

      <Button type="submit" disabled={pending} className="w-fit">
        {pending ? "Import en cours…" : "Importer"}
      </Button>

      {state.phase !== "idle" && (
        <div className="flex flex-col gap-1.5">
          <div className="h-2 w-full overflow-hidden rounded-full bg-muted">
            <div
              className={`h-full rounded-full transition-[width] duration-200 ease-out ${
                isError ? "bg-danger" : "bg-primary"
              }`}
              style={{ width: `${pct}%` }}
            />
          </div>
          <p className={`text-xs ${isError ? "text-danger" : "text-muted-foreground"}`}>
            {state.phase === "running"
              ? state.total > 0
                ? `${pct}% - ${state.processed}/${state.total} ligne(s)`
                : "Lecture du fichier…"
              : state.result.status === "success"
                ? `100% - ${state.result.recordsUpserted} fiche(s) traitée(s), ${state.result.duplicatesFound} doublon(s) mis à jour.`
                : `Erreur : ${state.result.error ?? "import échoué."}`}
          </p>
        </div>
      )}
    </form>
  )
}
