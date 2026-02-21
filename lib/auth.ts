import { getAppConfig } from "./config"
import crypto from "crypto"

export function validateAdminSecret(headerValue: string | null): boolean {
  const config = getAppConfig()
  const adminSecret = process.env.ADMIN_SECRET

  if (!adminSecret) {
    console.warn("[auth] ADMIN_SECRET not configured")
    return false
  }

  return headerValue === adminSecret
}

export function validatePrototypeSecret(headerValue: string | null): boolean {
  const config = getAppConfig()
  const prototypeSecret = process.env.PROTOTYPE_SECRET

  if (!prototypeSecret) {
    console.warn("[auth] PROTOTYPE_SECRET not configured")
    return false
  }

  return headerValue === prototypeSecret
}

export function validateRevealToken(token: string): { guest_id: string; store_domain: string } | null {
  try {
    const secret = process.env.REVEAL_SECRET || "dev-secret-change-in-production"
    const parts = token.split(".")

    if (parts.length !== 2) return null

    const [payload, signature] = parts
    const expectedSig = crypto.createHmac("sha256", secret).update(payload).digest("hex").slice(0, 32)

    if (signature !== expectedSig) return null

    const decoded = Buffer.from(payload, "base64").toString("utf-8")
    const data = JSON.parse(decoded)

    if (!data.exp || Date.now() > data.exp) {
      return null
    }

    return {
      guest_id: data.guest_id,
      store_domain: data.store_domain,
    }
  } catch (error) {
    return null
  }
}

export function createRevealToken(guestId: string, storeDomain: string, ttlMinutes = 15): string {
  const secret = process.env.REVEAL_SECRET || "dev-secret-change-in-production"
  const now = Date.now()
  const exp = now + ttlMinutes * 60 * 1000

  const payload = {
    guest_id: guestId,
    store_domain: storeDomain,
    exp,
    iat: now,
  }

  const payloadStr = Buffer.from(JSON.stringify(payload)).toString("base64")
  const signature = crypto.createHmac("sha256", secret).update(payloadStr).digest("hex").slice(0, 32)

  return `${payloadStr}.${signature}`
}
