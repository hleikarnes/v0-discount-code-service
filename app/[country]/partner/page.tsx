"use client"

import { useEffect, useState } from "react"
import Link from "next/link"
import { useParams } from "next/navigation"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Gift, Truck, ArrowLeft } from "lucide-react"
import { createClient } from "@/lib/supabase/client"
import { normalizeDomain, buildHomeUrl } from "@/lib/routing"
import { logEvent, fetchEventsFromSupabase } from "@/lib/events"
import { getTranslation, isValidCountry, type CountryCode } from "@/lib/i18n"

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

export default function PartnerListPage() {
  const params = useParams()
  const country = (params.country as string) || "no"
  const [partnerCodes, setPartnerCodes] = useState<PartnerCode[]>([])
  const [isLoading, setIsLoading] = useState(true)

  // Validate country and get translations
  const validCountry = isValidCountry(country) ? country as CountryCode : "no"
  const t = getTranslation(validCountry)

  useEffect(() => {
    // Log page_view
    logEvent("page_view", {
      countryCode: country.toUpperCase(),
      meta: { path: `/${country}/partner`, referrer: typeof document !== "undefined" ? document.referrer || "" : "" },
    }).catch(() => {})

    const fetchPartnerCodes = async () => {
      try {
        const supabase = createClient()
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
            for (const event of events) {
              const domain = event.store_domain || (event.meta as Record<string, unknown>)?.store_domain as string
              if (domain) {
                const normalized = normalizeDomain(domain)
                clickCounts.set(normalized, (clickCounts.get(normalized) || 0) + 1)
              }
            }
          }
        } catch {
          // Continue without click ranking if fetch fails
        }
        
        // Sort normal by: partner_click_count DESC, then created_at DESC
        const sortedNormal = normal.sort((a, b) => {
          const aClicks = clickCounts.get(normalizeDomain(a.store_domain || a.store_name)) || 0
          const bClicks = clickCounts.get(normalizeDomain(b.store_domain || b.store_name)) || 0
          if (bClicks !== aClicks) return bClicks - aClicks
          return new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
        })
        
        // Final list: featured first, then normal
        const finalList = [...sortedFeatured, ...sortedNormal]
        
        // Debug log (dev only)
        console.log("[v0] Partner list sort order:", finalList.map(p => ({
          store_domain: p.store_domain,
          is_featured: p.is_featured,
          sort_order: p.sort_order,
        })))
        
        setPartnerCodes(finalList)
      } catch (e) {
        console.warn("[v0] Partner codes fetch error:", e)
        setPartnerCodes([])
      } finally {
        setIsLoading(false)
      }
    }

    fetchPartnerCodes()
  }, [country])

  // Log partner click event
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

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="bg-card border-b border-border">
        <div className="container mx-auto px-4 py-6 flex justify-between items-center">
          <Link href={buildHomeUrl(country)}>
            <h1 className="text-2xl font-bold text-foreground cursor-pointer">{t.siteName}</h1>
          </Link>
        </div>
      </header>

      {/* Back Button */}
      <div className="container mx-auto px-4 py-4">
        <Link href={buildHomeUrl(country)}>
          <Button variant="ghost" className="gap-2 text-muted-foreground hover:text-foreground">
            <ArrowLeft className="h-4 w-4" />
            {t.backToHome}
          </Button>
        </Link>
      </div>

      {/* Page Title */}
      <section className="container mx-auto px-4 py-6">
        <div className="flex items-center gap-3 mb-8">
          <Gift className="h-7 w-7 text-green-600" />
          <h2 className="text-3xl font-bold text-foreground">{t.allPartnerCodes}</h2>
        </div>

        {isLoading ? (
          <div className="text-center py-12 text-muted-foreground">
            Laster...
          </div>
        ) : partnerCodes.length === 0 ? (
          <Card className="p-8 text-center text-muted-foreground">
            {t.noPartnerCodesAvailable}
          </Card>
        ) : (
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6 gap-4">
            {partnerCodes.map((partner) => (
              <Link
                key={partner.id}
                href={`/${country}/partner/${normalizeDomain(partner.store_domain || partner.store_name)}`}
                className="group block cursor-pointer"
                onClick={() => handlePartnerClick(partner)}
              >
                <Card className="h-full bg-card border-border transition-all duration-200 group-hover:shadow-lg group-hover:border-green-300 group-hover:bg-green-50/30">
                  <CardContent className="p-4 flex flex-col items-center gap-2">
                    {/* Featured Badge */}
                    {partner.is_featured && (
                      <span className="absolute top-2 right-2 px-2 py-0.5 text-xs font-medium bg-green-100 text-green-700 rounded-full">
                        Anbefalt
                      </span>
                    )}
                    
                    {/* Logo or Initial */}
                    {partner.logo_url ? (
                      <div className="w-14 h-14 rounded-full overflow-hidden bg-muted flex items-center justify-center">
                        <img 
                          src={partner.logo_url || "/placeholder.svg"} 
                          alt={partner.store_name}
                          className="w-full h-full object-cover"
                        />
                      </div>
                    ) : (
                      <div className="w-14 h-14 rounded-full bg-green-100 flex items-center justify-center text-xl font-bold text-green-600 group-hover:bg-green-200 transition-colors">
                        {partner.store_name.charAt(0).toUpperCase()}
                      </div>
                    )}
                    
                    {/* Store Name */}
                    <span className="font-medium text-foreground text-center text-sm line-clamp-2">
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
                        {t.freeShipping}
                      </span>
                    ) : null}
                  </CardContent>
                </Card>
              </Link>
            ))}
          </div>
        )}
      </section>

      {/* Footer */}
      <footer className="bg-card border-t border-border py-8 mt-12">
        <div className="container mx-auto px-4">
          <div className="text-center text-muted-foreground text-sm">{t.copyright}</div>
        </div>
      </footer>
    </div>
  )
}
