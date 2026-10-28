"use client"

import { useRouter } from "next/navigation"
import { useEffect, useMemo, useState } from "react"
import { Modal } from "@/components/ui/modal"
import { Button } from "@/components/ui/button"
import { FieldInput } from "@/components/field-input"
import { cn } from "@/lib/utils"
import { useFetchJson } from "@/lib/use-fetch-json"
import { FIELDS } from "@/lib/prospects-mail/fields"
import type { ActionDetail, SuggestionDetail } from "@/lib/prospects-mail/details"
import type { ApplyResult } from "@/lib/prospects-mail/apply"
import { actionLabel, parseThread, senderName } from "./shared"

type ActionForm = { enabled: boolean; showAll: boolean; values: Record<string, string> }

// Valeur de départ de chaque champ : la proposition si elle est retenue par
// défaut (champ vide en base), sinon la valeur actuelle - une proposition qui
// écraserait une valeur existante reste à appliquer d'un clic.
function initialForm(action: ActionDetail): ActionForm {
  const values: Record<string, string> = {}
  for (const def of FIELDS[action.entity]) {
    const proposal = action.fields.find((f) => f.key === def.key)
    values[def.key] = proposal?.selected ? proposal.proposed : (action.currentValues[def.key] ?? "")
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

// Une fiche à relire : tableau Champ | Actuel | Nouveau. La colonne "Actuel"
// disparaît pour une création (tout y serait vide).
function RecordReview({
  action,
  form,
  onChange,
}: {
  action: ActionDetail
  form: ActionForm
  onChange: (form: ActionForm) => void
}) {
  const isCreate = action.op === "create"
  const defs = FIELDS[action.entity]
  const isChanged = (key: string) => form.values[key].trim() !== (action.currentValues[key] ?? "")
  const proposedKeys = new Set(action.fields.map((f) => f.key))
  const rows = form.showAll ? defs : defs.filter((d) => proposedKeys.has(d.key) || isChanged(d.key))
  const hidden = defs.length - rows.length
  const setValue = (key: string, value: string) =>
    onChange({ ...form, values: { ...form.values, [key]: value } })

  if (action.op === "lien") {
    return (
      <p className="text-sm text-muted-foreground">
        {actionLabel(action)} :{" "}
        <span className="font-medium text-foreground">{action.targetLabel}</span>
        {action.matchReason && ` (${action.matchReason})`}
      </p>
    )
  }

  return (
    <section className={cn("transition-opacity", !form.enabled && "opacity-50")}>
      <header className="flex items-start justify-between gap-4 pb-3">
        <div className="min-w-0">
          <h3 className="text-sm font-semibold text-foreground">{actionLabel(action)}</h3>
          <p className="truncate text-xs text-muted-foreground">
            {action.targetLabel
              ? `${action.targetLabel}${action.matchReason ? ` · retrouvé par ${action.matchReason}` : ""}`
              : "Fiche créée à la validation"}
            {!form.enabled && " · ne sera pas modifiée"}
          </p>
        </div>
        <label className="flex shrink-0 cursor-pointer items-center gap-2 text-xs text-muted-foreground select-none">
          <input
            type="checkbox"
            checked={form.enabled}
            onChange={(e) => onChange({ ...form, enabled: e.target.checked })}
            className="h-4 w-4 accent-primary"
          />
          Enregistrer cette fiche
        </label>
      </header>

      <div className="overflow-hidden rounded-md border border-border bg-card">
        <div
          className={cn(
            "hidden border-b border-border bg-muted/50 px-4 py-2 text-xs font-medium text-muted-foreground sm:grid sm:gap-4",
            isCreate
              ? "sm:grid-cols-[140px_minmax(0,1fr)]"
              : "sm:grid-cols-[140px_minmax(0,0.8fr)_minmax(0,1.2fr)]",
          )}
        >
          <span>Champ</span>
          {!isCreate && <span>Actuel</span>}
          <span>{isCreate ? "Valeur" : "Nouveau"}</span>
        </div>

        <fieldset disabled={!form.enabled} className="divide-y divide-border">
          {rows.map((def) => {
            const current = action.currentValues[def.key]
            const proposal = action.fields.find((f) => f.key === def.key)?.proposed
            const changed = isChanged(def.key)
            const id = `review-${action.entity}-${def.key}`
            return (
              <div
                key={def.key}
                className={cn(
                  "relative grid gap-1.5 px-4 py-2.5 sm:items-start sm:gap-4",
                  isCreate
                    ? "sm:grid-cols-[140px_minmax(0,1fr)]"
                    : "sm:grid-cols-[140px_minmax(0,0.8fr)_minmax(0,1.2fr)]",
                  // Fond teal léger : la ligne sera écrite en base.
                  changed && !isCreate && "bg-primary/[0.04]",
                )}
              >
                <label htmlFor={id} className="pt-2 text-sm text-muted-foreground">
                  {def.label}
                </label>
                {!isCreate && (
                  <span
                    className={cn(
                      "pt-2 text-sm break-words",
                      current ? "text-foreground/70" : "text-muted-foreground",
                      changed && current && "line-through decoration-muted-foreground/50",
                    )}
                  >
                    {current ?? "-"}
                  </span>
                )}
                <div className="flex min-w-0 flex-col gap-1">
                  <FieldInput
                    id={id}
                    def={def}
                    value={form.values[def.key]}
                    onChange={(value) => setValue(def.key, value)}
                    className="h-9"
                  />
                  {proposal !== undefined && proposal !== form.values[def.key] && (
                    <button
                      type="button"
                      onClick={() => setValue(def.key, proposal)}
                      className="w-fit max-w-full truncate text-left text-xs text-primary hover:underline"
                    >
                      Utiliser la valeur du mail : « {proposal} »
                    </button>
                  )}
                  {changed && current && proposal === form.values[def.key] && !isCreate && (
                    <button
                      type="button"
                      onClick={() => setValue(def.key, current)}
                      className="w-fit text-left text-xs text-muted-foreground hover:text-foreground hover:underline"
                    >
                      Garder la valeur actuelle
                    </button>
                  )}
                </div>
              </div>
            )
          })}
          {rows.length === 0 && (
            <p className="px-4 py-3 text-sm text-muted-foreground">Fiche déjà à jour.</p>
          )}
        </fieldset>

        {hidden > 0 && (
          <button
            type="button"
            onClick={() => onChange({ ...form, showAll: true })}
            className="w-full border-t border-border px-4 py-2 text-left text-xs text-muted-foreground hover:bg-muted/40 hover:text-foreground"
          >
            Modifier d&apos;autres champs ({hidden})
          </button>
        )}
      </div>
    </section>
  )
}

function Conversation({ detail }: { detail: SuggestionDetail }) {
  const messages = parseThread(detail.excerpt)
  return (
    <aside className="flex flex-col border-t border-border bg-muted/40 lg:min-h-0 lg:overflow-auto lg:border-t-0 lg:border-l">
      {detail.resume && (
        <div className="border-b border-border px-5 py-4">
          <p className="text-sm font-semibold text-foreground">Résumé</p>
          <p className="mt-1.5 text-sm leading-relaxed text-foreground">{detail.resume}</p>
          {detail.origine && (
            <p className="mt-2 text-xs text-muted-foreground">Arrivé via {detail.origine}</p>
          )}
        </div>
      )}
      <ol className="flex flex-col gap-3 p-4">
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
        {messages.length === 0 && (
          <p className="text-sm text-muted-foreground">Contenu du mail indisponible.</p>
        )}
      </ol>
    </aside>
  )
}

// Issue d'un traitement réussi, remontée à la page (notification + mail suivant).
export type ValidateOutcome = {
  id: string
  displayName: string
  decision: "valider" | "rejeter"
  result?: ApplyResult
}

function ValidateForm({
  detail,
  confirmingClose,
  onKeepEditing,
  onDiscard,
  onRequestClose,
  onDirtyChange,
  onSavingChange,
  onDone,
}: {
  detail: SuggestionDetail
  confirmingClose: boolean
  onKeepEditing: () => void
  onDiscard: () => void
  onRequestClose: () => void
  onDirtyChange: (dirty: boolean) => void
  onSavingChange: (saving: boolean) => void
  onDone: (outcome: ValidateOutcome) => void
}) {
  const router = useRouter()
  const [initialForms] = useState(() => detail.actionsDetail.map(initialForm))
  const [forms, setForms] = useState(initialForms)
  const [pending, setPending] = useState<"valider" | "rejeter" | null>(null)
  const [error, setError] = useState<string | null>(null)

  // "Modifié" = une saisie ou une case "Enregistrer cette fiche" diffère de l'état d'ouverture.
  const dirty = useMemo(
    () =>
      forms.some(
        (f, i) =>
          f.enabled !== initialForms[i].enabled ||
          Object.entries(f.values).some(([k, v]) => v !== initialForms[i].values[k]),
      ),
    [forms, initialForms],
  )
  useEffect(() => onDirtyChange(dirty), [dirty, onDirtyChange])

  const changes = useMemo(
    () =>
      detail.actionsDetail.map((action, i) =>
        forms[i].enabled ? Object.keys(changedFields(action, forms[i])).length : 0,
      ),
    [detail.actionsDetail, forms],
  )
  const totalChanges = changes.reduce((a, b) => a + b, 0)
  const records = changes.filter((n) => n > 0).length
  // Valider sans rien écrire n'a de sens que pour acter un lien vers une
  // fiche existante (ex. bien concerné) ; sinon le bouton reste désactivé.
  const canValidate = totalChanges > 0 || detail.actionsDetail.some((a) => a.op === "lien")

  async function send(decision: "valider" | "rejeter") {
    setPending(decision)
    onSavingChange(true)
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
      const data = await res.json().catch(() => ({}))
      if (!res.ok) {
        setError(data.error ?? "L'enregistrement a échoué. Réessayez dans un instant.")
        return
      }
      onDone({ id: detail.id, displayName: detail.displayName, decision, result: data.result })
      router.refresh()
    } catch {
      setError("Connexion perdue - rien n'a été enregistré.")
    } finally {
      setPending(null)
      onSavingChange(false)
    }
  }

  return (
    <div className="flex h-full min-h-0 flex-col">
      {/* Sous lg : relecture puis mail dans un seul défilement ; au-delà, deux
          colonnes qui défilent chacune. */}
      <div className="grid min-h-0 flex-1 overflow-auto lg:grid-cols-[minmax(0,1fr)_400px] lg:overflow-hidden">
        <div className="flex flex-col gap-8 px-4 py-5 sm:px-6 sm:py-6 lg:min-h-0 lg:overflow-auto">
          {detail.actionsDetail.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              Ce mail ne permet pas de remplir une fiche. Rejetez-le, ou créez la fiche depuis la
              page Contacts.
            </p>
          ) : (
            detail.actionsDetail.map((action, i) => (
              <RecordReview
                key={`${action.entity}-${i}`}
                action={action}
                form={forms[i]}
                onChange={(next) => setForms((prev) => prev.map((f, j) => (j === i ? next : f)))}
              />
            ))
          )}
        </div>
        <Conversation detail={detail} />
      </div>

      <footer className="flex shrink-0 flex-wrap items-center gap-2 border-t border-border bg-card px-6 py-3">
        {confirmingClose ? (
          <>
            <span role="alert" className="text-sm text-foreground">
              Vos modifications sur ce mail ne sont pas enregistrées.
            </span>
            <div className="ml-auto flex items-center gap-2">
              <Button variant="outline" onClick={onKeepEditing} autoFocus>
                Continuer l&apos;édition
              </Button>
              <Button variant="destructive" onClick={onDiscard}>
                Fermer sans enregistrer
              </Button>
            </div>
          </>
        ) : (
          <>
            <Button
              variant="ghost"
              className="text-muted-foreground hover:bg-danger-bg hover:text-danger"
              disabled={pending !== null}
              onClick={() => send("rejeter")}
            >
              {pending === "rejeter" ? "Rejet…" : "Rejeter le mail"}
            </Button>
            <div className="ml-auto flex items-center gap-3">
              <span
                role={error ? "alert" : undefined}
                className={cn("text-sm", error ? "text-danger" : "text-muted-foreground")}
              >
                {error ??
                  (totalChanges > 0
                    ? `${totalChanges} champ${totalChanges > 1 ? "s" : ""} · ${records} fiche${records > 1 ? "s" : ""}`
                    : "Aucun changement")}
              </span>
              <Button variant="outline" onClick={onRequestClose} disabled={pending !== null}>
                Fermer
              </Button>
              <Button onClick={() => send("valider")} disabled={pending !== null || !canValidate}>
                {pending === "valider" ? "Enregistrement…" : "Valider et enregistrer"}
              </Button>
            </div>
          </>
        )}
      </footer>
    </div>
  )
}

// Silhouette de la fenêtre pendant le chargement du mail (même découpage que
// le formulaire), plutôt qu'un texte seul.
function ModalSkeleton({ error }: { error: string | null }) {
  if (error) return <p className="p-6 text-sm text-danger">{error}</p>
  const bar = "rounded bg-muted motion-safe:animate-pulse"
  return (
    <div
      role="status"
      aria-label="Chargement du mail"
      className="grid h-full lg:grid-cols-[minmax(0,1fr)_400px]"
    >
      <div className="flex flex-col gap-4 p-6">
        <div className={cn(bar, "h-4 w-40")} />
        <div className="flex flex-col gap-3 rounded-md border border-border p-4">
          {[0, 1, 2, 3].map((i) => (
            <div key={i} className="grid grid-cols-[140px_1fr_1.2fr] gap-4">
              <div className={cn(bar, "h-3")} />
              <div className={cn(bar, "h-3")} />
              <div className={cn(bar, "h-8")} />
            </div>
          ))}
        </div>
      </div>
      <div className="hidden flex-col gap-3 border-l border-border bg-muted/40 p-5 lg:flex">
        <div className={cn(bar, "h-3 w-24")} />
        <div className={cn(bar, "h-16")} />
        <div className={cn(bar, "h-40")} />
      </div>
    </div>
  )
}

export function ValidateModal({
  id,
  onClose,
  onDone,
}: {
  id: string | null
  onClose: () => void
  onDone: (outcome: ValidateOutcome) => void
}) {
  const { data: detail, error } = useFetchJson<SuggestionDetail>(id ? `/api/prospects/${id}` : null)
  const ready = detail && detail.id === id
  const [dirty, setDirty] = useState(false)
  const [saving, setSaving] = useState(false)
  const [confirmingClose, setConfirmingClose] = useState(false)

  // Échap, clic à l'extérieur, croix et "Fermer" passent tous par ici : pas de
  // fermeture pendant un enregistrement, confirmation si des saisies seraient
  // perdues.
  function requestClose() {
    if (saving) return
    if (dirty) setConfirmingClose(true)
    else onClose()
  }

  function reset() {
    setDirty(false)
    setConfirmingClose(false)
  }

  return (
    <Modal
      open={id !== null}
      onClose={requestClose}
      className="h-[90vh] max-w-6xl"
      title={ready ? detail.displayName : "Chargement…"}
      subtitle={ready ? (detail.subject ?? "(sans objet)") : undefined}
    >
      {ready ? (
        <ValidateForm
          key={detail.id}
          detail={detail}
          confirmingClose={confirmingClose}
          onKeepEditing={() => setConfirmingClose(false)}
          onDiscard={() => {
            reset()
            onClose()
          }}
          onRequestClose={requestClose}
          onDirtyChange={setDirty}
          onSavingChange={setSaving}
          onDone={(outcome) => {
            reset()
            onDone(outcome)
          }}
        />
      ) : (
        <ModalSkeleton error={error} />
      )}
    </Modal>
  )
}
