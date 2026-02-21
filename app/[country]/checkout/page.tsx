"use client"

import { useState, useEffect } from "react"
import { useRouter, useSearchParams, useParams } from "next/navigation"
import Link from "next/link"
import { ArrowLeft, Lock, CheckCircle } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { buildRevealUrl, buildStorePageUrl, buildHomeUrl, normalizeDomain } from "@/lib/routing"
import { logEvent } from "@/lib/events"

export default function CheckoutPage() {
  const router = useRouter()
  const params = useParams<{ country: string }>()
  const searchParams = useSearchParams()
  
  const country = params.country || "no"
  // ALWAYS normalize store domain from URL
  const rawStore = searchParams.get("store") || ""
  const store = rawStore ? normalizeDomain(rawStore) : ""
  
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState("")

  const isNorway = country === "no"

  // Log page_view on mount
  useEffect(() => {
    if (store) {
      logEvent("page_view", {
        storeDomain: store,
        countryCode: country.toUpperCase(),
        meta: { path: `/${country}/checkout`, referrer: document.referrer || "" },
      }).catch(() => {})
    }
  }, [store, country])

  // If store is missing, show error
  if (!store) {
    return (
      <div className="min-h-screen bg-gray-50">
        <header className="bg-white border-b border-gray-200">
          <div className="container mx-auto px-4 py-6">
            <Link 
              href={buildHomeUrl(country)}
              className="inline-flex items-center gap-2 text-gray-600 hover:text-gray-900 cursor-pointer"
            >
              <ArrowLeft className="h-4 w-4" />
              <span>{isNorway ? "Tilbake" : "Back"}</span>
            </Link>
          </div>
        </header>
        <main className="container mx-auto px-4 py-12">
          <Card className="max-w-md mx-auto bg-white border-gray-200">
            <CardContent className="p-8 text-center">
              <p className="text-gray-600 mb-4">
                {isNorway ? "Butikk mangler. Velg en butikk fra forsiden." : "Store missing. Please select a store from the homepage."}
              </p>
              <Link href={buildHomeUrl(country)}>
                <Button className="bg-green-600 hover:bg-green-700 text-white cursor-pointer">
                  {isNorway ? "Gå til forsiden" : "Go to homepage"}
                </Button>
              </Link>
            </CardContent>
          </Card>
        </main>
      </div>
    )
  }

  const handleCheckout = async () => {
    setIsLoading(true)
    setError("")

    // Log checkout_start event
    logEvent("checkout_start", {
      storeDomain: store,
      countryCode: country.toUpperCase(),
      meta: { store_domain: store },
    }).catch(() => {})

    try {
      const response = await fetch("/api/payments/checkout", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          store_domain: store,
          country_code: country.toUpperCase(),
        }),
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || "Checkout failed")
      }

      // If we got a reveal_token (prototype mode), store it and navigate to reveal
      if (data.reveal_token) {
        sessionStorage.setItem("dealtested_reveal_token", data.reveal_token)
        router.push(buildRevealUrl(country, store))
        return
      }

      // If we got a checkout_url (Stripe mode), redirect to it
      if (data.checkout_url) {
        window.location.href = data.checkout_url
        return
      }

      // If demo mode with redirect_url
      if (data.redirect_url) {
        router.push(data.redirect_url)
        return
      }

      throw new Error("Unexpected response from server")
    } catch (err) {
      console.error("[v0] Checkout error:", err)
      setError(err instanceof Error ? err.message : "En feil oppstod")
    } finally {
      setIsLoading(false)
    }
  }

  // Store name from domain (capitalize first letter)
  const storeName = store.split(".")[0].charAt(0).toUpperCase() + store.split(".")[0].slice(1)

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white border-b border-gray-200">
        <div className="container mx-auto px-4 py-6">
          <Link 
            href={buildStorePageUrl(country, { domain: store })}
            className="inline-flex items-center gap-2 text-gray-600 hover:text-gray-900 cursor-pointer"
          >
            <ArrowLeft className="h-4 w-4" />
            <span>{isNorway ? "Tilbake" : "Back"}</span>
          </Link>
        </div>
      </header>

      {/* Content */}
      <main className="container mx-auto px-4 py-12">
        <div className="max-w-md mx-auto">
          <Card className="bg-white border-gray-200 shadow-lg">
            <CardContent className="p-8">
              {/* Title */}
              <div className="text-center mb-8">
                <div className="w-16 h-16 rounded-full bg-green-100 flex items-center justify-center mx-auto mb-4">
                  <Lock className="h-8 w-8 text-green-600" />
                </div>
                <h1 className="text-2xl font-bold text-gray-900 mb-2">
                  {isNorway ? `Lås opp rabattkoder for ${storeName}` : `Unlock discount codes for ${storeName}`}
                </h1>
                <p className="text-gray-600">
                  {isNorway 
                    ? "Få tilgang til verifiserte og fungerende rabattkoder" 
                    : "Get access to verified working discount codes"}
                </p>
              </div>

              {/* Benefits */}
              <div className="space-y-3 mb-8">
                <div className="flex items-center gap-3 text-sm text-gray-700">
                  <CheckCircle className="h-5 w-5 text-green-500 flex-shrink-0" />
                  <span>{isNorway ? "Alle koder er testet og verifisert" : "All codes are tested and verified"}</span>
                </div>
                <div className="flex items-center gap-3 text-sm text-gray-700">
                  <CheckCircle className="h-5 w-5 text-green-500 flex-shrink-0" />
                  <span>{isNorway ? "Øyeblikkelig tilgang" : "Instant access"}</span>
                </div>
                <div className="flex items-center gap-3 text-sm text-gray-700">
                  <CheckCircle className="h-5 w-5 text-green-500 flex-shrink-0" />
                  <span>{isNorway ? "Ingen skjulte kostnader" : "No hidden fees"}</span>
                </div>
              </div>

              {/* Error message */}
              {error && (
                <div className="mb-4 p-3 bg-red-50 border border-red-200 text-red-700 rounded-lg text-sm">
                  {error}
                </div>
              )}

              {/* CTA Button */}
              <Button
                onClick={handleCheckout}
                disabled={isLoading}
                className="w-full bg-green-600 hover:bg-green-700 text-white py-6 text-lg font-semibold cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isLoading 
                  ? (isNorway ? "Behandler..." : "Processing...") 
                  : (isNorway ? "Bekreft og lås opp" : "Confirm and unlock")}
              </Button>

              {/* Disclaimer */}
              <p className="text-xs text-center text-gray-500 mt-4">
                {isNorway 
                  ? "Ingen abonnement. Ingen automatisk fornyelse." 
                  : "No subscription. No automatic renewal."}
              </p>
            </CardContent>
          </Card>
        </div>
      </main>
    </div>
  )
}
