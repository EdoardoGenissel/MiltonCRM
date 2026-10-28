"use client"

import Link from "next/link"
import { useRouter } from "next/navigation"
import { useCallback, useId, useMemo, useState } from "react"
import { ChevronDown, ChevronRight } from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { Button, buttonVariants } from "@/components/ui/button"
import { ToastProvider, useToast } from "@/components/ui/toaster"
import { useEntityDrawers } from "@/components/entity-drawers/entity-drawer-provider"
import { cn } from "@/lib/utils"
import { cardView } from "@/lib/prospects-mail/card"
import type { SuggestionSummary } from "@/lib/prospects-mail/queries"
import { appliedLabel, TimeAgo } from "./shared"
import {
  clockLabel,
  dayLabel,
  daySummary,
  ecartesLabel,
  groupByDay,
  historyDate,
  plural,
  treatedToday,
} from "./days"
import { ValidateModal, type ValidateOutcome } from "./validate-modal"
import { HistoryPanel, type OpenEntity } from "./history-panel"

// Le focus clavier du titre allume toute la carte (ombre + anneau) ; celui
// d'Ignorer / Valider reste sur le bouton seul.
const TITLE_FOCUS =
  "has-[h3_button:focus-visible]:shadow-[var(--shadow-card-interactive)] has-[h3_button:focus-visible]:ring-2 has-[h3_button:focus-visible]:ring-ring/50 has-[h3_button:focus-visible]:ring-offset-1"

function QueueRow({
  suggestion,
  others,
  open,
  onValidate,
  onReject,
}: {
  suggestion: SuggestionSummary
  // Autres mails du même expéditeur en attente (affichés groupés).
  others: number
  // Un mail de ce groupe est affiché dans la fenêtre de validation.
  open: boolean
  onValidate: () => void
  onReject: () => Promise<void>
}) {
  const [rejecting, setRejecting] = useState(false)
  const { typeLabel, bienLine, contactStatus } = cardView(suggestion)

  async function reject() {
    setRejecting(true)
    await onReject()
    setRejecting(false)
  }

  return (
    <li>
      {/* Titre étendu : le bouton du titre couvre toute la carte (::after),
          Ignorer et Valider passent au-dessus (z-10). Au clavier : titre,
          Ignorer, Valider. */}
      <article
        aria-current={open ? "true" : undefined}
        className={cn(
          "relative flex cursor-pointer flex-col gap-1 rounded-md border border-border bg-card px-3.5 py-3 transition-[box-shadow,border-color] duration-150 ease-[ease] pointer-coarse:shadow-[var(--shadow-card)] motion-reduce:transition-none",
          TITLE_FOCUS,
          !rejecting && "hover:shadow-[var(--shadow-card-interactive)]",
          // La carte ouverte garde sa bordure teal au survol.
          open
            ? "border-primary bg-[color-mix(in_srgb,var(--primary)_4%,var(--card))]"
            : !rejecting && "hover:border-border-strong",
          rejecting && "opacity-40",
        )}
      >
        <div className="flex items-baseline justify-between gap-4">
          <p className="min-w-0 truncate text-sm text-foreground/80">
            {suggestion.displayName}
            {others > 0 && <span className="text-muted-foreground"> · {others + 1} mails</span>}
          </p>
          <TimeAgo iso={suggestion.receivedAt} className="shrink-0 text-xs text-muted-foreground" />
        </div>
        <h3 className="min-w-0 text-base font-semibold text-foreground">
          <button
            type="button"
            onClick={onValidate}
            aria-label={`${typeLabel} · ${suggestion.displayName}`}
            className="block w-full truncate text-left outline-hidden after:absolute after:inset-0 after:rounded-md after:content-['']"
          >
            {typeLabel}
          </button>
        </h3>
        {(bienLine || suggestion.resume) && (
          <p className="truncate text-sm text-muted-foreground">
            {bienLine && <span className="font-medium text-foreground/80">{bienLine}</span>}
            {bienLine && suggestion.resume && " — "}
            {suggestion.resume}
          </p>
        )}
        <div className="mt-1 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          {contactStatus === "nouveau" && (
            <Badge
              variant="primary"
              className="self-start font-semibold text-primary-strong sm:self-auto"
            >
              Nouveau prospect
            </Badge>
          )}
          {contactStatus === "existant" && (
            <Badge variant="secondary" className="self-start sm:self-auto">
              Déjà dans le CRM
            </Badge>
          )}
          <div className="relative z-10 grid grid-cols-2 gap-2 sm:ml-auto sm:flex sm:gap-1">
            <Button
              variant="ghost"
              size="sm"
              onClick={reject}
              disabled={rejecting}
              className="text-muted-foreground pointer-coarse:h-11"
            >
              Ignorer
            </Button>
            <Button
              size="sm"
              onClick={onValidate}
              className="bg-primary-strong hover:bg-[color-mix(in_oklch,var(--primary-strong),var(--foreground)_15%)] pointer-coarse:h-11"
            >
              Valider
            </Button>
          </div>
        </div>
      </article>
    </li>
  )
}

// Type de demande (cf. lib/prospects-mail/card.ts). Repli pour les mails sans
// extraction (anciens mails) : ce qui a été enregistré, si le mail a été validé.
function requestType(s: SuggestionSummary): string | null {
  if (s.carte) return cardView(s).typeLabel
  if (s.statut !== "validee") return null
  const text = appliedLabel(s.applied ?? s.actions)
  return text[0].toUpperCase() + text.slice(1)
}

// Bien ou recherche en une ligne ; absent, le segment disparaît.
function bienOf(s: SuggestionSummary): string | null {
  return s.carte ? cardView(s).bienLine : null
}

const FOCUS_RING = "focus-visible:ring-3 focus-visible:ring-ring/50 focus-visible:outline-none"

// Ligne cliquable de la carte "Aujourd'hui" : toute la ligne est la cible.
// Survol en muted/60 (et non muted) pour garder le texte secondaire à 4,5:1.
const TODAY_ROW = cn(
  "group/row w-full rounded-md text-left transition-colors hover:bg-muted/60 motion-reduce:transition-none",
  FOCUS_RING,
)
const ROW_CHEVRON =
  "size-3.5 shrink-0 text-muted-foreground opacity-0 transition-opacity group-hover/row:opacity-100 group-focus-visible/row:opacity-100 motion-reduce:transition-none"
const OVERLINE = "px-2 pt-2 text-xs font-medium tracking-wide text-muted-foreground uppercase"

function TodayCard({
  history,
  historyHref,
  onOpen,
}: {
  history: SuggestionSummary[]
  historyHref: string
  onOpen: (id: string) => void
}) {
  const [open, setOpen] = useState(false)
  const listId = useId()
  const { validees, parVous, parAnalyse } = treatedToday(history)

  return (
    <section
      aria-labelledby="today-title"
      className="max-w-[340px] flex-[1_1_300px] rounded-md border border-border bg-card px-2 pt-4 pb-2"
    >
      <div className="flex items-baseline justify-between gap-3 px-2 pb-2">
        <h2 id="today-title" className="text-sm font-semibold text-foreground">
          Aujourd&apos;hui
        </h2>
        <Link
          href={historyHref}
          className={cn(
            "rounded-md text-sm font-medium text-primary-strong hover:underline",
            FOCUS_RING,
          )}
        >
          Historique →
        </Link>
      </div>

      {validees.length > 0 ? (
        <ol className="flex flex-col gap-0.5">
          {validees.map((s) => (
            <li key={s.id}>
              <button
                type="button"
                onClick={() => onOpen(s.id)}
                className={cn("grid grid-cols-[12px_minmax(0,1fr)] gap-x-1 p-2", TODAY_ROW)}
              >
                <span aria-hidden className="mt-1.5 size-2 rounded-full bg-success" />
                <span className="min-w-0">
                  <span className="flex items-center gap-2">
                    <span className="min-w-0 flex-1 truncate text-sm font-medium text-foreground decoration-muted-foreground underline-offset-2 group-hover/row:underline">
                      {s.displayName}
                    </span>
                    <span className="shrink-0 text-xs text-muted-foreground tabular-nums">
                      {clockLabel(historyDate(s))}
                    </span>
                    <ChevronRight aria-hidden className={ROW_CHEVRON} />
                  </span>
                  <span className="block truncate text-xs text-muted-foreground">
                    {["Validé", requestType(s), bienOf(s)].filter(Boolean).join(" · ")}
                  </span>
                </span>
              </button>
            </li>
          ))}
        </ol>
      ) : (
        <p className="px-2 py-2 text-xs text-muted-foreground">
          Aucun mail validé aujourd&apos;hui.
        </p>
      )}

      {parVous.length + parAnalyse.length > 0 && (
        <>
          <div aria-hidden className="mx-2 mt-2 border-t border-border" />
          <button
            type="button"
            aria-expanded={open}
            aria-controls={listId}
            onClick={() => setOpen((v) => !v)}
            className={cn(
              "mt-1 flex items-center justify-between gap-2 px-2 py-2.5 text-sm text-muted-foreground",
              TODAY_ROW,
            )}
          >
            {ecartesLabel(parVous.length, parAnalyse.length)}
            <ChevronDown
              aria-hidden
              className={cn(
                "size-3.5 shrink-0 transition-transform motion-reduce:transition-none",
                open && "rotate-180",
              )}
            />
          </button>
          <div id={listId} hidden={!open}>
            {parVous.length > 0 && (
              <section aria-labelledby={`${listId}-vous`}>
                <h3 id={`${listId}-vous`} className={OVERLINE}>
                  Ignorés par vous
                </h3>
                <ol className="mt-1">
                  {parVous.map((s) => {
                    const time = clockLabel(historyDate(s))
                    return (
                      <li key={s.id}>
                        <button
                          type="button"
                          onClick={() => onOpen(s.id)}
                          aria-label={
                            s.statut === "erreur"
                              ? `${s.displayName}, analyse échouée, ${time}`
                              : undefined
                          }
                          className={cn(
                            "grid grid-cols-[12px_minmax(0,1fr)_14px] items-center gap-x-1 px-2 py-1.5",
                            TODAY_ROW,
                          )}
                        >
                          <span
                            aria-hidden
                            className={cn(
                              "size-2 rounded-full",
                              s.statut === "erreur"
                                ? "bg-warning"
                                : "border-2 border-muted-foreground/60",
                            )}
                          />
                          <span className="flex min-w-0 items-baseline gap-2">
                            <span className="min-w-0 flex-1 truncate text-sm font-medium text-foreground/80">
                              {s.displayName}
                            </span>
                            <span className="shrink-0 text-xs text-muted-foreground tabular-nums">
                              {time}
                            </span>
                          </span>
                          <ChevronRight aria-hidden className={ROW_CHEVRON} />
                        </button>
                      </li>
                    )
                  })}
                </ol>
              </section>
            )}
            {parAnalyse.length > 0 && (
              <section aria-labelledby={`${listId}-analyse`}>
                <h3 id={`${listId}-analyse`} className={OVERLINE}>
                  Écartés par l&apos;analyse
                </h3>
                <ol className="mt-1">
                  {parAnalyse.map((s) => (
                    <li key={s.id}>
                      <button
                        type="button"
                        onClick={() => onOpen(s.id)}
                        className={cn(
                          "grid grid-cols-[12px_minmax(0,1fr)_14px] items-center gap-x-1 px-2 py-1.5",
                          TODAY_ROW,
                        )}
                      >
                        <span aria-hidden className="h-0.5 w-2 bg-border" />
                        <span className="flex min-w-0 items-baseline gap-2">
                          <span className="min-w-0 flex-1 truncate text-sm text-muted-foreground">
                            {s.displayName}
                          </span>
                          <span className="shrink-0 text-xs text-muted-foreground tabular-nums">
                            {clockLabel(historyDate(s))}
                          </span>
                        </span>
                        <ChevronRight aria-hidden className={ROW_CHEVRON} />
                      </button>
                    </li>
                  ))}
                </ol>
              </section>
            )}
          </div>
        </>
      )}
    </section>
  )
}

// Nœuds de la timeline : un rond plein par mail validé, un petit point pour le
// groupe des écartés. Le statut est toujours écrit à côté (WCAG 1.4.1).
const NODES = {
  validee: "size-2.5 bg-success",
  ecartes: "size-1.5 bg-border",
} as const

function TimelineEntry({
  time,
  node,
  first,
  last,
  children,
}: {
  time: string | null
  node: keyof typeof NODES
  first: boolean
  last: boolean
  children: React.ReactNode
}) {
  return (
    <li className="grid grid-cols-[44px_20px_minmax(0,1fr)] gap-x-2.5">
      <span className="pt-3 text-right text-xs text-muted-foreground tabular-nums">{time}</span>
      {/* Fil continu d'un nœud à l'autre ; nœud centré sur la première ligne. */}
      <span aria-hidden className="relative">
        {!(first && last) && (
          <span
            className={cn(
              "absolute left-1/2 w-px -translate-x-1/2 bg-border",
              first ? "top-5 bottom-0" : last ? "top-0 h-5" : "inset-y-0",
            )}
          />
        )}
        <span
          className={cn(
            "absolute top-5 left-1/2 -translate-x-1/2 -translate-y-1/2 rounded-full ring-3 ring-background",
            NODES[node],
          )}
        />
      </span>
      <div className="min-w-0 pb-2">{children}</div>
    </li>
  )
}

function fichesLabel(s: SuggestionSummary): string {
  const n = (s.applied ?? s.actions).filter((a) => a.op !== "lien").length
  return n === 0 ? "Aucune fiche" : plural(n, "fiche", "fiches")
}

function ValidatedCard({ s, onOpen }: { s: SuggestionSummary; onOpen: (id: string) => void }) {
  const type = requestType(s)
  const bien = bienOf(s)
  return (
    <button
      type="button"
      onClick={() => onOpen(s.id)}
      className={cn(
        "flex w-full items-center gap-3 rounded-md border border-border bg-card px-3.5 py-2.5 text-left transition-colors hover:bg-muted/40 motion-reduce:transition-none",
        FOCUS_RING,
      )}
    >
      <span className="min-w-0 flex-1 truncate text-sm">
        <span className="font-semibold text-foreground">{s.displayName}</span>
        {type && <span className="text-foreground/80"> · {type}</span>}
        {bien && <span className="text-muted-foreground"> · {bien}</span>}
      </span>
      <span className="shrink-0 text-xs text-muted-foreground tabular-nums">{fichesLabel(s)}</span>
      <span className="shrink-0 text-xs font-medium text-success-foreground">Validé</span>
    </button>
  )
}

function EcarteRow({
  s,
  detail,
  onOpen,
}: {
  s: SuggestionSummary
  detail: string | null
  onOpen: (id: string) => void
}) {
  return (
    <li>
      <button
        type="button"
        onClick={() => onOpen(s.id)}
        className={cn(
          "flex w-full items-baseline gap-2 rounded-md px-2 py-1.5 text-left text-xs transition-colors hover:bg-card",
          FOCUS_RING,
        )}
      >
        <span className="shrink-0 text-muted-foreground tabular-nums">
          {clockLabel(historyDate(s))}
        </span>
        <span className="min-w-0 truncate">
          <span className="font-medium text-foreground">{s.displayName}</span>
          {detail && <span className="text-muted-foreground"> · {detail}</span>}
        </span>
      </button>
    </li>
  )
}

// Écartés d'un jour, repliés en une ligne : par vous (ignorés, analyses en
// échec) et par l'analyse. Chaque ligne ouvre le drawer d'historique, où se
// trouve "Remettre à traiter".
function EcartesGroup({
  parVous,
  parAnalyse,
  onOpen,
}: {
  parVous: SuggestionSummary[]
  parAnalyse: SuggestionSummary[]
  onOpen: (id: string) => void
}) {
  const [open, setOpen] = useState(false)
  const listId = useId()
  return (
    <>
      <button
        type="button"
        aria-expanded={open}
        aria-controls={listId}
        onClick={() => setOpen((v) => !v)}
        className={cn(
          "flex items-center gap-1.5 rounded-md py-2.5 text-sm text-muted-foreground transition-colors hover:text-foreground",
          FOCUS_RING,
        )}
      >
        <ChevronRight
          aria-hidden
          className={cn(
            "size-3.5 transition-transform motion-reduce:transition-none",
            open && "rotate-90",
          )}
        />
        {ecartesLabel(parVous.length, parAnalyse.length)}
      </button>
      <div id={listId} hidden={!open} className="pb-1">
        {parVous.length > 0 && (
          <section aria-labelledby={`${listId}-vous`}>
            <h3 id={`${listId}-vous`} className={OVERLINE}>
              Ignorés par vous
            </h3>
            <ul className="mt-1">
              {parVous.map((s) => {
                const by = s.traitePar?.split("@")[0]
                return (
                  <EcarteRow
                    key={s.id}
                    s={s}
                    detail={
                      s.statut === "erreur" ? "analyse échouée" : `ignoré${by ? ` par ${by}` : ""}`
                    }
                    onOpen={onOpen}
                  />
                )
              })}
            </ul>
          </section>
        )}
        {parAnalyse.length > 0 && (
          <section aria-labelledby={`${listId}-analyse`}>
            <h3 id={`${listId}-analyse`} className={OVERLINE}>
              Écartés par l&apos;analyse
            </h3>
            <ul className="mt-1">
              {parAnalyse.map((s) => (
                <EcarteRow key={s.id} s={s} detail={s.subject} onOpen={onOpen} />
              ))}
            </ul>
          </section>
        )}
      </div>
    </>
  )
}

function HistoryTimeline({
  history,
  moreHistoryHref,
  onOpen,
}: {
  history: SuggestionSummary[]
  moreHistoryHref: string | null
  onOpen: (id: string) => void
}) {
  const days = groupByDay(history)

  if (days.length === 0) {
    return (
      <p className="py-12 text-center text-sm text-muted-foreground">
        Aucun mail traité pour l&apos;instant.
      </p>
    )
  }

  return (
    <div className="flex max-w-[860px] flex-col gap-7">
      {days.map((day) => {
        const ecartes = day.parVous.length + day.parAnalyse.length
        const entries = day.validees.length + (ecartes > 0 ? 1 : 0)
        return (
          <section key={day.key} aria-labelledby={`jour-${day.key}`}>
            <div className="mb-2 flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1">
              <h2
                id={`jour-${day.key}`}
                suppressHydrationWarning
                className="text-sm font-semibold text-foreground"
              >
                {dayLabel(day.key + "T12:00:00-03:00")}
              </h2>
              <p className="text-xs text-muted-foreground">{daySummary(day)}</p>
            </div>
            <ol>
              {day.validees.map((s, i) => (
                <TimelineEntry
                  key={s.id}
                  time={clockLabel(historyDate(s))}
                  node="validee"
                  first={i === 0}
                  last={i === entries - 1}
                >
                  <ValidatedCard s={s} onOpen={onOpen} />
                </TimelineEntry>
              ))}
              {ecartes > 0 && (
                <TimelineEntry time={null} node="ecartes" first={entries === 1} last>
                  <EcartesGroup parVous={day.parVous} parAnalyse={day.parAnalyse} onOpen={onOpen} />
                </TimelineEntry>
              )}
            </ol>
          </section>
        )
      })}
      {moreHistoryHref && (
        <div className="flex justify-center">
          <Link
            href={moreHistoryHref}
            scroll={false}
            className={cn(buttonVariants({ variant: "outline" }))}
          >
            Afficher les jours précédents
          </Link>
        </div>
      )}
    </div>
  )
}

export type ProspectsVue = "a-traiter" | "historique"

type BoardProps = {
  vue: ProspectsVue
  pending: SuggestionSummary[]
  history: SuggestionSummary[]
  // Lien vers l'onglet Historique, filtres et recherche conservés.
  historyHref: string
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

function Board({ vue, pending, history, historyHref, moreHistoryHref, lastSyncAt }: BoardProps) {
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
        title: "Mail ignoré",
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
      {vue === "historique" ? (
        <HistoryTimeline
          history={history}
          moreHistoryHref={moreHistoryHref}
          onOpen={setHistoryId}
        />
      ) : (
        <div className="flex flex-wrap items-start gap-6">
          <section
            aria-labelledby="queue-title"
            className="flex min-w-0 flex-[999_1_560px] flex-col gap-3"
          >
            <header className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1">
              <h2 id="queue-title" className="text-sm font-semibold text-foreground">
                {plural(pending.length, "mail à traiter", "mails à traiter")}
                {/* La requête plafonne la file (cf. listProspectsBoard). */}
                {pending.length >= 200 && (
                  <span className="font-normal text-muted-foreground">
                    {" "}
                    (200 plus récents affichés)
                  </span>
                )}
              </h2>
              {lastSyncAt && (
                <span className="text-xs text-muted-foreground">
                  Analyse automatique · <TimeAgo iso={lastSyncAt} />
                </span>
              )}
            </header>
            {pending.length > 0 ? (
              <ul className="flex flex-col gap-2">
                {groups.map(([s, ...others]) => (
                  <QueueRow
                    key={s.id}
                    suggestion={s}
                    others={others.length}
                    open={s.id === validatingId || others.some((o) => o.id === validatingId)}
                    onValidate={() => setValidatingId(s.id)}
                    onReject={() => rejectFromQueue(s)}
                  />
                ))}
              </ul>
            ) : (
              <div className="flex min-h-48 flex-col items-center justify-center gap-1 rounded-md border border-border bg-card px-8 text-center">
                <p className="text-sm font-medium text-foreground">Rien à traiter</p>
                <p className="text-sm text-muted-foreground">
                  Les nouveaux mails de prospects apparaîtront ici après la prochaine analyse.
                </p>
              </div>
            )}
          </section>
          <TodayCard history={history} historyHref={historyHref} onOpen={setHistoryId} />
        </div>
      )}

      <ValidateModal id={validatingId} onClose={() => setValidatingId(null)} onDone={handleDone} />
      <HistoryPanel id={historyId} onClose={() => setHistoryId(null)} onOpenEntity={openEntity} />
    </>
  )
}
