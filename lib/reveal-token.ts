import crypto from "crypto"
import { getAppConfig } from "./config"

interface TokenPayload {
  guest_id: string
  store_domain: string
  purchase_id: string
  exp: number
}

// Helper: Convert Buffer or string to URL-safe base64 (no base64url encoding needed)
function toBase64Url(input: Buffer | string): string {
  const b64 = (Buffer.isBuffer(input) ? input : Buffer.from(input)).toString("base64")
  return b64.replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/g, "")
}

// Helper: Convert URL-safe base64 back to string
function fromBase64Url(input: string): string {
  // Restore standard base64 characters
  let b64 = input.replace(/-/g, "+").replace(/_/g, "/")
  // Add padding if needed
  const pad = b64.length % 4
  if (pad) {
    b64 += "=".repeat(4 - pad)
  }
  return Buffer.from(b64, "base64").toString("utf-8")
}

// Generate HMAC-based reveal token
export function generateRevealToken(
  guestId: string,
  storeDomain: string,
  purchaseId: string,
  expiryMinutes = 10,
): string {
  const exp = Math.floor(Date.now() / 1000) + expiryMinutes * 60
  const payload: TokenPayload = {
    guest_id: guestId,
    store_domain: storeDomain,
    purchase_id: purchaseId,
    exp,
  }

  const payloadStr = JSON.stringify(payload)
  const payloadB64 = toBase64Url(payloadStr)

  const config = getAppConfig()
  const signatureBuffer = crypto.createHmac("sha256", config.revealTokenSecret).update(payloadB64).digest()
  const signature = toBase64Url(signatureBuffer)

  return `${payloadB64}.${signature}`
}

// Verify and decode reveal token
export function verifyRevealToken(token: string): TokenPayload | null {
  try {
    const [payloadB64, signature] = token.split(".")
    if (!payloadB64 || !signature) return null

    // Verify signature
    const config = getAppConfig()
    const expectedSignatureBuffer = crypto
      .createHmac("sha256", config.revealTokenSecret)
      .update(payloadB64)
      .digest()
    const expectedSignature = toBase64Url(expectedSignatureBuffer)

    if (signature !== expectedSignature) return null

    // Decode payload
    const payloadStr = fromBase64Url(payloadB64)
    const payload: TokenPayload = JSON.parse(payloadStr)

    // Check expiry
    const now = Math.floor(Date.now() / 1000)
    if (payload.exp < now) return null

    return payload
  } catch {
    return null
  }
}
