import { createHmac } from "crypto"
import { getAppConfig } from "./config"

interface TokenPayload {
  purchase_id: string
  store_domain: string
  iat: number
  exp: number
}

/**
 * Generate a short-lived HMAC token for revealing codes
 */
export function generateRevealToken(purchaseId: string, storeDomain: string): string {
  const config = getAppConfig()
  const payload: TokenPayload = {
    purchase_id: purchaseId,
    store_domain: storeDomain,
    iat: Date.now(),
    exp: Date.now() + 60 * 60 * 1000, // 1 hour
  }

  const payloadString = JSON.stringify(payload)
  const payloadBase64 = Buffer.from(payloadString).toString("base64url")

  const hmac = createHmac("sha256", config.revealTokenSecret)
  hmac.update(payloadBase64)
  const signature = hmac.digest("base64url")

  return `${payloadBase64}.${signature}`
}

/**
 * Verify and decode a reveal token
 */
export function verifyRevealToken(token: string): TokenPayload | null {
  try {
    const config = getAppConfig()
    const [payloadBase64, signature] = token.split(".")

    if (!payloadBase64 || !signature) {
      return null
    }

    // Verify signature
    const hmac = createHmac("sha256", config.revealTokenSecret)
    hmac.update(payloadBase64)
    const expectedSignature = hmac.digest("base64url")

    if (signature !== expectedSignature) {
      return null
    }

    // Decode payload
    const payloadString = Buffer.from(payloadBase64, "base64url").toString()
    const payload: TokenPayload = JSON.parse(payloadString)

    // Check expiry
    if (payload.exp < Date.now()) {
      return null
    }

    return payload
  } catch (error) {
    console.error("[v0] Token verification error:", error)
    return null
  }
}
