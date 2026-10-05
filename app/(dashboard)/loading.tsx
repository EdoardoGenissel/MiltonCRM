import { Topbar } from "@/components/topbar"
import { TableCard, TableHeadRow } from "@/components/ui/data-table"

const COLUMNS = 6
const ROWS = 10

function Bar({ className }: { className: string }) {
  return <div className={`animate-pulse rounded-md bg-muted ${className}`} />
}

// Affiché dès le clic dans la sidebar, le temps que la page serveur (auth +
// requêtes Prisma, toutes en `force-dynamic`) soit rendue - sans lui Next.js
// garde l'ancienne page figée sans retour visuel. Calque la mise en page des
// pages liste (FilterBar puis TableCard).
export default function DashboardLoading() {
  return (
    <>
      <Topbar title="" />
      <div className="flex-1 overflow-auto p-8" aria-busy="true" aria-label="Chargement">
        <div className="mb-6 flex items-center gap-3">
          <Bar className="h-9 w-72" />
          <Bar className="h-9 w-48" />
        </div>
        <TableCard>
          <TableHeadRow>
            {Array.from({ length: COLUMNS }, (_, i) => (
              <th key={i} className="px-5 py-3">
                <Bar className="h-3 w-20" />
              </th>
            ))}
          </TableHeadRow>
          <tbody>
            {Array.from({ length: ROWS }, (_, row) => (
              <tr key={row} className="border-b border-border last:border-0">
                {Array.from({ length: COLUMNS }, (_, col) => (
                  <td key={col} className="px-5 py-3.5">
                    <Bar className={col === 0 ? "h-4 w-40" : "h-4 w-24"} />
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </TableCard>
      </div>
    </>
  )
}
