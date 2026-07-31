"use client"

import { useEffect, useState } from "react"
import { Phone, X } from "lucide-react"
import { useEntityDrawers } from "@/components/entity-drawers/entity-drawer-provider"

type ActiveCall = {
  id: string
  phoneNumber: string
  callerName: string | null
  matchedContact: { id: string; prenom: string; nom: string } | null
} | null

const POLL_INTERVAL_MS = 5000

// Bandeau "Appel en cours" — cf. scope.md : "à l'appel entrant, détecter
// automatiquement le contact dans le CRM". Le webhook Ringover
// (app/api/ringover/webhook) fait le matching et écrit le CallLog ; ce composant
// se contente d'interroger /api/calls/active à intervalle régulier (pas de
// WebSocket/SSE, cohérent avec "pas de worker séparé pour ce volume").
export function IncomingCallBanner() {
  const [call, setCall] = useState<ActiveCall>(null)
  const [dismissedId, setDismissedId] = useState<string | null>(null)
  const { openContact } = useEntityDrawers()

  useEffect(() => {
    let cancelled = false

    async function poll() {
      try {
        const res = await fetch("/api/calls/active")
        if (!res.ok) return
        const data: { call: ActiveCall } = await res.json()
        if (!cancelled) setCall(data.call)
      } catch {
        // Un échec de polling ne doit pas casser le dashboard — on retentera au
        // prochain intervalle.
      }
    }

    poll()
    const interval = setInterval(poll, POLL_INTERVAL_MS)
    return () => {
      cancelled = true
      clearInterval(interval)
    }
  }, [])

  if (!call || call.id === dismissedId) return null

  const label = call.matchedContact
    ? `${call.matchedContact.prenom} ${call.matchedContact.nom}`
    : call.callerName || call.phoneNumber

  return (
    <div className="flex items-center justify-between gap-4 border-b border-border bg-primary/10 px-6 py-3">
      <div className="flex items-center gap-2.5 text-sm">
        <Phone className="h-4 w-4 text-primary" />
        <span className="font-medium text-foreground">Appel en cours - {label}</span>
        {!call.matchedContact && (
          <span className="text-muted-foreground">(contact inconnu, {call.phoneNumber})</span>
        )}
      </div>

      <div className="flex items-center gap-4">
        {call.matchedContact && (
          <button
            type="button"
            onClick={() => openContact(call.matchedContact!.id)}
            className="text-sm font-medium text-primary hover:underline"
          >
            Voir sa fiche contact
          </button>
        )}
        <button
          type="button"
          onClick={() => setDismissedId(call.id)}
          aria-label="Masquer le bandeau"
          className="text-muted-foreground hover:text-foreground"
        >
          <X className="h-4 w-4" />
        </button>
      </div>
    </div>
  )
}
