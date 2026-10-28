import { Topbar } from "@/components/topbar"
import { FilterBar } from "@/components/filter-bar"
import { TabStrip } from "@/components/ui/tab-strip"
import { buildQuery, toArray } from "@/lib/search-params"
import {
  HISTORY_PAGE_SIZE,
  HISTORY_STATUTS,
  lastMailSync,
  listProspectsBoard,
  PERIODES,
} from "@/lib/prospects-mail/queries"
import { ProspectsBoard } from "./prospects-board"
import { FiltersButton } from "./prospects-toolbar"

export const dynamic = "force-dynamic"

type ProspectsSearchParams = Record<string, string | string[] | undefined>

// Page Prospects : onglet "À traiter" (file + mails traités du jour) et onglet
// "Historique" (timeline : validés, ignorés, écartés par l'analyse, erreurs) -
// cf. lib/prospects-mail/. L'analyse des boîtes tourne en tâche planifiée
// (netlify/functions/prospects-mail-cron.mts) : pas de déclenchement manuel
// ici. Onglet (?vue=historique), recherche et filtres passent par l'URL ;
// l'onglet ne change que l'affichage, pas la requête.
export default async function ProspectsPage({
  searchParams,
}: {
  searchParams: Promise<ProspectsSearchParams>
}) {
  const params = await searchParams
  const historyLimit = Math.max(
    HISTORY_PAGE_SIZE,
    Number(toArray(params.hl)[0]) || HISTORY_PAGE_SIZE,
  )

  const [board, lastSync] = await Promise.all([
    listProspectsBoard({
      search: toArray(params.search)[0],
      periode: toArray(params.periode)[0],
      statuts: toArray(params.statut),
      boites: toArray(params.boite),
      par: toArray(params.par),
      historyLimit,
    }),
    lastMailSync(),
  ])

  const moreHistoryHref =
    board.history.length < board.historyTotal
      ? `?${buildQuery(params, { set: { hl: String(historyLimit + HISTORY_PAGE_SIZE) } }).toString()}`
      : null

  const vue = toArray(params.vue)[0] === "historique" ? "historique" : "a-traiter"
  const vueHref = (value?: string) => `?${buildQuery(params, { set: { vue: value } }).toString()}`

  return (
    <>
      <Topbar title="Prospects" />
      <div className="flex-1 overflow-auto p-8">
        <FilterBar
          searchParams={params}
          searchPlaceholder="Nom, objet, résumé…"
          filterKeys={["periode", "statut", "boite", "par"]}
          keyLabels={{ periode: "Reçus", statut: "Statut", boite: "Boîte", par: "Traité par" }}
          valueLabels={{
            periode: Object.fromEntries(PERIODES.map((p) => [p.value, p.label])),
            statut: Object.fromEntries(HISTORY_STATUTS.map((s) => [s.value, s.label])),
            par: Object.fromEntries(board.facets.par.map((p) => [p, p.split("@")[0]])),
          }}
          keepOnReset={["vue"]}
          tabs={
            <TabStrip
              items={[
                {
                  key: "a-traiter",
                  label: (
                    <>
                      À traiter{" "}
                      <span className="text-muted-foreground tabular-nums">
                        {board.pending.length}
                      </span>
                    </>
                  ),
                  active: vue === "a-traiter",
                  href: vueHref(undefined),
                },
                {
                  key: "historique",
                  label: "Historique",
                  active: vue === "historique",
                  href: vueHref("historique"),
                },
              ]}
            />
          }
          filters={<FiltersButton searchParams={params} facets={board.facets} vue={vue} />}
        />
        <ProspectsBoard
          vue={vue}
          pending={board.pending}
          history={board.history}
          historyHref={vueHref("historique")}
          moreHistoryHref={moreHistoryHref}
          lastSyncAt={lastSync?.startedAt.toISOString() ?? null}
        />
      </div>
    </>
  )
}
