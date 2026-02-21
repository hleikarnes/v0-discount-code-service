import type { Store, StoreCode, AffiliateOffer } from "@/lib/types"
import { mockStores, mockStoreCodes, mockAffiliateOffers } from "./mock-data"
import { normalizeDomain, normalizeQuery } from "@/lib/routing"
import { STORES_KEY, CODES_KEY } from "@/lib/storage-keys"

// Helper to check if a value is "featured" (handles string/boolean/number variants from localStorage)
export function isFeatured(v: unknown): boolean {
  return v === true || v === "true" || v === 1 || v === "1" || v === "on"
}

export interface SEOPage {
  id: string
  country_code: string
  store_slug: string
  seo_title: string
  seo_description: string
  seo_body: string
}

// Simple Levenshtein distance function for fuzzy matching
function levenshteinDistance(a: string, b: string): number {
  if (a.length === 0) return b.length
  if (b.length === 0) return a.length

  const matrix: number[][] = []

  for (let i = 0; i <= b.length; i++) {
    matrix[i] = [i]
  }
  for (let j = 0; j <= a.length; j++) {
    matrix[0][j] = j
  }

  for (let i = 1; i <= b.length; i++) {
    for (let j = 1; j <= a.length; j++) {
      if (b.charAt(i - 1) === a.charAt(j - 1)) {
        matrix[i][j] = matrix[i - 1][j - 1]
      } else {
        matrix[i][j] = Math.min(
          matrix[i - 1][j - 1] + 1,
          matrix[i][j - 1] + 1,
          matrix[i - 1][j] + 1
        )
      }
    }
  }

  return matrix[b.length][a.length]
}

// Normalize query string - use canonical normalizeDomain from routing.ts
// This is kept for backwards compatibility but delegates to the canonical implementation

export class MockRepository {
  private stores: Store[]
  private codes: StoreCode[]
  private offers: AffiliateOffer[]
  private seoPages: SEOPage[] = []

  constructor() {
    this.stores = [...mockStores]
    this.codes = [...mockStoreCodes]
    this.offers = [...mockAffiliateOffers]
    
    // Load stores from localStorage if available (admin added stores)
    if (typeof window !== "undefined") {
      try {
        const storedStores = localStorage.getItem(STORES_KEY)
        if (storedStores) {
          const parsed = JSON.parse(storedStores)
          // Merge with mock stores, avoiding duplicates by domain+country
          for (const s of parsed) {
            // Normalize store data for consistency
            const normalizedStore: Store = {
              ...s,
              country_code: s.country_code?.toUpperCase() || "NO",
              domain: normalizeDomain(s.domain || s.store_domain || ""),
              is_active: s.is_active !== false, // Default to true
              is_featured: isFeatured(s.is_featured), // Normalize string/boolean to boolean
            }
            
            const normalizedDomain = normalizeDomain(normalizedStore.domain)
            const exists = this.stores.some(
              (existing) => 
                normalizeDomain(existing.domain) === normalizedDomain && 
                existing.country_code === normalizedStore.country_code
            )
            if (!exists && normalizedDomain) {
              this.stores.push(normalizedStore)
            }
          }
        }
      } catch (e) {
        console.error("Failed to load stores from localStorage:", e)
      }
    }
  }

  // Store operations
  async getStores(country: string): Promise<Store[]> {
    const normalizedCountry = country.toUpperCase()
    return this.stores.filter((s) => s.country_code === normalizedCountry && s.is_active !== false)
  }

  async getFeaturedStores(country: string): Promise<Store[]> {
    const normalizedCountry = country.toUpperCase()
    
    // Get all active stores for this country
    const allStores = this.stores.filter(
      (s) => s.country_code === normalizedCountry && s.is_active !== false
    )
    
    // Rule: If 6 or fewer stores total, show ALL (ignore is_featured)
    if (allStores.length <= 6) {
      return allStores
    }
    
    // Rule: If more than 6 stores, prioritize featured then fill with non-featured
    const featured = allStores.filter((s) => s.is_featured === true)
    const nonFeatured = allStores.filter((s) => s.is_featured !== true)
    
    // Take all featured first, then fill remaining slots with non-featured
    const result: Store[] = [...featured]
    const remainingSlots = 6 - result.length
    if (remainingSlots > 0) {
      result.push(...nonFeatured.slice(0, remainingSlots))
    }
    
    return result.slice(0, 6)
  }

  async getStoreByDomain(domain: string): Promise<Store | null> {
    const normalizedDomain = normalizeDomain(domain)
    return this.stores.find((s) => normalizeDomain(s.domain) === normalizedDomain) || null
  }

  async searchStores(country: string, query: string): Promise<Store[]> {
    const normalizedQuery = normalizeDomain(query)
    const queryLower = query.toLowerCase().trim()
    const normalizedCountry = country.toUpperCase()
    
    return this.stores.filter(
      (s) => {
        if (s.country_code !== normalizedCountry || s.is_active === false) return false
        
        const storeDomain = normalizeDomain(s.domain)
        const domainWithoutTld = storeDomain.split(".")[0]
        const storeName = s.name.toLowerCase()
        const storeSlug = (s.slug || "").toLowerCase()
        
        // Match by: 
        // 1. Exact normalized domain
        // 2. Domain contains query
        // 3. Domain without TLD contains query (e.g., "butikk" matches "butikk.no")
        // 4. Store name contains query (partial match)
        // 5. Slug contains query
        return storeDomain === normalizedQuery || 
               storeDomain.includes(normalizedQuery) || 
               domainWithoutTld.includes(queryLower) ||
               storeName.includes(queryLower) ||
               storeSlug.includes(queryLower)
      }
    )
  }

  // Find closest store match using Levenshtein distance (for "did you mean" suggestions)
  async findClosestStore(country: string, query: string): Promise<{ store: Store; distance: number } | null> {
    const q = normalizeDomain(query)
    const normalizedCountry = country.toUpperCase()
    
    const countryStores = this.stores.filter(
      (s) => s.country_code === normalizedCountry && s.is_active
    )
    
    if (countryStores.length === 0) return null
    
    let bestMatch: Store | null = null
    let bestDistance = Number.POSITIVE_INFINITY
    
    for (const store of countryStores) {
      // Check distance against normalized domain (without TLD) and name
      const storeDomain = normalizeDomain(store.domain)
      const domainWithoutTld = storeDomain.split(".")[0]
      const nameLower = store.name.toLowerCase()
      
      const distDomain = levenshteinDistance(q, domainWithoutTld)
      const distName = levenshteinDistance(q, nameLower)
      const minDist = Math.min(distDomain, distName)
      
      if (minDist < bestDistance) {
        bestDistance = minDist
        bestMatch = store
      }
    }
    
    return bestMatch ? { store: bestMatch, distance: bestDistance } : null
  }

  // Get store by slug or domain (for SEO route)
  // IMPORTANT: Always match by normalized domain as the ONLY reliable identifier
  async getStoreBySlugOrDomain(slugOrDomain: string, country: string): Promise<Store | null> {
    const input = slugOrDomain.trim().toLowerCase()
    const normalizedCountry = country.toUpperCase()
    
    // STRATEGY: Try multiple matching approaches
    // 1. If contains ".", treat as domain and match directly
    // 2. Otherwise, try to match slug (which might map to a domain)
    
    // First: if it looks like a domain (contains "."), match by normalized domain
    if (input.includes(".")) {
      const normalizedInput = normalizeDomain(input)
      return this.stores.find(
        (s) => normalizeDomain(s.domain) === normalizedInput && 
               s.country_code === normalizedCountry && 
               s.is_active
      ) || null
    }
    
    // Second: treat as slug - find store where slug matches OR domain-without-TLD matches
    return this.stores.find(
      (s) => {
        if (s.country_code !== normalizedCountry || !s.is_active) return false
        
        // Match explicit slug
        if (s.slug?.toLowerCase() === input) return true
        
        // Match generated slug from domain (remove TLD and normalize)
        const domainWithoutTld = normalizeDomain(s.domain).split(".")[0]
        if (domainWithoutTld === input) return true
        
        return false
      }
    ) || null
  }

  async getStoreByDomainAndCountry(domain: string, country: string): Promise<Store | null> {
    return this.stores.find((s) => s.domain === domain && s.country_code === country) || null
  }

  // Code operations
  // CRITICAL: Always match codes by normalized domain
  async getStoreCodesByDomain(domain: string): Promise<StoreCode[]> {
    const normalizedDomain = normalizeDomain(domain)
    
    // First check localStorage for published codes (admin UI)
    if (typeof window !== "undefined") {
      try {
        const storedCodes = localStorage.getItem(CODES_KEY)
        if (storedCodes) {
          const parsedCodes = JSON.parse(storedCodes)
          const localCodes = parsedCodes
            .filter((c: { store_domain: string; country?: string }) => 
              normalizeDomain(c.store_domain) === normalizedDomain
            )
            .map((c: {
              id: string
              store_domain: string
              code: string
              benefit_type: string
              scope?: string
              value_percent?: number
              value_amount?: number
              currency?: string
              min_purchase_amount?: number
              applies_to_product?: string
              tested_products_count?: number
              is_visible_to_users?: boolean
            }) => ({
              id: c.id,
              store_domain: c.store_domain,
              code: c.code,
              benefit_type: c.benefit_type,
              scope: c.scope || "cart",
              value_percent: c.value_percent,
              value_amount: c.value_amount,
              currency: c.currency,
              min_purchase_amount: c.min_purchase_amount,
              applies_to_product: c.applies_to_product,
              tested_products_count: c.tested_products_count || 1,
              is_visible_to_users: c.is_visible_to_users ?? true,
              tested_at: new Date().toISOString(),
              expires_at: null,
            }))
          if (localCodes.length > 0) {
            return localCodes
          }
        }
      } catch (e) {
        console.error("Failed to read codes from localStorage:", e)
      }
    }
    // Fallback to mock codes (use normalized domain matching)
    return this.codes.filter((c) => normalizeDomain(c.store_domain) === normalizedDomain)
  }

  async getAllCodes(): Promise<StoreCode[]> {
    // Check localStorage first
    if (typeof window !== "undefined") {
      try {
        const storedCodes = localStorage.getItem(CODES_KEY)
        if (storedCodes) {
          return JSON.parse(storedCodes)
        }
      } catch (e) {
        console.error("Failed to read codes from localStorage:", e)
      }
    }
    return this.codes
  }

  // Offer operations
  async getOffers(country: string): Promise<AffiliateOffer[]> {
    return this.offers.filter((o) => o.country_code === country && o.is_active)
  }

  async getOfferBySlug(slug: string): Promise<AffiliateOffer | null> {
    return this.offers.find((o) => o.slug === slug) || null
  }

  // CRUD operations for stores
  async addStore(store: Omit<Store, "id" | "created_at" | "updated_at">): Promise<Store> {
    const newStore: Store = {
      ...store,
      id: `store_${Date.now()}`,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    }
    this.stores.push(newStore)
    return newStore
  }

  async updateStore(id: string, data: Partial<Store>): Promise<Store | null> {
    const index = this.stores.findIndex((s) => s.id === id)
    if (index === -1) return null
    this.stores[index] = { ...this.stores[index], ...data, updated_at: new Date().toISOString() }
    return this.stores[index]
  }

  async deleteStore(id: string): Promise<boolean> {
    const index = this.stores.findIndex((s) => s.id === id)
    if (index === -1) return false
    this.stores.splice(index, 1)
    return true
  }

  async getAllStores(): Promise<Store[]> {
    return this.stores
  }

  // CRUD operations for affiliate offers
  async addOffer(offer: Omit<AffiliateOffer, "id" | "created_at" | "updated_at">): Promise<AffiliateOffer> {
    const newOffer: AffiliateOffer = {
      ...offer,
      id: `offer_${Date.now()}`,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    }
    this.offers.push(newOffer)
    return newOffer
  }

  async updateOffer(id: string, data: Partial<AffiliateOffer>): Promise<AffiliateOffer | null> {
    const index = this.offers.findIndex((o) => o.id === id)
    if (index === -1) return null
    this.offers[index] = { ...this.offers[index], ...data, updated_at: new Date().toISOString() }
    return this.offers[index]
  }

  async deleteOffer(id: string): Promise<boolean> {
    const index = this.offers.findIndex((o) => o.id === id)
    if (index === -1) return false
    this.offers.splice(index, 1)
    return true
  }

  async getAllOffers(): Promise<AffiliateOffer[]> {
    return this.offers
  }

  // CRUD operations for SEO pages
  async addSEOPage(page: Omit<SEOPage, "id">): Promise<SEOPage> {
    const newPage: SEOPage = { ...page, id: `seo_${Date.now()}` }
    this.seoPages.push(newPage)
    return newPage
  }

  async updateSEOPage(id: string, data: Partial<SEOPage>): Promise<SEOPage | null> {
    const index = this.seoPages.findIndex((p) => p.id === id)
    if (index === -1) return null
    this.seoPages[index] = { ...this.seoPages[index], ...data }
    return this.seoPages[index]
  }

  async deleteSEOPage(id: string): Promise<boolean> {
    const index = this.seoPages.findIndex((p) => p.id === id)
    if (index === -1) return false
    this.seoPages.splice(index, 1)
    return true
  }

  async getAllSEOPages(): Promise<SEOPage[]> {
    return this.seoPages
  }
}

let repository: MockRepository | null = null

export function getMockRepository(): MockRepository {
  if (!repository) {
    repository = new MockRepository()
  }
  return repository
}
