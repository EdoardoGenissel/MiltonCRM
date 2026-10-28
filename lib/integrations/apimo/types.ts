// Sous-ensemble des ressources de l'API Apimo réellement utilisées par la synchro
// (cf. sync.ts) - champs relevés sur les vraies réponses de l'agence Milton le
// 2026-10-25, pas seulement sur la doc OpenAPI (Cockpit/apimmo.md). Les valeurs
// codées (type, statut, civilité...) sont des ids de catalogue, traduits par
// catalogs.ts ; les montants/surfaces des recherches arrivent en string ("500").

export type ApimoCity = { id: number; name: string; zipcode?: string }

export type ApimoUser = {
  id: number
  firstname: string | null
  lastname: string | null
}

export type ApimoProperty = {
  id: number
  reference: number | string | null
  step: number | null
  status: number | null
  category: number | null
  type: number | null
  subtype: number | null
  user: ApimoUser | null
  // Id du contact propriétaire - un seul par bien côté API (l'export Excel
  // listait parfois plusieurs co-propriétaires en texte libre).
  owner: number | null
  // Contact de l'agence en co-mandat ("Co-agent" de l'export).
  agency_co_id: number | null
  agreement: {
    type: number | null
    reference: string | null
    start_at: string | null
    end_at: string | null
  } | null
  address: string | null
  address_more: string | null
  country: string | null
  city: ApimoCity | null
  district: { id: number; name: string } | null
  residence: { id: number | null } | null
  referral: number | null
  area: { value: number | null } | null
  rooms: number | null
  bedrooms: number | null
  floor: { type: number | null } | null
  price: {
    value: number | null
    currency: string | null
    commission_owner: number | null
    commission_customer: number | null
    net_seller: number | null
    sold: number | null
    sold_at: string | null
  } | null
  visit: { key_number: string | null } | null
  comments: { language: string; title: string | null; comment: string | null }[] | null
  pictures: { url: string; rank: number }[] | null
  regulations: { type: number; value: string | number | null }[] | null
  tags_customized: { label: string; value: string | null }[] | null
  created_at: string | null
  updated_at: string | null
}

type Subscription = { subscription: number | null } | null

export type ApimoContact = {
  id: number
  title: number | null
  // Raison sociale (SCI, SARL...) quand le contact représente une société.
  name: string | null
  firstname: string | null
  lastname: string | null
  email: string | null
  mobile: string | null
  phone: string | null
  birthday_at: string | null
  birthplace: string | null
  address: string | null
  address_more: string | null
  city: ApimoCity | null
  country: string | null
  language: string[] | null
  mailing: Subscription
  emailing: Subscription
  magazine: Subscription
}

export type ApimoRequest = {
  id: number
  active: boolean
  contact: number | null
  user: number | null
  ranking: number | null
  last_action: string | null
  category: number | null
  types: string[] | null
  referral: number | null
  locations:
    { city: { id: number; name: string } | null; district: { name: string } | null }[] | null
  sector: string | null
  rooms_operator: string | null
  rooms: string | null
  bedrooms: number | null
  area: { min: string | null; max: string | null } | null
  price: { min: string | null; max: string | null; currency: string | null } | null
  comment: string | null
  free_criteria: string | null
  created_at: string | null
  updated_at: string | null
  updated_by: number | null
}

export type ApimoResidence = { id: number; name: string | null }
