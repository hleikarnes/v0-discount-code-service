"use client"

import { useEffect, useState, useRef } from "react"
import { useSearchParams, useParams } from "next/navigation"
import Link from "next/link"
import { ArrowLeft, Copy, Check, AlertCircle } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { buildStorePageUrl, buildHomeUrl, normalizeDomain } from "@/lib/routing"
import { logEvent } from "@/lib/events"

// Storage keys (same as admin uses)
const CODES_KEY = "dealtested_store_codes_v1"
const STORES_KEY = "dealtested_admin_stores_v1"
const COUNTRY_SETTINGS_KEY = "dealtested_country_settings_v1"

// Get reveal limits from localStorage
function getRevealLimits(storeDomain: string, countryCode: string): { cartLimit: number; productLimit: number } {
  if (typeof window === "undefined") return { cartLimit: 3, productLimit: 2 }
  
  try {
    // Check for store-specific overrides
    const stores = localStorage.getItem(STORES_KEY)
    if (stores) {
      const allStores = JSON.parse(stores) as Array<{
        domain: string
        country_code: string
        reveal_cart_limit_override: number | null
        reveal_product_limit_override: number | null
      }>
      const normalizedDomain = normalizeDomain(storeDomain)
      const store = allStores.find(s => normalizeDomain(s.domain) === normalizedDomain)
      
      if (store) {
        // Get country defaults
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
    
    // Fallback to country settings
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
  } catch (e) {
    console.error("[v0] Failed to read limits from localStorage:", e)
  }
  
  return { cartLimit: 3, productLimit: 2 } // Default
}

interface RevealedCode {
  code: string
  coupon_code?: string | null
  benefit_type: "percent_off" | "amount_off" | "free_shipping"
  scope: "cart" | "product"
  value_percent?: number
  value_amount?: number
  currency?: string
  min_purchase_amount?: number
  applies_to_product?: string
  terms?: string
  last_tested_at?: string
}

interface RevealResponse {
  store_domain: string
  codes: RevealedCode[]
  limits: { cart_limit: number; product_limit: number }
  message?: string
}

// Helper to get codes from localStorage (for manual/prototype mode) with limits applied
function getCodesFromLocalStorage(storeDomain: string, countryCode: string): RevealedCode[] {
  if (typeof window === "undefined") return []
  try {
    const stored = localStorage.getItem(CODES_KEY)
    if (!stored) return []
    
    const allCodes = JSON.parse(stored) as Array<{
      store_domain: string
      code: string
      coupon_code?: string
      benefit_type: string
      scope?: string
      value_percent?: number
      value_amount?: number
      currency?: string
      min_purchase_amount?: number
      applies_to_product?: string
      is_visible_to_users?: boolean
    }>
    
    const normalizedDomain = normalizeDomain(storeDomain)
    
    // Filter by store domain and valid coupon_code
    const filteredCodes = allCodes
      .filter(c => {
        const codeDomain = normalizeDomain(c.store_domain)
        const hasValidCoupon = c.coupon_code && c.coupon_code.trim().length > 0
        const isVisible = c.is_visible_to_users !== false
        return codeDomain === normalizedDomain && hasValidCoupon && isVisible
      })
      .map(c => ({
        code: c.code,
        coupon_code: c.coupon_code,
        benefit_type: c.benefit_type as "percent_off" | "amount_off" | "free_shipping",
        scope: (c.scope || "cart") as "cart" | "product",
        value_percent: c.value_percent,
        value_amount: c.value_amount,
        currency: c.currency,
        min_purchase_amount: c.min_purchase_amount,
        applies_to_product: c.applies_to_product,
      }))
    
    // Sort by value (best first)
    const sortByValue = (codes: RevealedCode[]) => {
      return [...codes].sort((a, b) => {
        // Free shipping always last among cart codes
        if (a.benefit_type === "free_shipping" && b.benefit_type !== "free_shipping") return 1
        if (b.benefit_type === "free_shipping" && a.benefit_type !== "free_shipping") return -1
        // Sort by percent first, then amount
        if (a.benefit_type === "percent_off" && b.benefit_type === "percent_off") {
          return (b.value_percent ?? 0) - (a.value_percent ?? 0)
        }
        if (a.benefit_type === "amount_off" && b.benefit_type === "amount_off") {
          return (b.value_amount ?? 0) - (a.value_amount ?? 0)
        }
        // Prefer percent over amount
        if (a.benefit_type === "percent_off") return -1
        if (b.benefit_type === "percent_off") return 1
        return 0
      })
    }
    
    // Get limits and apply them
    const { cartLimit, productLimit } = getRevealLimits(storeDomain, countryCode)
    
    const cartCodes = sortByValue(filteredCodes.filter(c => c.scope === "cart")).slice(0, cartLimit)
    const productCodes = sortByValue(filteredCodes.filter(c => c.scope === "product")).slice(0, productLimit)
    
    return [...cartCodes, ...productCodes]
  } catch (e) {
    console.error("[v0] Failed to read codes from localStorage:", e)
    return []
  }
}

export default function RevealPage() {
  const params = useParams<{ country: string }>()
  const searchParams = useSearchParams()
  
  const country = params.country || "no"
  // ALWAYS normalize store domain from URL
  const rawStore = searchParams.get("store") || ""
  const store = rawStore ? normalizeDomain(rawStore) : ""
  
  const [codes, setCodes] = useState<RevealedCode[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState("")
  const [copiedCode, setCopiedCode] = useState<string | null>(null)
  
  // Ref to prevent double-logging reveal_view
  const hasLoggedRevealView = useRef(false)

  // Log reveal_view ONCE when codes are loaded and displayed
  useEffect(() => {
    // Only log once, only when not loading, only when we have codes
    if (hasLoggedRevealView.current || isLoading || codes.length === 0 || !store) {
      return
    }
    
    // Count codes that actually have a coupon_code (what's displayed)
    const displayedCodes = codes.filter(c => c.coupon_code && c.coupon_code.trim().length > 0)
    
    if (displayedCodes.length > 0) {
      hasLoggedRevealView.current = true
      
      logEvent("reveal_view", {
        storeDomain: store,
        countryCode: country.toUpperCase(),
        meta: { store_domain: store, codes_shown_count: displayedCodes.length },
      }).then(() => {
        console.log(`[v0] Logged reveal_view: store=${store}, count=${displayedCodes.length}`)
      }).catch(() => {})
    }
  }, [codes, isLoading, store, country])

  // Log page_view on mount
  useEffect(() => {
    if (store) {
      logEvent("page_view", {
        storeDomain: store,
        countryCode: country.toUpperCase(),
        meta: { path: `/${country}/reveal`, referrer: document.referrer || "" },
      }).catch(() => {})
    }
  }, [store, country])

  // Fetch codes on mount
  useEffect(() => {
    const fetchCodes = async () => {
      const token = sessionStorage.getItem("dealtested_reveal_token")
      
      // If no token, try localStorage fallback for manual mode
      if (!token) {
        const localCodes = getCodesFromLocalStorage(store, country)
        if (localCodes.length > 0) {
          setCodes(localCodes)
          setIsLoading(false)
          return
        }
        
        setError(country === "no" 
          ? "Ingen tilgangstoken funnet. Vennligst gå tilbake og fullfør betalingen." 
          : "No access token found. Please go back and complete payment.")
        setIsLoading(false)
        return
      }

      try {
        const response = await fetch("/api/stores/reveal", {
          method: "GET",
          headers: {
            "Authorization": `Bearer ${token}`,
          },
        })

        const data: RevealResponse = await response.json()

        if (!response.ok) {
          // If API fails, try localStorage fallback
          const localCodes = getCodesFromLocalStorage(store, country)
          if (localCodes.length > 0) {
            setCodes(localCodes)
            setIsLoading(false)
            return
          }
          throw new Error(data.message || "Failed to fetch codes")
        }

        // If API returns empty, try localStorage fallback
        if (!data.codes || data.codes.length === 0) {
          const localCodes = getCodesFromLocalStorage(store, country)
          if (localCodes.length > 0) {
            setCodes(localCodes)
            setIsLoading(false)
            return
          }
        }

        const finalCodes = data.codes || []
        setCodes(finalCodes)
        // reveal_view is logged by the dedicated useEffect when codes state updates
      } catch (err) {
        console.error("[v0] Reveal fetch error:", err)
        
        // Try localStorage fallback on any error
        const localCodes = getCodesFromLocalStorage(store, country)
        if (localCodes.length > 0) {
          setCodes(localCodes)
          setIsLoading(false)
          return
        }
        
        setError(err instanceof Error ? err.message : "En feil oppstod")
      } finally {
        setIsLoading(false)
      }
    }

    fetchCodes()
  }, [country, store])

  const copyCode = async (code: string) => {
    try {
      await navigator.clipboard.writeText(code)
      setCopiedCode(code)
      setTimeout(() => setCopiedCode(null), 2000)
    } catch {
      // Fallback for older browsers
      const textArea = document.createElement("textarea")
      textArea.value = code
      document.body.appendChild(textArea)
      textArea.select()
      document.execCommand("copy")
      document.body.removeChild(textArea)
      setCopiedCode(code)
      setTimeout(() => setCopiedCode(null), 2000)
    }
  }

  const isNorway = country === "no"
  const storeName = store.split(".")[0].charAt(0).toUpperCase() + store.split(".")[0].slice(1)

  const formatBenefit = (code: RevealedCode) => {
    if (code.benefit_type === "percent_off" && code.value_percent) {
      return `${code.value_percent}% ${isNorway ? "rabatt" : "off"}`
    }
    if (code.benefit_type === "amount_off" && code.value_amount) {
      return `${code.value_amount} ${code.currency || "NOK"} ${isNorway ? "rabatt" : "off"}`
    }
    return isNorway ? "Gratis frakt" : "Free shipping"
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white border-b border-gray-200">
        <div className="container mx-auto px-4 py-6">
          <Link 
            href={buildHomeUrl(country)}
            className="inline-flex items-center gap-2 text-gray-600 hover:text-gray-900 cursor-pointer"
          >
            <ArrowLeft className="h-4 w-4" />
            <span>{isNorway ? "Tilbake til forsiden" : "Back to home"}</span>
          </Link>
        </div>
      </header>

      {/* Content */}
      <main className="container mx-auto px-4 py-12">
        <div className="max-w-2xl mx-auto">
          {/* Title */}
          <div className="text-center mb-8">
            <h1 className="text-3xl font-bold text-gray-900 mb-2">
              {isNorway ? `Rabattkoder for ${storeName}` : `Discount codes for ${storeName}`}
            </h1>
            {!isLoading && !error && codes.length > 0 && (
              <p className="text-green-600">
                {isNorway ? `${codes.length} verifiserte rabattkoder tilgjengelig` : `${codes.length} verified discount codes available`}
              </p>
            )}
          </div>

          {/* Loading State */}
          {isLoading && (
            <Card className="bg-white border-gray-200">
              <CardContent className="p-12 text-center">
                <div className="animate-pulse text-gray-500">
                  {isNorway ? "Henter rabattkoder..." : "Fetching discount codes..."}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Error State */}
          {!isLoading && error && (
            <Card className="bg-white border-gray-200">
              <CardContent className="p-8 text-center">
                <AlertCircle className="h-12 w-12 text-red-500 mx-auto mb-4" />
                <h2 className="text-lg font-semibold text-gray-900 mb-2">
                  {isNorway ? "Noe gikk galt" : "Something went wrong"}
                </h2>
                <p className="text-gray-600 mb-6">{error}</p>
                <Link href={buildStorePageUrl(country, { domain: store })}>
                  <Button className="bg-green-600 hover:bg-green-700 text-white cursor-pointer">
                    {isNorway ? "Gå tilbake til butikksiden" : "Go back to store page"}
                  </Button>
                </Link>
              </CardContent>
            </Card>
          )}

          {/* Empty State */}
          {!isLoading && !error && codes.length === 0 && (
            <Card className="bg-white border-gray-200">
              <CardContent className="p-8 text-center">
                <p className="text-gray-600 mb-6">
                  {isNorway 
                    ? "Ingen fungerende rabattkoder akkurat nå." 
                    : "No working discount codes right now."}
                </p>
                <Link href={buildHomeUrl(country)}>
                  <Button className="bg-green-600 hover:bg-green-700 text-white cursor-pointer">
                    {isNorway ? "Se andre butikker" : "See other stores"}
                  </Button>
                </Link>
              </CardContent>
            </Card>
          )}

          {/* Codes List */}
          {!isLoading && !error && codes.length > 0 && (
            <div className="space-y-4">
              {codes.map((code, index) => (
                <Card key={index} className="bg-white border-gray-200 shadow-sm hover:shadow-md transition-shadow">
                  <CardContent className="p-6">
                    <div className="flex justify-between items-start gap-4">
                      <div className="flex-1">
                        <p className="font-semibold text-gray-900 text-lg mb-1">
                          {formatBenefit(code)}
                        </p>
                        <p className="text-gray-600 text-sm">
                          {code.scope === "cart" 
                            ? (isNorway ? "Gjelder hele handlekurven" : "Applies to entire cart")
                            : (isNorway ? "Gjelder utvalgte produkter" : "Applies to select products")}
                        </p>
                        {code.min_purchase_amount && (
                          <p className="text-gray-500 text-xs mt-1">
                            {isNorway 
                              ? `Minstekjøp: ${code.min_purchase_amount} ${code.currency || "NOK"}` 
                              : `Min purchase: ${code.min_purchase_amount} ${code.currency || "NOK"}`}
                          </p>
                        )}
                        {code.applies_to_product && (
                          <p className="text-gray-500 text-xs mt-1">
                            {isNorway ? `Gjelder: ${code.applies_to_product}` : `For: ${code.applies_to_product}`}
                          </p>
                        )}
                      </div>
                      <div className="flex flex-col items-end gap-2">
                        {/* Always show coupon code - API filters out codes without one */}
                        <div className="bg-green-50 border-2 border-green-200 border-dashed px-4 py-2 rounded-lg">
                          <span className="font-mono font-bold text-green-700 text-lg tracking-wider">
                            {code.coupon_code}
                          </span>
                        </div>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => copyCode(code.coupon_code!)}
                          className="bg-transparent hover:bg-gray-100 cursor-pointer"
                        >
                          {copiedCode === code.coupon_code ? (
                            <>
                              <Check className="h-4 w-4 mr-1 text-green-600" />
                              <span className="text-green-600">{isNorway ? "Kopiert!" : "Copied!"}</span>
                            </>
                          ) : (
                            <>
                              <Copy className="h-4 w-4 mr-1" />
                              <span>{isNorway ? "Kopier" : "Copy"}</span>
                            </>
                          )}
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}

              {/* Link to store */}
              <div className="text-center pt-4">
                <a 
                  href={`https://${store}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-block bg-green-600 hover:bg-green-700 text-white px-8 py-3 rounded-lg font-semibold transition-colors cursor-pointer"
                >
                  {isNorway ? `Gå til ${storeName}` : `Go to ${storeName}`}
                </a>
              </div>
            </div>
          )}
        </div>
      </main>
    </div>
  )
}
