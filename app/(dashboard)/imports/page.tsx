import { Topbar } from "@/components/topbar"
import { listImportRuns } from "@/lib/imports/queries"
import { ImportForm } from "./import-form"

export const dynamic = "force-dynamic"

export default async function ImportsPage() {
  const runs = await listImportRuns()

  return (
    <>
      <Topbar title="Imports" />
      <div className="flex-1 overflow-auto p-8">
        <div className="grid grid-cols-3 gap-6">
          <div className="col-span-1 rounded-2xl border border-border bg-card p-6 shadow-[var(--shadow-card)]">
            <h2 className="mb-4 text-sm font-semibold text-foreground">Nouvel import</h2>
            <ImportForm />
          </div>

          <div className="col-span-2 overflow-hidden rounded-2xl border border-border bg-card shadow-[var(--shadow-card)]">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border text-left text-xs font-medium text-muted-foreground">
                  <th className="px-5 py-3">Date</th>
                  <th className="px-5 py-3">Source</th>
                  <th className="px-5 py-3">Fichier</th>
                  <th className="px-5 py-3">Statut</th>
                  <th className="px-5 py-3">Traités</th>
                  <th className="px-5 py-3">Doublons</th>
                </tr>
              </thead>
              <tbody>
                {runs.map((run) => (
                  <tr key={run.id} className="border-b border-border last:border-0">
                    <td className="px-5 py-3 text-muted-foreground">
                      {new Date(run.startedAt).toLocaleString("fr-FR")}
                    </td>
                    <td className="px-5 py-3 text-foreground">{run.source}</td>
                    <td className="px-5 py-3 text-muted-foreground">{run.fileName}</td>
                    <td className="px-5 py-3">
                      <span
                        className={
                          run.status === "success" ? "text-success" : "text-danger"
                        }
                      >
                        {run.status}
                      </span>
                    </td>
                    <td className="px-5 py-3 text-muted-foreground">{run.recordsUpserted}</td>
                    <td className="px-5 py-3 text-muted-foreground">{run.duplicatesFound}</td>
                  </tr>
                ))}
                {runs.length === 0 && (
                  <tr>
                    <td colSpan={6} className="px-5 py-10 text-center text-muted-foreground">
                      Aucun import effectué.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </>
  )
}
