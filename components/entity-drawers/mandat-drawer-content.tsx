"use client"

import { FileText, MapPin } from "lucide-react"
import { Card } from "@/components/detail-card"
import { MandatSummary, type MandatDetail } from "@/components/entity-drawers/mandat-summary"
import { MandatTypeBadge } from "@/components/mandat-type-badge"
import { DrawerState } from "@/components/entity-drawers/drawer-state"
import { useFetchJson } from "@/lib/use-fetch-json"

// Fiche mandat autonome ouverte depuis /mandats — le mandat n'a pas de page
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

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-3 rounded-[8px] border border-border bg-card p-5 shadow-[var(--shadow-card)]">
        <div className="flex items-center gap-2">
          <MandatTypeBadge type={mandat.type} />
          {mandat.categorie && (
            <span className="text-sm text-muted-foreground">{mandat.categorie}</span>
          )}
        </div>
        {mandat.bien && (
          <button
            type="button"
            onClick={() => onOpenBien(mandat.bien!.id)}
            className="flex items-center gap-1.5 text-left text-sm text-primary hover:underline"
          >
            <MapPin className="h-3.5 w-3.5 shrink-0" />
            {mandat.bien.titre || mandat.bien.adresse || mandat.bien.commune || "Bien sans adresse"}
          </button>
        )}
      </div>

      <Card title="Détails du mandat" icon={FileText}>
        <MandatSummary mandat={mandat} devise={mandat.bien?.devise} onOpenContact={onOpenContact} />
      </Card>
    </div>
  )
}
