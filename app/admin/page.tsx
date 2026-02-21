import { getMockRepository } from "@/lib/db/repository"
import { getInMemoryEvents } from "@/lib/events"
import { PrototypeAdmin } from "@/components/admin/prototype-admin"
import { Card } from "@/components/ui/card"

export default async function AdminPage() {
  const repo = getMockRepository()
  const events = getInMemoryEvents()

  const stores = await repo.getAllStores()
  const offers = await repo.getAllOffers()
  const seoPages = await repo.getAllSEOPages()

  const stats = {
    stores: stores.length,
    offers: offers.length,
    seoPages: seoPages.length,
    totalEvents: events.length,
  }

  return (
    <div className="min-h-screen bg-neutral-50 py-12">
      <div className="container mx-auto max-w-6xl px-4">
        <div className="mb-8">
          <h1 className="mb-2 font-serif text-4xl font-bold text-neutral-900">Admin Dashboard</h1>
          <div className="flex items-center gap-3">
            <span className="text-lg text-neutral-600">Mode:</span>
            <span className="rounded-full bg-yellow-100 px-4 py-1 text-sm font-semibold text-yellow-800">
              PROTOTYPE
            </span>
            <span className="rounded-full bg-blue-100 px-4 py-1 text-sm font-semibold text-blue-800">DEMO PAYMENT</span>
          </div>
        </div>

        {/* Stats */}
        <div className="mb-8 grid grid-cols-1 gap-4 md:grid-cols-4">
          <Card className="p-6">
            <div className="text-2xl font-bold text-neutral-900">{stats.stores}</div>
            <div className="text-sm text-neutral-600">Stores</div>
          </Card>
          <Card className="p-6">
            <div className="text-2xl font-bold text-neutral-900">{stats.offers}</div>
            <div className="text-sm text-neutral-600">Partner Offers</div>
          </Card>
          <Card className="p-6">
            <div className="text-2xl font-bold text-neutral-900">{stats.seoPages}</div>
            <div className="text-sm text-neutral-600">SEO Pages</div>
          </Card>
          <Card className="p-6">
            <div className="text-2xl font-bold text-neutral-900">{stats.totalEvents}</div>
            <div className="text-sm text-neutral-600">Events</div>
          </Card>
        </div>

        {/* Admin UI */}
        <PrototypeAdmin />
      </div>
    </div>
  )
}
