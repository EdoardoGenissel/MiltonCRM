"use client"

import { useRouter } from "next/navigation"
import { useCallback, useEffect, useId, useMemo, useRef, useState } from "react"
import { ChevronLeft, ChevronRight, Loader2, Redo2, TriangleAlert, Undo2 } from "lucide-react"
import { SidePanel } from "@/components/ui/side-panel"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { DrawerTabs } from "@/components/ui/drawer-tabs"
import { FieldInput } from "@/components/field-input"
import { cn } from "@/lib/utils"
import { useFetchJson } from "@/lib/use-fetch-json"
import { FIELDS, type FieldDef, type ProposalEntity } from "@/lib/prospects-mail/fields"
import { cardView } from "@/lib/prospects-mail/card"
import type { ActionDetail, SuggestionDetail } from "@/lib/prospects-mail/details"
import type { SuggestionSummary } from "@/lib/prospects-mail/queries"
import type { ApplyResult } from "@/lib/prospects-mail/apply"
import { actionLabel, NOUNS, parseThread, senderName } from "./shared"
import { TIME_ZONE } from "./days"
import type { OpenEntity } from "./history-panel"

type ActionForm = { enabled: boolean; showAll: boolean; values: Record<string, string> }

// Une proposition qui remplacerait une valeur déjà en base est-elle
// pré-remplie ? true : la valeur du mail est dans le champ, ↺ garde celle du
// CRM. false : la valeur du CRM reste, ↻ reprend celle du mail (règle
// d'origine, cf. FieldChange.selected dans lib/prospects-mail/proposals.ts).
// À trancher avec Edoardo.
const PREFILL_OVER_EXISTING = true

// Valeur de départ de chaque champ : la proposition du mail (toujours quand le
// champ est vide en base, selon PREFILL_OVER_EXISTING sinon), à défaut la
// valeur actuelle.
function initialForm(action: ActionDetail): ActionForm {
  const values: Record<string, string> = {}
  for (const def of FIELDS[action.entity]) {
    const proposal = action.fields.find((f) => f.key === def.key)
    values[def.key] =
      proposal && (proposal.selected || PREFILL_OVER_EXISTING)
        ? proposal.proposed
        : (action.currentValues[def.key] ?? "")
  }
  return { enabled: true, showAll: false, values }
}

// Champs envoyés = ceux qui diffèrent de la valeur en base (pour une création,
// tous les champs renseignés).
function changedFields(action: ActionDetail, form: ActionForm): Record<string, string> {
  return Object.fromEntries(
    Object.entries(form.values).filter(
      ([key, value]) => value.trim() !== (action.currentValues[key] ?? ""),
    ),
  )
}

const capitalize = (text: string) => text[0].toUpperCase() + text.slice(1)

// "contact", "contact et qualification", "contact, qualification et bien".
function joinNouns(entities: ProposalEntity[]): string {
  const names = entities.map((e) => NOUNS[e].one)
  if (names.length <= 1) return names.join("")
  return `${names.slice(0, -1).join(", ")} et ${names.at(-1)}`
}

// "Ne pas créer la qualification", "Ne pas mettre à jour le contact".
function excludeLabel(action: ActionDetail, withNoun: boolean): string {
  const verb = action.op === "create" ? "Ne pas créer" : "Ne pas mettre à jour"
  const { one, feminine } = NOUNS[action.entity]
  return withNoun ? `${verb} ${feminine ? "la" : "le"} ${one}` : verb
}

// "Contact · valeurs actuelles conservées", "Qualification · ne sera pas créée".
function excludedText(action: ActionDetail): string {
  const { one, feminine } = NOUNS[action.entity]
  if (action.op === "update") return `${capitalize(one)} · valeurs actuelles conservées`
  return `${capitalize(one)} · ne sera pas ${feminine ? "créée" : "créé"}`
}

const FOCUS_RING = "focus-visible:ring-3 focus-visible:ring-ring/50 focus-visible:outline-none"

const RECEIVED = new Intl.DateTimeFormat("fr-FR", {
  timeZone: TIME_ZONE,
  day: "numeric",
  month: "short",
})

function SummaryCard({ detail }: { detail: SuggestionDetail }) {
  const view = cardView(detail)
  // Mail sans extraction (ancien mail) : la première fiche proposée.
  const firstAction = detail.actionsDetail[0]
  const type = !detail.carte && firstAction ? actionLabel(firstAction) : view.typeLabel
  return (
    <section className="rounded-md border border-border bg-card px-5 py-4">
      <h3 className="text-base font-semibold text-foreground">{type}</h3>
      {view.bienLine && <p className="text-sm font-medium text-foreground/80">{view.bienLine}</p>}
      {detail.resume && (
        <p className="mt-3 text-sm leading-relaxed text-foreground">{detail.resume}</p>
      )}
      <div className="mt-3 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-muted-foreground">
        {view.contactStatus === "nouveau" && (
          <Badge variant="primary" className="font-semibold text-primary-strong">
            Nouveau prospect
          </Badge>
        )}
        {view.contactStatus === "existant" && <Badge variant="secondary">Déjà dans le CRM</Badge>}
        <span>Reçu le {RECEIVED.format(new Date(detail.receivedAt))}</span>
        {detail.origine && <span>via {detail.origine}</span>}
      </div>
    </section>
  )
}

// Fiche existante simplement citée par le mail : affichée, jamais modifiée.
function LienCard({ action, onOpenEntity }: { action: ActionDetail; onOpenEntity: OpenEntity }) {
  return (
    <section className="flex items-center justify-between gap-3 rounded-md border border-border bg-card px-4 py-3">
      <p className="min-w-0 text-sm text-muted-foreground">
        {actionLabel(action)}
        {action.matchReason && ` · ${action.matchReason}`}
        {action.targetLabel && (
          <span className="block truncate font-medium text-foreground">{action.targetLabel}</span>
        )}
      </p>
      {action.targetId && (
        <button
          type="button"
          onClick={() => onOpenEntity(action.entity, action.targetId!)}
          className={cn(
            "shrink-0 rounded-sm text-xs font-medium text-primary-strong hover:underline",
            FOCUS_RING,
          )}
        >
          Ouvrir la fiche
        </button>
      )}
    </section>
  )
}

// Une fiche à créer ou à mettre à jour. Incluse par défaut ; "Ne pas créer" /
// "Ne pas mettre à jour" la replie sur une ligne (enabled: false), "Rétablir"
// la réaffiche avec les valeurs saisies.
function ActionCard({
  action,
  form,
  onChange,
}: {
  action: ActionDetail
  form: ActionForm
  onChange: (form: ActionForm) => void
}) {
  const othersId = useId()
  const excludeRef = useRef<HTMLButtonElement>(null)
  const restoreRef = useRef<HTMLButtonElement>(null)
  // Le focus suit le bouton qui remplace celui qu'on vient d'activer.
  const toggled = useRef(false)
  useEffect(() => {
    if (!toggled.current) return
    toggled.current = false
    ;(form.enabled ? excludeRef : restoreRef).current?.focus()
  }, [form.enabled])

  function toggle(enabled: boolean) {
    toggled.current = true
    onChange({ ...form, enabled })
  }

  const isCreate = action.op === "create"
  const defs = FIELDS[action.entity]
  const isChanged = (key: string) => form.values[key].trim() !== (action.currentValues[key] ?? "")
  const proposedKeys = new Set(action.fields.map((f) => f.key))
  // Champs proposés par le mail, toujours visibles ; les autres sont repliés
  // sous "Autres champs". Le partage ne dépend pas des saisies : un champ
  // modifié reste à sa place, sans sauter d'une liste à l'autre pendant la frappe.
  const shownDefs = defs.filter((d) => proposedKeys.has(d.key))
  const otherDefs = defs.filter((d) => !proposedKeys.has(d.key))
  const { one, feminine } = NOUNS[action.entity]
  const setValue = (key: string, value: string) =>
    onChange({ ...form, values: { ...form.values, [key]: value } })

  const renderRow = (def: FieldDef) => {
    const current = action.currentValues[def.key] ?? ""
    const proposal = action.fields.find((f) => f.key === def.key)?.proposed
    const value = form.values[def.key]
    const changed = isChanged(def.key)
    const id = `review-${action.entity}-${def.key}`
    // Le champ remplacera une valeur du CRM : note + ↺ pour la garder.
    // Une fois revenu à la valeur du CRM, l'icône disparaît (comme un
    // "reset to default") et la note rappelle seulement ce que dit le
    // mail. Sans pré-remplissage (PREFILL_OVER_EXISTING = false), la
    // valeur du mail reste une suggestion : ↻ permet alors de l'appliquer.
    const replaces = !isCreate && changed && current !== ""
    const mailOffer = !isCreate && !changed && proposal !== undefined && proposal !== value
    const canApplyMail = mailOffer && !PREFILL_OVER_EXISTING
    const noteId = `${id}-note`
    return (
      <div
        key={def.key}
        className={cn(
          "grid grid-cols-[110px_minmax(0,1fr)] gap-3 px-4 py-3",
          // Fond teal léger : la ligne sera écrite en base.
          changed && !isCreate && "bg-primary/[0.04]",
        )}
      >
        <label htmlFor={id} className="pt-2 text-sm text-muted-foreground">
          {def.label}
        </label>
        <div className="flex min-w-0 items-start gap-1">
          <div className="min-w-0 flex-1">
            <FieldInput
              id={id}
              def={def}
              value={value}
              onChange={(next) => setValue(def.key, next)}
              className="h-9"
            />
            {(replaces || mailOffer) && (
              <p id={noteId} className="mt-1 truncate text-xs text-muted-foreground">
                {replaces ? `Remplace « ${current} »` : `Le mail indique « ${proposal} »`}
              </p>
            )}
          </div>
          {/* Emplacement réservé sur les fiches existantes : les champs
                        restent alignés, l'icône n'apparaît que si elle sert. */}
          {!isCreate && (
            <div className="w-8 shrink-0 pt-0.5 pointer-coarse:w-11">
              {(replaces || canApplyMail) && (
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => setValue(def.key, replaces ? current : proposal!)}
                  aria-label={
                    replaces
                      ? `Garder la valeur actuelle : ${current}`
                      : `Reprendre la valeur du mail : ${proposal}`
                  }
                  aria-describedby={noteId}
                  title={replaces ? `Garder « ${current} »` : `Reprendre « ${proposal} »`}
                  className="text-muted-foreground hover:text-foreground pointer-coarse:size-11"
                >
                  {replaces ? <Undo2 aria-hidden /> : <Redo2 aria-hidden />}
                </Button>
              )}
            </div>
          )}
        </div>
      </div>
    )
  }

  return (
    <div aria-live="polite">
      {form.enabled ? (
        <section className="overflow-hidden rounded-md border border-border bg-card">
          <header className="flex items-start justify-between gap-3 border-b border-border px-4 py-3">
            <div className="min-w-0">
              <h3 className="text-sm font-semibold text-foreground">{actionLabel(action)}</h3>
              <p className="truncate text-xs text-muted-foreground">
                {action.targetLabel
                  ? `${action.targetLabel}${action.matchReason ? ` · retrouvé par ${action.matchReason}` : ""}`
                  : "Fiche créée à la validation"}
              </p>
            </div>
            <Button
              ref={excludeRef}
              variant="ghost"
              size="sm"
              onClick={() => toggle(false)}
              aria-label={excludeLabel(action, true)}
              className="shrink-0 text-muted-foreground hover:text-foreground"
            >
              {excludeLabel(action, false)}
            </Button>
          </header>

          <div className="divide-y divide-border">
            {shownDefs.map(renderRow)}
            {shownDefs.length === 0 && (
              <p className="px-4 py-3 text-sm text-muted-foreground">Fiche déjà à jour.</p>
            )}
          </div>

          {otherDefs.length > 0 && (
            <>
              {/* Accordéon : toute la ligne est cliquable, chevron et aperçu des
                  champs repliés pour savoir ce qu'on va trouver. */}
              <button
                type="button"
                aria-expanded={form.showAll}
                aria-controls={othersId}
                onClick={() => onChange({ ...form, showAll: !form.showAll })}
                className={cn(
                  "flex w-full items-start gap-2 border-t border-border px-4 py-2.5 text-left transition-colors hover:bg-muted/40 focus-visible:ring-inset motion-reduce:transition-none",
                  FOCUS_RING,
                )}
              >
                <ChevronRight
                  aria-hidden
                  className={cn(
                    "mt-0.5 size-4 shrink-0 text-muted-foreground transition-transform motion-reduce:transition-none",
                    form.showAll && "rotate-90",
                  )}
                />
                <span className="min-w-0">
                  <span className="block text-sm font-medium text-foreground/80">
                    Autres champs {feminine ? "de la" : "du"} {one}
                    {!form.showAll && (
                      <span className="font-normal text-muted-foreground tabular-nums">
                        {" "}
                        ({otherDefs.length})
                      </span>
                    )}
                  </span>
                  {!form.showAll && (
                    <span className="block truncate text-xs text-muted-foreground">
                      {otherDefs.map((d) => d.label).join(", ")}
                    </span>
                  )}
                </span>
              </button>
              <div
                id={othersId}
                hidden={!form.showAll}
                className="divide-y divide-border border-t border-border"
              >
                {otherDefs.map(renderRow)}
              </div>
            </>
          )}
        </section>
      ) : (
        <section className="flex items-center justify-between gap-3 rounded-md border border-dashed border-border-strong bg-muted/30 px-4 py-2.5">
          <p className="text-sm text-muted-foreground">{excludedText(action)}</p>
          <Button
            ref={restoreRef}
            variant="ghost"
            size="sm"
            onClick={() => toggle(true)}
            className="shrink-0 text-foreground"
          >
            Rétablir
          </Button>
        </section>
      )}
    </div>
  )
}

function Conversation({ detail }: { detail: SuggestionDetail }) {
  const messages = parseThread(detail.excerpt)
  if (messages.length === 0) {
    return <p className="text-sm text-muted-foreground">Contenu du mail indisponible.</p>
  }
  return (
    <ol className="flex flex-col gap-3">
      {messages.map((message, i) => (
        <li key={i} className="rounded-md border border-border bg-card">
          <div className="flex items-baseline justify-between gap-3 border-b border-border px-4 py-2.5">
            <span className="truncate text-sm font-medium text-foreground">
              {senderName(message.headers.De)}
            </span>
            <span className="shrink-0 text-xs text-muted-foreground tabular-nums">
              {message.headers.Date
                ? new Date(message.headers.Date).toLocaleString("fr-FR", {
                    day: "numeric",
                    month: "short",
                    hour: "2-digit",
                    minute: "2-digit",
                  })
                : ""}
            </span>
          </div>
          {message.headers["Pièces jointes"] && (
            <p className="border-b border-border px-4 py-1.5 text-xs text-muted-foreground">
              Pièces jointes : {message.headers["Pièces jointes"]}
            </p>
          )}
          <p className="px-4 py-3 text-sm leading-relaxed whitespace-pre-wrap text-foreground/90">
            {message.body || "(message vide)"}
          </p>
        </li>
      ))}
    </ol>
  )
}

// Silhouette du corps pendant le chargement du mail : carte récapitulative
// puis une carte de fiche, sur une colonne.
function DrawerSkeleton() {
  const bar = "rounded bg-muted motion-safe:animate-pulse"
  return (
    <div role="status" aria-label="Chargement du mail" className="flex flex-col gap-6">
      <div className="flex flex-col gap-2 rounded-md border border-border bg-card px-5 py-4">
        <div className={cn(bar, "h-4 w-48")} />
        <div className={cn(bar, "h-3 w-32")} />
        <div className={cn(bar, "mt-2 h-3")} />
        <div className={cn(bar, "h-3 w-3/4")} />
      </div>
      <div className="flex flex-col gap-3 rounded-md border border-border bg-card p-4">
        <div className={cn(bar, "h-3 w-36")} />
        {[0, 1, 2].map((i) => (
          <div key={i} className="grid grid-cols-[110px_1fr] gap-3">
            <div className={cn(bar, "h-3")} />
            <div className={cn(bar, "h-8")} />
          </div>
        ))}
      </div>
    </div>
  )
}

// Issue d'un traitement réussi, remontée à la page (notification + mail suivant).
export type ValidateOutcome = {
  id: string
  displayName: string
  decision: "valider" | "rejeter"
  result?: ApplyResult
}

export type QueueNeighbour = Pick<SuggestionSummary, "id" | "displayName">

// Sortie demandée alors que des saisies seraient perdues.
type Leave =
  | { kind: "close" }
  | { kind: "navigate"; id: string }
  | { kind: "open"; entity: ProposalEntity; id: string }

type FormState = { id: string; initial: ActionForm[]; forms: ActionForm[] }

const LEAVE_TEXT: Record<Leave["kind"], { consequence: string; confirm: string }> = {
  close: {
    consequence: "Si vous fermez, elles seront perdues.",
    confirm: "Fermer sans enregistrer",
  },
  navigate: {
    consequence: "Si vous changez de mail, elles seront perdues.",
    confirm: "Passer sans enregistrer",
  },
  open: {
    consequence: "Si vous ouvrez la fiche, elles seront perdues.",
    confirm: "Ouvrir sans enregistrer",
  },
}

// Drawer de traitement d'un mail de la file "À traiter" : relecture des fiches
// proposées, navigation entre mails (Précédent / Suivant, Alt + ↑ / ↓), pied
// d'action toujours visible.
export function ValidateDrawer({
  id,
  summary,
  position,
  previous,
  next,
  ended,
  onNavigate,
  onClose,
  onDone,
  onOpenEntity,
}: {
  id: string | null
  // Ligne de la file : en-tête affiché tout de suite, avant le chargement.
  summary: SuggestionSummary | null
  // Position du mail dans la file (1-based).
  position: { index: number; total: number } | null
  previous: QueueNeighbour | null
  next: QueueNeighbour | null
  // Plus aucun mail à traiter après le dernier traitement.
  ended: boolean
  onNavigate: (id: string) => void
  onClose: () => void
  onDone: (outcome: ValidateOutcome) => void
  onOpenEntity: OpenEntity
}) {
  const router = useRouter()
  const rootRef = useRef<HTMLDivElement>(null)
  const {
    data,
    error: loadError,
    reload,
  } = useFetchJson<SuggestionDetail>(id && !ended ? `/api/prospects/${id}` : null)
  const detail = data && data.id === id ? data : null

  const [formState, setFormState] = useState<FormState | null>(null)
  const [pending, setPending] = useState<"valider" | "rejeter" | null>(null)
  const [error, setError] = useState<{ decision: "valider" | "rejeter"; message: string } | null>(
    null,
  )
  const [leave, setLeave] = useState<Leave | null>(null)
  const [shownId, setShownId] = useState(id)

  // Nouveau mail affiché : formulaire et états du pied repartent de zéro.
  if (id !== shownId) {
    setShownId(id)
    setError(null)
    setLeave(null)
  }
  if (detail && formState?.id !== detail.id) {
    const initial = detail.actionsDetail.map(initialForm)
    setFormState({ id: detail.id, initial, forms: initial })
  }
  const forms = detail && formState?.id === detail.id ? formState.forms : null
  const saving = pending !== null

  // "Modifié" = une saisie ou une exclusion diffère de l'état d'ouverture.
  const dirty = useMemo(
    () =>
      formState !== null &&
      formState.forms.some(
        (f, i) =>
          f.enabled !== formState.initial[i].enabled ||
          Object.entries(f.values).some(([k, v]) => v !== formState.initial[i].values[k]),
      ),
    [formState],
  )

  const changes = useMemo(
    () =>
      detail && forms
        ? detail.actionsDetail.map((action, i) =>
            forms[i].enabled ? Object.keys(changedFields(action, forms[i])).length : 0,
          )
        : [],
    [detail, forms],
  )
  const totalChanges = changes.reduce((a, b) => a + b, 0)
  // Valider sans rien écrire n'a de sens que pour acter un lien vers une
  // fiche existante (ex. bien concerné) ; sinon le bouton reste désactivé.
  const canValidate =
    totalChanges > 0 || Boolean(detail?.actionsDetail.some((a) => a.op === "lien"))
  const changedEntities = detail
    ? detail.actionsDetail.filter((_, i) => changes[i] > 0).map((a) => a.entity)
    : []

  const focusTitle = useCallback(() => {
    requestAnimationFrame(() =>
      rootRef.current?.closest<HTMLElement>("[role=dialog]")?.querySelector("h2")?.focus(),
    )
  }, [])

  const goTo = useCallback(
    (target: string) => {
      setFormState(null)
      onNavigate(target)
      focusTitle()
    },
    [onNavigate, focusTitle],
  )

  // Échap, clic sur le voile et croix passent tous par ici : pas de sortie
  // pendant un enregistrement, confirmation si des saisies seraient perdues.
  function requestLeave(target: Leave) {
    if (saving) return
    if (dirty) {
      setLeave(target)
      return
    }
    doLeave(target)
  }

  function doLeave(target: Leave) {
    setLeave(null)
    setFormState(null)
    if (target.kind === "close") onClose()
    else if (target.kind === "navigate") goTo(target.id)
    else onOpenEntity(target.entity, target.id)
  }

  const requestClose = () => requestLeave({ kind: "close" })

  // Alt + ↑ / ↓ : mail précédent / suivant (pas depuis une liste déroulante,
  // ni pendant un enregistrement).
  const open = id !== null && !ended
  useEffect(() => {
    if (!open) return
    function handleKey(e: KeyboardEvent) {
      if (!e.altKey || (e.key !== "ArrowUp" && e.key !== "ArrowDown")) return
      const el = document.activeElement
      if (
        el instanceof HTMLSelectElement ||
        (el instanceof HTMLInputElement && el.list) ||
        el?.getAttribute("role") === "listbox" ||
        el?.getAttribute("aria-expanded") === "true"
      ) {
        return
      }
      e.preventDefault()
      if (saving) return
      const target = e.key === "ArrowUp" ? previous : next
      if (!target) return
      if (dirty) setLeave({ kind: "navigate", id: target.id })
      else goTo(target.id)
    }
    document.addEventListener("keydown", handleKey)
    return () => document.removeEventListener("keydown", handleKey)
  }, [open, saving, dirty, previous, next, goTo])

  async function send(decision: "valider" | "rejeter") {
    if (!detail || !forms) return
    setPending(decision)
    setError(null)
    try {
      const body =
        decision === "valider"
          ? {
              decision,
              actions: detail.actionsDetail.map((action, i) => ({
                enabled: forms[i].enabled,
                fields: changedFields(action, forms[i]),
              })),
            }
          : { decision }
      const res = await fetch(`/api/prospects/${detail.id}`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(body),
      })
      const json = await res.json().catch(() => ({}))
      if (!res.ok) {
        setError({ decision, message: json.error ?? "L'enregistrement a échoué. Réessayez." })
        return
      }
      setFormState(null)
      onDone({ id: detail.id, displayName: detail.displayName, decision, result: json.result })
      focusTitle()
      router.refresh()
    } catch {
      setError({ decision, message: "Connexion perdue - rien n'a été enregistré." })
    } finally {
      setPending(null)
    }
  }

  const source = detail ?? summary
  const header = ended
    ? { title: "Mails à traiter", subtitle: undefined }
    : {
        title: source?.displayName ?? "Chargement…",
        // Pas de texte de remplacement : sans objet, l'en-tête n'affiche que le nom.
        subtitle: source?.subject ?? undefined,
      }

  const toolbar =
    !ended && position ? (
      <nav
        aria-label="Mails à traiter"
        className="flex items-center justify-between border-b border-border bg-[color-mix(in_srgb,var(--muted)_40%,var(--card))] py-1 pr-3 pl-6"
      >
        <p aria-live="polite" className="text-sm text-muted-foreground tabular-nums">
          Mail {position.index} sur {position.total}
        </p>
        <div className="flex items-center gap-1">
          {previous && (
            <Button
              variant="ghost"
              size="default"
              onClick={() => requestLeave({ kind: "navigate", id: previous.id })}
              disabled={saving}
              aria-label={`Mail précédent : ${previous.displayName}`}
              title="Alt + ↑"
              className="h-9"
            >
              <ChevronLeft data-icon="inline-start" aria-hidden />
              Précédent
            </Button>
          )}
          {next && (
            <Button
              variant="ghost"
              size="default"
              onClick={() => requestLeave({ kind: "navigate", id: next.id })}
              disabled={saving}
              aria-label={`Mail suivant : ${next.displayName}`}
              title="Alt + ↓"
              className="h-9"
            >
              Suivant
              <ChevronRight data-icon="inline-end" aria-hidden />
            </Button>
          )}
        </div>
      </nav>
    ) : undefined

  const hasOther = (position?.total ?? 0) > 1
  const footer = ended ? undefined : leave ? (
    // Alerte sur fond neutre, texte puis boutons alignés à gauche ; l'icône
    // porte la couleur, le texte reste lisible.
    <div className="flex flex-col items-start gap-3 px-6 py-4">
      <div role="alert" className="flex items-start gap-2">
        <TriangleAlert aria-hidden className="mt-0.5 size-4 shrink-0 text-warning" />
        <div>
          <p className="text-sm font-medium text-foreground">
            Vos modifications sur ce mail ne sont pas enregistrées.
          </p>
          <p className="text-sm text-muted-foreground">{LEAVE_TEXT[leave.kind].consequence}</p>
        </div>
      </div>
      <div className="flex flex-wrap items-center gap-2 pl-6">
        <Button variant="outline" onClick={() => setLeave(null)} autoFocus>
          Rester ici
        </Button>
        <Button variant="destructive" onClick={() => doLeave(leave)}>
          {LEAVE_TEXT[leave.kind].confirm}
        </Button>
      </div>
    </div>
  ) : (
    <div className="flex flex-wrap items-center gap-2 px-6 py-3 sm:flex-nowrap">
      <Button
        variant="ghost"
        className="text-muted-foreground hover:bg-danger-bg hover:text-danger"
        disabled={!detail || saving}
        onClick={() => send("rejeter")}
      >
        {pending === "rejeter" ? "Ignorer…" : "Ignorer"}
      </Button>
      <span
        role={error ? "alert" : undefined}
        className={cn(
          "ml-auto min-w-0 text-right text-sm leading-snug",
          error ? "text-danger" : "text-muted-foreground",
        )}
      >
        {error
          ? error.message
          : detail
            ? totalChanges > 0
              ? `${totalChanges} champ${totalChanges > 1 ? "s" : ""} · ${joinNouns(changedEntities)}`
              : "Aucun changement"
            : null}
      </span>
      <Button
        onClick={() => send("valider")}
        disabled={!detail || saving || !canValidate}
        className="bg-primary-strong hover:bg-[color-mix(in_oklch,var(--primary-strong),var(--foreground)_15%)]"
      >
        {pending === "valider" ? (
          <>
            <Loader2 aria-hidden className="motion-safe:animate-spin" />
            Enregistrement…
          </>
        ) : error?.decision === "valider" ? (
          "Réessayer"
        ) : hasOther ? (
          "Valider et passer au suivant"
        ) : (
          "Valider"
        )}
      </Button>
    </div>
  )

  let body: React.ReactNode
  if (ended) {
    body = (
      <div className="flex flex-col items-center gap-1 py-16 text-center">
        <p className="text-sm font-medium text-foreground">Plus aucun mail à traiter</p>
        <p className="text-sm text-muted-foreground">
          Les mails traités sont dans l&apos;historique.
        </p>
        <Button variant="outline" onClick={onClose} className="mt-4">
          Fermer
        </Button>
      </div>
    )
  } else if (loadError && !detail) {
    body = (
      <div className="flex flex-col items-start gap-3">
        <p role="alert" className="text-sm text-danger">
          {loadError}
        </p>
        <Button variant="outline" onClick={reload}>
          Réessayer
        </Button>
      </div>
    )
  } else if (!detail || !forms) {
    body = <DrawerSkeleton />
  } else {
    const writable = detail.actionsDetail.filter((a, i) => a.op !== "lien" && forms[i].enabled)
    body = (
      <>
        <SummaryCard detail={detail} />
        <DrawerTabs
          key={detail.id}
          tabs={[
            {
              value: "fiches",
              label: `À enregistrer (${writable.length})`,
              content:
                detail.actionsDetail.length === 0 ? (
                  <p className="text-sm text-muted-foreground">
                    Ce mail ne permet pas de remplir une fiche. Ignorez-le, ou créez la fiche depuis
                    la page Contacts.
                  </p>
                ) : (
                  detail.actionsDetail.map((action, i) =>
                    action.op === "lien" ? (
                      <LienCard
                        key={`${action.entity}-${i}`}
                        action={action}
                        onOpenEntity={(entity, target) =>
                          requestLeave({ kind: "open", entity, id: target })
                        }
                      />
                    ) : (
                      <ActionCard
                        key={`${action.entity}-${i}`}
                        action={action}
                        form={forms[i]}
                        onChange={(nextForm) =>
                          setFormState((prev) =>
                            prev
                              ? {
                                  ...prev,
                                  forms: prev.forms.map((f, j) => (j === i ? nextForm : f)),
                                }
                              : prev,
                          )
                        }
                      />
                    ),
                  )
                ),
            },
            { value: "mail", label: "Mail d'origine", content: <Conversation detail={detail} /> },
          ]}
        />
      </>
    )
  }

  return (
    <SidePanel
      open={id !== null || ended}
      onClose={requestClose}
      title={header.title}
      subtitle={header.subtitle}
      toolbar={toolbar}
      footer={footer}
    >
      <div ref={rootRef} className="flex flex-col gap-6">
        {body}
      </div>
    </SidePanel>
  )
}
