// Translation strings for different countries
// Brand is always "Dealtested" regardless of country - only language changes
export const translations = {
  no: {
    siteName: "Dealtested",
    title: "Finn verifiserte rabattkoder",
    subtitle: "Vi tester alle rabattkoder før salg. Få garantert fungerende koder.",
    searchPlaceholder: "Søk etter butikk eller domene...",
    search: "Søk",
    backToHome: "Tilbake til forsiden",
    popularStores: "Populære butikker",
    noStoresAvailable: "Ingen butikker tilgjengelig",
    howItWorks: "Slik fungerer Dealtested",
    step1Title: "Søk etter butikk",
    step1Desc: "Finn nettbutikken du skal handle i",
    step2Title: "Se verifiserte rabattkoder",
    step2Desc: "Vi viser de beste rabattkodene som er testet i handlekurven",
    step3Title: "Lås opp og spar penger",
    step3Desc: "Lås opp kodene og bruk dem når du betaler",
    aboutUs: "Om oss",
    privacy: "Personvern",
    terms: "Vilkår",
    copyright: "© 2025 Dealtested. Alle rettigheter reservert.",
    noResults: "Ingen resultater",
    storesFound: (count: number) => `${count} ${count === 1 ? "butikk" : "butikker"} funnet`,
    notFound: "Siden ble ikke funnet",
    noCodes: "Ingen rabattkoder tilgjengelig for øyeblikket.",
    freePartnerCodes: "Gratis partnerkoder",
    freeShipping: "Gratis frakt",
    visitStore: "Besøk butikk",
    seeAllPartnerCodes: "Se alle partnerkoder",
    allPartnerCodes: "Alle partnerkoder",
    noPartnerCodesAvailable: "Ingen partnerkoder tilgjengelig for øyeblikket.",
  },
  uk: {
    siteName: "Dealtested",
    title: "Find verified discount codes",
    subtitle: "We test all discount codes before sale. Get guaranteed working codes.",
    searchPlaceholder: "Search for store or domain...",
    search: "Search",
    backToHome: "Back to home",
    popularStores: "Popular stores",
    noStoresAvailable: "No stores available",
    howItWorks: "How it works",
    step1Title: "Search for store",
    step1Desc: "Find the store you want to shop from",
    step2Title: "Buy discount code",
    step2Desc: "Pay a small amount for verified code",
    step3Title: "Save money",
    step3Desc: "Use the code and save on your purchase",
    aboutUs: "About us",
    privacy: "Privacy",
    terms: "Terms",
    copyright: "© 2025 Dealtested. All rights reserved.",
    noResults: "No results",
    storesFound: (count: number) => `${count} ${count === 1 ? "store" : "stores"} found`,
    notFound: "Page not found",
    noCodes: "No discount codes available at the moment.",
    freePartnerCodes: "Free partner codes",
    freeShipping: "Free shipping",
    visitStore: "Visit store",
    seeAllPartnerCodes: "See all partner codes",
    allPartnerCodes: "All partner codes",
    noPartnerCodesAvailable: "No partner codes available at the moment.",
  },
}

export type CountryCode = "no" | "uk"

export function getTranslation(country: CountryCode): (typeof translations)[CountryCode] {
  if (country === "uk") return translations.uk
  return translations.no
}

export const SUPPORTED_COUNTRIES: CountryCode[] = ["no", "uk"]

export function isValidCountry(country: string): country is CountryCode {
  return SUPPORTED_COUNTRIES.includes(country as CountryCode)
}
