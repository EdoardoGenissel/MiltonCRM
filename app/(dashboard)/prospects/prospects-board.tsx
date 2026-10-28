"use client"

import Link from "next/link"
import { useRouter } from "next/navigation"
import { useCallback, useMemo, useState } from "react"
import { ChevronRight } from "lucide-react"
import { Button } from "@/components/ui/button"
import { ToastProvider, useToast } from "@/components/ui/toaster"
import { useEntityDrawers } from "@/components/entity-drawers/entity-drawer-provider"
import { cn } from "@/lib/utils"
import type { SuggestionSummary } from "@/lib/prospects-mail/queries"
import {
  appliedLabel,
  clockLabel,
  dayLabel,
  plannedLabel,
  STATUTS,
  StatutDot,
  TimeAgo,
} from "./shared"
import { ValidateModal, type ValidateOutcome } from "./validate-modal"
import { HistoryPanel, type OpenEntity } from "./history-panel"

function QueueRow({
  suggestion,
  others,
  onValidate,
  onReject,
}: {
  suggestion: SuggestionSummary
  // Autres mails du même expéditeur en attente (affichés groupés).
  others: number
  onValidate: () => void
  onReject: () => Promise<void>
}) {
  const [rejecting, setRejecting] = useState(false)
  const planned = plannedLabel(suggestion.actions)

  async function reject() {
    setRejecting(true)
    await onReject()
    setRejecting(false)
  }

  return (
    <li
      className={cn(
        "group relative px-5 py-3 transition-colors hover:bg-muted/40",
        rejecting && "opacity-40",
      )}
    >
      {/* Toute la ligne ouvre la validation à la souris ; au clavier, seuls
          "Rejeter" et "Valider" sont tabulables (pas de double arrêt). */}
      <button
        type="button"
        tabIndex={-1}
        onClick={onValidate}
        aria-label={`Examiner le mail de ${suggestion.displayName}`}
        className="absolute inset-0 focus-visible:ring-3 focus-visible:ring-ring/50 focus-visible:outline-none focus-visible:ring-inset"
      />
      <div className="pointer-events-none relative flex flex-col gap-1">
        <div className="flex items-baseline justify-between gap-4">
          <span className="truncate text-sm font-semibold text-foreground">
            {suggestion.displayName}
            {others > 0 && (
              <span className="ml-2 font-normal text-muted-foreground">{others + 1} mails</span>
            )}
          </span>
          <TimeAgo iso={suggestion.receivedAt} className="shrink-0 text-xs text-muted-foreground" />
        </div>
        <p className="truncate text-sm text-foreground/80">
          {suggestion.subject || "(sans objet)"}
        </p>
        {suggestion.resume && (
          <p className="truncate text-sm text-muted-foreground">{suggestion.resume}</p>
        )}
      </div>
      <div className="relative mt-2 flex flex-wrap items-center justify-between gap-x-4 gap-y-2">
        <p className="pointer-events-none text-xs text-muted-foreground">
          <span className="font-medium text-foreground/80">
            {planned || "Aucune fiche déduite"}
          </span>
          {suggestion.origine && <> · via {suggestion.origine}</>}
        </p>
        <div className="flex items-center gap-1">
          <Button
            variant="ghost"
            size="sm"
            onClick={reject}
            disabled={rejecting}
            className="text-muted-foreground hover:text-danger"
          >
            Rejeter
          </Button>
          <Button variant="outline" size="sm" onClick={onValidate}>
            Valider
          </Button>
        </div>
      </div>
    </li>
  )
}

function historyDetail(s: SuggestionSummary): string {
  const by = s.traitePar ? ` · ${s.traitePar.split("@")[0]}` : ""
  switch (s.statut) {
    case "validee": {
      const text = appliedLabel(s.applied ?? s.actions)
      return `${text[0].toUpperCase()}${text.slice(1)}${by}`
    }
    case "rejetee":
      return `Rejeté${by}`
    default:
      return `${STATUTS[s.statut]?.label ?? s.statut} · ${s.subject ?? "(sans objet)"}`
  }
}

function TimelineRow({
  s,
  active,
  onOpen,
}: {
  s: SuggestionSummary
  active: boolean
  onOpen: (id: string) => void
}) {
  return (
    <li>
      <button
        type="button"
        onClick={() => onOpen(s.id)}
        className={cn(
          "grid w-full grid-cols-[44px_12px_minmax(0,1fr)] items-baseline gap-x-3 px-5 py-2.5 text-left transition-colors hover:bg-muted/50 focus-visible:bg-muted/50 focus-visible:ring-2 focus-visible:ring-ring/50 focus-visible:outline-none focus-visible:ring-inset",
          active && "bg-muted/70",
        )}
      >
        <span suppressHydrationWarning className="text-xs text-muted-foreground tabular-nums">
          {clockLabel(s.traiteLe ?? s.receivedAt)}
        </span>
        <StatutDot statut={s.statut} className="translate-y-[-1px]" />
        <span className="min-w-0">
          <span
            className={cn(
              "block truncate text-sm",
              s.statut === "ignoree" ? "text-muted-foreground" : "text-foreground",
            )}
          >
            {s.displayName}
          </span>
          <span className="block truncate text-xs text-muted-foreground">{historyDetail(s)}</span>
        </span>
      </button>
    </li>
  )
}

// Les mails écartés par l'analyse (newsletters, notifications...) sont
// repliés en une ligne par jour : visibles pour contrôler le tri, sans noyer
// les mails réellement traités.
function IgnoredFold({
  items,
  activeId,
  onOpen,
}: {
  items: SuggestionSummary[]
  activeId: string | null
  onOpen: (id: string) => void
}) {
  const [open, setOpen] = useState(false)
  if (items.length === 0) return null
  return (
    <div>
      <button
        type="button"
        aria-expanded={open}
        onClick={() => setOpen((v) => !v)}
        className="grid w-full grid-cols-[44px_12px_minmax(0,1fr)] items-center gap-x-3 px-5 py-2 text-left text-xs text-muted-foreground transition-colors hover:bg-muted/50 hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring/50 focus-visible:outline-none focus-visible:ring-inset"
      >
        <ChevronRight
          className={cn("h-3.5 w-3.5 justify-self-end transition-transform", open && "rotate-90")}
        />
        <StatutDot statut="ignoree" />
        <span>
          {items.length} mail{items.length > 1 ? "s" : ""} non pertinent
          {items.length > 1 ? "s" : ""}
        </span>
      </button>
      {open && (
        <ol>
          {items.map((s) => (
            <TimelineRow key={s.id} s={s} active={s.id === activeId} onOpen={onOpen} />
          ))}
        </ol>
      )}
    </div>
  )
}

function Timeline({
  items,
  activeId,
  onOpen,
}: {
  items: SuggestionSummary[]
  activeId: string | null
  onOpen: (id: string) => void
}) {
  // Regroupement par jour de traitement (date du mail pour ce que l'analyse a
  // écarté d'elle-même) - l'ordre vient déjà trié de la requête.
  const groups: { day: string; items: SuggestionSummary[] }[] = []
  for (const item of items) {
    const day = dayLabel(item.traiteLe ?? item.receivedAt)
    const last = groups.at(-1)
    if (last?.day === day) last.items.push(item)
    else groups.push({ day, items: [item] })
  }

  return (
    <div className="flex flex-col">
      {groups.map((group) => (
        <section key={group.day}>
          <h3
            suppressHydrationWarning
            className="sticky top-0 z-10 border-b border-border bg-card/95 px-5 py-2 text-xs font-medium text-muted-foreground backdrop-blur"
          >
            {group.day}
          </h3>
          <ol>
            {group.items
              .filter((s) => s.statut !== "ignoree")
              .map((s) => (
                <TimelineRow key={s.id} s={s} active={s.id === activeId} onOpen={onOpen} />
              ))}
          </ol>
          <IgnoredFold
            items={group.items.filter((s) => s.statut === "ignoree")}
            activeId={activeId}
            onOpen={onOpen}
          />
        </section>
      ))}
    </div>
  )
}

type BoardProps = {
  pending: SuggestionSummary[]
  history: SuggestionSummary[]
  historyTotal: number
  moreHistoryHref: string | null
  lastSyncAt: string | null
}

export function ProspectsBoard(props: BoardProps) {
  return (
    <ToastProvider>
      <Board {...props} />
    </ToastProvider>
  )
}

async function postDecision(id: string, decision: "rejeter" | "rouvrir"): Promise<boolean> {
  const res = await fetch(`/api/prospects/${id}`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ decision }),
  }).catch(() => null)
  return Boolean(res?.ok)
}

function Board({ pending, history, historyTotal, moreHistoryHref, lastSyncAt }: BoardProps) {
  const router = useRouter()
  const toast = useToast()
  const { openContact, openBien, openMandat } = useEntityDrawers()
  const [validatingId, setValidatingId] = useState<string | null>(null)
  const [historyId, setHistoryId] = useState<string | null>(null)

  // Mails regroupés par expéditeur (une ligne par personne, la plus récente),
  // dans l'ordre du mail le plus récent de chaque groupe.
  const groups = useMemo(() => {
    const byKey = new Map<string, SuggestionSummary[]>()
    for (const s of pending) {
      // Par prospect (nom extrait du mail), pas par adresse d'expéditeur : les
      // portails relaient des prospects différents depuis la même adresse.
      const key = s.displayName.trim().toLowerCase()
      byKey.set(key, [...(byKey.get(key) ?? []), s])
    }
    return [...byKey.values()]
  }, [pending])
  const queueOrder = useMemo(() => groups.flat(), [groups])

  // Mail suivant (ou précédent si c'était le dernier) dans l'ordre de la file
  // - un autre mail du même expéditeur passe donc en premier.
  const nextAfter = useCallback(
    (id: string) => {
      const index = queueOrder.findIndex((s) => s.id === id)
      return (queueOrder[index + 1] ?? queueOrder[index - 1])?.id ?? null
    },
    [queueOrder],
  )

  const undoReject = useCallback(
    async (id: string) => {
      if (await postDecision(id, "rouvrir")) router.refresh()
      else
        toast.add({
          type: "error",
          title: "Annulation impossible",
          description:
            "Le mail reste rejeté. Vous pouvez le remettre à traiter depuis l'historique.",
        })
    },
    [router, toast],
  )

  const notifyRejected = useCallback(
    (id: string, name: string) =>
      toast.add({
        title: "Mail rejeté",
        description: name,
        actionProps: { children: "Annuler", onClick: () => undoReject(id) },
      }),
    [toast, undoReject],
  )

  async function rejectFromQueue(s: SuggestionSummary) {
    if (await postDecision(s.id, "rejeter")) {
      notifyRejected(s.id, s.displayName)
      router.refresh()
    } else {
      toast.add({
        type: "error",
        title: "Le rejet n'a pas été enregistré",
        description: "Vérifiez votre connexion puis réessayez.",
      })
    }
  }

  function handleDone(outcome: ValidateOutcome) {
    setValidatingId(nextAfter(outcome.id))
    if (outcome.decision === "rejeter") {
      notifyRejected(outcome.id, outcome.displayName)
      return
    }
    const applied = outcome.result?.applied ?? []
    const summary = appliedLabel(applied)
    const contactId = outcome.result?.contactId
    toast.add({
      title: outcome.displayName,
      description: `${summary[0].toUpperCase()}${summary.slice(1)}.`,
      actionProps: contactId
        ? {
            children: "Ouvrir la fiche",
            onClick: () => {
              setValidatingId(null)
              openContact(contactId)
            },
          }
        : undefined,
    })
  }

  // Le drawer d'historique est refermé avant d'ouvrir la fiche, pour que
  // celle-ci ne s'empile pas derrière lui.
  const openEntity: OpenEntity = (entity, id) => {
    setHistoryId(null)
    if (entity === "bien") openBien(id)
    else if (entity === "mandat") openMandat(id)
    else openContact(id)
  }

  return (
    <>
      <div className="grid min-h-0 flex-1 gap-6 lg:grid-cols-[minmax(0,1.5fr)_minmax(320px,1fr)]">
        <section
          aria-labelledby="queue-title"
          className="flex min-h-0 flex-col overflow-hidden rounded-md border border-border bg-card shadow-[var(--shadow-card)]"
        >
          <header className="flex h-12 shrink-0 items-center gap-2 border-b border-border px-5">
            <h2 id="queue-title" className="text-sm font-semibold text-foreground">
              À traiter
            </h2>
            <span className="text-sm text-muted-foreground tabular-nums">
              {pending.length}
              {/* La requête plafonne la file (cf. listProspectsBoard). */}
              {pending.length >= 200 && " (200 plus récents affichés)"}
            </span>
            {lastSyncAt && (
              <span className="ml-auto text-xs text-muted-foreground">
                Analyse automatique · <TimeAgo iso={lastSyncAt} />
              </span>
            )}
          </header>
          <div className="min-h-0 flex-1 overflow-auto">
            {pending.length > 0 ? (
              <ul className="divide-y divide-border">
                {groups.map(([s, ...others]) => (
                  <QueueRow
                    key={s.id}
                    suggestion={s}
                    others={others.length}
                    onValidate={() => setValidatingId(s.id)}
                    onReject={() => rejectFromQueue(s)}
                  />
                ))}
              </ul>
            ) : (
              <div className="flex h-full min-h-48 flex-col items-center justify-center gap-1 px-8 text-center">
                <p className="text-sm font-medium text-foreground">Rien à traiter</p>
                <p className="text-sm text-muted-foreground">
                  Les nouveaux mails de prospects apparaîtront ici après la prochaine analyse.
                </p>
              </div>
            )}
          </div>
        </section>

        <section
          aria-labelledby="history-title"
          className="flex min-h-0 flex-col overflow-hidden rounded-md border border-border bg-card shadow-[var(--shadow-card)]"
        >
          <header className="flex h-12 shrink-0 items-center gap-2 border-b border-border px-5">
            <h2 id="history-title" className="text-sm font-semibold text-foreground">
              Historique
            </h2>
            <span className="text-sm text-muted-foreground tabular-nums">{historyTotal}</span>
          </header>
          <div className="min-h-0 flex-1 overflow-auto">
            {history.length > 0 ? (
              <Timeline items={history} activeId={historyId} onOpen={setHistoryId} />
            ) : (
              <p className="px-5 py-12 text-center text-sm text-muted-foreground">
                Aucun mail traité ne correspond à ces filtres.
              </p>
            )}
            {moreHistoryHref && (
              <div className="border-t border-border p-3 text-center">
                <Link
                  href={moreHistoryHref}
                  scroll={false}
                  className="text-sm font-medium text-muted-foreground hover:text-foreground"
                >
                  Afficher les plus anciens
                </Link>
              </div>
            )}
          </div>
        </section>
      </div>

      <ValidateModal id={validatingId} onClose={() => setValidatingId(null)} onDone={handleDone} />
      <HistoryPanel id={historyId} onClose={() => setHistoryId(null)} onOpenEntity={openEntity} />
    </>
  )
}
