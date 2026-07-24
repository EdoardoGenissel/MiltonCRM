import { describe, expect, it } from "vitest"
import { signRingoverPayload, verifyRingoverSignature } from "./webhook-signature"

const SECRET = "test-webhook-key"

describe("verifyRingoverSignature / signRingoverPayload", () => {
  it("round-trip : un JWT signé avec le bon secret se vérifie et redonne les claims", () => {
    const claims = { url: "https://example.com/webhook", payload: { event: "ringing" } }
    const token = signRingoverPayload(SECRET, claims)
    expect(verifyRingoverSignature(token, SECRET)).toEqual(claims)
  })

  it("rejette un token signé avec un autre secret", () => {
    const token = signRingoverPayload("autre-secret", { event: "ringing" })
    expect(verifyRingoverSignature(token, SECRET)).toBeNull()
  })

  it("rejette un token altéré (payload modifié après signature)", () => {
    const token = signRingoverPayload(SECRET, { event: "ringing" })
    const [header, , sig] = token.split(".")
    const tampered = `${header}.${Buffer.from('{"event":"hangup"}').toString("base64url")}.${sig}`
    expect(verifyRingoverSignature(tampered, SECRET)).toBeNull()
  })

  it("rejette un token malformé (pas 3 segments)", () => {
    expect(verifyRingoverSignature("pas.un.jwt.valide.du.tout", SECRET)).toBeNull()
    expect(verifyRingoverSignature("deuxsegments.seulement", SECRET)).toBeNull()
  })
})
