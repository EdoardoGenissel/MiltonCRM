import Link from "next/link"
import { Topbar } from "@/components/topbar"
import { Pagination } from "@/components/pagination"
import { listEstimations } from "@/lib/estimations/queries"
import { parsePage } from "@/lib/pagination"

export const dynamic = "force-dynamic"

const STATUT_LABELS: Record<string, string> = {
  en_attente: "En attente",
  genere: "Généré",
  envoye_commercial: "Envoyé au commercial",
  envoye_client: "Envoyé au client",
}

export default async function EstimationsPage({
  searchParams,
}: {
  searchParams: Promise<{ page?: string }>
}) {
  const params = await searchParams
  const page = parsePage(params.page)
  const { items: estimations, total, totalPages } = await listEstimations(page)

  return (
    <>
      <Topbar title="Estimations" />
      <div className="flex-1 overflow-auto p-8">
        <div className="overflow-hidden rounded-2xl border border-border bg-card shadow-[var(--shadow-card)]">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border text-left text-xs font-medium text-muted-foreground">
                <th className="px-5 py-3">Date</th>
                <th className="px-5 py-3">Contact</th>
                <th className="px-5 py-3">Bien</th>
                <th className="px-5 py-3">Statut</th>
                <th className="px-5 py-3">Rapport</th>
              </tr>
            </thead>
            <tbody>
              {estimations.map((estimation) => (
                <tr key={estimation.id} className="border-b border-border last:border-0">
                  <td className="px-5 py-3 text-muted-foreground">
                    {new Date(estimation.createdAt).toLocaleDateString("fr-FR")}
                  </td>
                  <td className="px-5 py-3">
                    {estimation.contact ? (
                      <Link
                        href={`/contacts/${estimation.contact.id}`}
                        className="text-foreground hover:underline"
                      >
                        {estimation.contact.prenom} {estimation.contact.nom}
                      </Link>
                    ) : (
                      "—"
                    )}
                  </td>
                  <td className="px-5 py-3 text-muted-foreground">
                    {estimation.bien?.adresse ?? estimation.bien?.commune ?? "—"}
                  </td>
                  <td className="px-5 py-3 text-foreground">
                    {STATUT_LABELS[estimation.statut] ?? estimation.statut}
                  </td>
                  <td className="px-5 py-3">
                    {estimation.cityscanReportUrl ? (
                      <Link
                        href={estimation.cityscanReportUrl}
                        target="_blank"
                        className="text-primary hover:underline"
                      >
                        Voir le rapport
                      </Link>
                    ) : (
                      "—"
                    )}
                  </td>
                </tr>
              ))}
              {estimations.length === 0 && (
                <tr>
                  <td colSpan={5} className="px-5 py-10 text-center text-muted-foreground">
                    Aucune estimation. Elles apparaîtront ici après soumission d&apos;un
                    formulaire JotForm.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        <Pagination page={page} total={total} totalPages={totalPages} searchParams={params} />
      </div>
    </>
  )
}
