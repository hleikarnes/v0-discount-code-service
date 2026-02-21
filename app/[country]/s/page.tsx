import { Search } from "lucide-react"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import Link from "next/link"
import { redirect, notFound } from "next/navigation"
import { getMockRepository } from "@/lib/db/repository"
import { getTranslation, isValidCountry } from "@/lib/i18n"
import { normalizeDomain, buildStorePageUrl, buildHomeUrl } from "@/lib/routing"
import { SearchResultsClient } from "@/components/search-results-client"

interface SearchPageProps {
  params: Promise<{ country: string }>
  searchParams: Promise<{ query?: string }>
}

export default async function SearchPage({ params, searchParams }: SearchPageProps) {
  const { country } = await params
  const { query } = await searchParams

  // Validate country
  if (!isValidCountry(country)) {
    notFound()
  }

  const t = getTranslation(country)

  // Redirect to home if no query
  if (!query || query.trim() === "") {
    redirect(`/${country}`)
  }

  const normalizedQuery = normalizeDomain(query)

  // Safe data fetching with try/catch
  let stores: Array<{
    id: string
    name: string
    domain: string
    slug: string
    country_code: string
    logo_url: string | null
    website_url: string | null
    is_active: boolean
    is_featured: boolean
  }> = []
  
  let suggestion: { store: { name: string; domain: string }; distance: number } | null = null
  
  try {
    const repo = getMockRepository()
    stores = await repo.searchStores(country, query)
    
    // If no exact results, find closest match for "did you mean" suggestion
    if (stores.length === 0) {
      const closest = await repo.findClosestStore(country, query)
      // Only suggest if distance is reasonable (less than 4 edits for short queries, or less than query length / 2)
      const threshold = Math.max(3, Math.floor(normalizedQuery.length / 2))
      if (closest && closest.distance <= threshold) {
        suggestion = closest
      }
    }
  } catch (error) {
    console.error("[v0] Search error:", error)
    stores = []
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white border-b border-gray-200">
        <div className="container mx-auto px-4 py-6">
          <Link href={buildHomeUrl(country)}>
            <h1 className="text-2xl font-bold text-gray-900 hover:text-green-600 transition-colors cursor-pointer">{t.siteName}</h1>
          </Link>
        </div>
      </header>

      {/* Search Section */}
      <section className="container mx-auto px-4 py-8">
        <div className="max-w-3xl mx-auto">
          {/* Search Box */}
          <form action={`/${country}/s`} method="get" className="relative">
            <div className="relative">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
              <Input
                type="search"
                name="query"
                defaultValue={query}
                placeholder={t.searchPlaceholder}
                className="w-full pl-12 pr-4 py-6 text-lg bg-white border-gray-300 rounded-lg shadow-sm focus:ring-2 focus:ring-green-500 focus:border-green-500"
              />
            </div>
            <Button
              type="submit"
              className="absolute right-2 top-1/2 -translate-y-1/2 bg-green-600 hover:bg-green-700 text-white px-6 py-2 rounded-md"
            >
              {t.search}
            </Button>
          </form>
        </div>
      </section>

      {/* Results Section */}
      <section className="container mx-auto px-4 py-8">
        {/* Show results heading only if stores found */}
        {stores.length > 0 && (
          <div className="mb-6">
            <h2 className="text-2xl font-bold text-gray-900">
              {country === "no" 
                ? `Rabattkoder for ${stores[0].name}${stores.length > 1 ? ` og ${stores.length - 1} andre` : ""}`
                : `Discount codes for ${stores[0].name}${stores.length > 1 ? ` and ${stores.length - 1} more` : ""}`}
            </h2>
            <p className="text-gray-600 mt-1">{t.storesFound(stores.length)}</p>
          </div>
        )}

        {/* "Did you mean" suggestion when no exact results but close match found */}
        {stores.length === 0 && suggestion && (
          <Card className="bg-white border-gray-200 mb-6">
            <CardContent className="p-6 text-center">
              <p className="text-gray-700 mb-3">
                {country === "no" ? "Mente du" : "Did you mean"}{" "}
                <Link 
                  href={buildStorePageUrl(country, suggestion.store)}
                  className="text-green-600 hover:text-green-700 font-semibold underline cursor-pointer"
                >
                  {suggestion.store.name}
                </Link>
                ?
              </p>
              <Link href={buildStorePageUrl(country, suggestion.store)}>
                <Button className="bg-green-600 hover:bg-green-700 text-white cursor-pointer">
                  {country === "no" ? `Vis rabattkoder for ${suggestion.store.name}` : `Show codes for ${suggestion.store.name}`}
                </Button>
              </Link>
            </CardContent>
          </Card>
        )}

        {/* Empty State - only show if NO stores found AND no suggestion */}
        {stores.length === 0 && !suggestion && (
          <Card className="bg-white border-gray-200">
            <CardContent className="p-12 text-center">
              <Search className="h-12 w-12 text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg font-semibold text-gray-900 mb-2">{t.noResults}</h3>
              <p className="text-gray-600 mb-6">
                {country === "no"
                  ? "Vi fant ingen butikker som matcher søket ditt. Prøv et annet søkeord."
                  : "We found no stores matching your search. Try different keywords."}
              </p>
              <Link href={buildHomeUrl(country)}>
                <Button className="bg-green-600 hover:bg-green-700 text-white cursor-pointer">{t.backToHome}</Button>
              </Link>
            </CardContent>
          </Card>
        )}

        {/* Results Grid - Uses client component for event logging */}
        {stores.length > 0 && (
          <SearchResultsClient stores={stores} country={country} query={query} />
        )}
      </section>

      {/* Footer */}
      <footer className="bg-white border-t border-gray-200 py-8 mt-auto">
        <div className="container mx-auto px-4 text-center text-gray-600 text-sm">{t.copyright}</div>
      </footer>
    </div>
  )
}

/**
 * REGRESSION CHECKLIST (update timestamp when verified):
 * - [ ] /no loads, /uk loads
 * - [ ] /no/s?query=bilkomponenter shows store card
 * - [ ] Clicking store card on /no/s navigates to /no/store/bilkomponenter (URL changes)
 * - [ ] /no/store/bilkomponenter shows teasers + "Lås opp fungerende rabattkoder" CTA
 * - [ ] If no codes: shows "Ingen fungerende rabattkoder akkurat nå"
 * - [ ] No "Unhandled promise rejection" – fetches wrapped in try/catch
 */
