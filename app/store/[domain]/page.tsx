import { createClient } from "@/lib/supabase/server"
import { notFound } from "next/navigation"
import { ArrowLeft, ExternalLink, Lock, CheckCircle, Clock } from "lucide-react"
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import Link from "next/link"
import { StorePaymentButton } from "@/components/store-payment-button"
import { logEvent } from "@/lib/events"
import { getGuestId } from "@/lib/guest"
import { selectTeasers } from "@/lib/teaser"

interface StorePageProps {
  params: Promise<{ domain: string }>
}

export default async function StorePage({ params }: StorePageProps) {
  const { domain } = await params
  const supabase = await createClient()
  const guestId = await getGuestId()

  const { data: store } = await supabase.from("stores").select("*").eq("domain", domain).eq("is_active", true).single()

  if (!store) {
    notFound()
  }

  // Log page_view event (fire-and-forget)
  logEvent("page_view", {
    guestId,
    storeDomain: domain,
    countryCode: store.country_code,
    meta: { path: `/store/${domain}`, referrer: "" },
  }).catch(() => {})

  const { data: codes } = await supabase
    .from("store_codes")
    .select("*")
    .eq("store_domain", domain)
    .order("created_at", { ascending: false })

  const teasers = codes ? selectTeasers(codes) : []

  if (!codes || codes.length === 0) {
    return (
      <div className="min-h-screen bg-gray-50">
        <header className="bg-white border-b border-gray-200">
          <div className="container mx-auto px-4 py-6">
            <Link href="/" className="inline-flex items-center gap-2 text-gray-600 hover:text-gray-900">
              <ArrowLeft className="h-4 w-4" />
              <span>Tilbake til forsiden</span>
            </Link>
          </div>
        </header>
        <div className="container mx-auto px-4 py-12 text-center">
          <h1 className="text-2xl font-bold text-gray-900 mb-4">{store.name}</h1>
          <p className="text-gray-600">Ingen rabattkoder tilgjengelig for øyeblikket.</p>
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
          <Link href="/" className="inline-flex items-center gap-2 text-gray-600 hover:text-gray-900">
            <ArrowLeft className="h-4 w-4" />
            <span>Tilbake til forsiden</span>
          </Link>
        </div>
      </header>

      {/* Store Header */}
      <section className="bg-white border-b border-gray-200">
        <div className="container mx-auto px-4 py-8">
          <div className="flex items-start gap-6">
            {store.logo_url ? (
              <img
                src={store.logo_url || "/placeholder.svg"}
                alt={store.name}
                className="w-24 h-24 object-contain rounded-lg bg-gray-100 p-2"
              />
            ) : (
              <div className="w-24 h-24 rounded-lg bg-gray-100 flex items-center justify-center text-3xl font-bold text-gray-600 flex-shrink-0">
                {store.name.charAt(0)}
              </div>
            )}
            <div className="flex-1">
              <h1 className="text-3xl font-bold text-gray-900 mb-2">{store.name}</h1>
              {store.description && <p className="text-gray-600 mb-3">{store.description}</p>}
              <div className="flex items-center gap-3">
                <a
                  href={`https://${domain}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1 text-sm text-green-600 hover:text-green-700"
                >
                  Besøk {domain}
                  <ExternalLink className="h-3 w-3" />
                </a>
                {isFresh && (
                  <Badge variant="outline" className="text-green-600 border-green-600">
                    <CheckCircle className="h-3 w-3 mr-1" />
                    Nylig testet
                  </Badge>
                )}
                {!isFresh && (
                  <Badge variant="outline" className="text-yellow-600 border-yellow-600">
                    <Clock className="h-3 w-3 mr-1" />
                    Testet for {ageHours}t siden
                  </Badge>
                )}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Discount Codes Teasers */}
      <section className="container mx-auto px-4 py-8">
        <div className="max-w-4xl mx-auto">
          <div className="mb-6">
            <h2 className="text-2xl font-bold text-gray-900 mb-2">Verifiserte rabattkoder</h2>
            <p className="text-gray-600">Disse kodene er testet og fungerer. Lås opp for å se de faktiske kodene.</p>
          </div>

          {teasers.length > 0 && (
            <div className="grid gap-4 md:grid-cols-2 mb-8">
              {teasers.map((teaser, index) => (
                <Card key={index} className="bg-white border-gray-200 relative overflow-hidden">
                  <CardContent className="p-6">
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-2">
                          <Lock className="h-4 w-4 text-gray-400" />
                          <span className="font-mono text-sm text-gray-400">
                            {teaser.benefit_type === "free_shipping" ? "FRI FRAKT" : `${teaser.value_percent}% RABATT`}
                          </span>
                        </div>
                        {teaser.benefit_type === "percent_off" && (
                          <div className="text-3xl font-bold text-gray-900">{teaser.value_percent}%</div>
                        )}
                        {teaser.benefit_type === "free_shipping" && (
                          <div className="text-xl font-bold text-gray-900">Gratis frakt</div>
                        )}
                        {teaser.benefit_type === "amount_off" && (
                          <div className="text-3xl font-bold text-gray-900">
                            {teaser.value_amount} {teaser.currency}
                          </div>
                        )}
                        {teaser.min_purchase_amount && (
                          <p className="text-sm text-gray-500 mt-2">Min kjøp: {teaser.min_purchase_amount} kr</p>
                        )}
                      </div>
                      <Badge
                        variant="secondary"
                        className={
                          index === 0
                            ? "bg-green-100 text-green-700"
                            : index === 1
                              ? "bg-blue-100 text-blue-700"
                              : "bg-purple-100 text-purple-700"
                        }
                      >
                        #{index + 1}
                      </Badge>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}

          {/* Payment Card */}
          <Card className="bg-gradient-to-br from-green-50 to-green-100 border-green-200">
            <CardContent className="p-8">
              <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
                <div className="flex-1">
                  <h3 className="text-2xl font-bold text-gray-900 mb-2">Lås opp alle rabattkoder</h3>
                  <p className="text-gray-600 mb-4">
                    Få tilgang til verifiserte rabattkoder for {store.name}.
                  </p>
                  <div className="flex flex-col gap-2 text-sm text-gray-600">
                    <div className="flex items-center gap-2">
                      <CheckCircle className="h-4 w-4 text-green-600" />
                      <span>Testet rabattkoder</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <CheckCircle className="h-4 w-4 text-green-600" />
                      <span>Fungerer garantert</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <CheckCircle className="h-4 w-4 text-green-600" />
                      <span>Umiddelbar tilgang</span>
                    </div>
                  </div>
                </div>
                <div className="flex flex-col items-center gap-3">
                  <div className="text-center">
                    <div className="text-4xl font-bold text-gray-900">19 kr</div>
                    <div className="text-sm text-gray-600">engangsbetaling</div>
                  </div>
                  <StorePaymentButton storeDomain={domain} storeName={store.name} />
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Test Details */}
          <div className="mt-8 p-6 bg-white rounded-lg border border-gray-200">
            <h4 className="font-semibold text-gray-900 mb-3">Testgrunnlag</h4>
            <div className="grid md:grid-cols-3 gap-4 text-sm">
              <div>
                <span className="text-gray-600">Antall koder:</span>
                <span className="ml-2 font-semibold text-gray-900">{codes.length}</span>
              </div>
              <div>
                <span className="text-gray-600">Sist testet:</span>
                <span className="ml-2 font-semibold text-gray-900">
                  {mostRecentTest ? new Date(mostRecentTest).toLocaleDateString("no-NO") : "Nylig"}
                </span>
              </div>
              <div>
                <span className="text-gray-600">Status:</span>
                <span className="ml-2 font-semibold text-green-600">Aktive</span>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-white border-t border-gray-200 py-8 mt-12">
        <div className="container mx-auto px-4 text-center text-gray-600 text-sm">
          © 2025 Rabattkoder.no. Alle rettigheter reservert.
        </div>
      </footer>
    </div>
  )
}
