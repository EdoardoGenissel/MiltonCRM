"use client"

import { useRouter } from "next/navigation"
import { useState } from "react"
import { RefreshCw } from "lucide-react"
import { Button } from "@/components/ui/button"

// Lance une synchro Apimo immédiate (en plus du cron quotidien). La synchro
// tourne en arrière-plan sur Netlify (plusieurs minutes) : la route rend la main
// tout de suite, le résultat apparaît ensuite dans l'historique des imports.
export function ApimoSyncButton() {
  const router = useRouter()
  const [pending, setPending] = useState(false)
  const [message, setMessage] = useState<string | null>(null)

  async function run() {
    setPending(true)
    setMessage(null)
    try {
      const res = await fetch("/api/apimo/sync", { method: "POST" })
      if (res.ok) {
        setMessage("Synchro lancée - résultat dans l'historique d'ici quelques minutes.")
      } else {
        const data = await res.json().catch(() => ({}))
        setMessage(`Erreur : ${data.error ?? "synchro non lancée."}`)
      }
      router.refresh()
    } catch {
      setMessage("Erreur réseau.")
    } finally {
      setPending(false)
    }
  }

  return (
    <div className="flex flex-col items-end gap-1.5">
      <Button onClick={run} disabled={pending}>
        <RefreshCw className={pending ? "animate-spin" : undefined} />
        Synchroniser maintenant
      </Button>
      {message && <span className="text-xs text-muted-foreground">{message}</span>}
    </div>
  )
}
