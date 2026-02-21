/**
 * ROUTING UTILITY - Single source of truth for navigation URLs
 * 
 * IMPORTANT ARCHITECTURAL RULE (LOCKED):
 * - All store and code matching MUST be done using store_domain only.
 * - Slug may exist for URL display, but must NEVER be used for data matching or lookup.
 * - Use normalizeDomain() for ALL domain operations.
 * 
 * CANONICAL NAVIGATION:
 * - Store cards on search/homepage -> /[country]/store/[store_slug]
 * - The store detail page shows teasers and CTA
 * 
 * REGRESSION CHECKLIST (must pass after any navigation changes):
 * - /no loads, /uk loads
 * - /no/s?query=bilkomponenter shows store card
 * - Clicking store card on /no/s navigates to /no/store/bilkomponenter (URL changes)
 * - Store detail page shows teasers + "Lås opp fungerende rabattkoder" CTA
 * - If no codes: shows "Ingen fungerende rabattkoder akkurat nå"
 * - No "Unhandled promise rejection" – wrap fetches in try/catch and show empty state
 */

/**
 * CANONICAL DOMAIN NORMALIZATION
 * 
 * This is the SINGLE source of truth for normalizing store domains.
 * Use this EVERYWHERE:
 * - when saving stores (stores.domain)
 * - when saving codes (codes.store_domain)
 * - when searching
 * - when building teasers
 * - when revealing codes
 * 
 * @example normalizeDomain("https://www.Bilkomponenter.NO/path") -> "bilkomponenter.no"
 * @example normalizeDomain("  WWW.elkjop.no  ") -> "elkjop.no"
 */
export function normalizeDomain(input: string | null | undefined): string {
  if (!input) return ""
  let d = input.trim().toLowerCase()
  // Remove protocol
  d = d.replace(/^https?:\/\//, "")
  // Remove leading www.
  d = d.replace(/^www\./, "")
  // Extract hostname only (remove path, query, etc.)
  if (d.includes("/")) {
    d = d.split("/")[0]
  }
  // Remove any trailing dots
  d = d.replace(/\.+$/, "")
  return d
}

/**
 * Normalize a query string for search (alias for normalizeDomain)
 * - trim whitespace
 * - lowercase
 * - remove protocol (http://, https://)
 * - remove leading www.
 * - extract hostname if full URL
 */
export function normalizeQuery(input: string): string {
  return normalizeDomain(input)
}

/**
 * Generate a URL-safe slug from a domain
 * - remove protocol and www
 * - take hostname
 * - remove TLD (e.g., .no, .com, .co.uk)
 * - replace non-alphanumerics with "-"
 * - lowercase
 * 
 * @example generateSlugFromDomain("https://www.bilkomponenter.no") -> "bilkomponenter"
 * @example generateSlugFromDomain("elkjop.no") -> "elkjop"
 */
export function generateSlugFromDomain(domain: string): string {
  let slug = normalizeQuery(domain)
  // Remove common TLDs
  slug = slug.replace(/\.(com|no|co\.uk|uk|net|org|io|se|dk|fi|de|fr|es|it|nl|be|at|ch)$/i, "")
  // Replace non-alphanumeric with hyphens
  slug = slug.replace(/[^a-z0-9]/g, "-")
  // Remove leading/trailing hyphens and collapse multiple hyphens
  slug = slug.replace(/^-+|-+$/g, "").replace(/-+/g, "-")
  return slug
}

/**
 * Get the store slug from the store object.
 * IMPORTANT: Prefer using store.slug from Supabase. 
 * Only falls back to generating from domain if slug is not available.
 * Never appends country to slug - country is in URL path segment.
 */
export function getStoreSlug(store: { slug?: string; domain: string }): string {
  if (store.slug && store.slug.trim()) {
    return store.slug.trim().toLowerCase()
  }
  // Fallback: generate slug from domain (without country suffix)
  return generateSlugFromDomain(store.domain)
}

/**
 * Build the canonical store search URL
 * This is the ONLY way stores should be linked in the app.
 * 
 * @param country - Country code (e.g., "no", "uk")
 * @param storeDomainOrQuery - Store domain or search query
 * @returns The canonical URL: /{country}/s?query={normalizedQuery}
 */
export function buildStoreSearchUrl(country: string, storeDomainOrQuery: string): string {
  const normalized = normalizeQuery(storeDomainOrQuery)
  return `/${country}/s?query=${encodeURIComponent(normalized)}`
}

/**
 * Build the store detail page URL - PRIMARY navigation for store cards
 * 
 * @param country - Country code
 * @param store - Store object with slug and domain
 * @returns The store URL: /{country}/store/{slug}
 */
export function buildStorePageUrl(country: string, store: { slug?: string; domain: string }): string {
  const slug = getStoreSlug(store)
  return `/${country}/store/${slug}`
}

/**
 * Build a store SEO page URL using raw slug (legacy, prefer buildStorePageUrl)
 * 
 * @param country - Country code
 * @param storeSlug - Store slug (not domain)
 * @returns The SEO URL: /{country}/store/{slug}
 */
export function buildStoreSeoUrl(country: string, storeSlug: string): string {
  return `/${country}/store/${storeSlug}`
}

/**
 * Build the homepage URL for a country
 */
export function buildHomeUrl(country: string): string {
  return `/${country}`
}

/**
 * Build the admin URL for a country
 */
export function buildAdminUrl(country: string): string {
  return `/${country}/admin`
}

/**
 * Build the checkout URL for a store
 * 
 * @param country - Country code
 * @param storeDomain - Store domain (e.g., "bilkomponenter.no")
 * @returns The checkout URL: /{country}/checkout?store={storeDomain}
 */
export function buildCheckoutUrl(country: string, storeDomain: string): string {
  return `/${country}/checkout?store=${encodeURIComponent(storeDomain)}`
}

/**
 * Build the reveal URL for a store
 * 
 * @param country - Country code
 * @param storeDomain - Store domain (e.g., "bilkomponenter.no")
 * @returns The reveal URL: /{country}/reveal?store={storeDomain}
 */
export function buildRevealUrl(country: string, storeDomain: string): string {
  return `/${country}/reveal?store=${encodeURIComponent(storeDomain)}`
}
