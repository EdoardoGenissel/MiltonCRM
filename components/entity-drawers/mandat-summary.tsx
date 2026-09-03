import { Calendar, User, Wallet } from "lucide-react"
import { Field, Badge } from "@/components/detail-card"
import { dateLabel, moneyLabel } from "@/lib/format"

export type MandatDetail = {
  id: string
  type: string
  statut: string | null
  categorie: string | null
  coAgent: string | null
  numero: string | null
  dateSignature: string | null
  finMandat: string | null
  origine: string | null
  originePrecise: string | null
  honorairesProprietaire: string | null
  honorairesAcheteur: string | null
  montantProprietaire: string | null
  montantCompromis: string | null
  venduLe: string | null
  typeBail: string | null
  usage: string | null
  regimeFiscal: string | null
  montantLoyer: string | null
  montantCharges: string | null
  montantDepotGarantie: string | null
  fraisAgence: string | null
  honorairesGestion: string | null
  pourcentageHonorairesGestion: string | null
  proprietaire: { id: string; prenom: string; nom: string } | null
  locataire: { id: string; prenom: string; nom: string } | null
  bien: {
    id: string
    titre: string | null
    adresse: string | null
    commune: string | null
    devise: string | null
  } | null
}

// Contenu détaillé d'un mandat — partagé par la fiche bien (liste de ses
// mandats) et le drawer mandat autonome (cf. mandat-drawer-content.tsx),
// portage direct du <li> qui vivait dans l'ancienne page biens/[id].
export function MandatSummary({
  mandat,
  devise,
  onOpenContact,
}: {
  mandat: MandatDetail
  devise?: string | null
  onOpenContact: (id: string) => void
}) {
  const effectiveDevise = devise ?? mandat.bien?.devise ?? undefined

  function stop(e: React.MouseEvent, action: () => void) {
    e.stopPropagation()
    action()
  }

  return (
    <div>
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <span className="font-medium text-foreground">{mandat.type}</span>
          {mandat.categorie && <Badge>{mandat.categorie}</Badge>}
        </div>
        <span className="text-xs text-muted-foreground">{mandat.statut ?? "statut inconnu"}</span>
      </div>
      <dl className="mt-3 grid grid-cols-2 gap-3">
        <Field
          label="Propriétaire"
          value={
            mandat.proprietaire ? (
              <button
                type="button"
                onClick={(e) => stop(e, () => onOpenContact(mandat.proprietaire!.id))}
                className="text-left text-primary hover:underline"
              >
                {mandat.proprietaire.prenom} {mandat.proprietaire.nom}
              </button>
            ) : undefined
          }
          icon={User}
        />
        <Field
          label="Locataire"
          value={
            mandat.locataire ? (
              <button
                type="button"
                onClick={(e) => stop(e, () => onOpenContact(mandat.locataire!.id))}
                className="text-left text-primary hover:underline"
              >
                {mandat.locataire.prenom} {mandat.locataire.nom}
              </button>
            ) : undefined
          }
          icon={User}
        />
        <Field label="Co-agent" value={mandat.coAgent} />
        <Field label="Numéro de mandat" value={mandat.numero} />
        <Field label="Démarrage mandat" value={dateLabel(mandat.dateSignature)} icon={Calendar} />
        <Field label="Fin mandat" value={dateLabel(mandat.finMandat)} icon={Calendar} />
        <Field
          label="Origine"
          value={[mandat.origine, mandat.originePrecise].filter(Boolean).join(" - ") || undefined}
        />
      </dl>

      {(mandat.montantProprietaire ||
        mandat.montantCompromis ||
        mandat.honorairesProprietaire ||
        mandat.honorairesAcheteur ||
        mandat.venduLe) && (
        <dl className="mt-3 grid grid-cols-2 gap-3 border-t border-border pt-3">
          <Field
            label="Montant propriétaire"
            value={moneyLabel(mandat.montantProprietaire, effectiveDevise)}
            icon={Wallet}
          />
          <Field
            label="Montant compromis"
            value={moneyLabel(mandat.montantCompromis, effectiveDevise)}
            icon={Wallet}
          />
          <Field
            label="Honoraires propriétaire"
            value={moneyLabel(mandat.honorairesProprietaire, effectiveDevise)}
          />
          <Field
            label="Honoraires acheteur"
            value={moneyLabel(mandat.honorairesAcheteur, effectiveDevise)}
          />
          <Field label="Vendu le" value={dateLabel(mandat.venduLe)} />
        </dl>
      )}

      {(mandat.montantLoyer || mandat.locataire) && (
        <dl className="mt-3 grid grid-cols-2 gap-3 border-t border-border pt-3">
          <Field
            label="Loyer mensuel"
            value={moneyLabel(mandat.montantLoyer, "EUR")}
            icon={Wallet}
          />
          <Field label="Charges (provisions)" value={moneyLabel(mandat.montantCharges, "EUR")} />
          <Field label="Dépôt de garantie" value={moneyLabel(mandat.montantDepotGarantie, "EUR")} />
          <Field label="Frais d'agence" value={moneyLabel(mandat.fraisAgence, "EUR")} />
          <Field
            label="Honoraires de gestion"
            value={
              mandat.pourcentageHonorairesGestion
                ? `${mandat.pourcentageHonorairesGestion} %`
                : moneyLabel(mandat.honorairesGestion, "EUR")
            }
          />
          <Field label="Type de bail" value={mandat.typeBail} />
          <Field label="Usage" value={mandat.usage} />
          <Field label="Régime fiscal" value={mandat.regimeFiscal} />
        </dl>
      )}
    </div>
  )
}
