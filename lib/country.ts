import { cookies, headers } from "next/headers"

const SUPPORTED_COUNTRIES = ["NO", "SE", "DK", "GB"] as const
export type SupportedCountry = (typeof SUPPORTED_COUNTRIES)[number]

const DEFAULT_COUNTRY: SupportedCountry = "NO"

// Country detection from common geo headers
export async function detectCountryFromIP(): Promise<SupportedCountry | null> {
  const headersList = await headers()

  // Check common geo headers (Vercel, Cloudflare, etc.)
  const geoCountry =
    headersList.get("x-vercel-ip-country") ||
    headersList.get("cf-ipcountry") ||
    headersList.get("x-country-code") ||
    null

  if (geoCountry && SUPPORTED_COUNTRIES.includes(geoCountry as SupportedCountry)) {
    return geoCountry as SupportedCountry
  }

  return null
}

// Get preferred country from cookie
export async function getPreferredCountry(): Promise<SupportedCountry | null> {
  const cookieStore = await cookies()
  const preferred = cookieStore.get("preferred_country")?.value

  if (preferred && SUPPORTED_COUNTRIES.includes(preferred as SupportedCountry)) {
    return preferred as SupportedCountry
  }

  return null
}

// Set preferred country cookie
export async function setPreferredCountry(country: SupportedCountry): Promise<void> {
  const cookieStore = await cookies()
  cookieStore.set("preferred_country", country, {
    httpOnly: false, // Client needs to read for country selector
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    maxAge: 60 * 60 * 24 * 365, // 1 year
    path: "/",
  })
}

// Main resolver: IP first, then cookie, then default
export async function resolveCountry(): Promise<SupportedCountry> {
  // Try IP-based detection first
  const ipCountry = await detectCountryFromIP()
  if (ipCountry) {
    return ipCountry
  }

  // Fall back to preferred country from cookie
  const preferredCountry = await getPreferredCountry()
  if (preferredCountry) {
    return preferredCountry
  }

  // Default to Norway
  return DEFAULT_COUNTRY
}

// Check if IP detection is available
export async function hasIPDetection(): Promise<boolean> {
  const ipCountry = await detectCountryFromIP()
  return ipCountry !== null
}

export function isSupportedCountry(country: string): country is SupportedCountry {
  return SUPPORTED_COUNTRIES.includes(country as SupportedCountry)
}

export { SUPPORTED_COUNTRIES, DEFAULT_COUNTRY }
