import { Suspense } from "react"
import CheckoutSuccess from "@/components/checkout-success"

export default function ThankYouPage() {
  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white border-b border-gray-200">
        <div className="container mx-auto px-4 py-6">
          <h1 className="text-2xl font-bold text-gray-900">Rabattkoder.no</h1>
        </div>
      </header>

      {/* Main Content */}
      <section className="container mx-auto px-4 py-12">
        <Suspense
          fallback={
            <div className="max-w-2xl mx-auto text-center">
              <div className="inline-block h-8 w-8 animate-spin rounded-full border-4 border-solid border-green-600 border-r-transparent" />
            </div>
          }
        >
          <CheckoutSuccess />
        </Suspense>
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
