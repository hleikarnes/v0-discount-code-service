import { createClient } from "@/lib/supabase/server"
import { notFound } from "next/navigation"
import { ArrowLeft } from "lucide-react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import Link from "next/link"
import Checkout from "@/components/checkout"
import { buildStoreSearchUrl } from "@/lib/routing"

interface CheckoutPageProps {
  params: Promise<{ id: string }>
}

export default async function CheckoutPage({ params }: CheckoutPageProps) {
  const { id } = await params
  const supabase = await createClient()

  // Fetch the discount code with store info
  const { data: discountCode } = await supabase
    .from("discount_codes")
    .select(
      `
      *,
      stores (
        name,
        domain,
        logo_url
      )
    `,
    )
    .eq("id", id)
    .eq("is_active", true)
    .single()

  if (!discountCode) {
    notFound()
  }

  const formatPrice = (cents: number) => {
    return `${(cents / 100).toFixed(0)} kr`
  }

  const formatDiscount = () => {
    if (discountCode.discount_percentage) {
      return `${discountCode.discount_percentage}% rabatt`
    }
    if (discountCode.discount_amount_cents) {
      return `${formatPrice(discountCode.discount_amount_cents)} rabatt`
    }
    return "Rabatt"
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white border-b border-gray-200">
        <div className="container mx-auto px-4 py-6">
          <Link
            href={buildStoreSearchUrl("no", discountCode.stores.domain)}
            className="inline-flex items-center gap-2 text-gray-600 hover:text-gray-900 cursor-pointer"
          >
            <ArrowLeft className="h-4 w-4" />
            <span>Tilbake til {discountCode.stores.name}</span>
          </Link>
        </div>
      </header>

      {/* Checkout */}
      <section className="container mx-auto px-4 py-8">
        <div className="grid lg:grid-cols-2 gap-8 max-w-6xl mx-auto">
          {/* Product Info */}
          <div>
            <Card className="bg-white border-gray-200 sticky top-8">
              <CardHeader>
                <div className="flex items-center gap-4 mb-4">
                  <div className="w-16 h-16 rounded-lg bg-gray-100 flex items-center justify-center overflow-hidden flex-shrink-0">
                    <img
                      src={discountCode.stores.logo_url || "/placeholder.svg?height=64&width=64"}
                      alt={discountCode.stores.name}
                      className="w-full h-full object-cover"
                    />
                  </div>
                  <div>
                    <CardTitle className="text-xl">{discountCode.stores.name}</CardTitle>
                    <CardDescription>{formatDiscount()}</CardDescription>
                  </div>
                </div>
                <div className="border-t border-gray-200 pt-4">
                  <h3 className="font-semibold text-gray-900 mb-2">{discountCode.description || "Rabattkode"}</h3>
                  {discountCode.terms && <p className="text-sm text-gray-600 leading-relaxed">{discountCode.terms}</p>}
                </div>
              </CardHeader>
              <CardContent>
                <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                  <span className="text-gray-700 font-medium">Total</span>
                  <span className="text-3xl font-bold text-gray-900">{formatPrice(discountCode.price_cents)}</span>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Stripe Checkout */}
          <div className="lg:pl-8">
            <h2 className="text-2xl font-bold text-gray-900 mb-6">Fullført betaling</h2>
            <Checkout discountCodeId={id} />
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
