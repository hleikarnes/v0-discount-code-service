import { createClient } from "@/lib/supabase/server"
import { notFound, permanentRedirect } from "next/navigation"
import { ArrowLeft } from "lucide-react"
import Link from "next/link"
import { logEvent } from "@/lib/events"
import { getGuestId } from "@/lib/guest"
import { selectTeasers } from "@/lib/teaser"
import { getMockRepository } from "@/lib/db/repository"
import { getTranslation, isValidCountry } from "@/lib/i18n"
import { buildCheckoutUrl, normalizeDomain } from "@/lib/routing"
import { isManualMode, isPrototypeMode } from "@/lib/config"
import { StorePageClient } from "@/components/store-page-client"
import type { Metadata } from "next"

interface StorePageProps {
  params: Promise<{ country: string; store_slug: string }>
}

// Generate metadata with canonical URL and SEO tags
export async function generateMetadata({ params }: StorePageProps): Promise<Metadata> {
  const { country, store_slug } = await params
  const normalizedCountry = country.toLowerCase()
  const inputSlug = store_slug.trim().toLowerCase()
  
  // If slug has country suffix, use the clean slug for canonical
  const cleanSlug = inputSlug.endsWith(`-${normalizedCountry}`)
    ? inputSlug.slice(0, -(normalizedCountry.length + 1))
    : inputSlug
  
  // Fetch store for SEO metadata
  try {
    const supabase = await createClient()
    const { data: store } = await supabase
      .from("stores")
      .select("store_name, seo_title, seo_description")
      .eq("slug", cleanSlug)
      .eq("country", normalizedCountry)
      .eq("is_active", true)
      .maybeSingle()
    
    const storeName = store?.store_name || cleanSlug
    const title = store?.seo_title || (normalizedCountry === "no" 
      ? `Rabattkoder for ${storeName} | DealTested`
      : `Discount codes for ${storeName} | DealTested`)
    const description = store?.seo_description || (normalizedCountry === "no"
      ? `Finn fungerende rabattkoder for ${storeName}. Alle koder er testet og verifisert.`
      : `Find working discount codes for ${storeName}. All codes are tested and verified.`)
    
    return {
      title,
      description,
      alternates: {
        canonical: `https://dealtested.com/${normalizedCountry}/store/${cleanSlug}`,
      },
    }
  } catch {
    return {
      title: normalizedCountry === "no" ? "Rabattkoder | DealTested" : "Discount Codes | DealTested",
      alternates: {
        canonical: `https://dealtested.com/${normalizedCountry}/store/${cleanSlug}`,
      },
    }
  }
}

export default async function StorePage({ params }: StorePageProps) {
  const { country, store_slug } = await params
  const normalizedCountry = country.toLowerCase()
  const inputSlug = store_slug.trim().toLowerCase()

  // Validate country
  if (!isValidCountry(country)) {
    notFound()
  }

  // EARLY REDIRECT: Handle legacy URLs with country suffix BEFORE any data fetching
  // This prevents rendering the empty state for URLs like /no/store/bilkomponenter-no
  const cleanSlug = inputSlug.endsWith(`-${normalizedCountry}`)
    ? inputSlug.slice(0, -(normalizedCountry.length + 1))
    : inputSlug
  
  if (cleanSlug !== inputSlug) {
    // 301 permanent redirect to canonical URL
    permanentRedirect(`/${country}/store/${cleanSlug}`)
  }

  const t = getTranslation(country)

  // In manual mode, delegate EVERYTHING to client-side component
  // Server components cannot access localStorage, so we skip all server-side store/code lookup
  if (isManualMode()) {
    return (
      <StorePageClient
        country={country}
        storeSlug={store_slug}
        isPrototypeMode={isPrototypeMode()}
        isManualMode={true}
        translations={{ backToHome: t.backToHome, copyright: t.copyright }}
      />
    )
  }

  // Non-manual mode: use server-side lookup
  const guestId = await getGuestId()
  const repo = getMockRepository()

  // Store lookup: Primary by slug, fallback strip -{country} suffix
  let store = null
  let storeId: string | null = null
  
  try {
    const supabase = await createClient()
    
    // Match by slug exactly (early redirect already handled country suffix case)
    const { data } = await supabase
      .from("stores")
      .select("*")
      .eq("slug", inputSlug)
      .eq("country", normalizedCountry)
      .eq("is_active", true)
      .maybeSingle()
    
    // Map Supabase schema to internal format
    if (data) {
      storeId = data.id
      store = {
        id: data.id,
        domain: data.store_domain,
        name: data.store_name,
        slug: data.slug,
        country_code: data.country.toUpperCase(),
        is_active: data.is_active,
        is_featured: data.is_featured,
        logo_url: data.logo_url,
        seo_title: data.seo_title,
        seo_description: data.seo_description,
      }
    }
    
    // If still not found, try mock repository as last resort
    if (!store) {
      store = await repo.getStoreBySlugOrDomain(store_slug, country)
    }
    
    // Debug log if store not found (server-side only)
    if (!store) {
      console.log(`[v0] Store not found: country=${country}, slug=${inputSlug}, stripped=${inputSlug.endsWith(`-${normalizedCountry}`) ? inputSlug.slice(0, -(normalizedCountry.length + 1)) : "N/A"}`)
    }
  } catch (e) {
    console.error("[v0] Store lookup error:", e)
    store = null
  }

  // If store not found, show friendly message instead of 404
  if (!store) {
    return (
      <div className="min-h-screen bg-gray-50">
        <header className="bg-white border-b border-gray-200">
          <div className="container mx-auto px-4 py-6">
            <Link href={`/${country}`} className="inline-flex items-center gap-2 text-gray-600 hover:text-gray-900">
              <ArrowLeft className="h-4 w-4" />
              <span>{t.backToHome}</span>
            </Link>
          </div>
        </header>
        <div className="container mx-auto px-4 py-12">
          <div className="max-w-xl mx-auto text-center">
            <h1 className="text-2xl font-bold text-gray-900 mb-2">
              {country === "no" ? "Butikk ikke funnet" : "Store not found"}
            </h1>
            <p className="text-gray-600 mb-6">
              {country === "no"
                ? "Vi kunne ikke finne denne butikken. Prove a soke etter en annen."
                : "We couldn't find this store. Try searching for another one."}
            </p>
            <Link
              href={`/${country}`}
              className="inline-block px-6 py-2 bg-green-600 hover:bg-green-700 text-white rounded-md transition-colors"
            >
              {t.backToHome}
            </Link>
          </div>
        </div>
      </div>
    )
  }

  // Log page_view event (fire-and-forget)
  logEvent("page_view", {
    guestId,
    storeDomain: normalizeDomain(store.domain),
    countryCode: country.toUpperCase(),
    meta: { path: `/${country}/store/${store_slug}`, referrer: "" },
  }).catch(() => {})

  // Get discount codes by store_id from Supabase
  let codes: Array<{
    id?: string
    store_id?: string
    store_domain?: string
    code: string
    benefit_type: string
    scope: string
    value_percent?: number
    value_amount?: number
    currency?: string
    min_purchase_amount?: number
    applies_to_product?: string
    tested_products_count?: number
    is_visible_to_users?: boolean
    last_tested_at?: string
  }> = []
  
  try {
    // Primary: Fetch codes by store_id if we have it
    if (storeId) {
      const supabase = await createClient()
      const { data } = await supabase
        .from("discount_codes")
        .select("*")
        .eq("store_id", storeId)
        .eq("is_active", true)
        .not("code", "is", null)
        .order("created_at", { ascending: false })
      
      codes = data || []
    }
    
    // Fallback: If no codes from Supabase, try mock repository by domain
    if (codes.length === 0) {
      const normalizedStoreDomain = normalizeDomain(store.domain)
      const repoCodes = await repo.getStoreCodesByDomain(normalizedStoreDomain)
      codes = repoCodes
    }
    
    // Filter: Only codes with a valid code string and visible to users
    codes = codes.filter((c) => {
      const codeValue = c.code || (c as { coupon_code?: string }).coupon_code
      const isVisible = c.is_visible_to_users !== false
      return codeValue && codeValue.trim().length > 0 && isVisible
    })
  } catch (e) {
    console.error("[v0] Codes lookup error:", e)
    codes = []
  }

  const teasers = codes.length > 0 ? selectTeasers(codes) : []

  if (codes.length === 0) {
    return (
      <div className="min-h-screen bg-gray-50">
        <header className="bg-white border-b border-gray-200">
          <div className="container mx-auto px-4 py-6">
            <Link href={`/${country}`} className="inline-flex items-center gap-2 text-gray-600 hover:text-gray-900">
              <ArrowLeft className="h-4 w-4" />
              <span>{t.backToHome}</span>
            </Link>
          </div>
        </header>
        <div className="container mx-auto px-4 py-12">
          <div className="max-w-xl mx-auto text-center">
            <h1 className="text-2xl font-bold text-gray-900 mb-2">
              {country === "no" ? `Rabattkoder for ${store.name}` : `Discount codes for ${store.name}`}
            </h1>
            <p className="text-lg text-gray-700 mb-4">
              {country === "no" 
                ? "Ingen fungerende rabattkoder akkurat nå" 
                : "No working discount codes right now"}
            </p>
            <p className="text-gray-500 text-sm">
              {country === "no"
                ? "Vi tester rabattkoder kontinuerlig. Sjekk tilbake senere, eller søk etter en annen butikk."
                : "We test discount codes continuously. Check back later, or search for another store."}
            </p>
            <Link 
              href={`/${country}`} 
              className="inline-block mt-6 px-6 py-2 bg-green-600 hover:bg-green-700 text-white rounded-md transition-colors"
            >
              {t.backToHome}
            </Link>
          </div>
        </div>
      </div>
    )
  }

  // Calculate cache freshness
  const mostRecentTest = codes[0]?.last_tested_at
  const ageHours = mostRecentTest
    ? Math.floor((Date.now() - new Date(mostRecentTest).getTime()) / (1000 * 60 * 60))
    : 999
  const isFresh = ageHours < 24

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white border-b border-gray-200">
        <div className="container mx-auto px-4 py-6">
          <Link href={`/${country}`} className="inline-flex items-center gap-2 text-gray-600 hover:text-gray-900">
            <ArrowLeft className="h-4 w-4" />
            <span>{t.backToHome}</span>
          </Link>
        </div>
      </header>

      {/* Store Info */}
      <section className="container mx-auto px-4 py-8">
        <div className="max-w-3xl mx-auto">
          <div className="text-center mb-8">
            <div className="w-20 h-20 rounded-full bg-gray-100 flex items-center justify-center text-3xl font-bold text-gray-600 mx-auto mb-4">
              {store.name.charAt(0)}
            </div>
            <h1 className="text-3xl font-bold text-gray-900 mb-2">
              {country === "no" ? `Rabattkoder for ${store.name}` : `Discount codes for ${store.name}`}
            </h1>
            {isFresh && (
              <p className="text-green-600 text-sm">
                {country === "no" ? "Koder testet i dag" : "Codes tested today"}
              </p>
            )}
          </div>

          {/* Teasers */}
          <div className="space-y-4">
            <h2 className="text-xl font-semibold text-gray-900">
              {country === "no" ? "Tilgjengelige rabatter" : "Available discounts"}
            </h2>
            
            {teasers.map((teaser, index) => (
              <div key={index} className="bg-white border border-gray-200 rounded-lg p-6 shadow-sm">
                <div className="flex justify-between items-center">
                  <div>
                    <p className="font-semibold text-gray-900 text-lg">
                      {teaser.benefit_type === "percent_off" && teaser.value_percent
                        ? `${teaser.value_percent}% ${country === "no" ? "rabatt" : "off"}`
                        : teaser.benefit_type === "amount_off" && teaser.value_amount
                          ? `${teaser.value_amount} ${teaser.currency || "NOK"} ${country === "no" ? "rabatt" : "off"}`
                          : country === "no" ? "Gratis frakt" : "Free shipping"}
                    </p>
                    <p className="text-gray-600 text-sm mt-1">
                      {teaser.scope === "cart" 
                        ? (country === "no" ? "Gjelder hele handlekurven" : "Applies to entire cart")
                        : (country === "no" ? "Gjelder utvalgte produkter" : "Applies to select products")}
                    </p>
                    {teaser.min_purchase_amount && (
                      <p className="text-gray-500 text-xs mt-1">
                        {country === "no" ? `Minstekjøp: ${teaser.min_purchase_amount} ${teaser.currency || "NOK"}` : `Min purchase: ${teaser.min_purchase_amount} ${teaser.currency || "NOK"}`}
                      </p>
                    )}
                  </div>
                  <div className="text-right">
                    <div className="bg-gray-100 text-gray-400 px-4 py-2 rounded font-mono text-lg tracking-wider">
                      ****
                    </div>
                    <p className="text-xs text-gray-500 mt-1">
                      {country === "no" ? "Kode skjult" : "Code hidden"}
                    </p>
                  </div>
                </div>
              </div>
            ))}

            {/* Purchase CTA */}
            <div className="bg-green-50 border border-green-200 rounded-lg p-6 text-center mt-6 relative">
              <p className="text-gray-700 mb-4">
                {(() => {
                  // Compute truthful counts (mirrors store-page-client logic)
                  const teaserCount = teasers.length
                  // For server mode, use codes.length as totalVerified since limits aren't applied pre-payment
                  const totalVerified = codes.length
                  const additionalCodes = totalVerified - teaserCount
                  
                  if (additionalCodes > 0) {
                    return country === "no"
                      ? `Vi viser topp ${teaserCount} nå. Lås opp for å se ${additionalCodes} flere verifiserte rabattkodene.`
                      : `Showing top ${teaserCount} now. Unlock to see ${additionalCodes} more verified discount codes.`
                  }
                  return country === "no"
                    ? "Dette er alle verifiserte rabattkodene vi har akkurat nå."
                    : "These are all the verified discount codes we have right now."
                })()}
              </p>
              <Link 
                href={buildCheckoutUrl(country, store.domain)}
                className="inline-block bg-green-600 hover:bg-green-700 text-white px-8 py-3 rounded-lg font-semibold transition-colors cursor-pointer relative z-10"
                style={{ pointerEvents: "auto" }}
              >
                {country === "no" ? "Lås opp fungerende rabattkoder" : "Unlock working discount codes"}
              </Link>
              <p className="text-xs text-gray-500 mt-2">
                {country === "no" ? "Alle koder er testet og verifisert" : "All codes are tested and verified"}
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-white border-t border-gray-200 py-8 mt-auto">
        <div className="container mx-auto px-4 text-center text-gray-600 text-sm">{t.copyright}</div>
      </footer>
    </div>
  )
}
