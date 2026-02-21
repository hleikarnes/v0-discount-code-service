"use client"

import { useEffect } from "react"
import Link from "next/link"
import { Card, CardContent } from "@/components/ui/card"
import { logEvent } from "@/lib/events"
import { normalizeDomain, buildStorePageUrl } from "@/lib/routing"

interface Store {
  id: string
  name: string
  domain: string
  slug: string
  country_code: string
  logo_url: string | null
}

interface SearchResultsClientProps {
  stores: Store[]
  country: string
  query: string
}

/**
 * Log a search event (for popularity tracking)
 */
function logSearchEvent(query: string, country: string, resultCount: number) {
  logEvent("search", {
    countryCode: country.toUpperCase(),
    meta: { query: query.toLowerCase().trim(), resultCount },
  })
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

export function SearchResultsClient({ stores, country, query }: SearchResultsClientProps) {
  // Log page_view and search events on mount
  useEffect(() => {
    // Log page_view for search results page
    logEvent("page_view", {
      countryCode: country.toUpperCase(),
      meta: { 
        path: `/${country}/s`, 
        referrer: typeof document !== "undefined" ? document.referrer || "" : "" 
      },
    }).catch(() => {})
    
    // Log search event
    if (query && query.trim()) {
      logSearchEvent(query, country, stores.length)
    }
  }, [query, country, stores.length])

  if (stores.length === 0) {
    return null
  }

  return (
    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
      {stores.map((store) => {
        const storeUrl = buildStorePageUrl(country, store)
        return (
          <Link
            key={store.id}
            href={storeUrl}
            className="group block cursor-pointer focus:outline-none focus:ring-2 focus:ring-green-500 focus:ring-offset-2 rounded-lg"
            onClick={() => logStoreClick(store.domain, country)}
          >
            <Card className="h-full bg-white border-gray-200 transition-all duration-200 group-hover:shadow-lg group-hover:border-green-300 group-hover:bg-green-50/30">
              <CardContent className="p-6 flex flex-col items-center gap-3">
                {store.logo_url ? (
                  <img
                    src={store.logo_url || "/placeholder.svg"}
                    alt={store.name}
                    className="w-16 h-16 object-contain"
                  />
                ) : (
                  <div className="w-16 h-16 rounded-full bg-gray-100 flex items-center justify-center text-2xl font-bold text-gray-600 group-hover:bg-green-100 transition-colors">
                    {store.name.charAt(0)}
                  </div>
                )}
                <span className="font-medium text-gray-900 text-center text-sm">{store.name}</span>
              </CardContent>
            </Card>
          </Link>
        )
      })}
    </div>
  )
}
