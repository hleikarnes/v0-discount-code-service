import { getGuestId } from "@/lib/guest"
import { logEvent } from "@/lib/events"
import { Search } from "lucide-react"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import Link from "next/link"
import { notFound } from "next/navigation"
import { getTranslation, isValidCountry } from "@/lib/i18n"
import { buildHomeUrl, buildAdminUrl } from "@/lib/routing"
import { FeaturedStoresClient } from "@/components/featured-stores-client"
import { PartnerCodesClient } from "@/components/partner-codes-client"

interface HomePageProps {
  params: Promise<{ country: string }>
}

export default async function HomePage({ params }: HomePageProps) {
  const { country } = await params

  // Validate country
  if (!isValidCountry(country)) {
    notFound()
  }

  const guestId = await getGuestId()
  const t = getTranslation(country)

  // Log page view (fire-and-forget, never block render)
  logEvent("page_view", {
    guestId,
    countryCode: country.toUpperCase(),
    meta: { path: `/${country}`, referrer: "" },
  }).catch(() => {})

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white border-b border-gray-200">
        <div className="container mx-auto px-4 py-6 flex justify-between items-center">
          <Link href={buildHomeUrl(country)}>
            <h1 className="text-2xl font-bold text-gray-900 cursor-pointer">{t.siteName}</h1>
          </Link>
          <Link href={buildAdminUrl(country)}>
            <Button variant="ghost" className="text-sm text-gray-600 hover:text-gray-900 cursor-pointer">
              Admin
            </Button>
          </Link>
        </div>
      </header>

      {/* Hero Section */}
      <section className="container mx-auto px-4 py-12">
        <div className="max-w-3xl mx-auto text-center space-y-6">
          <h2 className="text-4xl font-bold text-gray-900 text-balance">{t.title}</h2>
          <p className="text-lg text-gray-600 text-pretty">{t.subtitle}</p>

          {/* Search Box */}
          <form action={`/${country}/s`} method="get" className="relative max-w-2xl mx-auto">
            <div className="relative">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
              <Input
                type="search"
                name="query"
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

      {/* Featured Stores - Client Component for live localStorage reads */}
      <FeaturedStoresClient
        country={country}
        popularStoresLabel={t.popularStores}
        noStoresLabel={t.noStoresAvailable}
      />

      {/* Partner Codes - Fetched from Supabase (below featured stores) */}
      <PartnerCodesClient
        country={country}
        label={t.freePartnerCodes}
        seeAllLabel={t.seeAllPartnerCodes}
      />

      {/* How It Works */}
      <section className="container mx-auto px-4 py-12 mb-12">
        <h3 className="text-2xl font-bold text-gray-900 text-center mb-8">{t.howItWorks}</h3>
        <div className="grid md:grid-cols-3 gap-8 max-w-4xl mx-auto">
          <div className="text-center space-y-3">
            <div className="w-12 h-12 rounded-full bg-green-100 text-green-600 flex items-center justify-center text-xl font-bold mx-auto">
              1
            </div>
            <h4 className="font-semibold text-gray-900">{t.step1Title}</h4>
            <p className="text-gray-600 text-sm">{t.step1Desc}</p>
          </div>
          <div className="text-center space-y-3">
            <div className="w-12 h-12 rounded-full bg-green-100 text-green-600 flex items-center justify-center text-xl font-bold mx-auto">
              2
            </div>
            <h4 className="font-semibold text-gray-900">{t.step2Title}</h4>
            <p className="text-gray-600 text-sm">{t.step2Desc}</p>
          </div>
          <div className="text-center space-y-3">
            <div className="w-12 h-12 rounded-full bg-green-100 text-green-600 flex items-center justify-center text-xl font-bold mx-auto">
              3
            </div>
            <h4 className="font-semibold text-gray-900">{t.step3Title}</h4>
            <p className="text-gray-600 text-sm">{t.step3Desc}</p>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-white border-t border-gray-200 py-8 mt-auto">
        <div className="container mx-auto px-4">
          <div className="flex flex-col md:flex-row justify-between items-center gap-6">
            <div className="text-center md:text-left text-gray-600 text-sm">{t.copyright}</div>
            <div className="flex gap-6 text-sm">
              <Link href={`${buildHomeUrl(country)}/about`} className="text-gray-600 hover:text-gray-900 cursor-pointer">
                {t.aboutUs}
              </Link>
              <Link href={`${buildHomeUrl(country)}/privacy`} className="text-gray-600 hover:text-gray-900 cursor-pointer">
                {t.privacy}
              </Link>
              <Link href={`${buildHomeUrl(country)}/terms`} className="text-gray-600 hover:text-gray-900 cursor-pointer">
                {t.terms}
              </Link>
            </div>
          </div>
        </div>
      </footer>
    </div>
  )
}
