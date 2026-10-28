"use client"

import { useRouter } from "next/navigation"
import { useState } from "react"
import { SidePanel } from "@/components/ui/side-panel"
import { Button } from "@/components/ui/button"
import { DrawerState } from "@/components/entity-drawers/drawer-state"
import { useFetchJson } from "@/lib/use-fetch-json"
import { dateTimeLabel } from "@/lib/format"
import type { ProposalEntity } from "@/lib/prospects-mail/fields"
import type { SuggestionDetail } from "@/lib/prospects-mail/details"
import { actionLabel, parseThread, senderName, STATUTS, StatutDot } from "./shared"

export type OpenEntity = (entity: ProposalEntity, id: string) => void

type Row = { key: string; label: string; before?: string | null; value: string | null }
type Block = { title: string; targetId: string | null; entity: ProposalEntity; rows: Row[] }

// Validé : ce qui a réellement été écrit (corrections manuelles comprises).
// Sinon : ce qui avait été proposé, avec la valeur qu'il aurait remplacée.
function blocks(detail: SuggestionDetail): Block[] {
  if (detail.statut === "validee" && detail.resultat?.applied) {
    return detail.resultat.applied.map((a) => ({
      title: actionLabel(a),
      entity: a.entity,
      targetId: a.targetId,
      rows: a.fields.map((f) => ({ key: f.key, label: f.label, value: f.value })),
    }))
  }
  return detail.actionsDetail.map((a) => ({
    title: actionLabel(a),
    entity: a.entity,
    targetId: detail.statut === "validee" ? a.targetId : null,
    rows: a.fields.map((f) => ({
      key: f.key,
      label: f.label,
      before: f.current,
      value: f.proposed,
    })),
  }))
}

function HistoryContent({
  detail,
  onOpenEntity,
  onReopened,
}: {
  detail: SuggestionDetail
  onOpenEntity: OpenEntity
  onReopened: () => void
}) {
  const router = useRouter()
  const [pending, setPending] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const messages = parseThread(detail.excerpt)
  const statut = STATUTS[detail.statut] ?? STATUTS.en_attente
  const by = detail.traitePar?.split("@")[0]

  async function reopen() {
    setPending(true)
    setError(null)
    const res = await fetch(`/api/prospects/${detail.id}`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ decision: "rouvrir" }),
    }).catch(() => null)
    setPending(false)
    if (!res?.ok) {
      setError("Ce mail n'a pas pu être remis à traiter. Réessayez dans un instant.")
      return
    }
    onReopened()
    router.refresh()
  }

  return (
    <div className="flex flex-col gap-8">
      <header className="flex flex-col gap-1">
        <h3 className="text-lg font-semibold tracking-tight text-foreground">
          {detail.displayName}
        </h3>
        {detail.subject && <p className="text-sm text-muted-foreground">{detail.subject}</p>}
        <p className="mt-2 flex items-center gap-2 text-sm text-foreground">
          <StatutDot statut={detail.statut} />
          {statut.label}
          {by && <span className="text-muted-foreground">par {by}</span>}
          {detail.traiteLe && (
            <span className="text-muted-foreground">· {dateTimeLabel(detail.traiteLe)}</span>
          )}
        </p>
      </header>

      {detail.error && (
        <p className="rounded-md border border-warning/30 bg-warning-bg px-4 py-3 text-sm text-warning-foreground">
          L&apos;analyse de ce mail a échoué : {detail.error}
        </p>
      )}

      {detail.resume && (
        <section>
          <h4 className="text-sm font-semibold text-foreground">Résumé</h4>
          <p className="mt-1.5 text-sm leading-relaxed text-foreground">{detail.resume}</p>
          {detail.origine && (
            <p className="mt-1.5 text-xs text-muted-foreground">Arrivé via {detail.origine}</p>
          )}
        </section>
      )}

      <section className="flex flex-col gap-4">
        <h4 className="text-sm font-semibold text-foreground">
          {detail.statut === "validee" ? "Enregistré dans le CRM" : "Proposé"}
        </h4>
        {blocks(detail).map((block, i) => (
          <div key={`${block.entity}-${i}`} className="rounded-md border border-border bg-card">
            <div className="flex items-center justify-between gap-3 border-b border-border px-4 py-2.5">
              <span className="text-sm font-medium text-foreground">{block.title}</span>
              {block.targetId && (
                <button
                  type="button"
                  onClick={() => onOpenEntity(block.entity, block.targetId!)}
                  className="text-xs font-medium text-primary hover:underline"
                >
                  Ouvrir la fiche
                </button>
              )}
            </div>
            {block.rows.length > 0 ? (
              <dl className="divide-y divide-border">
                {block.rows.map((row) => (
                  <div
                    key={row.key}
                    className="grid grid-cols-[130px_minmax(0,1fr)] gap-4 px-4 py-2 text-sm"
                  >
                    <dt className="text-muted-foreground">{row.label}</dt>
                    <dd className="break-words text-foreground">
                      {row.before && (
                        <span className="mr-2 text-muted-foreground line-through">
                          {row.before}
                        </span>
                      )}
                      {row.value ?? "-"}
                    </dd>
                  </div>
                ))}
              </dl>
            ) : (
              <p className="px-4 py-2.5 text-sm text-muted-foreground">Aucun champ modifié.</p>
            )}
          </div>
        ))}
        {detail.actionsDetail.length === 0 && !detail.resultat?.applied?.length && (
          <p className="text-sm text-muted-foreground">Aucune fiche concernée.</p>
        )}
      </section>

      <section className="flex flex-col gap-3">
        <h4 className="text-sm font-semibold text-foreground">Mail · {detail.mailbox}</h4>
        {messages.map((message, i) => (
          <div key={i} className="rounded-md border border-border bg-card">
            <div className="flex items-baseline justify-between gap-3 border-b border-border px-4 py-2">
              <span className="truncate text-sm font-medium text-foreground">
                {senderName(message.headers.De)}
              </span>
              {message.headers.Date && (
                <span className="shrink-0 text-xs text-muted-foreground tabular-nums">
                  {dateTimeLabel(new Date(message.headers.Date))}
                </span>
              )}
            </div>
            <p className="px-4 py-3 text-sm leading-relaxed whitespace-pre-wrap text-foreground/90">
              {message.body || "(message vide)"}
            </p>
          </div>
        ))}
      </section>

      {detail.statut !== "validee" && (
        <footer className="flex flex-wrap items-center justify-end gap-3 border-t border-border pt-4">
          {error && (
            <span role="alert" className="text-sm text-danger">
              {error}
            </span>
          )}
          <Button variant="outline" onClick={reopen} disabled={pending}>
            {pending ? "En cours…" : "Remettre à traiter"}
          </Button>
        </footer>
      )}
    </div>
  )
}

export function HistoryPanel({
  id,
  onClose,
  onOpenEntity,
}: {
  id: string | null
  onClose: () => void
  onOpenEntity: OpenEntity
}) {
  const { data: detail, error } = useFetchJson<SuggestionDetail>(id ? `/api/prospects/${id}` : null)

  return (
    <SidePanel open={id !== null} onClose={onClose} title="Mail traité">
      {detail && detail.id === id ? (
        <HistoryContent detail={detail} onOpenEntity={onOpenEntity} onReopened={onClose} />
      ) : (
        <DrawerState error={error} />
      )}
    </SidePanel>
  )
}
