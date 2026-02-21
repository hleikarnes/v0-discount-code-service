/**
 * Supabase Stores utility
 * Source of truth for stores is now Supabase (public.stores)
 * Falls back to localStorage if Supabase is unavailable
 */

import { createClient } from "@/lib/supabase/client"
import { STORES_KEY } from "@/lib/storage-keys"
import { normalizeDomain } from "@/lib/routing"

// Store from Supabase schema
export interface SupabaseStore {
  id: string
  country: string
  store_domain: string
  store_name: string
  slug: string
  logo_url: string | null
  is_featured: boolean
  is_active: boolean
  sort_order: number
  seo_title: string | null
  seo_description: string | null
  reveal_limit_cart_override: number | null
  reveal_limit_product_override: number | null
  created_at?: string
  updated_at?: string
}

/**
 * Fetch all active stores for a given country from Supabase
 * Falls back to localStorage if Supabase fails
 */
export async function getStoresByCountry(country: string): Promise<SupabaseStore[]> {
  const normalizedCountry = country.toLowerCase()
  
  try {
    const supabase = createClient()
    const { data, error } = await supabase
      .from("stores")
      .select("*")
      .eq("country", normalizedCountry)
      .eq("is_active", true)
      .order("sort_order", { ascending: true })
      .order("store_name", { ascending: true })
    
    if (error) {
      console.warn("[v0] Supabase stores fetch failed, using localStorage fallback:", error.message)
      return getStoresFromLocalStorage(normalizedCountry)
    }
    
    return data || []
  } catch (e) {
    console.warn("[v0] Supabase stores fetch error, using localStorage fallback:", e)
    return getStoresFromLocalStorage(normalizedCountry)
  }
}

/**
 * Fetch a single store by domain and country from Supabase
 * Falls back to localStorage if Supabase fails
 */
export async function getStoreByDomainAndCountry(
  domain: string,
  country: string
): Promise<SupabaseStore | null> {
  const normalizedDomain = normalizeDomain(domain)
  const normalizedCountry = country.toLowerCase()
  
  try {
    const supabase = createClient()
    const { data, error } = await supabase
      .from("stores")
      .select("*")
      .eq("country", normalizedCountry)
      .eq("store_domain", normalizedDomain)
      .eq("is_active", true)
      .maybeSingle()
    
    if (error) {
      console.warn("[v0] Supabase store fetch failed, using localStorage fallback:", error.message)
      return getStoreFromLocalStorage(normalizedDomain, normalizedCountry)
    }
    
    return data
  } catch (e) {
    console.warn("[v0] Supabase store fetch error, using localStorage fallback:", e)
    return getStoreFromLocalStorage(normalizedDomain, normalizedCountry)
  }
}

/**
 * Search stores by name or domain
 * Falls back to localStorage if Supabase fails
 */
export async function searchStores(country: string, query: string): Promise<SupabaseStore[]> {
  const normalizedCountry = country.toLowerCase()
  const normalizedQuery = normalizeDomain(query)
  const queryLower = query.toLowerCase().trim()
  
  try {
    const supabase = createClient()
    
    // Supabase text search: use ilike for partial matching
    const { data, error } = await supabase
      .from("stores")
      .select("*")
      .eq("country", normalizedCountry)
      .eq("is_active", true)
      .or(`store_name.ilike.%${queryLower}%,store_domain.ilike.%${normalizedQuery}%`)
      .order("store_name", { ascending: true })
      .limit(20)
    
    if (error) {
      console.warn("[v0] Supabase search failed, using localStorage fallback:", error.message)
      return searchStoresInLocalStorage(normalizedCountry, queryLower)
    }
    
    return data || []
  } catch (e) {
    console.warn("[v0] Supabase search error, using localStorage fallback:", e)
    return searchStoresInLocalStorage(normalizedCountry, queryLower)
  }
}

/**
 * Get store by slug for SEO routes
 * Primary: Match by stores.slug column
 * Fallback: If slug ends with -{country}, strip suffix and retry
 */
export async function getStoreBySlug(slug: string, country: string): Promise<SupabaseStore | null> {
  const normalizedCountry = country.toLowerCase()
  const inputSlug = slug.trim().toLowerCase()
  
  try {
    const supabase = createClient()
    
    // Primary: Match by slug exactly
    let { data, error } = await supabase
      .from("stores")
      .select("*")
      .eq("slug", inputSlug)
      .eq("country", normalizedCountry)
      .eq("is_active", true)
      .maybeSingle()
    
    // Fallback: If slug ends with -{country}, strip suffix and retry
    if (!data && inputSlug.endsWith(`-${normalizedCountry}`)) {
      const strippedSlug = inputSlug.slice(0, -(normalizedCountry.length + 1))
      const { data: fallbackData, error: fallbackError } = await supabase
        .from("stores")
        .select("*")
        .eq("slug", strippedSlug)
        .eq("country", normalizedCountry)
        .eq("is_active", true)
        .maybeSingle()
      data = fallbackData
      error = fallbackError
    }
    
    if (error) {
      console.warn("[v0] Supabase slug lookup failed, using localStorage fallback:", error.message)
      return getStoreBySlugFromLocalStorage(inputSlug, normalizedCountry)
    }
    
    return data
  } catch (e) {
    console.warn("[v0] Supabase slug lookup error, using localStorage fallback:", e)
    return getStoreBySlugFromLocalStorage(inputSlug, normalizedCountry)
  }
}

// ============ localStorage fallback functions ============

function getStoresFromLocalStorage(country: string): SupabaseStore[] {
  if (typeof window === "undefined") return []
  
  try {
    const stored = localStorage.getItem(STORES_KEY)
    if (!stored) return []
    
    const oldStores = JSON.parse(stored) as Record<string, unknown>[]
    return oldStores
      .filter((s) => {
        const matchesCountry = ((s.country_code as string) || "NO").toLowerCase() === country
        const isActive = s.is_active !== false
        return matchesCountry && isActive
      })
      .map(mapOldStoreToSupabaseFormat)
  } catch {
    return []
  }
}

function getStoreFromLocalStorage(domain: string, country: string): SupabaseStore | null {
  if (typeof window === "undefined") return null
  
  try {
    const stored = localStorage.getItem(STORES_KEY)
    if (!stored) return null
    
    const oldStores = JSON.parse(stored) as Record<string, unknown>[]
    const found = oldStores.find((s) => {
      const storeDomain = normalizeDomain((s.domain as string) || (s.store_domain as string) || "")
      const storeCountry = ((s.country_code as string) || "NO").toLowerCase()
      return storeDomain === domain && storeCountry === country && s.is_active !== false
    })
    
    return found ? mapOldStoreToSupabaseFormat(found) : null
  } catch {
    return null
  }
}

function searchStoresInLocalStorage(country: string, query: string): SupabaseStore[] {
  if (typeof window === "undefined") return []
  
  try {
    const stored = localStorage.getItem(STORES_KEY)
    if (!stored) return []
    
    const oldStores = JSON.parse(stored) as Record<string, unknown>[]
    return oldStores
      .filter((s) => {
        const storeCountry = ((s.country_code as string) || "NO").toLowerCase()
        if (storeCountry !== country || s.is_active === false) return false
        
        const storeName = ((s.name as string) || (s.store_name as string) || "").toLowerCase()
        const storeDomain = normalizeDomain((s.domain as string) || (s.store_domain as string) || "")
        
        return storeName.includes(query) || storeDomain.includes(query)
      })
      .map(mapOldStoreToSupabaseFormat)
  } catch {
    return []
  }
}

function getStoreBySlugFromLocalStorage(slug: string, country: string): SupabaseStore | null {
  if (typeof window === "undefined") return null
  
  try {
    const stored = localStorage.getItem(STORES_KEY)
    if (!stored) return null
    
    const oldStores = JSON.parse(stored) as Record<string, unknown>[]
    const found = oldStores.find((s) => {
      const storeCountry = ((s.country_code as string) || "NO").toLowerCase()
      if (storeCountry !== country || s.is_active === false) return false
      
      const storeDomain = normalizeDomain((s.domain as string) || (s.store_domain as string) || "")
      const storeSlug = (s.slug as string) || storeDomain.replace(/\./g, "-")
      const domainWithoutTld = storeDomain.split(".")[0]
      
      return storeSlug === slug || domainWithoutTld === slug || storeDomain === slug.replace(/-/g, ".")
    })
    
    return found ? mapOldStoreToSupabaseFormat(found) : null
  } catch {
    return null
  }
}

function mapOldStoreToSupabaseFormat(s: Record<string, unknown>): SupabaseStore {
  const domain = normalizeDomain((s.domain as string) || (s.store_domain as string) || "")
  return {
    id: s.id as string,
    country: ((s.country_code as string) || "NO").toLowerCase(),
    store_domain: domain,
    store_name: (s.name as string) || (s.store_name as string) || "",
    slug: (s.slug as string) || domain.split(".")[0], // Generate slug from domain if not present
    logo_url: (s.logo_url as string) || null,
    is_featured: s.is_featured === true,
    is_active: s.is_active !== false,
    sort_order: (s.sort_order as number) || 0,
    seo_title: (s.seo_title as string) || null,
    seo_description: (s.seo_description as string) || null,
    reveal_limit_cart_override: (s.reveal_cart_limit_override as number) ?? (s.reveal_limit_cart_override as number) ?? null,
    reveal_limit_product_override: (s.reveal_product_limit_override as number) ?? (s.reveal_limit_product_override as number) ?? null,
  }
}
