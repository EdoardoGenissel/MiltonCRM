"use client"

import Link from "next/link"
import { useRouter } from "next/navigation"
import { useCallback, useEffect, useId, useMemo, useState } from "react"
import { ChevronRight } from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { Button, buttonVariants } from "@/components/ui/button"
import { ToastProvider, useToast } from "@/components/ui/toaster"
import { useEntityDrawers } from "@/components/entity-drawers/entity-drawer-provider"
import { cn } from "@/lib/utils"
import { cardView } from "@/lib/prospects-mail/card"
import { ContactAvatar } from "@/components/contact-avatar"
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
import { ValidateDrawer, type ValidateOutcome } from "./validate-drawer"
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

// Recherche et filtres actifs : une liste vide veut alors dire "aucun
// résultat", pas "rien à traiter".
export type Narrowing = {
  search: string
  // Filtres actifs ayant un effet sur la file / sur l'historique.
  queueFiltered: boolean
  historyFiltered: boolean
  clearSearchHref: string
  resetHref: string
}

// " pour « marc »", " avec ces filtres", ou rien.
function narrowSuffix(search: string, filtered: boolean): string {
  return search ? ` pour « ${search} »` : filtered ? " avec ces filtres" : ""
}

function NoResults({
  title,
  text,
  href,
  action,
}: {
  title: string
  text: string
  href: string
  action: string
}) {
  return (
    <div className="flex min-h-48 flex-col items-center justify-center gap-1 rounded-md border border-border bg-card px-8 py-8 text-center">
      <p className="text-sm font-medium text-foreground">{title}</p>
      <p className="text-sm text-muted-foreground">{text}</p>
      <Link
        href={href}
        scroll={false}
        className={cn(buttonVariants({ variant: "outline", size: "default" }), "mt-3")}
      >
        {action}
      </Link>
    </div>
  )
}

// Ligne cliquable de la carte "Aujourd'hui" : toute la ligne est la cible.
// Survol en muted/60 (et non muted) pour garder le texte secondaire à 4,5:1.
const TODAY_ROW = cn(
  "group/row w-full rounded-md text-left transition-colors hover:bg-muted/60 motion-reduce:transition-none",
  FOCUS_RING,
)
const ROW_CHEVRON =
  "size-3.5 shrink-0 text-muted-foreground opacity-0 transition-opacity group-hover/row:opacity-100 group-focus-visible/row:opacity-100 motion-reduce:transition-none"
const OVERLINE = "px-2 pt-2 text-xs font-medium tracking-wide text-muted-foreground uppercase"

// Compteur des titres "Mails à traiter" et "Validés aujourd'hui" : pastille
// ronde de la même taille que le compteur du bouton Filtres. Contour sur fond
// blanc plutôt que la variante grise, qui se confond avec le fond de page
// (#f3f4f6 sur #f7f8fa) et passerait pour un badge sans fond.
function CountBadge({ count }: { count: number }) {
  return (
    <Badge
      variant="outline"
      className="h-4.5 min-w-4.5 justify-center rounded-full bg-card px-1.5 py-0 tabular-nums"
    >
      {count}
    </Badge>
  )
}

// Lignes affichées dans "Validés aujourd'hui" ; le reste est dans l'onglet
// Historique.
const TODAY_LIMIT = 5

function MoreInHistory({ count, href }: { count: number; href: string }) {
  if (count <= 0) return null
  return (
    <Link
      href={href}
      className={cn(
        "mx-2 mt-1 inline-block rounded-md py-1 text-xs font-medium text-primary-strong hover:underline",
        FOCUS_RING,
      )}
    >
      Voir {count === 1 ? "l'autre" : `les ${count} autres`} dans l&apos;historique
    </Link>
  )
}

// "par l'analyse", "analyse échouée", "ignoré par johan".
function ecarteDetail(s: SuggestionSummary): string {
  if (s.statut === "ignoree") return "par l'analyse"
  if (s.statut === "erreur") return "analyse échouée"
  const by = s.traitePar?.split("@")[0]
  return by ? `ignoré par ${by}` : "ignoré"
}

// Ligne d'un mail écarté (bloc du jour, replié) : nom puis détail, sur une ligne.
function TodayLine({
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
        className={cn("flex items-center gap-2 px-2 py-1.5", TODAY_ROW)}
      >
        <span className="min-w-0 flex-1 truncate text-sm">
          <span className="font-medium text-foreground/80 decoration-muted-foreground underline-offset-2 group-hover/row:underline">
            {s.displayName}
          </span>
          {detail && <span className="text-xs text-muted-foreground"> · {detail}</span>}
        </span>
        <ChevronRight aria-hidden className={ROW_CHEVRON} />
      </button>
    </li>
  )
}

// Mail validé du jour : avatar à initiales (repère visuel par personne, plus
// petit que dans Contacts), nom puis type de demande sur deux lignes aérées.
function TodayValidatedLine({ s, onOpen }: { s: SuggestionSummary; onOpen: (id: string) => void }) {
  const [first = "", ...rest] = s.displayName.trim().split(/\s+/)
  const type = requestType(s)
  return (
    <li>
      <button
        type="button"
        onClick={() => onOpen(s.id)}
        className={cn("flex items-center gap-2.5 px-2 py-2", TODAY_ROW)}
      >
        <span aria-hidden>
          {/* 30px : du haut du nom au bas de la description. */}
          <ContactAvatar prenom={first} nom={rest.at(-1) ?? ""} size="sm" className="size-7.5" />
        </span>
        <span className="min-w-0 flex-1">
          <span className="block truncate text-sm font-medium text-foreground decoration-muted-foreground underline-offset-2 group-hover/row:underline">
            {s.displayName}
          </span>
          {type && <span className="block truncate text-xs text-muted-foreground">{type}</span>}
        </span>
        <ChevronRight aria-hidden className={ROW_CHEVRON} />
      </button>
    </li>
  )
}

// Récap de la journée, discret (la file reste le cœur de la page) : posé sur le
// fond de page, sans carte, pour passer au second plan derrière les cartes
// blanches de la file. Les validés sur deux lignes, les écartés repliés. 5
// lignes au plus par liste, le reste est dans l'onglet Historique.
function TodayCard({
  history,
  historyHref,
  narrowing,
  onOpen,
}: {
  history: SuggestionSummary[]
  historyHref: string
  narrowing: Narrowing
  onOpen: (id: string) => void
}) {
  const [open, setOpen] = useState(false)
  const listId = useId()
  const { validees, parEquipe, parAnalyse } = treatedToday(history)
  const ecartes = [...parEquipe, ...parAnalyse].sort((a, b) =>
    historyDate(b).localeCompare(historyDate(a)),
  )
  const suffix = narrowSuffix(narrowing.search, narrowing.historyFiltered)

  return (
    <section aria-labelledby="today-title" className="w-full pb-2 @4xl:w-[340px] @4xl:shrink-0">
      <h2
        id="today-title"
        className="flex items-center gap-2 px-2 pb-1 text-sm font-semibold text-foreground"
      >
        Validés aujourd&apos;hui
        <CountBadge count={validees.length} />
      </h2>

      {validees.length === 0 ? (
        <p className="px-2 py-1 text-xs text-muted-foreground">
          {suffix
            ? `Aucun résultat aujourd'hui${suffix}.`
            : "Les mails que vous validez apparaîtront ici."}
        </p>
      ) : (
        <>
          <ol aria-labelledby="today-title" className="flex flex-col gap-0.5">
            {validees.slice(0, TODAY_LIMIT).map((s) => (
              <TodayValidatedLine key={s.id} s={s} onOpen={onOpen} />
            ))}
          </ol>
          <MoreInHistory count={validees.length - TODAY_LIMIT} href={historyHref} />
        </>
      )}

      {ecartes.length > 0 && (
        <div className="mt-2 border-t border-border pt-1">
          <button
            type="button"
            aria-expanded={open}
            aria-controls={listId}
            onClick={() => setOpen((v) => !v)}
            className={cn(
              "flex items-center gap-1.5 px-2 py-1.5 text-sm text-muted-foreground",
              TODAY_ROW,
            )}
          >
            <ChevronRight
              aria-hidden
              className={cn(
                "size-3.5 shrink-0 transition-transform motion-reduce:transition-none",
                open && "rotate-90",
              )}
            />
            {plural(ecartes.length, "écarté", "écartés")}
          </button>
          <div id={listId} hidden={!open}>
            <ol className="flex flex-col">
              {ecartes.slice(0, TODAY_LIMIT).map((s) => (
                <TodayLine key={s.id} s={s} detail={ecarteDetail(s)} onOpen={onOpen} />
              ))}
            </ol>
            <MoreInHistory count={ecartes.length - TODAY_LIMIT} href={historyHref} />
          </div>
        </div>
      )}
    </section>
  )
}

// Nœuds de la timeline : un cercle vert (contour seul) par mail validé, un petit point pour le
// groupe des écartés. Le statut est toujours écrit à côté (WCAG 1.4.1).
const NODES = {
  validee: "size-2.5 border-2 border-success bg-background",
  ecartes: "size-1.5 bg-muted-foreground/50",
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

// Deux lignes pour alléger la lecture : qui (nom + nombre de fiches), puis
// quoi (type de demande · bien). Le statut "validé" est porté par l'en-tête du
// jour, pas répété sur chaque carte.
function ValidatedCard({ s, onOpen }: { s: SuggestionSummary; onOpen: (id: string) => void }) {
  const type = requestType(s)
  const bien = bienOf(s)
  return (
    <button
      type="button"
      onClick={() => onOpen(s.id)}
      className={cn(
        "grid w-full grid-cols-[minmax(0,1fr)_auto] items-baseline gap-x-3 gap-y-0.5 rounded-md border border-border bg-card px-3.5 py-2.5 text-left transition-colors hover:bg-muted/40 motion-reduce:transition-none",
        FOCUS_RING,
      )}
    >
      <span className="truncate text-sm font-semibold text-foreground">{s.displayName}</span>
      <span className="text-right text-xs text-muted-foreground tabular-nums">
        {fichesLabel(s)}
      </span>
      {(type || bien) && (
        <span className="col-span-2 truncate text-xs text-muted-foreground">
          {type && <span className="text-foreground/80">{type}</span>}
          {type && bien && " · "}
          {bien}
        </span>
      )}
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
  parEquipe,
  parAnalyse,
  onOpen,
}: {
  parEquipe: SuggestionSummary[]
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
        {ecartesLabel(parEquipe.length, parAnalyse.length)}
      </button>
      <div id={listId} hidden={!open} className="pb-1">
        {parEquipe.length > 0 && (
          <section aria-labelledby={`${listId}-vous`}>
            <h3 id={`${listId}-vous`} className={OVERLINE}>
              Ignorés par l&apos;équipe
            </h3>
            <ul className="mt-1">
              {parEquipe.map((s) => {
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
  narrowing,
  onOpen,
}: {
  history: SuggestionSummary[]
  moreHistoryHref: string | null
  narrowing: Narrowing
  onOpen: (id: string) => void
}) {
  const days = groupByDay(history)

  if (days.length === 0 && narrowing.search) {
    return (
      <NoResults
        title={`Aucun mail traité pour « ${narrowing.search} »`}
        text="Vérifiez l'orthographe, ou cherchez un nom, un objet ou un mot du résumé."
        href={narrowing.clearSearchHref}
        action="Effacer la recherche"
      />
    )
  }
  if (days.length === 0 && narrowing.historyFiltered) {
    return (
      <NoResults
        title="Aucun mail traité avec ces filtres"
        text="Modifiez ou retirez des filtres pour voir plus de mails."
        href={narrowing.resetHref}
        action="Tout effacer"
      />
    )
  }
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
        const ecartes = day.parEquipe.length + day.parAnalyse.length
        const entries = day.validees.length + (ecartes > 0 ? 1 : 0)
        const summary = daySummary(day)
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
              <p id={`resume-${day.key}`} className="text-xs text-muted-foreground">
                <span className="font-medium text-foreground/80">{summary.validees}</span>
                {summary.ecartes && ` · ${summary.ecartes}`}
              </p>
            </div>
            {/* Nom de la liste pour les lecteurs d'écran : jour + "7 validés · 4 écartés". */}
            <ol aria-labelledby={`jour-${day.key} resume-${day.key}`}>
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
                  <EcartesGroup
                    parEquipe={day.parEquipe}
                    parAnalyse={day.parAnalyse}
                    onOpen={onOpen}
                  />
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
  narrowing: Narrowing
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

function Board({
  vue,
  pending,
  history,
  historyHref,
  moreHistoryHref,
  lastSyncAt,
  narrowing,
}: BoardProps) {
  const router = useRouter()
  const toast = useToast()
  const { openContact, openBien, openMandat } = useEntityDrawers()
  const [validatingId, setValidatingId] = useState<string | null>(null)
  // Dernier mail traité depuis le drawer, plus rien derrière : le drawer reste
  // ouvert sur l'état "Plus aucun mail à traiter".
  const [queueEnded, setQueueEnded] = useState(false)
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

  // Position du mail affiché dans la file et ses voisins (navigation du drawer).
  const queueIndex = validatingId ? queueOrder.findIndex((s) => s.id === validatingId) : -1
  const validating = queueIndex >= 0 ? queueOrder[queueIndex] : null

  function closeDrawer() {
    setValidatingId(null)
    setQueueEnded(false)
  }

  // La carte du mail affiché reste visible dans la file, derrière le voile.
  useEffect(() => {
    if (!validatingId) return
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches
    document
      .querySelector('article[aria-current="true"]')
      ?.scrollIntoView({ block: "nearest", behavior: reduce ? "auto" : "smooth" })
  }, [validatingId])

  const undoReject = useCallback(
    async (id: string) => {
      if (await postDecision(id, "rouvrir")) router.refresh()
      else
        toast.add({
          type: "error",
          title: "Annulation impossible",
          description:
            "Le mail reste ignoré. Vous pouvez le remettre à traiter depuis l'historique.",
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
        title: "Ce mail n'a pas pu être ignoré",
        description: "Vérifiez votre connexion puis réessayez.",
      })
    }
  }

  function handleDone(outcome: ValidateOutcome) {
    const next = nextAfter(outcome.id)
    setValidatingId(next)
    setQueueEnded(next === null)
    if (outcome.decision === "rejeter") {
      notifyRejected(outcome.id, outcome.displayName)
      return
    }
    const applied = outcome.result?.applied ?? []
    const summary = appliedLabel(applied)
    const contactId = outcome.result?.contactId
    toast.add({
      title: `${outcome.displayName} validé`,
      description: `${summary[0].toUpperCase()}${summary.slice(1)}.`,
      actionProps: contactId
        ? {
            children: "Ouvrir la fiche",
            onClick: () => {
              closeDrawer()
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
    closeDrawer()
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
          narrowing={narrowing}
          onOpen={setHistoryId}
        />
      ) : (
        // Requête de conteneur : à partir de 56rem de large, la carte du jour
        // se range à droite de la file (340px) ; en dessous, elle passe sous
        // la file, en pleine largeur.
        <div className="@container">
          <div className="flex flex-col gap-6 @4xl:flex-row @4xl:items-start">
            <section aria-labelledby="queue-title" className="flex min-w-0 flex-1 flex-col gap-3">
              <header className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1">
                <h2
                  id="queue-title"
                  className="flex items-center gap-2 text-sm font-semibold text-foreground"
                >
                  {narrowing.search || narrowing.queueFiltered ? "Résultats" : "Mails à traiter"}
                  <CountBadge count={pending.length} />
                  {/* La requête plafonne la file (cf. listProspectsBoard). */}
                  {pending.length >= 200 && (
                    <span className="font-normal text-muted-foreground">
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
              ) : narrowing.search ? (
                <NoResults
                  title={`Aucun mail à traiter pour « ${narrowing.search} »`}
                  text="Vérifiez l'orthographe, ou cherchez un nom, un objet ou un mot du résumé."
                  href={narrowing.clearSearchHref}
                  action="Effacer la recherche"
                />
              ) : narrowing.queueFiltered ? (
                <NoResults
                  title="Aucun mail à traiter avec ces filtres"
                  text="Modifiez ou retirez des filtres pour voir plus de mails."
                  href={narrowing.resetHref}
                  action="Tout effacer"
                />
              ) : (
                <div className="flex min-h-48 flex-col items-center justify-center gap-1 rounded-md border border-border bg-card px-8 text-center">
                  <p className="text-sm font-medium text-foreground">Rien à traiter</p>
                  <p className="text-sm text-muted-foreground">
                    Les nouveaux mails de prospects apparaîtront ici après la prochaine analyse.
                  </p>
                </div>
              )}
            </section>
            <TodayCard
              history={history}
              historyHref={historyHref}
              narrowing={narrowing}
              onOpen={setHistoryId}
            />
          </div>
        </div>
      )}

      <ValidateDrawer
        id={validatingId}
        summary={validating}
        position={validating ? { index: queueIndex + 1, total: queueOrder.length } : null}
        previous={queueIndex > 0 ? queueOrder[queueIndex - 1] : null}
        next={queueIndex >= 0 ? (queueOrder[queueIndex + 1] ?? null) : null}
        ended={queueEnded}
        onNavigate={setValidatingId}
        onClose={closeDrawer}
        onDone={handleDone}
        onOpenEntity={openEntity}
      />
      <HistoryPanel id={historyId} onClose={() => setHistoryId(null)} onOpenEntity={openEntity} />
    </>
  )
}
