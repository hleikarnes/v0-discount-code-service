"use client"

import { useEffect, useState } from "react"
import { useParams, notFound } from "next/navigation"
import Link from "next/link"
import { ArrowLeft, Truck, Gift, ExternalLink, Copy, Check } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { createClient } from "@/lib/supabase/client"
import { getTranslation, isValidCountry } from "@/lib/i18n"
import { normalizeDomain } from "@/lib/routing"
import { logEvent } from "@/lib/events"

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
  sort_order: number
}

export default function PartnerDetailPage() {
  const params = useParams()
  const country = params.country as string
  const slug = params.slug as string

  const [partnerCode, setPartnerCode] = useState<PartnerCode | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [copiedCode, setCopiedCode] = useState(false)

  // Validate country
  if (!isValidCountry(country)) {
    notFound()
  }

  const t = getTranslation(country)

  useEffect(() => {
    const fetchPartnerCode = async () => {
      try {
        const supabase = createClient()
        
        // Fetch partner code by store_domain matching the slug
        const { data, error } = await supabase
          .from("partner_codes")
          .select("*")
          .eq("country", country.toLowerCase())
          .eq("is_active", true)
          .or(`store_domain.eq.${slug},store_domain.ilike.%${slug}%`)
          .order("sort_order", { ascending: true })
          .limit(1)
          .single()
        
        if (error || !data) {
          // Try fallback: match by normalized domain
          const { data: fallbackData } = await supabase
            .from("partner_codes")
            .select("*")
            .eq("country", country.toLowerCase())
            .eq("is_active", true)
          
          const match = fallbackData?.find(p => 
            normalizeDomain(p.store_domain || p.store_name) === normalizeDomain(slug)
          )
          
          setPartnerCode(match || null)
        } else {
          setPartnerCode(data)
        }
      } catch (e) {
        console.warn("[v0] Partner code fetch error:", e)
        setPartnerCode(null)
      } finally {
        setIsLoading(false)
      }
    }

    fetchPartnerCode()

    // Log page_view
    logEvent("page_view", {
      storeDomain: slug,
      countryCode: country.toUpperCase(),
      meta: { path: `/${country}/partner/${slug}`, referrer: "" },
    }).catch(() => {})
  }, [country, slug])

  const handlePartnerClick = () => {
    if (!partnerCode) return
    
    logEvent("partner_click", {
      storeDomain: normalizeDomain(partnerCode.store_domain || partnerCode.store_name),
      countryCode: country.toUpperCase(),
      meta: { 
        store_domain: partnerCode.store_domain,
        partner_url: partnerCode.partner_url,
      },
    }).catch(() => {})
  }

  const handleCopyCode = async () => {
    if (!partnerCode?.code) return
    
    try {
      await navigator.clipboard.writeText(partnerCode.code)
      setCopiedCode(true)
      setTimeout(() => setCopiedCode(false), 2000)
    } catch {
      // Fallback for older browsers
      const textArea = document.createElement("textarea")
      textArea.value = partnerCode.code
      document.body.appendChild(textArea)
      textArea.select()
      document.execCommand("copy")
      document.body.removeChild(textArea)
      setCopiedCode(true)
      setTimeout(() => setCopiedCode(false), 2000)
    }
  }

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="animate-pulse text-gray-500">Laster...</div>
      </div>
    )
  }

  if (!partnerCode) {
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
        <section className="container mx-auto px-4 py-12 text-center">
          <p className="text-gray-600">{country === "no" ? "Partnerkode ikke funnet" : "Partner code not found"}</p>
        </section>
      </div>
    )
  }

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

      {/* Partner Offer */}
      <section className="container mx-auto px-4 py-12">
        <div className="max-w-2xl mx-auto">
          <Card className="bg-white shadow-lg">
            <CardContent className="p-8">
              {/* Header with Logo and Store Name */}
              <div className="flex items-center gap-4 mb-6">
                {partnerCode.logo_url ? (
                  <div className="w-16 h-16 rounded-full overflow-hidden bg-gray-100 flex-shrink-0">
                    <img 
                      src={partnerCode.logo_url || "/placeholder.svg"} 
                      alt={partnerCode.store_name}
                      className="w-full h-full object-cover"
                    />
                  </div>
                ) : (
                  <div className="w-16 h-16 rounded-full bg-green-100 flex items-center justify-center text-2xl font-bold text-green-600 flex-shrink-0">
                    {partnerCode.store_name.charAt(0).toUpperCase()}
                  </div>
                )}
                <div>
                  <h1 className="text-2xl font-bold text-gray-900">{partnerCode.store_name}</h1>
                  {partnerCode.store_domain && (
                    <p className="text-gray-500 text-sm">{partnerCode.store_domain}</p>
                  )}
                </div>
              </div>

              {/* Discount Info */}
              <div className="space-y-4 mb-6">
                {partnerCode.discount_text && (
                  <div className="flex items-center gap-2 text-green-600">
                    <Gift className="h-5 w-5" />
                    <span className="font-semibold text-lg">{partnerCode.discount_text}</span>
                  </div>
                )}
                
                {partnerCode.free_shipping && (
                  <div className="flex items-center gap-2 text-blue-600">
                    <Truck className="h-5 w-5" />
                    <span className="font-medium">{country === "no" ? "Gratis frakt" : "Free shipping"}</span>
                  </div>
                )}

                {partnerCode.description && (
                  <p className="text-gray-600">{partnerCode.description}</p>
                )}
              </div>

              {/* Code Display (if exists) */}
              {partnerCode.code && (
                <div className="mb-6 p-4 bg-gray-100 rounded-lg">
                  <p className="text-sm text-gray-600 mb-2">{country === "no" ? "Rabattkode:" : "Discount code:"}</p>
                  <div className="flex items-center gap-2">
                    <code className="flex-1 text-lg font-mono font-bold text-gray-900 bg-white px-4 py-2 rounded border">
                      {partnerCode.code}
                    </code>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={handleCopyCode}
                      className="flex-shrink-0 bg-transparent"
                    >
                      {copiedCode ? (
                        <>
                          <Check className="h-4 w-4 mr-1" />
                          {country === "no" ? "Kopiert!" : "Copied!"}
                        </>
                      ) : (
                        <>
                          <Copy className="h-4 w-4 mr-1" />
                          {country === "no" ? "Kopier" : "Copy"}
                        </>
                      )}
                    </Button>
                  </div>
                </div>
              )}

              {/* CTA Button */}
              <a
                href={partnerCode.partner_url}
                target="_blank"
                rel="noopener noreferrer"
                onClick={handlePartnerClick}
                className="block"
              >
                <Button className="w-full bg-green-600 hover:bg-green-700 text-white py-6 text-lg">
                  <ExternalLink className="h-5 w-5 mr-2" />
                  {t.visitStore}
                </Button>
              </a>
            </CardContent>
          </Card>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-white border-t border-gray-200 py-8 mt-auto">
        <div className="container mx-auto px-4 text-center text-gray-600 text-sm">{t.copyright}</div>
      </footer>
    </div>
  )
}
