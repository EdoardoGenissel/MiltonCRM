// Mapping colonnes → champs CRM pour l'export Septéo "biens/mandats" (gestion
// locative — un lot + son mandat de gestion par ligne, ex. `data/properties/
// import septeo.csv`). Export très large (593 colonnes) : la plupart décrivent
// des états datés de copropriété (amiante, plomb, ascenseur...) ou de la
// plomberie comptable interne Septéo (RIB/IBAN, contacts technique/comptable) —
// hors périmètre d'un CRM commercial, non mappés ici. Cf. AGENTS/scope.md :
// seuls les champs utiles à la fiche bien/mandat/contact sont repris.
//
// Deux simplifications actées après inspection du fichier réel transmis par
// Milton (233 lignes) :
// - "Destinataire_*" et "Proprietaire_*" sont strictement identiques sur les
//   233 lignes (même nom, même prénom...) — on ne mappe que "Proprietaire_*".
// - "Lot_*" et "MandatLot_*" sont strictement identiques (adresse, surfaces,
//   DPE...) — on ne mappe que "MandatLot_*", plus complet (loyers, locataire
//   actuel, dates).
import { at, cell, type HeaderIndex } from "./header-index"

export type SepteoBienRow = {
  // Identité — cf. run-import-biens-septeo.ts pour le choix de sourceRef :
  // "MandatLot_IDLot" (le lot physique) pour le Bien, "MandatLot_IDMandatLot"
  // (l'association lot+mandat, ~1-1 avec les lignes) pour le Mandat — un même
  // "Mandat_IDMandat" Septéo peut en réalité couvrir plusieurs lots.
  idLot: string
  idMandatLot: string
  numero?: string // "Mandat_Numero", numéro de mandat lisible

  // Bien (Immeuble + Lot/MandatLot)
  residence?: string // "Immeuble_Nom"
  adresse?: string
  adresseComplement?: string
  codePostal?: string
  commune?: string
  pays?: string
  typeLot?: string // texte libre Septéo, ex. "4 Pièces"
  natureLot?: string // "Maison" | "Appartement" | "Local commercial"
  meuble?: string // "Oui" | "Non"
  surfaceHabitable?: string
  surfaceUtile?: string
  energieConsommation?: string
  energieEmission?: string
  agence?: string

  // Mandat (gestion locative)
  dateSignature?: string // "Mandat_Debut"
  finMandat?: string // "Mandat_DateEch"
  typeBail?: string
  usage?: string
  regimeFiscal?: string
  montantLoyer?: string
  montantCharges?: string
  montantDepotGarantie?: string
  fraisAgence?: string
  honorairesGestion?: string
  pourcentageHonorairesGestion?: string

  // Propriétaire — coordonnées utilisées pour rattacher/créer une fiche contact
  // (cf. resolveContactByIdentity), pas stockées telles quelles sur le bien.
  proprietaireCivilite?: string
  proprietaireNom?: string
  proprietairePrenom?: string
  proprietaireTelephone?: string
  proprietaireEmail?: string

  // Locataire actuel du lot (snapshot Septéo au moment de l'export) — idem,
  // sert à rattacher/créer une fiche contact persona "locataire".
  locataireCivilite?: string
  locataireNom?: string
  locatairePrenom?: string
  locataireTelephone?: string
  locataireEmail?: string
}

export function mapSepteoBienRow(headerIndex: HeaderIndex, row: unknown[]): SepteoBienRow | null {
  const idLot = cell(row, at(headerIndex, "mandatlotidlot"))
  const idMandatLot = cell(row, at(headerIndex, "mandatlotidmandatlot"))
  if (!idLot || !idMandatLot) return null

  const adrB = cell(row, at(headerIndex, "mandatlotadrb"))
  const adrC = cell(row, at(headerIndex, "mandatlotadrc"))

  return {
    idLot,
    idMandatLot,
    numero: cell(row, at(headerIndex, "mandatnumero")),

    residence: cell(row, at(headerIndex, "immeublenom")),
    adresse: cell(row, at(headerIndex, "mandatlotadra")),
    adresseComplement: [adrB, adrC].filter(Boolean).join(" ") || undefined,
    codePostal: cell(row, at(headerIndex, "mandatlotcodepostal")),
    commune: cell(row, at(headerIndex, "mandatlotville")),
    pays: cell(row, at(headerIndex, "mandatlotpays")),
    typeLot: cell(row, at(headerIndex, "mandatlottypelot")),
    natureLot: cell(row, at(headerIndex, "mandatlotnaturelot")),
    meuble: cell(row, at(headerIndex, "mandatlotmeuble")),
    surfaceHabitable: cell(row, at(headerIndex, "mandatlotsurfacehabitable")),
    surfaceUtile: cell(row, at(headerIndex, "mandatlotsurfaceutile")),
    energieConsommation:
      cell(row, at(headerIndex, "mandatlotconsommationenergetiquefinale")) ??
      cell(row, at(headerIndex, "mandatlotconsommationenergetique")),
    energieEmission: cell(row, at(headerIndex, "mandatlotemissiongaz")),
    agence: cell(row, at(headerIndex, "agencelibelle")),

    dateSignature: cell(row, at(headerIndex, "mandatdebut")),
    finMandat: cell(row, at(headerIndex, "mandatdateech")),
    typeBail: cell(row, at(headerIndex, "mandattypebaildefaut")),
    usage: cell(row, at(headerIndex, "mandattypeusagedefaut")),
    regimeFiscal: cell(row, at(headerIndex, "mandatlotregimefiscal")),
    montantLoyer: cell(row, at(headerIndex, "mandatlotmontantloyer")),
    montantCharges: cell(row, at(headerIndex, "mandatlotmontantprov")),
    montantDepotGarantie: cell(row, at(headerIndex, "mandatlotmontantdg")),
    fraisAgence: cell(row, at(headerIndex, "mandatlotfraisagence")),
    honorairesGestion: cell(row, at(headerIndex, "mandatlothonorairesgestion")),
    pourcentageHonorairesGestion: cell(row, at(headerIndex, "mandatlotpourcentagehonogestion")),

    proprietaireCivilite: cell(row, at(headerIndex, "proprietairecivilitelongue")),
    proprietaireNom: cell(row, at(headerIndex, "proprietairenom")),
    proprietairePrenom: cell(row, at(headerIndex, "proprietaireprenom")),
    proprietaireTelephone:
      cell(row, at(headerIndex, "proprietaireportable")) ??
      cell(row, at(headerIndex, "proprietairetelephonea")),
    proprietaireEmail: cell(row, at(headerIndex, "proprietaireemail")),

    locataireCivilite: cell(row, at(headerIndex, "mandatlotlocataireactuelcivlongue")),
    locataireNom: cell(row, at(headerIndex, "mandatlotlocataireactuelnom")),
    locatairePrenom: cell(row, at(headerIndex, "mandatlotlocataireactuelprenom")),
    locataireTelephone:
      cell(row, at(headerIndex, "mandatlotlocataireactuelportable")) ??
      cell(row, at(headerIndex, "mandatlotlocataireactueltelephonea")),
    locataireEmail: cell(row, at(headerIndex, "mandatlotlocataireactuelemail")),
  }
}
