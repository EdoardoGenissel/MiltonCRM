// Origine d'un prospect / d'un mandat - valeurs de la colonne "Origine" d'Apimo
// (déjà alimentée par les imports), reprises telles quelles par l'analyse IA
// des mails (cf. lib/prospects-mail/extract.ts) et proposées à la saisie dans
// les drawers, pour pouvoir filtrer/compter toutes sources confondues.
export const ORIGINE_CANAUX = [
  "Internet",
  "Prospection",
  "Relation",
  "Apporteur",
  "Ancien client",
  "Passage / Vitrine",
  "Panneau",
  "Salon / Evenement",
  "e-mailing",
  "Notoriété",
  "Collaboration",
  "Autre",
] as const

// Suggestions pour "Origine précise" (texte libre) : portails et outils les
// plus courants - le nom d'un commercial reste à saisir librement.
export const ORIGINE_PRECISIONS = [
  "Leboncoin",
  "SeLoger",
  "Bien'ici",
  "Properstar",
  "Plato",
  "Logic-Immo",
  "Calendly",
  "Facebook",
  "Instagram",
  "Site Milton",
] as const
