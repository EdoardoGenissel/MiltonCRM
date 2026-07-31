"use client"

import {
  Building2,
  Calendar,
  Clock,
  ExternalLink,
  FileText,
  Images,
  Key,
  Leaf,
  MapPin,
  Ruler,
  Tag,
  User,
  Zap,
} from "lucide-react"
import { SourceBadge } from "@/components/source-badge"
import { Card, Field, EmptyState, Badge } from "@/components/detail-card"
import { MandatSummary, type MandatDetail } from "@/components/entity-drawers/mandat-summary"
import { useFetchJson } from "@/lib/use-fetch-json"
import { dateLabel, moneyLabel, boolLabelOuiNon } from "@/lib/format"

const ESTIMATION_STATUT_STYLES: Record<string, string> = {
  en_attente: "bg-secondary text-secondary-foreground",
  genere: "bg-primary/10 text-primary",
  envoye_commercial: "bg-success-bg text-success-foreground",
  envoye_client: "bg-success-bg text-success-foreground",
}

const ESTIMATION_STATUT_LABELS: Record<string, string> = {
  en_attente: "En attente",
  genere: "Généré",
  envoye_commercial: "Envoyé au commercial",
  envoye_client: "Envoyé au client",
}

type BienDetail = {
  id: string
  adresse: string | null
  adresseComplement: string | null
  commune: string | null
  codePostal: string | null
  typeBien: string | null
  surface: string | null
  prix: string | null
  devise: string | null
  statut: string | null
  source: string
  titre: string | null
  description: string | null
  photos: string[]
  pieces: number | null
  chambres: number | null
  etage: string | null
  residence: string | null
  quartier: string | null
  pays: string | null
  numeroClef: string | null
  meuble: boolean | null
  energieConsommation: string | null
  energieEmission: string | null
  attributs: string | null
  agence: string | null
  utilisateur: string | null
  referenceProduit: string | null
  proprietaireLabel: string | null
  creeLe: string | null
  majLe: string | null
  updatedAt: string
  mandats: MandatDetail[]
  estimations: { id: string; statut: string; cityscanReportUrl: string | null }[]
}

export function BienDrawerContent({
  id,
  onOpenContact,
  onOpenMandat,
}: {
  id: string
  onOpenContact: (id: string) => void
  onOpenMandat: (id: string) => void
}) {
  const { data: bien, error, loading } = useFetchJson<BienDetail>(`/api/biens/${id}`)

  if (loading || !bien) {
    return <p className="text-sm text-muted-foreground">{error ?? "Chargement…"}</p>
  }

  const adresseComplete = [bien.adresse, bien.adresseComplement].filter(Boolean).join(", ")
  const localisation = [bien.codePostal, bien.commune].filter(Boolean).join(" ")
  const title = bien.titre || bien.adresse || "Bien sans adresse"

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-3 rounded-[8px] border border-border bg-card p-5 shadow-[var(--shadow-card)]">
        <div className="flex items-center gap-4">
          <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-secondary text-secondary-foreground">
            <Building2 className="h-5 w-5" />
          </div>
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <h3 className="text-lg font-semibold tracking-tight text-foreground">{title}</h3>
              <SourceBadge source={bien.source} />
              {bien.mandats[0]?.categorie && <Badge>{bien.mandats[0].categorie}</Badge>}
              {bien.statut && <Badge>{bien.statut}</Badge>}
            </div>
            <div className="mt-1.5 flex items-center gap-1.5 text-sm text-muted-foreground">
              <MapPin className="h-3.5 w-3.5 shrink-0" />
              {adresseComplete || "Adresse inconnue"}
              {localisation ? ` - ${localisation}` : ""}
            </div>
          </div>
        </div>

        <div className="flex flex-wrap gap-4">
          {bien.prix && (
            <div>
              <div className="text-xs text-muted-foreground">Prix</div>
              <div className="text-lg font-semibold text-foreground">{moneyLabel(bien.prix, bien.devise)}</div>
            </div>
          )}
          {bien.surface && (
            <div>
              <div className="text-xs text-muted-foreground">Surface</div>
              <div className="text-lg font-semibold text-foreground">{bien.surface} m²</div>
            </div>
          )}
        </div>
      </div>

      <Card title="Propriétaire" icon={User}>
        {bien.mandats[0]?.proprietaire ? (
          <button
            type="button"
            onClick={() => onOpenContact(bien.mandats[0].proprietaire!.id)}
            className="inline-flex items-center gap-1.5 text-left text-sm text-primary hover:underline"
          >
            {bien.mandats[0].proprietaire.prenom} {bien.mandats[0].proprietaire.nom}
            <ExternalLink className="h-3 w-3" />
          </button>
        ) : bien.proprietaireLabel ? (
          <div className="text-sm text-foreground">
            {bien.proprietaireLabel}
            <p className="mt-1 text-xs text-muted-foreground">
              Fiche non rattachée automatiquement (plusieurs co-propriétaires ou identité ambiguë).
            </p>
          </div>
        ) : (
          <EmptyState label="Aucun propriétaire renseigné." />
        )}
      </Card>

      <Card title="Caractéristiques" icon={Ruler}>
        <dl className="grid grid-cols-2 gap-4 text-sm">
          <Field label="Type de bien" value={bien.typeBien} />
          <Field label="Catégorie" value={bien.mandats[0]?.categorie} />
          <Field label="Pièces" value={bien.pieces?.toString()} />
          <Field label="Chambres" value={bien.chambres?.toString()} />
          <Field label="Surface" value={bien.surface ? `${bien.surface} m²` : undefined} />
          <Field label="Étage" value={bien.etage} />
          <Field label="Résidence" value={bien.residence} />
          <Field label="Quartier" value={bien.quartier} />
          <Field label="Pays" value={bien.pays} />
          <Field label="Numéro de clef" value={bien.numeroClef} icon={Key} />
          <Field label="Meublé" value={boolLabelOuiNon(bien.meuble)} />
          <Field
            label="DPE - consommation"
            value={bien.energieConsommation ? `${bien.energieConsommation} kWh/m²/an` : undefined}
            icon={Zap}
          />
          <Field
            label="DPE - émissions"
            value={bien.energieEmission ? `${bien.energieEmission} kg CO₂/m²/an` : undefined}
            icon={Leaf}
          />
        </dl>
      </Card>

      {(bien.titre || bien.description) && (
        <Card title="Description" icon={FileText}>
          {bien.titre && <p className="mb-2 font-medium text-foreground">{bien.titre}</p>}
          {bien.description && <p className="whitespace-pre-wrap text-sm text-muted-foreground">{bien.description}</p>}
        </Card>
      )}

      {bien.photos.length > 0 && (
        <Card title="Photos" icon={Images}>
          <div className="grid grid-cols-2 gap-3">
            {bien.photos.map((url, index) => (
              // eslint-disable-next-line @next/next/no-img-element -- photos externes Apimo
              <img key={`${index}-${url}`} src={url} alt="" className="aspect-[4/3] w-full rounded-[8px] border border-border object-cover" />
            ))}
          </div>
        </Card>
      )}

      <Card title="Mandats" icon={Tag}>
        {bien.mandats.length === 0 ? (
          <EmptyState label="Aucun mandat lié à ce bien." />
        ) : (
          <ul className="flex flex-col gap-3">
            {bien.mandats.map((mandat) => (
              <li key={mandat.id}>
                <div
                  role="button"
                  tabIndex={0}
                  onClick={() => onOpenMandat(mandat.id)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" || e.key === " ") {
                      e.preventDefault()
                      onOpenMandat(mandat.id)
                    }
                  }}
                  className="w-full cursor-pointer rounded-[8px] border border-border p-4 text-left text-sm transition-colors hover:bg-muted/50"
                >
                  <MandatSummary mandat={mandat} devise={bien.devise} onOpenContact={onOpenContact} />
                </div>
              </li>
            ))}
          </ul>
        )}
      </Card>

      <Card title="Estimations" icon={Building2}>
        {bien.estimations.length === 0 ? (
          <EmptyState label="Aucune estimation liée. Elles apparaissent après soumission d'un formulaire JotForm." />
        ) : (
          <ul className="flex flex-col gap-2">
            {bien.estimations.map((estimation) => (
              <li key={estimation.id} className="flex items-center justify-between rounded-[8px] border border-border p-3 text-sm">
                <span
                  className={`rounded-[8px] px-2 py-0.5 text-xs font-medium ${
                    ESTIMATION_STATUT_STYLES[estimation.statut] ?? "bg-secondary text-secondary-foreground"
                  }`}
                >
                  {ESTIMATION_STATUT_LABELS[estimation.statut] ?? estimation.statut}
                </span>
                {estimation.cityscanReportUrl && (
                  <a
                    href={estimation.cityscanReportUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex items-center gap-1 text-primary hover:underline"
                  >
                    Rapport CityScan
                    <ExternalLink className="h-3 w-3" />
                  </a>
                )}
              </li>
            ))}
          </ul>
        )}
      </Card>

      <Card title="Suivi Apimo">
        <dl className="flex flex-col gap-3 text-sm">
          <Field label="Agence" value={bien.agence} />
          <Field label="Utilisateur" value={bien.utilisateur} />
          <Field label="Référence" value={bien.referenceProduit} />
          <Field label="Créé le" value={dateLabel(bien.creeLe)} icon={Calendar} />
          <Field label="Mise à jour le (Apimo)" value={dateLabel(bien.majLe)} icon={Clock} />
          <Field label="Dernière synchro CRM" value={dateLabel(bien.updatedAt)} icon={Clock} />
        </dl>
      </Card>

      {bien.attributs && (
        <Card title="Attributs">
          <p className="whitespace-pre-wrap text-sm text-foreground">{bien.attributs}</p>
        </Card>
      )}
    </div>
  )
}
