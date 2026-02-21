/**
 * Helper functions for loading and filtering codes
 * 
 * This module provides:
 * - getCodesForStore() - Load and filter codes from localStorage
 * - Debug information for troubleshooting
 */

import { CODES_KEY } from "./storage-keys"
import { normalizeDomain } from "./routing"

export interface StoredCode {
  id: string
  country: string
  store_domain: string
  code: string
  coupon_code?: string | null
  benefit_type: "percent_off" | "amount_off" | "free_shipping"
  scope: "cart" | "product"
  value_percent?: number
  value_amount?: number
  currency?: string
  min_purchase_amount?: number
  applies_to_product?: string
  tested_products_count?: number
  is_visible_to_users?: boolean
  created_at?: string
}

export interface CodesForStoreResult {
  allCount: number
  matchCount: number
  matchedCodes: StoredCode[]
  sampleDomains: string[]
  sampleCountries: string[]
  parseError: string | null
  storageKey: string
}

/**
 * Load and filter codes from localStorage for a specific store
 * 
 * @param country - Country code (e.g., "no", "uk") - will be normalized to lowercase
 * @param storeDomain - Store domain (e.g., "bilkomponenter.no") - will be normalized
 * @returns Object with matched codes and debug info
 */
export function getCodesForStore(country: string, storeDomain: string): CodesForStoreResult {
  const result: CodesForStoreResult = {
    allCount: 0,
    matchCount: 0,
    matchedCodes: [],
    sampleDomains: [],
    sampleCountries: [],
    parseError: null,
    storageKey: CODES_KEY,
  }

  // Only works in browser
  if (typeof window === "undefined") {
    result.parseError = "Not in browser context"
    return result
  }

  // Normalize inputs
  const normalizedCountry = country.toLowerCase()
  const normalizedDomain = normalizeDomain(storeDomain)

  // Load from localStorage
  let rawData: string | null = null
  try {
    rawData = localStorage.getItem(CODES_KEY)
  } catch (e) {
    result.parseError = `localStorage.getItem failed: ${e instanceof Error ? e.message : String(e)}`
    return result
  }

  if (!rawData) {
    result.parseError = `No data in localStorage[${CODES_KEY}]`
    return result
  }

  // Parse JSON
  let allCodes: StoredCode[] = []
  try {
    allCodes = JSON.parse(rawData)
  } catch (e) {
    result.parseError = `JSON.parse failed: ${e instanceof Error ? e.message : String(e)}`
    return result
  }

  if (!Array.isArray(allCodes)) {
    result.parseError = `Parsed data is not an array: ${typeof allCodes}`
    return result
  }

  result.allCount = allCodes.length

  // Collect sample domains and countries for debug
  const domains = new Set<string>()
  const countries = new Set<string>()
  for (const code of allCodes.slice(0, 20)) {
    if (code.store_domain) domains.add(normalizeDomain(code.store_domain))
    if (code.country) countries.add(code.country.toLowerCase())
  }
  result.sampleDomains = Array.from(domains).slice(0, 5)
  result.sampleCountries = Array.from(countries).slice(0, 5)

  // Filter codes
  const matchedCodes = allCodes.filter((code) => {
    // Match by normalized domain
    const codeDomain = normalizeDomain(code.store_domain || "")
    if (codeDomain !== normalizedDomain) return false

    // Match by country (normalize to lowercase)
    const codeCountry = (code.country || "").toLowerCase()
    if (codeCountry !== normalizedCountry) return false

    // Must have coupon_code
    const couponCode = code.coupon_code
    if (!couponCode || String(couponCode).trim().length === 0) return false

    // Must be visible
    if (code.is_visible_to_users === false) return false

    return true
  })

  result.matchCount = matchedCodes.length
  result.matchedCodes = matchedCodes

  return result
}

/**
 * Load all codes from localStorage
 */
export function getAllCodes(): { codes: StoredCode[]; error: string | null } {
  if (typeof window === "undefined") {
    return { codes: [], error: "Not in browser context" }
  }

  try {
    const rawData = localStorage.getItem(CODES_KEY)
    if (!rawData) {
      return { codes: [], error: null }
    }
    const codes = JSON.parse(rawData)
    if (!Array.isArray(codes)) {
      return { codes: [], error: "Data is not an array" }
    }
    return { codes, error: null }
  } catch (e) {
    return { codes: [], error: e instanceof Error ? e.message : String(e) }
  }
}
