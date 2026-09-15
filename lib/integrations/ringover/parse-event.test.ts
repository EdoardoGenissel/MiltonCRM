import { describe, expect, it } from "vitest"
import {
  extractRawCallId,
  isIncomingCall,
  parseRingoverEvent,
  safeDate,
  type ParsedRingoverEvent,
} from "./parse-event"

// Payloads conformes au vrai schéma Ringover (developer.ringover.com/web/
// openapi_public.yml), pas à ce qu'on avait initialement supposé.
//
// Le call_id ci-dessous (1234567890987654321) dépasse Number.MAX_SAFE_INTEGER -
// s'il était écrit comme littéral JS dans un objet, il perdrait déjà sa précision
// AVANT tout JSON.stringify (perte au moment même où le moteur JS parse le
// littéral source). D'où la chaîne brute écrite à la main ci-dessous plutôt qu'un
// `JSON.stringify` d'un objet : c'est le seul moyen de simuler fidèlement un vrai
// corps de requête HTTP reçu tel quel, chiffres non altérés.
const ringingRawBody =
  '{"event":"ringing","resource":"call","timestamp":1554823493.762305,' +
  '"data":{"id":"57622f20-a020-4f9e-814c-62a6123412fa","call_id":1234567890987654321,' +
  '"direction":"inbound","from_number":"33601020304","to_number":"33101020304","status":"ringing"}}'
const ringingPayload = JSON.parse(ringingRawBody)

describe("extractRawCallId", () => {
  it("extrait le call_id sans perte de précision (uint64 > Number.MAX_SAFE_INTEGER)", () => {
    expect(extractRawCallId(ringingRawBody)).toBe("1234567890987654321")
  })

  it("tolère les espaces autour du ':'", () => {
    expect(extractRawCallId('{"call_id"  :  42}')).toBe("42")
  })

  it("retourne undefined si absent", () => {
    expect(extractRawCallId('{"foo":"bar"}')).toBeUndefined()
  })
})

describe("parseRingoverEvent", () => {
  it("événement ringing (appel entrant), avec rawBody pour le call_id précis", () => {
    expect(parseRingoverEvent(ringingPayload, ringingRawBody)).toMatchObject({
      event: "ringing",
      resource: "call",
      callId: "1234567890987654321",
      phoneNumber: "33601020304",
      direction: "inbound",
    })
  })

  it("sans rawBody, retombe sur le call_id du payload déjà parsé (peut perdre en précision, mais ne plante pas)", () => {
    const parsed = parseRingoverEvent(ringingPayload)
    expect(parsed.callId).toBeDefined()
  })

  it("événement hangup avec URL d'enregistrement", () => {
    const payload = {
      event: "hangup",
      resource: "call",
      timestamp: 1554823493.76,
      data: {
        call_id: "42",
        direction: "inbound",
        from_number: "33601020304",
        record: "https://cdr.ringover.com/record/x.mp3",
      },
    }
    expect(parseRingoverEvent(payload, JSON.stringify(payload))).toMatchObject({
      event: "hangup",
      recordUrl: "https://cdr.ringover.com/record/x.mp3",
    })
  })

  it("événement record_available", () => {
    const payload = {
      event: "record_available",
      resource: "aftercall",
      data: {
        call_id: "42",
        record_link: "https://cdr.ringover.com/record/y.mp3",
        record_duration: "32",
      },
    }
    expect(parseRingoverEvent(payload, JSON.stringify(payload))).toMatchObject({
      recordUrl: "https://cdr.ringover.com/record/y.mp3",
      recordDuration: "32",
    })
  })

  it("événement transcription_available", () => {
    const payload = {
      event: "transcription_available",
      resource: "aftercall",
      data: { call_id: "42", transcription_url: "https://cdn.ringover.com/transcriptions/x.json" },
    }
    expect(parseRingoverEvent(payload, JSON.stringify(payload)).transcriptionUrl).toBe(
      "https://cdn.ringover.com/transcriptions/x.json",
    )
  })

  it("payload non-objet -> tout undefined, ne plante pas", () => {
    expect(parseRingoverEvent(null)).toEqual({})
    expect(parseRingoverEvent("texte")).toEqual({})
    expect(parseRingoverEvent(42)).toEqual({})
  })

  it("data absent ou mal formé -> pas d'erreur", () => {
    expect(parseRingoverEvent({ event: "ringing" })).toMatchObject({ event: "ringing" })
    expect(parseRingoverEvent({ event: "ringing", data: null })).toMatchObject({ event: "ringing" })
  })
})

describe("isIncomingCall", () => {
  function event(overrides: Partial<ParsedRingoverEvent> = {}): ParsedRingoverEvent {
    return { event: "ringing", direction: "inbound", ...overrides }
  }

  it("ringing + inbound -> true", () => {
    expect(isIncomingCall(event())).toBe(true)
  })

  it("ringing + outbound -> false (appel sortant)", () => {
    expect(isIncomingCall(event({ direction: "outbound" }))).toBe(false)
  })

  it("autres événements -> false même si inbound", () => {
    expect(isIncomingCall(event({ event: "hangup" }))).toBe(false)
    expect(isIncomingCall(event({ event: "missed" }))).toBe(false)
    expect(isIncomingCall(event({ event: "answered" }))).toBe(false)
  })
})

describe("safeDate", () => {
  it("epoch Ringover (secondes, avec décimales) -> Date correspondante", () => {
    const result = safeDate("1554823493.762305")
    expect(result.getTime()).toBe(1554823493762)
  })

  it("valeur absente -> maintenant", () => {
    const before = Date.now()
    expect(safeDate(undefined).getTime()).toBeGreaterThanOrEqual(before)
  })

  it("chaîne invalide -> maintenant plutôt qu'Invalid Date", () => {
    expect(Number.isNaN(safeDate("pas-une-date").getTime())).toBe(false)
  })
})
