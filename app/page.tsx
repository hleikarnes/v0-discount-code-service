import { getMockRepository } from "@/lib/db/repository"
import { getGuestId } from "@/lib/guest"
import { logEvent } from "@/lib/events"
import { Search, TrendingUp } from "lucide-react"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import Link from "next/link"
import type { Store } from "@/lib/types"
import { redirect } from "next/navigation"
import { buildStoreSearchUrl, buildHomeUrl } from "@/lib/routing"

export default async function HomePage() {
  redirect("/no")

  const guestId = await getGuestId()
  const repo = getMockRepository()

  // Log page view
  try {
    await logEvent("page_view", {
      guestId,
      countryCode: "NO",
      meta: { page: "homepage" },
    })
  } catch (e) {
    console.error("[v0] Failed to log page view:", e)
  }

  // Get featured stores
  const stores = await repo.getFeaturedStores("NO")

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white border-b border-gray-200">
        <div className="container mx-auto px-4 py-6 flex justify-between items-center">
          <Link href="/">
            <h1 className="text-2xl font-bold text-gray-900">Rabattkoder.no</h1>
          </Link>
          <Link href="/admin">
            <Button variant="ghost" className="text-sm text-gray-600 hover:text-gray-900">
              Admin
            </Button>
          </Link>
        </div>
      </header>

      {/* Hero Section */}
      <section className="container mx-auto px-4 py-12">
        <div className="max-w-3xl mx-auto text-center space-y-6">
          <h2 className="text-4xl font-bold text-gray-900 text-balance">Finn verifiserte rabattkoder</h2>
          <p className="text-lg text-gray-600 text-pretty">
            Vi tester alle rabattkoder før salg. Få garantert fungerende koder.
          </p>

          {/* Search Box */}
          <form action="/search" method="get" className="relative max-w-2xl mx-auto">
            <div className="relative">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
              <Input
                type="search"
                name="q"
                placeholder="Søk etter butikk eller domene..."
                className="w-full pl-12 pr-4 py-6 text-lg bg-white border-gray-300 rounded-lg shadow-sm focus:ring-2 focus:ring-green-500 focus:border-green-500"
              />
            </div>
            <Button
              type="submit"
              className="absolute right-2 top-1/2 -translate-y-1/2 bg-green-600 hover:bg-green-700 text-white px-6 py-2 rounded-md"
            >
              Søk
            </Button>
          </form>
        </div>
      </section>

      {/* Top Stores */}
      <section className="container mx-auto px-4 py-12">
        <div className="flex items-center gap-2 mb-6">
          <TrendingUp className="h-6 w-6 text-green-600" />
          <h3 className="text-2xl font-bold text-gray-900">Populære butikker</h3>
        </div>

        {stores && stores.length > 0 ? (
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
            {stores.map((store: Store) => (
              <Link 
                key={store.id} 
                href={buildStoreSearchUrl("no", store.domain)}
                className="block cursor-pointer"
              >
                <Card className="hover:shadow-lg transition-shadow bg-white border-gray-200 cursor-pointer">
                  <CardContent className="p-6 flex flex-col items-center gap-3 pointer-events-none">
                    {store.logo_url ? (
                      <img
                        src={store.logo_url || "/placeholder.svg"}
                        alt={store.name}
                        className="w-16 h-16 object-contain"
                      />
                    ) : (
                      <div className="w-16 h-16 rounded-full bg-gray-100 flex items-center justify-center text-2xl font-bold text-gray-600">
                        {store.name.charAt(0)}
                      </div>
                    )}
                    <span className="font-medium text-gray-900 text-center text-sm">{store.name}</span>
                  </CardContent>
                </Card>
              </Link>
            ))}
          </div>
        ) : (
          <div className="text-center py-12 text-gray-500">Ingen butikker tilgjengelig</div>
        )}
      </section>

      {/* How It Works */}
      <section className="container mx-auto px-4 py-12 mb-12">
        <h3 className="text-2xl font-bold text-gray-900 text-center mb-8">Hvordan fungerer det?</h3>
        <div className="grid md:grid-cols-3 gap-8 max-w-4xl mx-auto">
          <div className="text-center space-y-3">
            <div className="w-12 h-12 rounded-full bg-green-100 text-green-600 flex items-center justify-center text-xl font-bold mx-auto">
              1
            </div>
            <h4 className="font-semibold text-gray-900">Søk etter butikk</h4>
            <p className="text-gray-600 text-sm">Finn butikken du vil handle fra</p>
          </div>
          <div className="text-center space-y-3">
            <div className="w-12 h-12 rounded-full bg-green-100 text-green-600 flex items-center justify-center text-xl font-bold mx-auto">
              2
            </div>
            <h4 className="font-semibold text-gray-900">Kjøp rabattkoden</h4>
            <p className="text-gray-600 text-sm">Betal en liten sum for verifisert kode</p>
          </div>
          <div className="text-center space-y-3">
            <div className="w-12 h-12 rounded-full bg-green-100 text-green-600 flex items-center justify-center text-xl font-bold mx-auto">
              3
            </div>
            <h4 className="font-semibold text-gray-900">Spar penger</h4>
            <p className="text-gray-600 text-sm">Bruk koden og spar på handelen</p>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-white border-t border-gray-200 py-8 mt-auto">
        <div className="container mx-auto px-4">
          <div className="flex flex-col md:flex-row justify-between items-center gap-6">
            <div className="text-center md:text-left text-gray-600 text-sm">
              © 2025 Rabattkoder.no. Alle rettigheter reservert.
            </div>
            <div className="flex gap-6 text-sm">
              <Link href="/about" className="text-gray-600 hover:text-gray-900">
                Om oss
              </Link>
              <Link href="/privacy" className="text-gray-600 hover:text-gray-900">
                Personvern
              </Link>
              <Link href="/terms" className="text-gray-600 hover:text-gray-900">
                Vilkår
              </Link>
            </div>
          </div>
        </div>
      </footer>
    </div>
  )
}
