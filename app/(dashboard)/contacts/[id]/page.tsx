import { notFound } from "next/navigation"
import Link from "next/link"
import {
  ArrowLeft,
  BadgeCheck,
  Building2,
  Cake,
  Calendar,
  Clock,
  ExternalLink,
  FileText,
  ListChecks,
  Mail,
  MapPin,
  Phone,
  Tag,
  UserCircle,
} from "lucide-react"
import { Topbar } from "@/components/topbar"
import { PersonaBadge } from "@/components/persona-badge"
import { SourceBadge } from "@/components/source-badge"
import { ContactAvatar } from "@/components/contact-avatar"
import { Button } from "@/components/ui/button"
import { getContactById } from "@/lib/contacts/queries"
import { loyerMaxWithMargin } from "@/lib/prospects/loyer-max"

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

export default async function ContactDetailPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  const contact = await getContactById(id)
  if (!contact) notFound()

  return (
    <>
      <Topbar title={`${contact.prenom} ${contact.nom}`} />
      <div className="flex-1 overflow-auto p-8">
        <Link
          href="/contacts"
          className="mb-5 inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft className="h-3.5 w-3.5" />
          Contacts
        </Link>

        <div className="mb-6 flex flex-col justify-between gap-4 rounded-[8px] border border-border bg-card p-6 shadow-[var(--shadow-card)] sm:flex-row sm:items-center">
          <div className="flex items-center gap-4">
            <ContactAvatar prenom={contact.prenom} nom={contact.nom} size="lg" />
            <div>
              <div className="flex flex-wrap items-center gap-2">
                <h1 className="text-xl font-semibold tracking-tight text-foreground">
                  {contact.civilite ? `${contact.civilite} ` : ""}
                  {contact.prenom} {contact.nom}
                </h1>
                <SourceBadge source={contact.source} />
              </div>
              <div className="mt-2 flex flex-wrap gap-1.5">
                {contact.personas.length === 0 ? (
                  <span className="text-sm text-muted-foreground">Aucun persona</span>
                ) : (
                  contact.personas.map((persona) => <PersonaBadge key={persona} persona={persona} />)
                )}
              </div>
            </div>
          </div>

          <div className="flex flex-wrap gap-2">
            {contact.telephone && (
              <Button
                variant="outline"
                size="lg"
                nativeButton={false}
                render={<a href={`tel:${contact.telephone}`} />}
              >
                <Phone className="h-3.5 w-3.5" />
                {contact.telephone}
              </Button>
            )}
            {contact.email && (
              <Button
                variant="outline"
                size="lg"
                nativeButton={false}
                render={<a href={`mailto:${contact.email}`} />}
              >
                <Mail className="h-3.5 w-3.5" />
                Email
              </Button>
            )}
          </div>
        </div>

        <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
          <section className="flex flex-col gap-6 lg:col-span-2">
            {contact.prospectDetail && (
              <Card title="Qualification prospect" icon={Tag}>
                <dl className="grid grid-cols-2 gap-4 text-sm">
                  <Field
                    label="Alerte abonné"
                    value={contact.prospectDetail.alerteAbonne ? "Oui" : "Non"}
                  />
                  <Field label="Classification" value={contact.prospectDetail.classification} />
                  <Field label="Origine" value={contact.prospectDetail.origine} />
                  <Field label="Co-agence" value={contact.prospectDetail.coAgence} />
                  <Field label="Catégorie" value={contact.prospectDetail.categorie} />
                  <Field label="Type de bien" value={contact.prospectDetail.typeBien} />
                  <Field label="Loyer max" value={loyerMaxLabel(contact.prospectDetail.loyerMax)} />
                  <Field
                    label="Budget min"
                    value={moneyLabel(contact.prospectDetail.prixMin, contact.prospectDetail.devise)}
                  />
                  <Field
                    label="Budget max"
                    value={moneyLabel(contact.prospectDetail.prixMax, contact.prospectDetail.devise)}
                  />
                  <Field label="Pièces" value={contact.prospectDetail.pieces} />
                  <Field
                    label="Surface min"
                    value={surfaceLabel(contact.prospectDetail.surfaceMin)}
                  />
                  <Field
                    label="Surface max"
                    value={surfaceLabel(contact.prospectDetail.surfaceMax)}
                  />
                  <Field label="Secteur" value={contact.prospectDetail.secteur} />
                  <Field label="Quartier" value={contact.prospectDetail.quartier} />
                </dl>
              </Card>
            )}

            {contact.prospectDetail && (
              <Card title="Suivi Apimo" icon={ListChecks}>
                <dl className="grid grid-cols-2 gap-4 text-sm">
                  <Field label="Agence" value={contact.prospectDetail.agence} />
                  <Field label="Référence produit" value={contact.prospectDetail.referenceProduit} />
                  <Field label="Utilisateur" value={contact.prospectDetail.utilisateur} />
                  <Field
                    label="Créé le (Apimo)"
                    value={dateLabel(contact.prospectDetail.creeLe)}
                  />
                  <Field
                    label="Dernière action"
                    value={dateLabel(contact.prospectDetail.derniereAction)}
                  />
                  <Field
                    label="Mise à jour le"
                    value={dateLabel(contact.prospectDetail.majLe)}
                  />
                  <Field label="Mis à jour par" value={contact.prospectDetail.majPar} />
                  <Field label="Attributs" value={contact.prospectDetail.attributs} />
                </dl>
                {(contact.prospectDetail.commentaire ||
                  contact.prospectDetail.criteresComplementaires) && (
                  <dl className="mt-4 flex flex-col gap-4 border-t border-border pt-4 text-sm">
                    <Field label="Commentaire" value={contact.prospectDetail.commentaire} wrap />
                    <Field
                      label="Critères complémentaires"
                      value={contact.prospectDetail.criteresComplementaires}
                      wrap
                    />
                  </dl>
                )}
              </Card>
            )}

            <Card title="Mandats" icon={FileText}>
              {contact.mandats.length === 0 ? (
                <EmptyState label="Aucun mandat lié à ce contact." />
              ) : (
                <ul className="flex flex-col gap-2">
                  {contact.mandats.map((mandat) => (
                    <li
                      key={mandat.id}
                      className="rounded-[8px] border border-border p-3 text-sm transition-colors hover:bg-muted/50"
                    >
                      <div className="flex items-center justify-between">
                        <span className="font-medium text-foreground">{mandat.type}</span>
                        <span className="text-xs text-muted-foreground">
                          {mandat.statut ?? "statut inconnu"}
                        </span>
                      </div>
                      {mandat.bien && (
                        <Link
                          href={`/biens/${mandat.bien.id}`}
                          className="mt-1 flex items-center gap-1.5 text-muted-foreground hover:text-foreground hover:underline"
                        >
                          <MapPin className="h-3 w-3 shrink-0" />
                          {mandat.bien.titre || mandat.bien.adresse || mandat.bien.commune || "Bien sans adresse"}
                        </Link>
                      )}
                    </li>
                  ))}
                </ul>
              )}
            </Card>

            {contact.mandatsLocataire.length > 0 && (
              <Card title="Location(s) en tant que locataire" icon={FileText}>
                <ul className="flex flex-col gap-2">
                  {contact.mandatsLocataire.map((mandat) => (
                    <li
                      key={mandat.id}
                      className="rounded-[8px] border border-border p-3 text-sm transition-colors hover:bg-muted/50"
                    >
                      <div className="flex items-center justify-between">
                        <span className="font-medium text-foreground">
                          {mandat.montantLoyer
                            ? `${moneyLabel(mandat.montantLoyer, undefined)} / mois`
                            : mandat.type}
                        </span>
                        <span className="text-xs text-muted-foreground">
                          {mandat.finMandat ? `Jusqu'au ${dateLabel(mandat.finMandat)}` : "en cours"}
                        </span>
                      </div>
                      {mandat.bien && (
                        <Link
                          href={`/biens/${mandat.bien.id}`}
                          className="mt-1 flex items-center gap-1.5 text-muted-foreground hover:text-foreground hover:underline"
                        >
                          <MapPin className="h-3 w-3 shrink-0" />
                          {mandat.bien.titre || mandat.bien.adresse || mandat.bien.commune || "Bien sans adresse"}
                        </Link>
                      )}
                    </li>
                  ))}
                </ul>
              </Card>
            )}

            <Card title="Estimations" icon={Building2}>
              {contact.estimations.length === 0 ? (
                <EmptyState label="Aucune estimation liée. Elles apparaissent après soumission d'un formulaire JotForm." />
              ) : (
                <ul className="flex flex-col gap-2">
                  {contact.estimations.map((estimation) => (
                    <li
                      key={estimation.id}
                      className="flex items-center justify-between rounded-[8px] border border-border p-3 text-sm"
                    >
                      <span
                        className={`rounded-[8px] px-2 py-0.5 text-xs font-medium ${
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
            <Card title="Coordonnées">
              <dl className="flex flex-col gap-3 text-sm">
                <Field label="Commune" value={contact.commune} icon={MapPin} />
                <Field
                  label="Fiche créée le"
                  value={new Date(contact.createdAt).toLocaleDateString("fr-FR")}
                  icon={Calendar}
                />
                <Field
                  label="Dernière mise à jour"
                  value={new Date(contact.updatedAt).toLocaleDateString("fr-FR")}
                  icon={Clock}
                />
              </dl>
            </Card>

            {contact.prospectDetail && hasProfilPersonnel(contact.prospectDetail) && (
              <Card title="Profil personnel" icon={UserCircle}>
                <dl className="flex flex-col gap-3 text-sm">
                  <Field
                    label="Date de naissance"
                    value={dateLabel(contact.prospectDetail.dateNaissance)}
                    icon={Cake}
                  />
                  <Field label="Lieu de naissance" value={contact.prospectDetail.lieuNaissance} />
                  <Field
                    label="Langues parlées"
                    value={contact.prospectDetail.languesParlees.join(", ") || undefined}
                  />
                  <Field
                    label="Adresse"
                    value={adresseLabel(contact.prospectDetail)}
                    icon={MapPin}
                    wrap
                  />
                </dl>
              </Card>
            )}

            {contact.prospectDetail && (
              <Card title="Consentements marketing" icon={BadgeCheck}>
                <dl className="flex flex-col gap-3 text-sm">
                  <Field
                    label="Mailing"
                    value={contact.prospectDetail.alerteAbonne ? "Abonné" : "Non abonné"}
                  />
                  <Field label="e-mailing" value={boolLabel(contact.prospectDetail.emailingAbonne)} />
                  <Field label="Magazine" value={boolLabel(contact.prospectDetail.magazineAbonne)} />
                  <Field label="Origine précise" value={contact.prospectDetail.originePrecise} />
                </dl>
              </Card>
            )}

            <Card title="Historique d'appels" icon={Phone}>
              {contact.callLogs.length === 0 ? (
                <EmptyState label="Aucun appel matché pour ce contact." />
              ) : (
                <ul className="flex flex-col gap-2">
                  {contact.callLogs.map((call) => (
                    <li key={call.id} className="rounded-[8px] border border-border p-3 text-sm">
                      <div className="flex items-center gap-1.5 text-muted-foreground">
                        <Clock className="h-3 w-3" />
                        {new Date(call.receivedAt).toLocaleString("fr-FR")}
                      </div>
                      {call.transcriptSummary && (
                        <div className="mt-1.5 text-foreground">{call.transcriptSummary}</div>
                      )}
                    </li>
                  ))}
                </ul>
              )}
            </Card>
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
    <div className="rounded-[8px] border border-border bg-card p-6 shadow-[var(--shadow-card)]">
      <h2 className="mb-4 flex items-center gap-2 text-sm font-semibold text-foreground">
        {Icon && <Icon className="h-4 w-4 text-muted-foreground" />}
        {title}
      </h2>
      {children}
    </div>
  )
}

function Field({
  label,
  value,
  icon: Icon,
  wrap,
}: {
  label: string
  value: string | null | undefined
  icon?: React.ComponentType<{ className?: string }>
  wrap?: boolean
}) {
  return (
    <div>
      <dt className="flex items-center gap-1.5 text-xs text-muted-foreground">
        {Icon && <Icon className="h-3 w-3" />}
        {label}
      </dt>
      <dd className={`mt-0.5 text-foreground ${wrap ? "whitespace-pre-wrap" : ""}`}>
        {value || "-"}
      </dd>
    </div>
  )
}

function EmptyState({ label }: { label: string }) {
  return <p className="text-sm text-muted-foreground">{label}</p>
}

function dateLabel(value: Date | null | undefined): string | undefined {
  return value ? new Date(value).toLocaleDateString("fr-FR") : undefined
}

function boolLabel(value: boolean | null | undefined): string | undefined {
  if (value === null || value === undefined) return undefined
  return value ? "Abonné" : "Non abonné"
}

function moneyLabel(
  value: { toString(): string } | null | undefined,
  devise: string | null | undefined
): string | undefined {
  if (!value) return undefined
  const amount = Number(value.toString())
  try {
    return new Intl.NumberFormat("fr-FR", { style: "currency", currency: devise ?? "EUR" }).format(
      amount
    )
  } catch {
    return `${amount} ${devise ?? ""}`.trim()
  }
}

function surfaceLabel(value: { toString(): string } | null | undefined): string | undefined {
  return value ? `${value.toString()} m²` : undefined
}

type ProfilPersonnelFields = {
  dateNaissance: Date | null
  lieuNaissance: string | null
  languesParlees: string[]
  adressePersonnelle: string | null
  adresseComplement: string | null
  codePostal: string | null
  villePersonnelle: string | null
  pays: string | null
}

function hasProfilPersonnel(detail: ProfilPersonnelFields): boolean {
  return Boolean(
    detail.dateNaissance ||
      detail.lieuNaissance ||
      detail.languesParlees.length > 0 ||
      detail.adressePersonnelle ||
      detail.codePostal ||
      detail.villePersonnelle ||
      detail.pays
  )
}

function adresseLabel(detail: ProfilPersonnelFields): string | undefined {
  const lines = [
    detail.adressePersonnelle,
    detail.adresseComplement,
    [detail.codePostal, detail.villePersonnelle].filter(Boolean).join(" "),
    detail.pays,
  ].filter((line) => line && line.trim() !== "")
  return lines.length > 0 ? lines.join("\n") : undefined
}

function loyerMaxLabel(loyerMax: { toString(): string } | null): string | null {
  if (!loyerMax) return null
  const value = Number(loyerMax.toString())
  return `${value} € (jusqu'à ${loyerMaxWithMargin(value)} € avec la marge de 10 %)`
}
