import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"

export default function TermsPage() {
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
          <h1 className="text-4xl font-bold text-gray-900 mb-4">Betingelser for bruk</h1>
          <p className="text-gray-600">Sist oppdatert: Januar 2025</p>
        </div>

        <div className="space-y-8">
          <Card className="bg-white border-gray-200">
            <CardContent className="p-6 space-y-4">
              <section>
                <h2 className="text-2xl font-semibold text-gray-900 mb-3">1. Generelt</h2>
                <p className="text-gray-700 leading-relaxed">
                  Rabattkoder.no er en platform som lar brukere kjøpe verifiserte rabattkoder til populære butikker. Ved
                  å bruke denne tjenesten, godtar du disse betingelsene for bruk.
                </p>
              </section>

              <section>
                <h2 className="text-2xl font-semibold text-gray-900 mb-3">2. Bruk av tjenesten</h2>
                <p className="text-gray-700 leading-relaxed mb-3">
                  Du godtar å bruke Rabattkoder.no kun for lovlige formål. Du skal ikke:
                </p>
                <ul className="list-disc list-inside text-gray-700 space-y-2 mb-3">
                  <li>Misbruke rabattkodet på andre domener enn det oppgitt</li>
                  <li>Dele rabattkodet med andre eller publisere den offentlig</li>
                  <li>Forsøke å stjele eller hacke rabattkoder</li>
                  <li>Bruke automatiserte verktøy for å få tilgang til kodene</li>
                </ul>
              </section>

              <section>
                <h2 className="text-2xl font-semibold text-gray-900 mb-3">3. Kjøp og betaling</h2>
                <p className="text-gray-700 leading-relaxed">
                  Alle kjøp gjøres gjennom Stripe og behandles sikkert. Rabattkodene er digitale produkter og kan ikke
                  refunderes etter kjøp, med mindre koden ikke fungerer som annonsert.
                </p>
              </section>

              <section>
                <h2 className="text-2xl font-semibold text-gray-900 mb-3">4. Kodevaliditet</h2>
                <p className="text-gray-700 leading-relaxed">
                  Vi tester alle rabattkoder før publisering. Vi garanterer ikke at kodene vil være gyldig permanent, da
                  butikker kan endre eller deaktivere rabattkampanjer når som helst. Dersom en kode ikke fungerer, kan
                  du kontakte oss for støtte.
                </p>
              </section>

              <section>
                <h2 className="text-2xl font-semibold text-gray-900 mb-3">5. Ansvarsfraskrivelse</h2>
                <p className="text-gray-700 leading-relaxed">
                  Rabattkoder.no tillbyr tjenesten som den er. Vi er ikke ansvarlig for:
                </p>
                <ul className="list-disc list-inside text-gray-700 space-y-2">
                  <li>Tap eller skade fra bruk av rabattkodet</li>
                  <li>Butikkers handlemåte eller kundtjeneste</li>
                  <li>Tekniske problemer eller nedetid</li>
                  <li>Tredjepartsinnhold eller lenker</li>
                </ul>
              </section>

              <section>
                <h2 className="text-2xl font-semibold text-gray-900 mb-3">6. Endringer av vilkår</h2>
                <p className="text-gray-700 leading-relaxed">
                  Vi forbeholder oss retten til å endre disse vilkårene når som helst. Fortsatt bruk av tjenesten etter
                  endringer betyr at du godtar de nye vilkårene.
                </p>
              </section>

              <section>
                <h2 className="text-2xl font-semibold text-gray-900 mb-3">7. Kontakt</h2>
                <p className="text-gray-700 leading-relaxed">
                  For spørsmål om disse vilkårene, vennligst kontakt oss på: support@rabattkoder.no
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
