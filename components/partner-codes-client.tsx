"use client"

import { useEffect, useState } from "react"
import Link from "next/link"
import { Card, CardContent } from "@/components/ui/card"
import { Gift, Truck, ChevronRight } from "lucide-react"
import { createClient } from "@/lib/supabase/client"
import { normalizeDomain } from "@/lib/routing"
import { logEvent, fetchEventsFromSupabase } from "@/lib/events"

interface PartnerCode {
  id: string
  country: string
  store_domain: string
  store_name: string
  code: string | null
  discount_text: string | null
  free_shipping: boolean
  partner_url: string
  logo_url: string | null
  description: string | null
  is_active: boolean
  is_featured: boolean
  sort_order: number
  created_at: string
}

interface PartnerCodesClientProps {
  country: string
  label: string
  seeAllLabel: string
}

export function PartnerCodesClient({ country, label, seeAllLabel }: PartnerCodesClientProps) {
  const [partnerCodes, setPartnerCodes] = useState<PartnerCode[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [totalCount, setTotalCount] = useState(0)

  useEffect(() => {
    const fetchPartnerCodes = async () => {
      try {
        const supabase = createClient()
        
        // Fetch all active partner codes for this country (no ordering from DB, we do it client-side)
        const { data, error } = await supabase
          .from("partner_codes")
          .select("*")
          .eq("country", country.toLowerCase())
          .eq("is_active", true)
        
        if (error) {
          console.warn("[v0] Failed to fetch partner codes:", error.message)
          setPartnerCodes([])
          return
        }
        
        const allCodes = data || []
        setTotalCount(allCodes.length)
        
        if (allCodes.length === 0) {
          setPartnerCodes([])
          return
        }
        
        // Split into featured and normal
        const featured = allCodes.filter(p => p.is_featured === true)
        const normal = allCodes.filter(p => p.is_featured !== true)
        
        // Sort featured by: sort_order ASC (null/0 = 9999), then created_at DESC
        const sortedFeatured = featured.sort((a, b) => {
          const aOrder = (a.sort_order == null || a.sort_order === 0) ? 9999 : a.sort_order
          const bOrder = (b.sort_order == null || b.sort_order === 0) ? 9999 : b.sort_order
          if (aOrder !== bOrder) return aOrder - bOrder
          // Tie-breaker: created_at DESC
          return new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
        })
        
        // For normal codes: fetch partner_click events for ranking (sort_order is IGNORED)
        let clickCounts: Map<string, number> = new Map()
        try {
          const events = await fetchEventsFromSupabase({
            country: country.toLowerCase(),
            eventTypes: ["partner_click"],
          })
          
          if (events) {
            // Count clicks per store_domain
            for (const event of events) {
              const domain = event.store_domain || (event.meta as any)?.store_domain
              if (domain) {
                const normalized = normalizeDomain(domain)
                clickCounts.set(normalized, (clickCounts.get(normalized) || 0) + 1)
              }
            }
          }
        } catch {
          // Continue without click ranking if fetch fails
        }
        
        // Sort normal by: partner_click_count DESC, then created_at DESC (sort_order NOT used)
        const sortedNormal = normal.sort((a, b) => {
          const aClicks = clickCounts.get(normalizeDomain(a.store_domain || a.store_name)) || 0
          const bClicks = clickCounts.get(normalizeDomain(b.store_domain || b.store_name)) || 0
          if (bClicks !== aClicks) return bClicks - aClicks
          // Tie-breaker: created_at DESC
          return new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
        })
        
        // Final list: featured first, then normal
        const finalList = [...sortedFeatured, ...sortedNormal]
        
        // Debug log (dev only)
        console.log("[v0] Partner sort order:", finalList.slice(0, 6).map(p => ({
          store_domain: p.store_domain,
          is_featured: p.is_featured,
          sort_order: p.sort_order,
        })))
        
        // Show max 6
        setPartnerCodes(finalList.slice(0, 6))
      } catch (e) {
        console.warn("[v0] Partner codes fetch error:", e)
        setPartnerCodes([])
      } finally {
        setIsLoading(false)
      }
    }

    fetchPartnerCodes()
  }, [country])

  // Log partner click event when clicking a partner card
  const handlePartnerClick = (partnerCode: PartnerCode) => {
    logEvent("partner_click", {
      storeDomain: normalizeDomain(partnerCode.store_domain || partnerCode.store_name),
      countryCode: country.toUpperCase(),
      meta: { 
        store_domain: partnerCode.store_domain,
        partner_url: partnerCode.partner_url,
      },
    }).catch(() => {})
  }

  // Hide section while loading or if no partner codes
  if (isLoading || partnerCodes.length === 0) {
    return null
  }

  return (
    <section className="container mx-auto px-4 py-8">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-2">
          <Gift className="h-5 w-5 text-green-600" />
          <h3 className="text-xl font-bold text-foreground">{label}</h3>
        </div>
        
        {/* Show "See all" link if there are more than 6 partner codes */}
        {totalCount > 6 && (
          <Link
            href={`/${country}/partner`}
            className="inline-flex items-center gap-1 text-sm font-medium text-green-600 hover:text-green-700 transition-colors"
          >
            {seeAllLabel}
            <ChevronRight className="h-4 w-4" />
          </Link>
        )}
      </div>
      
      <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4">
        {partnerCodes.map((partner) => (
          <Link
            key={partner.id}
            href={`/${country}/partner/${normalizeDomain(partner.store_domain || partner.store_name)}`}
            className="group block cursor-pointer"
            onClick={() => handlePartnerClick(partner)}
          >
            <Card className="h-full bg-card border-border transition-all duration-200 group-hover:shadow-lg group-hover:border-green-300 group-hover:bg-green-50/30">
              <CardContent className="p-4 flex flex-col items-center gap-2">
                {/* Logo or Initial */}
                {partner.logo_url ? (
                  <div className="w-12 h-12 rounded-full overflow-hidden bg-muted flex items-center justify-center">
                    <img 
                      src={partner.logo_url || "/placeholder.svg"} 
                      alt={partner.store_name}
                      className="w-full h-full object-cover"
                    />
                  </div>
                ) : (
                  <div className="w-12 h-12 rounded-full bg-green-100 flex items-center justify-center text-lg font-bold text-green-600 group-hover:bg-green-200 transition-colors">
                    {partner.store_name.charAt(0).toUpperCase()}
                  </div>
                )}
                
                {/* Store Name */}
                <span className="font-medium text-foreground text-center text-sm line-clamp-1">
                  {partner.store_name}
                </span>
                
                {/* Discount Text or Free Shipping Badge */}
                {partner.discount_text ? (
                  <span className="text-xs text-green-600 font-medium text-center line-clamp-1">
                    {partner.discount_text}
                  </span>
                ) : partner.free_shipping ? (
                  <span className="inline-flex items-center gap-1 text-xs text-blue-600 font-medium">
                    <Truck className="h-3 w-3" />
                    Gratis frakt
                  </span>
                ) : null}
              </CardContent>
            </Card>
          </Link>
        ))}
      </div>
    </section>
  )
}
