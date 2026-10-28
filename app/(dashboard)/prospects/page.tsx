import { Topbar } from "@/components/topbar"
import { FilterBar } from "@/components/filter-bar"
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

// Page Prospects : à gauche les mails à traiter, à droite l'historique
// (validés, rejetés, écartés par l'analyse, erreurs) - cf. lib/prospects-mail/.
// L'analyse des boîtes tourne en tâche planifiée (netlify/functions/
// prospects-mail-cron.mts) : pas de déclenchement manuel ici. Recherche et
// filtres (bouton "Filtres") passent par l'URL.
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

  return (
    <>
      <Topbar title="Prospects" />
      <div className="flex min-h-0 flex-1 flex-col p-8 lg:h-[calc(100vh-4rem)]">
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
          tabs={<FiltersButton searchParams={params} facets={board.facets} />}
        />
        <ProspectsBoard
          pending={board.pending}
          history={board.history}
          historyTotal={board.historyTotal}
          moreHistoryHref={moreHistoryHref}
          lastSyncAt={lastSync?.startedAt.toISOString() ?? null}
        />
      </div>
    </>
  )
}
