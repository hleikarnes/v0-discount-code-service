import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"

export default function PrivacyPage() {
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
          <h1 className="text-4xl font-bold text-gray-900 mb-4">Personvernpolicy</h1>
          <p className="text-gray-600">Sist oppdatert: Januar 2025</p>
        </div>

        <div className="space-y-8">
          <Card className="bg-white border-gray-200">
            <CardContent className="p-6 space-y-4">
              <section>
                <h2 className="text-2xl font-semibold text-gray-900 mb-3">1. Introduksjon</h2>
                <p className="text-gray-700 leading-relaxed">
                  Rabattkoder.no respekterer ditt privatliv. Denne personvernpolicyen forklarer hvordan vi samler inn,
                  bruker og beskytter dine personlige data.
                </p>
              </section>

              <section>
                <h2 className="text-2xl font-semibold text-gray-900 mb-3">2. Datainnsamling</h2>
                <p className="text-gray-700 leading-relaxed mb-3">Vi samler inn følgende data:</p>
                <ul className="list-disc list-inside text-gray-700 space-y-2 mb-3">
                  <li>
                    <strong>Guest ID:</strong> En anonym identifikator satt via cookie for å spore brukeraktivitet
                  </li>
                  <li>
                    <strong>Kjøpsdata:</strong> E-postadresse, innkjøpsbeløp og butikkinformasjon (kun når du kjøper)
                  </li>
                  <li>
                    <strong>Analytics:</strong> Sidvisninger, søk, klikk og andre interaksjoner
                  </li>
                  <li>
                    <strong>Teknikk:</strong> IP-adresse, nettleser og enhetsinformasjon
                  </li>
                </ul>
              </section>

              <section>
                <h2 className="text-2xl font-semibold text-gray-900 mb-3">3. Bruk av data</h2>
                <p className="text-gray-700 leading-relaxed">Vi bruker dine data til å:</p>
                <ul className="list-disc list-inside text-gray-700 space-y-2">
                  <li>Behandle dine kjøp og betalinger</li>
                  <li>Forbedre og optimalisere vår tjeneste</li>
                  <li>Forhindre misbruk og sikkerhetsproblemer</li>
                  <li>Analysere brukeratferd og trender</li>
                </ul>
              </section>

              <section>
                <h2 className="text-2xl font-semibold text-gray-900 mb-3">4. Cookies</h2>
                <p className="text-gray-700 leading-relaxed">
                  Vi bruker cookies for å lagre din Guest ID og land-preferanse. Disse er nødvendige cookies og kan ikke
                  deaktiveres.
                </p>
              </section>

              <section>
                <h2 className="text-2xl font-semibold text-gray-900 mb-3">5. Tredjeparter</h2>
                <p className="text-gray-700 leading-relaxed">Vi deler dine data med følgende tredjeparter:</p>
                <ul className="list-disc list-inside text-gray-700 space-y-2">
                  <li>
                    <strong>Stripe:</strong> For betalingsbehandling (se Stripes personvernpolicy)
                  </li>
                  <li>
                    <strong>Supabase:</strong> For databaselagring (se Supabase databehandleravtale)
                  </li>
                  <li>
                    <strong>Vercel:</strong> For hosting (se Vercel personvernpolicy)
                  </li>
                </ul>
              </section>

              <section>
                <h2 className="text-2xl font-semibold text-gray-900 mb-3">6. Dine rettigheter</h2>
                <p className="text-gray-700 leading-relaxed">
                  I henhold til GDPR har du rett til å be om innsyn i, retting eller sletting av dine personlige data.
                  Kontakt oss på support@rabattkoder.no.
                </p>
              </section>

              <section>
                <h2 className="text-2xl font-semibold text-gray-900 mb-3">7. Sikkerhet</h2>
                <p className="text-gray-700 leading-relaxed">
                  Vi bruker SSL-kryptering og andre sikkerhetstiltak for å beskytte dine data. Vi oppbevarer data kun så
                  lenge det er nødvendig for tjenesten.
                </p>
              </section>

              <section>
                <h2 className="text-2xl font-semibold text-gray-900 mb-3">8. Endringer</h2>
                <p className="text-gray-700 leading-relaxed">
                  Vi kan oppdatere denne policyen når som helst. Betydelige endringer vil bli kommunisert på våre
                  nettsider.
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
