import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"

export default function AboutPage() {
  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white border-b border-gray-200">
        <div className="container mx-auto px-4 py-6">
          <Link href="/">
            <h1 className="text-2xl font-bold text-gray-900 hover:text-green-600 transition-colors">Rabattkoder.no</h1>
          </Link>
        </div>
      </header>

      {/* Main Content */}
      <main className="container mx-auto px-4 py-12 max-w-3xl">
        <div className="mb-8">
          <Link href="/">
            <Button variant="outline" className="mb-6 bg-transparent">
              ← Tilbake
            </Button>
          </Link>
          <h1 className="text-4xl font-bold text-gray-900 mb-4">Om Rabattkoder.no</h1>
        </div>

        <div className="space-y-8">
          <Card className="bg-white border-gray-200">
            <CardContent className="p-6 space-y-4">
              <section>
                <h2 className="text-2xl font-semibold text-gray-900 mb-3">Hva er Rabattkoder.no?</h2>
                <p className="text-gray-700 leading-relaxed">
                  Rabattkoder.no er en platform som gjør det enkelt å finne, kjøpe og bruke verifiserte rabattkoder til
                  populære norske og internasjonale butikker. Vi tester alle koder før de publiseres for å sikre at de
                  fungerer.
                </p>
              </section>

              <section>
                <h2 className="text-2xl font-semibold text-gray-900 mb-3">Vår misjon</h2>
                <p className="text-gray-700 leading-relaxed">
                  Vi ønsker å hjelpe norske forbrukere å spare penger på netthandel ved å gi dem tilgang til verifiserte
                  og fungerende rabattkoder. Vi tror på transparens og kvalitet over kvantitet.
                </p>
              </section>

              <section>
                <h2 className="text-2xl font-semibold text-gray-900 mb-3">Hvordan fungerer det?</h2>
                <div className="space-y-4">
                  <div>
                    <h3 className="font-semibold text-gray-900 mb-2">1. Søk</h3>
                    <p className="text-gray-700">Søk etter butikken du ønsker rabattkoder til på vår platform.</p>
                  </div>
                  <div>
                    <h3 className="font-semibold text-gray-900 mb-2">2. Kjøp</h3>
                    <p className="text-gray-700">
                      Kjøp pakken med alle verifiserte rabattkoder for den butikken. Betaling gjøres sikkert via Stripe.
                    </p>
                  </div>
                  <div>
                    <h3 className="font-semibold text-gray-900 mb-2">3. Bruk</h3>
                    <p className="text-gray-700">
                      Kopier kodene og bruk dem på butikkens nettsted under betaling for å få rabatt på din handel.
                    </p>
                  </div>
                </div>
              </section>

              <section>
                <h2 className="text-2xl font-semibold text-gray-900 mb-3">Verifisering</h2>
                <p className="text-gray-700 leading-relaxed">
                  Alle rabattkoder på Rabattkoder.no er manuelt testet før publisering. Vi legger inn disse kodene i
                  handlekurv og bekrefter at de fungerer og gir den rabatterte som annonsert. Vi tester bare på
                  butikkers nettsted, aldri på tredjepartssider.
                </p>
              </section>

              <section>
                <h2 className="text-2xl font-semibold text-gray-900 mb-3">Pris</h2>
                <p className="text-gray-700 leading-relaxed">
                  Vi tar en liten gebyr for hver rabattkodepakke (typisk 19 NOK). Dette dekker kostnadene med å teste
                  kodene og drive plattformen. Rabattene du får ved å bruke kodene vil raskt betale for seg selv.
                </p>
              </section>

              <section>
                <h2 className="text-2xl font-semibold text-gray-900 mb-3">Kontakt</h2>
                <p className="text-gray-700 leading-relaxed">
                  Har du spørsmål, forslag eller problemer? Kontakt oss på support@rabattkoder.no
                </p>
              </section>
            </CardContent>
          </Card>
        </div>
      </main>

      {/* Footer */}
      <footer className="bg-white border-t border-gray-200 py-8 mt-12">
        <div className="container mx-auto px-4 text-center text-gray-600 text-sm">
          © 2025 Rabattkoder.no. Alle rettigheter reservert.
        </div>
      </footer>
    </div>
  )
}
