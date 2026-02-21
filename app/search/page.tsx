import { Search } from "lucide-react"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import Link from "next/link"
import { redirect } from "next/navigation"
import type { Store } from "@/lib/types"
import { createClient } from "@/lib/supabase/server"
import { buildStoreSearchUrl, buildHomeUrl } from "@/lib/routing"

interface SearchPageProps {
  searchParams: Promise<{ q?: string }>
}

export default async function SearchPage({ searchParams }: SearchPageProps) {
  const params = await searchParams
  const query = params.q

  // Redirect to home if no query
  if (!query || query.trim() === "") {
    redirect("/")
  }

  let supabase
  let stores: Store[] = []
  let error = null

  try {
    supabase = await createClient()
  } catch (e) {
    console.error("[v0] Supabase client creation failed:", e)
    error = "Database ikke tilgjengelig"
  }

  if (supabase && !error) {
    try {
      const escapedQuery = `%${query}%`

      const { data: byDomain } = await supabase
        .from("stores")
        .select("*")
        .ilike("domain", escapedQuery)
        .eq("is_active", true)
        .eq("country_code", "NO")

      const { data: byName } = await supabase
        .from("stores")
        .select("*")
        .ilike("name", escapedQuery)
        .eq("is_active", true)
        .eq("country_code", "NO")

      // Merge and deduplicate results
      const mergedMap = new Map()
      ;[...(byDomain || []), ...(byName || [])].forEach((store) => {
        mergedMap.set(store.id, store)
      })
      stores = Array.from(mergedMap.values()).sort((a, b) => a.name.localeCompare(b.name))
    } catch (e) {
      console.error("[v0] Search error:", e)
      error = "Kunne ikke hente søkeresultater"
    }
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white border-b border-gray-200">
        <div className="container mx-auto px-4 py-6">
          <Link href={buildHomeUrl("no")}>
            <h1 className="text-2xl font-bold text-gray-900 hover:text-green-600 transition-colors cursor-pointer">Rabattkoder.no</h1>
          </Link>
        </div>
      </header>

      {/* Search Section */}
      <section className="container mx-auto px-4 py-8">
        <div className="max-w-3xl mx-auto">
          {/* Search Box */}
          <form action="/search" method="get" className="relative">
            <div className="relative">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
              <Input
                type="search"
                name="q"
                defaultValue={query}
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

      {/* Results Section */}
      <section className="container mx-auto px-4 py-8">
        <div className="mb-6">
          <h2 className="text-2xl font-bold text-gray-900">Søkeresultater for &quot;{query}&quot;</h2>
          <p className="text-gray-600 mt-1">
            {stores.length === 0
              ? "Ingen butikker funnet"
              : `${stores.length} ${stores.length === 1 ? "butikk" : "butikker"} funnet`}
          </p>
        </div>

        {/* Error State */}
        {error && (
          <Card className="bg-red-50 border-red-200">
            <CardContent className="p-6">
              <p className="text-red-800">{error}</p>
            </CardContent>
          </Card>
        )}

        {/* Empty State */}
        {!error && stores.length === 0 && (
          <Card className="bg-white border-gray-200">
            <CardContent className="p-12 text-center">
              <Search className="h-12 w-12 text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg font-semibold text-gray-900 mb-2">Ingen resultater</h3>
              <p className="text-gray-600 mb-6">
                Vi fant ingen butikker som matcher søket ditt. Prøv et annet søkeord.
              </p>
              <Link href={buildHomeUrl("no")}>
                <Button className="bg-green-600 hover:bg-green-700 text-white cursor-pointer">Tilbake til forsiden</Button>
              </Link>
            </CardContent>
          </Card>
        )}

        {/* Results Grid - Store cards navigate to search, never to /store/{domain} */}
        {!error && stores.length > 0 && (
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
            {stores.map((store) => (
              <Link 
                key={store.id} 
                href={buildStoreSearchUrl("no", store.domain)}
                className="block cursor-pointer"
              >
                <Card className="hover:shadow-lg transition-shadow bg-white border-gray-200 h-full cursor-pointer">
                  <CardContent className="p-6 flex flex-col items-center gap-3 pointer-events-none">
                    <div className="w-16 h-16 rounded-full bg-gray-100 flex items-center justify-center text-2xl font-bold text-gray-600">
                      {store.name.charAt(0)}
                    </div>
                    <span className="font-medium text-gray-900 text-center text-sm">{store.name}</span>
                  </CardContent>
                </Card>
              </Link>
            ))}
          </div>
        )}
      </section>

      {/* Footer */}
      <footer className="bg-white border-t border-gray-200 py-8 mt-auto">
        <div className="container mx-auto px-4 text-center text-gray-600 text-sm">
          © 2025 Rabattkoder.no. Alle rettigheter reservert.
        </div>
      </footer>
    </div>
  )
}
