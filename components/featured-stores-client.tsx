"use client"

import { useEffect, useState, useCallback } from "react"
import Link from "next/link"
import { Card, CardContent } from "@/components/ui/card"
import { TrendingUp } from "lucide-react"
import { STORES_KEY } from "@/lib/storage-keys"
import { normalizeDomain } from "@/lib/routing"
import { logEvent, fetchEventsFromSupabase, getLocalStorageEvents } from "@/lib/events"
import { createClient } from "@/lib/supabase/client"
import type { Event } from "@/lib/types"

// Store from Supabase schema
interface SupabaseStore {
  id: string
  country: string
  store_domain: string
  store_name: string
  slug: string
  logo_url: string | null
  is_featured: boolean
  is_active: boolean
  sort_order: number
  seo_title: string | null
  seo_description: string | null
}

/**
 * Log a store click event (for popularity tracking)
 */
function logStoreClick(storeDomain: string, country: string) {
  logEvent("store_click", {
    storeDomain: normalizeDomain(storeDomain),
    countryCode: country.toUpperCase(),
  })
}

// 30 days in milliseconds
const THIRTY_DAYS_MS = 30 * 24 * 60 * 60 * 1000

interface PopularityStats {
  purchases: number
  clicks: number
  searches: number
}

interface FeaturedStoresClientProps {
  country: string
  popularStoresLabel: string
  noStoresLabel: string
}

/**
 * Compute popularity stats for a store based on events from the last 30 days
 */
function computePopularityStats(
  store_domain: string,
  store_name: string,
  country: string,
  events: Event[]
): PopularityStats {
  const storeDomain = store_domain
  const storeName = store_name
  const normalizedDomain = normalizeDomain(storeDomain)
  const normalizedCountry = country.toUpperCase()
  const cutoffTime = Date.now() - THIRTY_DAYS_MS
  
  let purchases = 0
  let clicks = 0
  let searches = 0
  
  for (const event of events) {
    // Skip events older than 30 days
    const eventTime = new Date(event.created_at || 0).getTime()
    if (eventTime < cutoffTime) continue
    
    // Skip events from different countries
    const eventCountry = (event.country_code || "").toUpperCase()
    if (eventCountry !== normalizedCountry) continue
    
    const eventDomain = normalizeDomain(event.store_domain || "")
    
    if (event.event_type === "purchase_success") {
      if (eventDomain === normalizedDomain) {
        purchases++
      }
    } else if (event.event_type === "store_click") {
      if (eventDomain === normalizedDomain) {
        clicks++
      }
    } else if (event.event_type === "search") {
      // For search events, check if query matches store domain or name
      const query = (event.meta?.query || "").toLowerCase().trim()
      const nameMatch = storeName.toLowerCase().includes(query) || query.includes(storeName.toLowerCase())
      const domainMatch = normalizedDomain.includes(query) || query.includes(normalizedDomain)
      if (query && (nameMatch || domainMatch)) {
        searches++
      }
    }
  }
  
  return { purchases, clicks, searches }
}

/**
 * Sort stores by popularity (purchases desc, then clicks desc, then searches desc)
 */
function sortByPopularity(
  stores: SupabaseStore[],
  statsMap: Map<string, PopularityStats>
): SupabaseStore[] {
  return [...stores].sort((a, b) => {
    const statsA = statsMap.get(a.id) || { purchases: 0, clicks: 0, searches: 0 }
    const statsB = statsMap.get(b.id) || { purchases: 0, clicks: 0, searches: 0 }
    
    // Primary: purchases desc
    if (statsB.purchases !== statsA.purchases) {
      return statsB.purchases - statsA.purchases
    }
    // Secondary: clicks desc
    if (statsB.clicks !== statsA.clicks) {
      return statsB.clicks - statsA.clicks
    }
    // Tertiary: searches desc
    if (statsB.searches !== statsA.searches) {
      return statsB.searches - statsA.searches
    }
    // Fallback: stable order (keep original insertion order)
    return 0
  })
}

export function FeaturedStoresClient({ country, popularStoresLabel, noStoresLabel }: FeaturedStoresClientProps) {
  const [featuredStores, setFeaturedStores] = useState<SupabaseStore[]>([])
  const [isLoading, setIsLoading] = useState(true)

  const loadFeaturedStores = useCallback(async () => {
    try {
      const supabase = createClient()
      const normalizedCountry = country.toLowerCase()
      
      // Try to fetch from Supabase first
      const { data, error } = await supabase
        .from("stores")
        .select("*")
        .eq("country", normalizedCountry)
        .eq("is_active", true)
      
      let countryStores: SupabaseStore[] = []
      
      if (error) {
        console.warn("[v0] Failed to fetch stores from Supabase, trying localStorage fallback:", error.message)
        // Fallback to localStorage
        const stored = localStorage.getItem(STORES_KEY)
        if (stored) {
          const oldStores = JSON.parse(stored) as Record<string, unknown>[]
          countryStores = oldStores
            .filter((s) => {
              const matchesCountry = ((s.country_code as string) || "").toLowerCase() === normalizedCountry
              const isActive = s.is_active !== false
              return matchesCountry && isActive
            })
            .map((s) => {
              const domain = normalizeDomain((s.domain as string) || (s.store_domain as string) || "")
              return {
                id: s.id as string,
                country: normalizedCountry,
                store_domain: domain,
                store_name: (s.name as string) || (s.store_name as string) || domain,
                slug: (s.slug as string) || domain.split(".")[0],
                logo_url: (s.logo_url as string) || null,
                is_featured: s.is_featured === true,
                is_active: true,
                sort_order: (s.sort_order as number) || 0,
                seo_title: null,
                seo_description: null,
              }
            })
        }
      } else {
        // Normalize Supabase rows: ensure store_name and slug are never null
        countryStores = (data || []).map((s) => ({
          ...s,
          store_name: s.store_name || s.store_domain || "Ukjent butikk",
          slug: s.slug || s.store_domain?.split(".")[0] || s.id,
        }))
      }
      
      if (countryStores.length === 0) {
        setFeaturedStores([])
        setIsLoading(false)
        return
      }
      
      // Rule: If 6 or fewer stores total, show ALL (ignore is_featured and popularity)
      if (countryStores.length <= 6) {
        setFeaturedStores(countryStores)
        setIsLoading(false)
        return
      }
      
      // Rule: If more than 6 stores, prioritize featured then fill with popularity-sorted non-featured
      const featured = countryStores.filter((s) => s.is_featured === true)
      const nonFeatured = countryStores.filter((s) => s.is_featured !== true)
      
      // Load events for popularity calculation (try Supabase first, fallback to localStorage)
      let events: Event[] = []
      try {
        const supabaseEvents = await fetchEventsFromSupabase({ 
          country: normalizedCountry,
          eventTypes: ["purchase_success", "store_click", "search"]
        })
        events = supabaseEvents ?? getLocalStorageEvents()
      } catch {
        events = getLocalStorageEvents()
      }
      
      // Compute popularity stats for non-featured stores
      const statsMap = new Map<string, PopularityStats>()
      for (const store of nonFeatured) {
        const stats = computePopularityStats(store.store_domain, store.store_name, country, events)
        statsMap.set(store.id, stats)
      }
      
      // Sort non-featured by popularity
      const sortedNonFeatured = sortByPopularity(nonFeatured, statsMap)
      
      // Take all featured first, then fill remaining slots with popularity-sorted non-featured
      const result: SupabaseStore[] = [...featured]
      const remainingSlots = 6 - result.length
      if (remainingSlots > 0) {
        result.push(...sortedNonFeatured.slice(0, remainingSlots))
      }

      setFeaturedStores(result.slice(0, 6))
    } catch (e) {
      console.error("[v0] Failed to load featured stores:", e)
      setFeaturedStores([])
    } finally {
      setIsLoading(false)
    }
  }, [country])

  useEffect(() => {
    // Load on mount
    loadFeaturedStores()

    // Re-load when window gains focus (so changes from admin are visible)
    const handleFocus = () => {
      loadFeaturedStores()
    }

    window.addEventListener("focus", handleFocus)
    return () => window.removeEventListener("focus", handleFocus)
  }, [loadFeaturedStores])

  // Only hide section if there are zero stores for this country
  if (!isLoading && featuredStores.length === 0) {
    return null
  }

  if (isLoading) {
    return (
      <section className="container mx-auto px-4 py-12">
        <div className="flex items-center gap-2 mb-6">
          <TrendingUp className="h-6 w-6 text-green-600" />
          <h3 className="text-2xl font-bold text-gray-900">{popularStoresLabel}</h3>
        </div>
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
          {[1, 2, 3, 4, 5, 6].map((i) => (
            <Card key={i} className="animate-pulse bg-gray-100 border-gray-200">
              <CardContent className="p-6 flex flex-col items-center gap-3">
                <div className="w-16 h-16 rounded-full bg-gray-200" />
                <div className="h-4 w-20 bg-gray-200 rounded" />
              </CardContent>
            </Card>
          ))}
        </div>
      </section>
    )
  }

  return (
    <section className="container mx-auto px-4 py-12">
      <div className="flex items-center gap-2 mb-6">
        <TrendingUp className="h-6 w-6 text-green-600" />
        <h3 className="text-2xl font-bold text-gray-900">{popularStoresLabel}</h3>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
        {featuredStores.map((store) => {
          const displayName = store.store_name || store.store_domain || "Butikk"
          const storeSlug = store.slug || store.store_domain?.split(".")[0] || store.id
          return (
            <Link
              key={store.id}
              href={`/${country}/store/${storeSlug}`}
              className="group block cursor-pointer"
              onClick={() => logStoreClick(store.store_domain, country)}
            >
              <Card className="hover:shadow-lg transition-all duration-200 bg-white border-gray-200 group-hover:border-green-300 group-hover:bg-green-50/30">
                <CardContent className="p-6 flex flex-col items-center gap-3">
                  {store.logo_url ? (
                    <img
                      src={store.logo_url || "/placeholder.svg"}
                      alt={displayName}
                      className="w-16 h-16 object-contain"
                    />
                  ) : (
                    <div className="w-16 h-16 rounded-full bg-gray-100 flex items-center justify-center text-2xl font-bold text-gray-600 group-hover:bg-green-100 transition-colors">
                      {displayName.charAt(0).toUpperCase()}
                    </div>
                  )}
                  <span className="font-medium text-gray-900 text-center text-sm">{displayName}</span>
                </CardContent>
              </Card>
            </Link>
          )
        })}
      </div>
    </section>
  )
}
