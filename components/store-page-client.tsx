"use client"

import { useEffect, useState } from "react"
import Link from "next/link"
import { ArrowLeft } from "lucide-react"
import { getCodesForStore, type StoredCode, type CodesForStoreResult } from "@/lib/codes-helper"
import { selectTeasers } from "@/lib/teaser"
import { buildCheckoutUrl, normalizeDomain } from "@/lib/routing"
import { STORES_KEY, COUNTRY_SETTINGS_KEY } from "@/lib/storage-keys"
import { logEvent } from "@/lib/events"

// Get reveal limits from localStorage (mirrors reveal page logic)
function getRevealLimits(storeDomain: string, countryCode: string): { cartLimit: number; productLimit: number } {
  if (typeof window === "undefined") return { cartLimit: 3, productLimit: 2 }
  
  try {
    const stores = localStorage.getItem(STORES_KEY)
    if (stores) {
      const allStores = JSON.parse(stores) as Array<{
        domain: string
        country_code: string
        reveal_cart_limit_override: number | null
        reveal_product_limit_override: number | null
      }>
      const normalized = normalizeDomain(storeDomain)
      const store = allStores.find(s => normalizeDomain(s.domain) === normalized)
      
      if (store) {
        let countryCartLimit = 3
        let countryProductLimit = 2
        
        const settings = localStorage.getItem(COUNTRY_SETTINGS_KEY)
        if (settings) {
          const allSettings = JSON.parse(settings) as Array<{
            country_code: string
            reveal_limit_cart_codes_default: number
            reveal_limit_product_codes_default: number
          }>
          const countrySetting = allSettings.find(s => s.country_code === countryCode.toUpperCase())
          if (countrySetting) {
            countryCartLimit = countrySetting.reveal_limit_cart_codes_default
            countryProductLimit = countrySetting.reveal_limit_product_codes_default
          }
        }
        
        return {
          cartLimit: store.reveal_cart_limit_override ?? countryCartLimit,
          productLimit: store.reveal_product_limit_override ?? countryProductLimit,
        }
      }
    }
    
    const settings = localStorage.getItem(COUNTRY_SETTINGS_KEY)
    if (settings) {
      const allSettings = JSON.parse(settings) as Array<{
        country_code: string
        reveal_limit_cart_codes_default: number
        reveal_limit_product_codes_default: number
      }>
      const countrySetting = allSettings.find(s => s.country_code === countryCode.toUpperCase())
      if (countrySetting) {
        return {
          cartLimit: countrySetting.reveal_limit_cart_codes_default,
          productLimit: countrySetting.reveal_limit_product_codes_default,
        }
      }
    }
  } catch {
    // Ignore errors
  }
  
  return { cartLimit: 3, productLimit: 2 }
}

// Compute how many codes will actually be revealed (applying limits)
function computeRevealCount(codes: StoredCode[], storeDomain: string, countryCode: string): number {
  const { cartLimit, productLimit } = getRevealLimits(storeDomain, countryCode)
  const cartCodes = codes.filter(c => c.scope === "cart")
  const productCodes = codes.filter(c => c.scope === "product")
  return Math.min(cartCodes.length, cartLimit) + Math.min(productCodes.length, productLimit)
}

interface StoredStore {
  id: string
  country_code: string
  name: string
  domain: string
  slug?: string
  logo_url?: string
  is_featured?: boolean
}

interface StorePageClientProps {
  country: string
  storeSlug: string
  isPrototypeMode: boolean
  isManualMode: boolean
  translations: {
    backToHome: string
    copyright: string
  }
}

interface StoreResolveResult {
  store: StoredStore | null
  error: string | null
  allStores: number
  sampleDomains: string[]
}

function resolveStore(country: string, storeSlug: string): StoreResolveResult {
  const result: StoreResolveResult = {
    store: null,
    error: null,
    allStores: 0,
    sampleDomains: [],
  }

  if (typeof window === "undefined") {
    result.error = "Not in browser context"
    return result
  }

  // Load stores from localStorage
  let stores: StoredStore[] = []
  try {
    const rawData = localStorage.getItem(STORES_KEY)
    if (rawData) {
      stores = JSON.parse(rawData)
    }
  } catch (e) {
    result.error = `Failed to parse stores: ${e instanceof Error ? e.message : String(e)}`
    return result
  }

  result.allStores = stores.length
  result.sampleDomains = stores.slice(0, 5).map((s) => normalizeDomain(s.domain))

  const normalizedCountry = country.toUpperCase()
  const input = storeSlug.trim().toLowerCase()

  // Try to find store
  // 1. If contains ".", treat as domain
  if (input.includes(".")) {
    const normalizedInput = normalizeDomain(input)
    const found = stores.find(
      (s) => normalizeDomain(s.domain) === normalizedInput && s.country_code === normalizedCountry
    )
    if (found) {
      result.store = found
      return result
    }
  }

  // 2. Try to match by slug
  const bySlug = stores.find(
    (s) => s.slug?.toLowerCase() === input && s.country_code === normalizedCountry
  )
  if (bySlug) {
    result.store = bySlug
    return result
  }

  // 3. Try to match by domain-without-TLD
  const byDomainPart = stores.find((s) => {
    if (s.country_code !== normalizedCountry) return false
    const domainWithoutTld = normalizeDomain(s.domain).split(".")[0]
    return domainWithoutTld === input
  })
  if (byDomainPart) {
    result.store = byDomainPart
    return result
  }

  result.error = `No store found for slug "${storeSlug}" in country "${country}"`
  return result
}

export function StorePageClient({
  country,
  storeSlug,
  isPrototypeMode,
  isManualMode,
  translations,
}: StorePageClientProps) {
  const [loading, setLoading] = useState(true)
  const [storeResult, setStoreResult] = useState<StoreResolveResult | null>(null)
  const [codesResult, setCodesResult] = useState<CodesForStoreResult | null>(null)
  const [codes, setCodes] = useState<StoredCode[]>([])

  useEffect(() => {
    // Resolve store from localStorage
    const storeRes = resolveStore(country, storeSlug)
    setStoreResult(storeRes)

    if (storeRes.store) {
      // Load codes using the resolved store's domain
      const codesRes = getCodesForStore(country, storeRes.store.domain)
      setCodesResult(codesRes)
      setCodes(codesRes.matchedCodes)
      
      // Log page_view for store page
      logEvent("page_view", {
        storeDomain: normalizeDomain(storeRes.store.domain),
        countryCode: country.toUpperCase(),
        meta: { 
          path: `/${country}/store/${storeSlug}`, 
          referrer: typeof document !== "undefined" ? document.referrer || "" : "" 
        },
      }).catch(() => {})
    }

    setLoading(false)
  }, [country, storeSlug])

  const showDebug = isPrototypeMode || isManualMode
  const isNorway = country === "no"

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50">
        <header className="bg-white border-b border-gray-200">
          <div className="container mx-auto px-4 py-6">
            <Link href={`/${country}`} className="inline-flex items-center gap-2 text-gray-600 hover:text-gray-900">
              <ArrowLeft className="h-4 w-4" />
              <span>{translations.backToHome}</span>
            </Link>
          </div>
        </header>
        <div className="container mx-auto px-4 py-12">
          <div className="max-w-xl mx-auto text-center">
            <p className="text-gray-500">{isNorway ? "Laster..." : "Loading..."}</p>
          </div>
        </div>
      </div>
    )
  }

  const store = storeResult?.store

  // Debug output
  const debugOutput = showDebug ? (
    <div className="bg-yellow-50 border border-yellow-200 rounded p-3 mb-4 text-xs font-mono overflow-x-auto">
      <strong>DEBUG:</strong> country={country}, slug={storeSlug}
      <br />
      <strong>STORES:</strong> total={storeResult?.allStores}, sample_domains=[{storeResult?.sampleDomains.join(", ")}]
      {storeResult?.error && <span className="text-red-600"> | STORE_ERROR: {storeResult.error}</span>}
      {store && (
        <>
          <br />
          <strong>RESOLVED:</strong> store_domain={normalizeDomain(store.domain)}, name={store.name}
        </>
      )}
      {codesResult && (
        <>
          <br />
          <strong>CODES:</strong> total={codesResult.allCount}, matched={codesResult.matchCount}, 
          sample_domains=[{codesResult.sampleDomains.join(", ")}], 
          sample_countries=[{codesResult.sampleCountries.join(", ")}]
          {codesResult.parseError && <span className="text-red-600"> | CODES_ERROR: {codesResult.parseError}</span>}
        </>
      )}
    </div>
  ) : null

  // Store not found
  if (!store) {
    return (
      <div className="min-h-screen bg-gray-50">
        <header className="bg-white border-b border-gray-200">
          <div className="container mx-auto px-4 py-6">
            <Link href={`/${country}`} className="inline-flex items-center gap-2 text-gray-600 hover:text-gray-900">
              <ArrowLeft className="h-4 w-4" />
              <span>{translations.backToHome}</span>
            </Link>
          </div>
        </header>
        <div className="container mx-auto px-4 py-12">
          <div className="max-w-xl mx-auto text-center">
            {debugOutput}
            <h1 className="text-2xl font-bold text-gray-900 mb-2">
              {isNorway ? "Butikk ikke funnet" : "Store not found"}
            </h1>
            <p className="text-gray-600 mb-6">
              {isNorway
                ? "Vi kunne ikke finne denne butikken. Prove a soke etter en annen."
                : "We couldn't find this store. Try searching for another one."}
            </p>
            <Link
              href={`/${country}`}
              className="inline-block px-6 py-2 bg-green-600 hover:bg-green-700 text-white rounded-md transition-colors"
            >
              {translations.backToHome}
            </Link>
          </div>
        </div>
        <footer className="bg-white border-t border-gray-200 py-8 mt-auto">
          <div className="container mx-auto px-4 text-center text-gray-600 text-sm">{translations.copyright}</div>
        </footer>
      </div>
    )
  }

  const storeName = store.name
  const storeDomain = normalizeDomain(store.domain)
  const teasers = codes.length > 0 ? selectTeasers(codes) : []
  
  // Compute truthful counts for copy
  const teaserCount = teasers.length
  const totalVerified = computeRevealCount(codes, storeDomain, country)
  const additionalCodes = totalVerified - teaserCount

  // No codes found
  if (codes.length === 0) {
    return (
      <div className="min-h-screen bg-gray-50">
        <header className="bg-white border-b border-gray-200">
          <div className="container mx-auto px-4 py-6">
            <Link href={`/${country}`} className="inline-flex items-center gap-2 text-gray-600 hover:text-gray-900">
              <ArrowLeft className="h-4 w-4" />
              <span>{translations.backToHome}</span>
            </Link>
          </div>
        </header>
        <div className="container mx-auto px-4 py-12">
          <div className="max-w-xl mx-auto text-center">
            {debugOutput}
            <h1 className="text-2xl font-bold text-gray-900 mb-2">
              {isNorway ? `Rabattkoder for ${storeName}` : `Discount codes for ${storeName}`}
            </h1>
            <p className="text-lg text-gray-700 mb-4">
              {isNorway ? "Ingen fungerende rabattkoder akkurat nå." : "No working discount codes right now."}
            </p>
            <p className="text-gray-500 text-sm">
              {isNorway
                ? "Vi tester rabattkoder kontinuerlig. Sjekk tilbake senere, eller sok etter en annen butikk."
                : "We test discount codes continuously. Check back later, or search for another store."}
            </p>
            <Link
              href={`/${country}`}
              className="inline-block mt-6 px-6 py-2 bg-green-600 hover:bg-green-700 text-white rounded-md transition-colors"
            >
              {translations.backToHome}
            </Link>
          </div>
        </div>
        <footer className="bg-white border-t border-gray-200 py-8 mt-auto">
          <div className="container mx-auto px-4 text-center text-gray-600 text-sm">{translations.copyright}</div>
        </footer>
      </div>
    )
  }

  // Store found with codes
  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white border-b border-gray-200">
        <div className="container mx-auto px-4 py-6">
          <Link href={`/${country}`} className="inline-flex items-center gap-2 text-gray-600 hover:text-gray-900">
            <ArrowLeft className="h-4 w-4" />
            <span>{translations.backToHome}</span>
          </Link>
        </div>
      </header>

      <section className="container mx-auto px-4 py-8">
        <div className="max-w-3xl mx-auto">
          <div className="text-center mb-8">
            {debugOutput}
            <div className="w-20 h-20 rounded-full bg-gray-100 flex items-center justify-center text-3xl font-bold text-gray-600 mx-auto mb-4">
              {storeName.charAt(0)}
            </div>
            <h1 className="text-3xl font-bold text-gray-900 mb-2">
              {isNorway ? `Rabattkoder for ${storeName}` : `Discount codes for ${storeName}`}
            </h1>
          </div>

          <div className="space-y-4">
            <h2 className="text-xl font-semibold text-gray-900">
              {isNorway ? "Tilgjengelige rabatter" : "Available discounts"}
            </h2>

            {teasers.map((teaser, index) => (
              <div key={index} className="bg-white border border-gray-200 rounded-lg p-6 shadow-sm">
                <div className="flex justify-between items-center">
                  <div>
                    <p className="font-semibold text-gray-900 text-lg">
                      {teaser.benefit_type === "percent_off" && teaser.value_percent
                        ? `${teaser.value_percent}% ${isNorway ? "rabatt" : "off"}`
                        : teaser.benefit_type === "amount_off" && teaser.value_amount
                          ? `${teaser.value_amount} ${teaser.currency || "NOK"} ${isNorway ? "rabatt" : "off"}`
                          : isNorway
                            ? "Gratis frakt"
                            : "Free shipping"}
                    </p>
                    <p className="text-gray-600 text-sm mt-1">
                      {teaser.scope === "cart"
                        ? isNorway
                          ? "Gjelder hele handlekurven"
                          : "Applies to entire cart"
                        : isNorway
                          ? "Gjelder utvalgte produkter"
                          : "Applies to select products"}
                    </p>
                    {teaser.min_purchase_amount && (
                      <p className="text-gray-500 text-xs mt-1">
                        {isNorway
                          ? `Minstekjop: ${teaser.min_purchase_amount} ${teaser.currency || "NOK"}`
                          : `Min purchase: ${teaser.min_purchase_amount} ${teaser.currency || "NOK"}`}
                      </p>
                    )}
                  </div>
                  <div className="text-right">
                    <div className="bg-gray-100 text-gray-400 px-4 py-2 rounded font-mono text-lg tracking-wider">
                      ****
                    </div>
                    <p className="text-xs text-gray-500 mt-1">{isNorway ? "Kode skjult" : "Code hidden"}</p>
                  </div>
                </div>
              </div>
            ))}

            <div className="bg-green-50 border border-green-200 rounded-lg p-6 text-center mt-6 relative">
              <p className="text-gray-700 mb-4">
                {additionalCodes > 0
                  ? isNorway
                    ? `Vi viser topp ${teaserCount} nå. Lås opp for å se ${additionalCodes} flere verifiserte rabattkoder.`
                    : `Showing top ${teaserCount} now. Unlock to see ${additionalCodes} more verified discount codes.`
                  : isNorway
                    ? "Dette er alle verifiserte rabattkodene vi har akkurat nå."
                    : "These are all the verified discount codes we have right now."}
              </p>
              <Link
                href={buildCheckoutUrl(country, storeDomain)}
                className="inline-block bg-green-600 hover:bg-green-700 text-white px-8 py-3 rounded-lg font-semibold transition-colors cursor-pointer relative z-10"
                style={{ pointerEvents: "auto" }}
              >
                {isNorway ? "Lås opp fungerende rabattkoder" : "Unlock working discount codes"}
              </Link>
              <p className="text-xs text-gray-500 mt-2">
                {isNorway ? "Alle koder er testet og verifisert" : "All codes are tested and verified"}
              </p>
            </div>
          </div>
        </div>
      </section>

      <footer className="bg-white border-t border-gray-200 py-8 mt-auto">
        <div className="container mx-auto px-4 text-center text-gray-600 text-sm">{translations.copyright}</div>
      </footer>
    </div>
  )
}
