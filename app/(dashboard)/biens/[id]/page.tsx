import { notFound } from "next/navigation"
import Link from "next/link"
import {
  ArrowLeft,
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
  Wallet,
  Zap,
} from "lucide-react"
import { Topbar } from "@/components/topbar"
import { SourceBadge } from "@/components/source-badge"
import { getBienById } from "@/lib/biens/queries"

export const dynamic = "force-dynamic"

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

export default async function BienDetailPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  const bien = await getBienById(id)
  if (!bien) notFound()

  const adresseComplete = [bien.adresse, bien.adresseComplement].filter(Boolean).join(", ")
  const localisation = [bien.codePostal, bien.commune].filter(Boolean).join(" ")
  const title = bien.titre || bien.adresse || "Bien sans adresse"

  return (
    <>
      <Topbar title={title} />
      <div className="flex-1 overflow-auto p-8">
        <Link
          href="/biens"
          className="mb-5 inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft className="h-3.5 w-3.5" />
          Biens
        </Link>

        <div className="mb-6 flex flex-col justify-between gap-4 rounded-2xl border border-border bg-card p-6 shadow-[var(--shadow-card)] sm:flex-row sm:items-center">
          <div className="flex items-center gap-4">
            <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-secondary text-secondary-foreground">
              <Building2 className="h-5 w-5" />
            </div>
            <div>
              <div className="flex flex-wrap items-center gap-2">
                <h1 className="text-xl font-semibold tracking-tight text-foreground">{title}</h1>
                <SourceBadge source={bien.source} />
                {bien.mandats[0]?.categorie && <Badge>{bien.mandats[0].categorie}</Badge>}
                {bien.statut && <Badge>{bien.statut}</Badge>}
              </div>
              <div className="mt-1.5 flex items-center gap-1.5 text-sm text-muted-foreground">
                <MapPin className="h-3.5 w-3.5 shrink-0" />
                {adresseComplete || "Adresse inconnue"}
                {localisation ? ` — ${localisation}` : ""}
              </div>
            </div>
          </div>

          <div className="flex flex-wrap gap-4 text-right">
            {bien.prix && (
              <div>
                <div className="text-xs text-muted-foreground">Prix</div>
                <div className="text-lg font-semibold text-foreground">
                  {moneyLabel(bien.prix, bien.devise)}
                </div>
              </div>
            )}
            {bien.surface && (
              <div>
                <div className="text-xs text-muted-foreground">Surface</div>
                <div className="text-lg font-semibold text-foreground">{bien.surface.toString()} m²</div>
              </div>
            )}
          </div>
        </div>

        <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
          <section className="flex flex-col gap-6 lg:col-span-2">
            <Card title="Caractéristiques" icon={Ruler}>
              <dl className="grid grid-cols-2 gap-4 text-sm">
                <Field label="Type de bien" value={bien.typeBien} />
                <Field label="Catégorie" value={bien.mandats[0]?.categorie} />
                <Field label="Pièces" value={bien.pieces?.toString()} />
                <Field label="Chambres" value={bien.chambres?.toString()} />
                <Field label="Surface" value={bien.surface ? `${bien.surface.toString()} m²` : undefined} />
                <Field label="Étage" value={bien.etage} />
                <Field label="Résidence" value={bien.residence} />
                <Field label="Quartier" value={bien.quartier} />
                <Field label="Pays" value={bien.pays} />
                <Field label="Numéro de clef" value={bien.numeroClef} icon={Key} />
                <Field
                  label="DPE — consommation"
                  value={bien.energieConsommation ? `${bien.energieConsommation.toString()} kWh/m²/an` : undefined}
                  icon={Zap}
                />
                <Field
                  label="DPE — émissions"
                  value={bien.energieEmission ? `${bien.energieEmission.toString()} kg CO₂/m²/an` : undefined}
                  icon={Leaf}
                />
              </dl>
            </Card>

            {(bien.titre || bien.description) && (
              <Card title="Description" icon={FileText}>
                {bien.titre && <p className="mb-2 font-medium text-foreground">{bien.titre}</p>}
                {bien.description && (
                  <p className="whitespace-pre-wrap text-sm text-muted-foreground">{bien.description}</p>
                )}
              </Card>
            )}

            {bien.photos.length > 0 && (
              <Card title="Photos" icon={Images}>
                <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
                  {bien.photos.map((url) => (
                    // eslint-disable-next-line @next/next/no-img-element -- photos externes Apimo, pas d'optimisation next/image nécessaire pour un usage interne CRM
                    <img
                      key={url}
                      src={url}
                      alt=""
                      className="aspect-[4/3] w-full rounded-lg border border-border object-cover"
                    />
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
                    <li
                      key={mandat.id}
                      id={`mandat-${mandat.id}`}
                      className="scroll-mt-8 rounded-lg border border-border p-4 text-sm target:ring-2 target:ring-primary"
                    >
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <div className="flex items-center gap-2">
                          <span className="font-medium text-foreground">{mandat.type}</span>
                          {mandat.categorie && <Badge>{mandat.categorie}</Badge>}
                        </div>
                        <span className="text-xs text-muted-foreground">
                          {mandat.statut ?? "statut inconnu"}
                        </span>
                      </div>
                      <dl className="mt-3 grid grid-cols-2 gap-3">
                        <Field
                          label="Propriétaire"
                          value={
                            mandat.proprietaire ? (
                              <Link
                                href={`/contacts/${mandat.proprietaire.id}`}
                                className="text-primary hover:underline"
                              >
                                {mandat.proprietaire.prenom} {mandat.proprietaire.nom}
                              </Link>
                            ) : (
                              (bien.proprietaireLabel ?? undefined)
                            )
                          }
                          icon={User}
                        />
                        <Field label="Co-agent" value={mandat.coAgent} />
                        <Field label="Démarrage mandat" value={dateLabel(mandat.dateSignature)} icon={Calendar} />
                        <Field label="Fin mandat" value={dateLabel(mandat.finMandat)} icon={Calendar} />
                        <Field
                          label="Montant propriétaire"
                          value={moneyLabel(mandat.montantProprietaire, bien.devise)}
                          icon={Wallet}
                        />
                        <Field
                          label="Montant compromis"
                          value={moneyLabel(mandat.montantCompromis, bien.devise)}
                          icon={Wallet}
                        />
                        <Field label="Honoraires propriétaire" value={moneyLabel(mandat.honorairesProprietaire, bien.devise)} />
                        <Field label="Honoraires acheteur" value={moneyLabel(mandat.honorairesAcheteur, bien.devise)} />
                        <Field label="Vendu le" value={dateLabel(mandat.venduLe)} />
                        <Field label="Origine" value={[mandat.origine, mandat.originePrecise].filter(Boolean).join(" — ") || undefined} />
                      </dl>
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
                    <li
                      key={estimation.id}
                      className="flex items-center justify-between rounded-lg border border-border p-3 text-sm"
                    >
                      <span
                        className={`rounded-md px-2 py-0.5 text-xs font-medium ${
                          ESTIMATION_STATUT_STYLES[estimation.statut] ?? "bg-secondary text-secondary-foreground"
                        }`}
                      >
                        {ESTIMATION_STATUT_LABELS[estimation.statut] ?? estimation.statut}
                      </span>
                      {estimation.cityscanReportUrl && (
                        <Link
                          href={estimation.cityscanReportUrl}
                          className="inline-flex items-center gap-1 text-primary hover:underline"
                          target="_blank"
                        >
                          Rapport CityScan
                          <ExternalLink className="h-3 w-3" />
                        </Link>
                      )}
                    </li>
                  ))}
                </ul>
              )}
            </Card>
          </section>

          <section className="flex flex-col gap-6">
            <Card title="Propriétaire" icon={User}>
              {bien.mandats[0]?.proprietaire ? (
                <Link
                  href={`/contacts/${bien.mandats[0].proprietaire.id}`}
                  className="inline-flex items-center gap-1.5 text-sm text-primary hover:underline"
                >
                  {bien.mandats[0].proprietaire.prenom} {bien.mandats[0].proprietaire.nom}
                  <ExternalLink className="h-3 w-3" />
                </Link>
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

            <Card title="Suivi Apimo">
              <dl className="flex flex-col gap-3 text-sm">
                <Field label="Agence" value={bien.agence} />
                <Field label="Utilisateur" value={bien.utilisateur} />
                <Field label="Référence" value={bien.referenceProduit} />
                <Field label="Créé le" value={dateLabel(bien.creeLe)} icon={Calendar} />
                <Field label="Mise à jour le (Apimo)" value={dateLabel(bien.majLe)} icon={Clock} />
                <Field
                  label="Dernière synchro CRM"
                  value={new Date(bien.updatedAt).toLocaleDateString("fr-FR")}
                  icon={Clock}
                />
              </dl>
            </Card>

            {bien.attributs && (
              <Card title="Attributs">
                <p className="whitespace-pre-wrap text-sm text-foreground">{bien.attributs}</p>
              </Card>
            )}
          </section>
        </div>
      </div>
    </>
  )
}

function Card({
  title,
  icon: Icon,
  children,
}: {
  title: string
  icon?: React.ComponentType<{ className?: string }>
  children: React.ReactNode
}) {
  return (
    <div className="rounded-2xl border border-border bg-card p-6 shadow-[var(--shadow-card)]">
      <h2 className="mb-4 flex items-center gap-2 text-sm font-semibold text-foreground">
        {Icon && <Icon className="h-4 w-4 text-muted-foreground" />}
        {title}
      </h2>
      {children}
    </div>
  )
}

function Badge({ children }: { children: React.ReactNode }) {
  return (
    <span className="inline-flex items-center rounded-md bg-secondary px-2 py-0.5 text-xs font-medium text-secondary-foreground">
      {children}
    </span>
  )
}

function Field({
  label,
  value,
  icon: Icon,
}: {
  label: string
  value: React.ReactNode
  icon?: React.ComponentType<{ className?: string }>
}) {
  return (
    <div>
      <dt className="flex items-center gap-1.5 text-xs text-muted-foreground">
        {Icon && <Icon className="h-3 w-3" />}
        {label}
      </dt>
      <dd className="mt-0.5 text-foreground">{value || "—"}</dd>
    </div>
  )
}

function EmptyState({ label }: { label: string }) {
  return <p className="text-sm text-muted-foreground">{label}</p>
}

function dateLabel(value: Date | null | undefined): string | undefined {
  return value ? new Date(value).toLocaleDateString("fr-FR") : undefined
}

function moneyLabel(
  value: { toString(): string } | null | undefined,
  devise: string | null | undefined
): string | undefined {
  if (!value) return undefined
  const amount = Number(value.toString())
  try {
    return new Intl.NumberFormat("fr-FR", { style: "currency", currency: devise ?? "EUR" }).format(amount)
  } catch {
    return `${amount} ${devise ?? ""}`.trim()
  }
}
