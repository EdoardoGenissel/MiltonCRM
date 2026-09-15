"use client"

import { FileText, MapPin } from "lucide-react"
import { Card } from "@/components/detail-card"
import { MandatSummary, type MandatDetail } from "@/components/entity-drawers/mandat-summary"
import { MandatTypeBadge } from "@/components/mandat-type-badge"
import { mandatBadgeLabel, mandatTypeComplement } from "@/lib/mandats/mandat-label"
import { drawerLink } from "@/components/entity-drawers/drawer-link"
import { DrawerState } from "@/components/entity-drawers/drawer-state"
import { useFetchJson } from "@/lib/use-fetch-json"

// Fiche mandat autonome ouverte depuis /mandats - le mandat n'a pas de page
// dédiée dans l'app (il vivait intégré à la fiche bien), ce drawer en fait un
// point d'entrée à part entière tout en réutilisant le même contenu détaillé.
export function MandatDrawerContent({
  id,
  onOpenContact,
  onOpenBien,
}: {
  id: string
  onOpenContact: (id: string) => void
  onOpenBien: (id: string) => void
}) {
  const { data: mandat, error, loading } = useFetchJson<MandatDetail>(`/api/mandats/${id}`)

  if (loading || !mandat) {
    return <DrawerState error={error} />
  }

  const typeComplement = mandatTypeComplement(mandat)

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-3 rounded-md border border-border bg-card p-5 shadow-[var(--shadow-card)]">
        <div className="flex flex-wrap items-center gap-2">
          <MandatTypeBadge type={mandatBadgeLabel(mandat)} />
          {typeComplement && (
            <span className="text-sm text-muted-foreground">{typeComplement}</span>
          )}
          <span className="text-xs text-muted-foreground">
            · {mandat.statut ?? "statut inconnu"}
          </span>
        </div>
        {mandat.bien && (
          <button
            type="button"
            onClick={() => onOpenBien(mandat.bien!.id)}
            className={`flex items-center gap-1.5 text-sm ${drawerLink}`}
          >
            <MapPin className="h-3.5 w-3.5 shrink-0" />
            {mandat.bien.titre || mandat.bien.adresse || mandat.bien.commune || "Bien sans adresse"}
          </button>
        )}
      </div>

      <Card title="Détails du mandat" icon={FileText}>
        <MandatSummary
          mandat={mandat}
          devise={mandat.bien?.devise}
          onOpenContact={onOpenContact}
          showHeader={false}
        />
      </Card>
    </div>
  )
}
