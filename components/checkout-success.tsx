"use client"

import { useEffect, useState } from "react"
import { useSearchParams } from "next/navigation"
import { CheckCircle, Copy, ExternalLink, Tag } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import Link from "next/link"
import type { RevealedCode } from "@/lib/types"

export default function CheckoutSuccess() {
  const searchParams = useSearchParams()
  const purchaseId = searchParams.get("purchase_id")

  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [codes, setCodes] = useState<RevealedCode[]>([])
  const [storeDomain, setStoreDomain] = useState("")
  const [copiedIndex, setCopiedIndex] = useState<number | null>(null)

  useEffect(() => {
    async function fetchRevealedCodes() {
      if (!purchaseId) {
        setError("Ingen kjøp funnet")
        setLoading(false)
        return
      }

      try {
        const tokenResponse = await fetch("/api/purchases/token", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ purchase_id: purchaseId }),
        })

        const tokenData = await tokenResponse.json()

        if (!tokenResponse.ok) {
          throw new Error(tokenData.error || "Kunne ikke hente token")
        }

        const revealResponse = await fetch("/api/stores/reveal", {
          method: "GET",
          headers: {
            Authorization: `Bearer ${tokenData.token}`,
          },
        })

        const revealData = await revealResponse.json()

        if (!revealResponse.ok) {
          throw new Error(revealData.error || "Kunne ikke hente rabattkoder")
        }

        setStoreDomain(revealData.store_domain)
        setCodes(revealData.codes)
      } catch (err) {
        console.error("[v0] Error revealing codes:", err)
        setError(err instanceof Error ? err.message : "En feil oppstod")
      } finally {
        setLoading(false)
      }
    }

    fetchRevealedCodes()
  }, [purchaseId])

  const copyToClipboard = (code: string, index: number) => {
    navigator.clipboard.writeText(code)
    setCopiedIndex(index)
    setTimeout(() => setCopiedIndex(null), 2000)
  }

  if (loading) {
    return (
      <div className="max-w-4xl mx-auto">
        <Card className="bg-white border-gray-200">
          <CardContent className="py-12 text-center">
            <div className="inline-block h-8 w-8 animate-spin rounded-full border-4 border-solid border-green-600 border-r-transparent mb-4" />
            <p className="text-gray-600">Henter dine rabattkoder...</p>
          </CardContent>
        </Card>
      </div>
    )
  }

  if (error || codes.length === 0) {
    return (
      <div className="max-w-4xl mx-auto">
        <Card className="bg-white border-red-200">
          <CardContent className="py-12 text-center">
            <p className="text-red-600 mb-4">{error || "Ingen rabattkoder tilgjengelig"}</p>
            <Link href="/">
              <Button variant="outline" className="bg-transparent">
                Tilbake til forsiden
              </Button>
            </Link>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Success Message */}
      <Card className="bg-white border-gray-200">
        <CardHeader className="text-center">
          <div className="flex justify-center mb-4">
            <CheckCircle className="h-16 w-16 text-green-600" />
          </div>
          <CardTitle className="text-3xl text-gray-900">Takk for kjøpet!</CardTitle>
          <CardDescription className="text-base">
            Du har nå tilgang til alle verifiserte rabattkoder for {storeDomain}
          </CardDescription>
        </CardHeader>
      </Card>

      {/* Test Basis Info */}
      <Card className="bg-blue-50 border-blue-200">
        <CardContent className="p-6">
          <div className="flex items-start gap-3">
            <div className="w-10 h-10 rounded-full bg-blue-100 flex items-center justify-center flex-shrink-0">
              <CheckCircle className="h-5 w-5 text-blue-600" />
            </div>
            <div className="flex-1">
              <h3 className="font-semibold text-blue-900 mb-2">Verifisert rabattkoder</h3>
              <p className="text-sm text-blue-800">
                Alle kodene er testet og fungerer. Bruk dem på {storeDomain} for å spare penger.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Discount Codes */}
      <div className="space-y-4">
        <h2 className="text-2xl font-bold text-gray-900">Dine rabattkoder ({codes.length})</h2>

        {codes.map((code, index) => (
          <Card key={index} className="bg-white border-gray-200">
            <CardContent className="p-6">
              <div className="flex flex-col md:flex-row md:items-center gap-4">
                {/* Code Display */}
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-3">
                    {code.benefit_type === "percent_off" && (
                      <Badge className="bg-green-100 text-green-700">
                        <Tag className="h-3 w-3 mr-1" />
                        {code.value_percent}% rabatt
                      </Badge>
                    )}
                    {code.benefit_type === "free_shipping" && (
                      <Badge className="bg-blue-100 text-blue-700">
                        <Tag className="h-3 w-3 mr-1" />
                        Gratis frakt
                      </Badge>
                    )}
                    {code.benefit_type === "amount_off" && (
                      <Badge className="bg-purple-100 text-purple-700">
                        <Tag className="h-3 w-3 mr-1" />
                        {code.value_amount} {code.currency} rabatt
                      </Badge>
                    )}
                    {code.last_tested_at && (
                      <span className="text-xs text-gray-500">
                        Testet {new Date(code.last_tested_at).toLocaleDateString("no-NO")}
                      </span>
                    )}
                  </div>

                  <div className="flex items-center gap-3">
                    <div className="flex-1 p-4 bg-gray-50 rounded-lg border-2 border-green-600 font-mono text-2xl font-bold text-gray-900">
                      {code.code}
                    </div>
                    <Button
                      onClick={() => copyToClipboard(code.code, index)}
                      variant="outline"
                      size="icon"
                      className="h-14 w-14 flex-shrink-0 bg-transparent"
                    >
                      {copiedIndex === index ? (
                        <CheckCircle className="h-5 w-5 text-green-600" />
                      ) : (
                        <Copy className="h-5 w-5" />
                      )}
                      <span className="sr-only">Kopier kode</span>
                    </Button>
                  </div>

                  {/* Additional Code Info */}
                  {(code.min_purchase_amount || code.applies_to_product || code.terms) && (
                    <div className="mt-3 text-sm text-gray-600 space-y-1">
                      {code.min_purchase_amount && (
                        <p>
                          Minimum kjøp: {code.min_purchase_amount} {code.currency}
                        </p>
                      )}
                      {code.applies_to_product && <p>Gjelder for: {code.applies_to_product}</p>}
                      {code.terms && <p className="italic">{code.terms}</p>}
                    </div>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Use Codes CTA */}
      <Card className="bg-gradient-to-br from-green-50 to-green-100 border-green-200">
        <CardContent className="p-8 text-center">
          <h3 className="text-xl font-bold text-gray-900 mb-3">Klar til å spare penger?</h3>
          <p className="text-gray-600 mb-6">Bruk kodene dine på {storeDomain}</p>
          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            <a href={`https://${storeDomain}`} target="_blank" rel="noopener noreferrer">
              <Button className="bg-green-600 hover:bg-green-700 text-white">
                Gå til {storeDomain}
                <ExternalLink className="h-4 w-4 ml-2" />
              </Button>
            </a>
            <Link href="/">
              <Button variant="outline" className="bg-transparent">
                Finn flere rabattkoder
              </Button>
            </Link>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
