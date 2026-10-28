import type { ApimoCatalogs, CatalogName } from "./catalogs"
import type { ApimoMappingContext } from "./mapping-context"
import type { ApimoContact, ApimoProperty, ApimoRequest } from "./types"

// Extraits des vrais catalogues Apimo (culture fr) et des vraies réponses API de
// l'agence Milton, réduits au nécessaire pour les tests des conversions.
const CATALOGS: Record<CatalogName, [number, string, string?][]> = {
  property_type: [
    [1, "Appartement"],
    [2, "Maison"],
    [3, "Terrain"],
  ],
  property_subtype: [[71, "Maison jumelée"]],
  property_status: [
    [1, "En cours"],
    [20, "Attente mandat"],
    [30, "Vendu/loué par l'agence"],
  ],
  property_category: [
    [1, "Vente"],
    [2, "Location"],
  ],
  property_agreement: [
    [1, "Simple"],
    [3, "Exclusif"],
  ],
  property_floor: [[30, "Plain-pied"]],
  contact_title: [
    [1, "Monsieur", "M."],
    [2, "Madame", "Mme"],
  ],
  referral: [[6, "Internet"]],
}

export function buildTestContext(contacts: ApimoContact[] = []): ApimoMappingContext {
  const catalogs = Object.fromEntries(
    Object.entries(CATALOGS).map(([name, entries]) => [
      name,
      new Map(
        entries.map(([id, label, plural]) => [id, { id, name: label, name_plurial: plural }]),
      ),
    ]),
  ) as ApimoCatalogs

  return {
    catalogs,
    agencyName: "Milton Immobilier",
    users: new Map([[93072, "Contact MILTON IMMOBILIER"]]),
    residences: new Map([[800530, "CLOS DE MONTJOLY"]]),
    contacts: new Map(contacts.map((c) => [c.id, c])),
    sharedEmails: new Set(["contact@miltonimmobilier.fr"]),
  }
}

export function buildContact(overrides: Partial<ApimoContact> = {}): ApimoContact {
  return {
    id: 21930454,
    title: 2,
    name: null,
    firstname: "Marie",
    lastname: "LAMBERT",
    email: "marie.lambert@example.com",
    mobile: "+594694247275",
    phone: null,
    birthday_at: null,
    birthplace: "",
    address: null,
    address_more: null,
    city: null,
    country: "GF",
    language: ["fr"],
    mailing: { subscription: 2 },
    emailing: { subscription: 2 },
    magazine: { subscription: 1 },
    ...overrides,
  }
}

export function buildProperty(overrides: Partial<ApimoProperty> = {}): ApimoProperty {
  return {
    id: 83148568,
    reference: 83148568,
    step: 2,
    status: 20,
    category: 1,
    type: 2,
    subtype: 71,
    user: { id: 93072, firstname: "Contact", lastname: "MILTON IMMOBILIER" },
    owner: 21930454,
    agency_co_id: null,
    agreement: null,
    address: "4 Rue des Spatules",
    address_more: "",
    country: "GF",
    city: { id: 38731, name: "Remire-Montjoly", zipcode: "97354" },
    district: null,
    residence: { id: 800530 },
    referral: null,
    area: { value: 99.4 },
    rooms: 5,
    bedrooms: 4,
    floor: { type: 30 },
    price: {
      value: null,
      currency: "EUR",
      commission_owner: 0,
      commission_customer: 0,
      net_seller: 0,
      sold: null,
      sold_at: null,
    },
    visit: { key_number: null },
    comments: [
      {
        language: "fr",
        title: "Dpt Guyane (973), à vendre maison duplex",
        comment: "Venez découvrir\r\ncette villa",
      },
    ],
    pictures: [
      { url: "https://media.apimo.pro/b.jpg", rank: 2 },
      { url: "https://media.apimo.pro/a.jpg", rank: 1 },
    ],
    regulations: [
      { type: 1, value: "-1" },
      { type: 2, value: "12" },
    ],
    tags_customized: [
      { label: "Prospect directeur d'agence", value: "Prospect directeur d'agence" },
    ],
    created_at: "2023-08-03 22:46:34",
    updated_at: "2026-03-05 20:50:19",
    ...overrides,
  }
}

export function buildRequest(overrides: Partial<ApimoRequest> = {}): ApimoRequest {
  return {
    id: 12219138,
    active: true,
    contact: 26566698,
    user: 93072,
    ranking: null,
    last_action: null,
    category: 2,
    types: ["1", "2"],
    referral: null,
    locations: [
      { city: { id: 38724, name: "Cayenne" }, district: null },
      { city: { id: 38731, name: "Remire-Montjoly" }, district: null },
    ],
    sector: null,
    rooms_operator: "2",
    rooms: "3.0",
    bedrooms: 0,
    area: { min: "52", max: null },
    price: { min: null, max: "500", currency: "EUR" },
    comment: "",
    free_criteria: "",
    created_at: "2025-04-15 17:45:43",
    updated_at: "2026-10-25 05:50:54",
    updated_by: 1,
    ...overrides,
  }
}
