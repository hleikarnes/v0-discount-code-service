"use client"

import { useState, useEffect, useCallback } from "react"
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Tooltip, TooltipTrigger, TooltipContent, TooltipProvider } from "@/components/ui/tooltip"
import { Info } from "lucide-react"
import { normalizeDomain } from "@/lib/routing"
import { STORES_KEY, CODES_KEY, SEO_KEY, JOBS_KEY, COUNTRY_SETTINGS_KEY } from "@/lib/storage-keys"
import { fetchEventsFromSupabase, getLocalStorageEvents } from "@/lib/events"
import { createClient } from "@/lib/supabase/client"

// Store interface - matches Supabase public.stores table
interface Store {
  id: string
  country: string // lowercase (no/uk)
  store_domain: string // normalized
  store_name: string
  slug: string // URL slug (e.g., "bilkomponenter")
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

// Partner code interface - matches Supabase public.partner_codes table
interface PartnerCode {
  id: string
  country: string // lowercase
  store_name: string
  store_domain: string
  code: string | null
  discount_text: string | null
  free_shipping: boolean
  partner_url: string
  logo_url: string | null
  description: string | null
  is_active: boolean
  is_featured: boolean
  sort_order: number
  created_at?: string
  updated_at?: string
}

interface SeoPage {
  id: string
  country_code: string
  store_slug: string
  seo_title: string
  seo_description: string
  seo_body: string
}

interface Job {
  id: string
  store_domain: string
  status: "pending" | "done" | "error"
  created_at: string
}

interface CountrySetting {
  country_code: string
  reveal_limit_cart_codes_default: number
  reveal_limit_product_codes_default: number
}

interface PublishedCode {
  id: string
  country: string
  store_domain: string
  code: string
  coupon_code?: string | null
  benefit_type: "percent_off" | "amount_off" | "free_shipping"
  scope: "cart" | "product"
  value_percent?: number
  value_amount?: number
  currency?: string
  min_purchase_amount?: number
  applies_to_product?: string
  tested_products_count?: number
  is_visible_to_users: boolean
  created_at: string
}

function generateId() {
  return `${Date.now()}_${Math.random().toString(36).substring(2, 9)}`
}

export function PrototypeAdmin() {
  const [activeTab, setActiveTab] = useState("stores")
  const [mounted, setMounted] = useState(false)

  // Stores state (Supabase)
  const [stores, setStores] = useState<Store[]>([])
  const [showStoreForm, setShowStoreForm] = useState(false)
  const [editingStore, setEditingStore] = useState<Store | null>(null)
  const [savingStore, setSavingStore] = useState(false)
  const [storeError, setStoreError] = useState("")
  const [storeSuccess, setStoreSuccess] = useState("")
  const [importingStores, setImportingStores] = useState(false)
  const [storeFormData, setStoreFormData] = useState({
    country: "no",
    store_name: "",
    store_domain: "",
    logo_url: "",
    is_featured: false,
    sort_order: 0,
    seo_title: "",
    seo_description: "",
    reveal_limit_cart_override: "",
    reveal_limit_product_override: "",
  })

  // Partner codes state (Supabase)
  const [partnerCodes, setPartnerCodes] = useState<PartnerCode[]>([])
  const [showPartnerForm, setShowPartnerForm] = useState(false)
  const [editingPartner, setEditingPartner] = useState<PartnerCode | null>(null)
  const [savingPartner, setSavingPartner] = useState(false)
  const [partnerError, setPartnerError] = useState("")
  const [partnerSuccess, setPartnerSuccess] = useState("")
  const [partnerFormData, setPartnerFormData] = useState({
    country: "no",
    store_name: "",
    store_domain: "",
    code: "",
    discount_text: "",
    free_shipping: false,
    partner_url: "",
    logo_url: "",
    description: "",
    sort_order: 0,
    is_active: true,
    is_featured: false,
  })

  // SEO state
  const [seoPages, setSeoPages] = useState<SeoPage[]>([])
  const [showSeoForm, setShowSeoForm] = useState(false)
  const [editingSeoPage, setEditingSeoPage] = useState<SeoPage | null>(null)
  const [savingSeoPage, setSavingSeoPage] = useState(false)
  const [seoError, setSeoError] = useState("")
  const [seoSuccess, setSeoSuccess] = useState("")
  const [seoFormData, setSeoFormData] = useState({
    country_code: "NO",
    store_slug: "",
    seo_title: "",
    seo_description: "",
    seo_body: "",
  })

  // Analytics state
  const [guestId, setGuestId] = useState("")
  const [funnelMetrics, setFunnelMetrics] = useState({
    page_views: 0,
    searches: 0,
    checkout_starts: 0,
    purchases: 0,
    reveals: 0,
    partner_clicks: 0,
  })
  const [analyticsEvents, setAnalyticsEvents] = useState<Array<{ event_type: string; guest_id?: string; store_domain?: string; created_at: string }>>([])
  
  // Load analytics events from Supabase (fallback to localStorage)
  const loadAnalyticsEvents = useCallback(async () => {
    if (typeof window === "undefined") return
    
    try {
      // Try Supabase first
      const supabaseEvents = await fetchEventsFromSupabase({ limit: 2000 })
      
      // Use Supabase events if available, otherwise fallback to localStorage
      const events = supabaseEvents ?? getLocalStorageEvents()
      
      setAnalyticsEvents(events as Array<{ event_type: string; guest_id?: string; store_domain?: string; created_at: string }>)
      
      // Calculate funnel metrics (exact event types only)
      const metrics = {
        page_views: events.filter(e => e.event_type === "page_view").length,
        searches: events.filter(e => e.event_type === "search").length,
        checkout_starts: events.filter(e => e.event_type === "checkout_start").length,
        purchases: events.filter(e => e.event_type === "purchase_success").length,
        reveals: events.filter(e => e.event_type === "reveal_view").length,
        partner_clicks: events.filter(e => e.event_type === "partner_click").length,
      }
      setFunnelMetrics(metrics)
    } catch (e) {
      console.error("[v0] Failed to load analytics events:", e)
      // Fallback to localStorage on any error
      const events = getLocalStorageEvents()
      setAnalyticsEvents(events as Array<{ event_type: string; guest_id?: string; store_domain?: string; created_at: string }>)
    }
  }, [])

  // Codes tab state
  const [jobs, setJobs] = useState<Job[]>([])
  const [publishedCodes, setPublishedCodes] = useState<PublishedCode[]>([])
  const [selectedJobDomain, setSelectedJobDomain] = useState("")
  const [startingJob, setStartingJob] = useState(false)
  const [jobSuccess, setJobSuccess] = useState("")
  const [jobError, setJobError] = useState("")
  const [codesJsonInput, setCodesJsonInput] = useState("")
  const [publishingCodes, setPublishingCodes] = useState(false)
  const [publishSuccess, setPublishSuccess] = useState("")
  const [publishError, setPublishError] = useState("")
  const [showJsonImport, setShowJsonImport] = useState(false)
  
  // Country settings state (Innstillinger tab)
  const [countrySettings, setCountrySettings] = useState<CountrySetting[]>([
    { country_code: "NO", reveal_limit_cart_codes_default: 3, reveal_limit_product_codes_default: 2 },
    { country_code: "UK", reveal_limit_cart_codes_default: 3, reveal_limit_product_codes_default: 2 },
  ])
  const [settingsSaved, setSettingsSaved] = useState(false)

  // Manual code form state
  const [showCodeForm, setShowCodeForm] = useState(false)
  const [editingCode, setEditingCode] = useState<PublishedCode | null>(null)
  const [savingCode, setSavingCode] = useState(false)
  const [codeFormData, setCodeFormData] = useState({
    country: "NO",
    store_domain: "",
    code: "",
    coupon_code: "",
    benefit_type: "percent_off" as "percent_off" | "amount_off" | "free_shipping",
    scope: "cart" as "cart" | "product",
    value_percent: "",
    value_amount: "",
    currency: "NOK",
    min_purchase_amount: "",
    applies_to_product: "",
    tested_products_count: "1",
    is_visible_to_users: true,
  })

  // Load stores from Supabase (with localStorage fallback)
  const loadStores = useCallback(async () => {
    try {
      const supabase = createClient()
      const { data, error } = await supabase
        .from("stores")
        .select("*")
        .order("sort_order", { ascending: true })
        .order("created_at", { ascending: false })
      
      if (error) {
        console.error("[v0] Failed to load stores from Supabase:", error.message)
        // Fallback to localStorage
        const storedStores = localStorage.getItem(STORES_KEY)
        if (storedStores) {
          // Map old localStorage format to new format for display
          const oldStores = JSON.parse(storedStores)
          const mappedStores = oldStores.map((s: Record<string, unknown>) => ({
            id: s.id as string,
            country: ((s.country_code as string) || "NO").toLowerCase(),
            store_domain: normalizeDomain((s.domain as string) || (s.store_domain as string) || ""),
            store_name: (s.name as string) || (s.store_name as string) || "",
            logo_url: (s.logo_url as string) || null,
            is_featured: s.is_featured === true,
            is_active: s.is_active !== false,
            sort_order: (s.sort_order as number) || 0,
            seo_title: (s.seo_title as string) || null,
            seo_description: (s.seo_description as string) || null,
            reveal_limit_cart_override: (s.reveal_cart_limit_override as number) ?? (s.reveal_limit_cart_override as number) ?? null,
            reveal_limit_product_override: (s.reveal_product_limit_override as number) ?? (s.reveal_limit_product_override as number) ?? null,
          }))
          setStores(mappedStores)
        }
        return
      }
      
      setStores(data || [])
    } catch (e) {
      console.error("[v0] Store load error:", e)
    }
  }, [])

  // Load partner codes from Supabase
  const loadPartnerCodes = useCallback(async () => {
    try {
      const supabase = createClient()
      const { data, error } = await supabase
        .from("partner_codes")
        .select("*")
        .order("sort_order", { ascending: true })
        .order("created_at", { ascending: false })
      
      if (error) {
        console.error("[v0] Failed to load partner codes:", error.message)
        return
      }
      
      setPartnerCodes(data || [])
    } catch (e) {
      console.error("[v0] Partner codes load error:", e)
    }
  }, [])

  // Load from Supabase and localStorage on mount
  useEffect(() => {
    setMounted(true)
    // Load stores from Supabase
    loadStores()
    // Load partner codes from Supabase
    loadPartnerCodes()
    try {
      const storedSeo = localStorage.getItem(SEO_KEY)
      if (storedSeo) {
        setSeoPages(JSON.parse(storedSeo))
      }
      const storedCodes = localStorage.getItem(CODES_KEY)
      if (storedCodes) {
        setPublishedCodes(JSON.parse(storedCodes))
      }
      const storedJobs = localStorage.getItem(JOBS_KEY)
      if (storedJobs) {
        setJobs(JSON.parse(storedJobs))
      }
      // Load country settings
      const storedSettings = localStorage.getItem(COUNTRY_SETTINGS_KEY)
      if (storedSettings) {
        setCountrySettings(JSON.parse(storedSettings))
      }
      // Load analytics events
      loadAnalyticsEvents()
    } catch (e) {
      console.error("Failed to load from localStorage:", e)
    }
  }, [loadAnalyticsEvents, loadStores, loadPartnerCodes])

  // Save stores to localStorage
  const saveStoresToStorage = useCallback((newStores: Store[]) => {
    try {
      localStorage.setItem(STORES_KEY, JSON.stringify(newStores))
    } catch (e) {
      console.error("Failed to save stores:", e)
    }
  }, [])

  // Save country settings to localStorage
  const saveCountrySettings = useCallback(() => {
    try {
      localStorage.setItem(COUNTRY_SETTINGS_KEY, JSON.stringify(countrySettings))
      setSettingsSaved(true)
      setTimeout(() => setSettingsSaved(false), 2000)
    } catch (e) {
      console.error("Failed to save country settings:", e)
    }
  }, [countrySettings])

  // Helper to get effective reveal limits for a store
  const getEffectiveLimits = useCallback((store: Store) => {
    const countrySetting = countrySettings.find(cs => cs.country_code === store.country.toUpperCase())
    const cartLimit = store.reveal_limit_cart_override ?? countrySetting?.reveal_limit_cart_codes_default ?? 3
    const productLimit = store.reveal_limit_product_override ?? countrySetting?.reveal_limit_product_codes_default ?? 2
    return { cartLimit, productLimit }
  }, [countrySettings])

  // Helper to get store name by domain (for display in codes table)
  const getStoreNameByDomain = useCallback((storeDomain: string): string => {
    const normalized = normalizeDomain(storeDomain)
    const store = stores.find((s) => normalizeDomain(s.store_domain) === normalized)
    if (store) {
      return store.store_name
    }
    // Fallback: show "Ukjent butikk (domain)" if not found
    return `Ukjent butikk (${storeDomain})`
  }, [stores])

  // Save SEO to localStorage
  const saveSeoToStorage = useCallback((newSeo: SeoPage[]) => {
    try {
      localStorage.setItem(SEO_KEY, JSON.stringify(newSeo))
    } catch (e) {
      console.error("Failed to save SEO pages:", e)
    }
  }, [])

  // Save codes to localStorage
  const saveCodesToStorage = useCallback((newCodes: PublishedCode[]) => {
    try {
      localStorage.setItem(CODES_KEY, JSON.stringify(newCodes))
    } catch (e) {
      console.error("Failed to save codes:", e)
    }
  }, [])

  // Save jobs to localStorage
  const saveJobsToStorage = useCallback((newJobs: Job[]) => {
    try {
      localStorage.setItem(JOBS_KEY, JSON.stringify(newJobs))
    } catch (e) {
      console.error("Failed to save jobs:", e)
    }
  }, [])

  // Reset store form
  const resetStoreForm = () => {
    setStoreFormData({
      country: "no",
      store_name: "",
      store_domain: "",
      logo_url: "",
      is_featured: false,
      sort_order: 0,
      seo_title: "",
      seo_description: "",
      reveal_limit_cart_override: "",
      reveal_limit_product_override: "",
    })
    setEditingStore(null)
    setStoreError("")
    setStoreSuccess("")
  }

  // Handle store save to Supabase (upsert by country+store_domain)
  const handleSaveStore = async () => {
    if (savingStore) return // Prevent double submit

    setStoreError("")
    setStoreSuccess("")

    // Validation
    if (!storeFormData.store_domain.trim()) {
      setStoreError("Domene må fylles ut")
      return
    }
    if (!storeFormData.store_name.trim()) {
      setStoreError("Butikknavn må fylles ut")
      return
    }

    setSavingStore(true)

    try {
      const supabase = createClient()
      
      // ALWAYS normalize domain before any operation
      const normalizedDomain = normalizeDomain(storeFormData.store_domain)
      const normalizedCountry = storeFormData.country.toLowerCase()
      
      if (!normalizedDomain || !normalizedDomain.includes(".")) {
        setStoreError("Ugyldig domene. Må være f.eks. 'butikk.no'")
        setSavingStore(false)
        return
      }

      const storeData = {
        country: normalizedCountry,
        store_domain: normalizedDomain,
        store_name: storeFormData.store_name.trim(),
        logo_url: storeFormData.logo_url.trim() || null,
        is_featured: storeFormData.is_featured,
        is_active: true,
        sort_order: storeFormData.sort_order,
        seo_title: storeFormData.seo_title.trim() || null,
        seo_description: storeFormData.seo_description.trim() || null,
        reveal_limit_cart_override: storeFormData.reveal_limit_cart_override
          ? Number.parseInt(storeFormData.reveal_limit_cart_override)
          : null,
        reveal_limit_product_override: storeFormData.reveal_limit_product_override
          ? Number.parseInt(storeFormData.reveal_limit_product_override)
          : null,
        updated_at: new Date().toISOString(),
      }

      if (editingStore) {
        // Update existing by ID
        const { error } = await supabase
          .from("stores")
          .update(storeData)
          .eq("id", editingStore.id)
        
        if (error) throw error
        setStoreSuccess("Butikk oppdatert")
      } else {
        // Upsert: if same (country, store_domain) exists, update it; otherwise insert
        const { error } = await supabase
          .from("stores")
          .upsert(storeData, { onConflict: "country,store_domain" })
        
        if (error) throw error
        setStoreSuccess("Butikk lagret")
      }

      // Reload stores
      await loadStores()
      resetStoreForm()
      setShowStoreForm(false)
    } catch (e) {
      setStoreError(`Feil ved lagring: ${e instanceof Error ? e.message : "Ukjent feil"}`)
    } finally {
      setSavingStore(false)
    }
  }

  // Handle store edit
  const handleEditStore = (store: Store) => {
    setEditingStore(store)
    setStoreFormData({
      country: store.country || "no",
      store_name: store.store_name || "",
      store_domain: store.store_domain || "",
      logo_url: store.logo_url || "",
      is_featured: store.is_featured ?? false,
      sort_order: store.sort_order ?? 0,
      seo_title: store.seo_title || "",
      seo_description: store.seo_description || "",
      reveal_limit_cart_override: store.reveal_limit_cart_override?.toString() || "",
      reveal_limit_product_override: store.reveal_limit_product_override?.toString() || "",
    })
    setShowStoreForm(true)
    setStoreError("")
    setStoreSuccess("")
  }

  // Handle store delete (from Supabase)
  const handleDeleteStore = async (storeId: string) => {
    if (!window.confirm("Er du sikker på at du vil slette denne butikken?")) return
    
    try {
      const supabase = createClient()
      const { error } = await supabase
        .from("stores")
        .delete()
        .eq("id", storeId)
      
      if (error) throw error
      
      setStoreSuccess("Butikk slettet")
      await loadStores()
    } catch (e) {
      setStoreError(`Feil ved sletting: ${e instanceof Error ? e.message : "Ukjent feil"}`)
    }
  }

  // Import existing stores from localStorage to Supabase
  const handleImportStores = async () => {
    if (importingStores) return
    
    setImportingStores(true)
    setStoreError("")
    setStoreSuccess("")
    
    try {
      const storedStores = localStorage.getItem(STORES_KEY)
      if (!storedStores) {
        setStoreError("Ingen butikker funnet i localStorage")
        setImportingStores(false)
        return
      }
      
      const oldStores = JSON.parse(storedStores) as Record<string, unknown>[]
      if (oldStores.length === 0) {
        setStoreError("Ingen butikker å importere")
        setImportingStores(false)
        return
      }
      
      const supabase = createClient()
      let newCount = 0
      let updatedCount = 0
      
      for (const s of oldStores) {
        const storeData = {
          country: ((s.country_code as string) || "NO").toLowerCase(),
          store_domain: normalizeDomain((s.domain as string) || (s.store_domain as string) || ""),
          store_name: (s.name as string) || (s.store_name as string) || "",
          logo_url: (s.logo_url as string) || null,
          is_featured: s.is_featured === true,
          is_active: s.is_active !== false,
          sort_order: (s.sort_order as number) || 0,
          seo_title: (s.seo_title as string) || null,
          seo_description: (s.seo_description as string) || null,
          reveal_limit_cart_override: (s.reveal_cart_limit_override as number) ?? (s.reveal_limit_cart_override as number) ?? null,
          reveal_limit_product_override: (s.reveal_product_limit_override as number) ?? (s.reveal_limit_product_override as number) ?? null,
          updated_at: new Date().toISOString(),
        }
        
        if (!storeData.store_domain || !storeData.store_domain.includes(".")) {
          continue // Skip invalid entries
        }
        
        // Check if exists
        const { data: existing } = await supabase
          .from("stores")
          .select("id")
          .eq("country", storeData.country)
          .eq("store_domain", storeData.store_domain)
          .maybeSingle()
        
        if (existing) {
          // Update
          await supabase
            .from("stores")
            .update(storeData)
            .eq("id", existing.id)
          updatedCount++
        } else {
          // Insert
          await supabase
            .from("stores")
            .insert(storeData)
          newCount++
        }
      }
      
      setStoreSuccess(`Import fullført: ${newCount} nye / ${updatedCount} oppdatert`)
      await loadStores()
    } catch (e) {
      setStoreError(`Feil ved import: ${e instanceof Error ? e.message : "Ukjent feil"}`)
    } finally {
      setImportingStores(false)
    }
  }

  // Cancel store form
  const handleCancelStoreForm = () => {
    resetStoreForm()
    setShowStoreForm(false)
  }

  // Reset partner form
  const resetPartnerForm = () => {
    setPartnerFormData({
      country: "no",
      store_name: "",
      store_domain: "",
      code: "",
      discount_text: "",
      free_shipping: false,
      partner_url: "",
      logo_url: "",
      description: "",
      sort_order: 0,
      is_active: true,
      is_featured: false,
    })
    setEditingPartner(null)
    setPartnerError("")
    setPartnerSuccess("")
  }

  // Handle partner code save (to Supabase)
  const handleSavePartner = async () => {
    if (savingPartner) return

    setPartnerError("")
    setPartnerSuccess("")

    if (!partnerFormData.store_name.trim()) {
      setPartnerError("Butikknavn må fylles ut")
      return
    }
    if (!partnerFormData.partner_url.trim()) {
      setPartnerError("Partner URL må fylles ut")
      return
    }

    setSavingPartner(true)

    try {
      const supabase = createClient()
      
      const partnerData = {
        country: partnerFormData.country.toLowerCase(),
        store_name: partnerFormData.store_name.trim(),
        store_domain: normalizeDomain(partnerFormData.store_domain.trim() || partnerFormData.store_name.trim()),
        code: partnerFormData.code.trim() || null,
        discount_text: partnerFormData.discount_text.trim() || null,
        free_shipping: partnerFormData.free_shipping,
        partner_url: partnerFormData.partner_url.trim(),
        logo_url: partnerFormData.logo_url.trim() || null,
        description: partnerFormData.description.trim() || null,
        sort_order: partnerFormData.sort_order,
        is_active: partnerFormData.is_active,
        is_featured: partnerFormData.is_featured,
        updated_at: new Date().toISOString(),
      }

      if (editingPartner) {
        // Update existing
        const { error } = await supabase
          .from("partner_codes")
          .update(partnerData)
          .eq("id", editingPartner.id)
        
        if (error) throw error
        setPartnerSuccess("Partnerkode oppdatert")
      } else {
        // Insert new
        const { error } = await supabase
          .from("partner_codes")
          .insert(partnerData)
        
        if (error) throw error
        setPartnerSuccess("Partnerkode lagret")
      }

      // Reload partner codes
      await loadPartnerCodes()
      resetPartnerForm()
      setShowPartnerForm(false)
    } catch (e) {
      setPartnerError(`Feil ved lagring: ${e instanceof Error ? e.message : "Ukjent feil"}`)
    } finally {
      setSavingPartner(false)
    }
  }

  // Handle partner edit
  const handleEditPartner = (partner: PartnerCode) => {
    setEditingPartner(partner)
    setPartnerFormData({
      country: partner.country,
      store_name: partner.store_name,
      store_domain: partner.store_domain,
      code: partner.code || "",
      discount_text: partner.discount_text || "",
      free_shipping: partner.free_shipping,
      partner_url: partner.partner_url,
      logo_url: partner.logo_url || "",
      description: partner.description || "",
      sort_order: partner.sort_order,
      is_active: partner.is_active,
      is_featured: partner.is_featured,
    })
    setShowPartnerForm(true)
    setPartnerError("")
    setPartnerSuccess("")
  }

  // Handle partner delete (from Supabase)
  const handleDeletePartner = async (partnerId: string) => {
    if (!window.confirm("Er du sikker på at du vil slette denne partnerkoden?")) return
    
    try {
      const supabase = createClient()
      const { error } = await supabase
        .from("partner_codes")
        .delete()
        .eq("id", partnerId)
      
      if (error) throw error
      
      setPartnerSuccess("Partnerkode slettet")
      await loadPartnerCodes()
    } catch (e) {
      setPartnerError(`Feil ved sletting: ${e instanceof Error ? e.message : "Ukjent feil"}`)
    }
  }

  // Reset SEO form
  const resetSeoForm = () => {
    setSeoFormData({
      country_code: "NO",
      store_slug: "",
      seo_title: "",
      seo_description: "",
      seo_body: "",
    })
    setEditingSeoPage(null)
    setSeoError("")
    setSeoSuccess("")
  }

  // Handle SEO save
  const handleSaveSeoPage = async () => {
    if (savingSeoPage) return

    setSeoError("")
    setSeoSuccess("")

    if (!seoFormData.store_slug.trim()) {
      setSeoError("Butikk-slug må fylles ut")
      return
    }
    if (!seoFormData.seo_title.trim()) {
      setSeoError("SEO-tittel må fylles ut")
      return
    }

    setSavingSeoPage(true)

    try {
      const seoData: SeoPage = {
        id: editingSeoPage?.id || generateId(),
        country_code: seoFormData.country_code,
        store_slug: seoFormData.store_slug.trim(),
        seo_title: seoFormData.seo_title.trim(),
        seo_description: seoFormData.seo_description.trim(),
        seo_body: seoFormData.seo_body.trim(),
      }

      let newSeoPages: SeoPage[]
      if (editingSeoPage) {
        newSeoPages = seoPages.map((p) => (p.id === editingSeoPage.id ? seoData : p))
      } else {
        newSeoPages = [...seoPages, seoData]
      }

      setSeoPages(newSeoPages)
      saveSeoToStorage(newSeoPages)
      setSeoSuccess(editingSeoPage ? "SEO-side oppdatert" : "SEO-side lagret")
      resetSeoForm()
      setShowSeoForm(false)
    } catch (e) {
      setSeoError(`Feil ved lagring: ${e instanceof Error ? e.message : "Ukjent feil"}`)
    } finally {
      setSavingSeoPage(false)
    }
  }

  // Handle SEO edit
  const handleEditSeoPage = (page: SeoPage) => {
    setEditingSeoPage(page)
    setSeoFormData({
      country_code: page.country_code,
      store_slug: page.store_slug,
      seo_title: page.seo_title,
      seo_description: page.seo_description,
      seo_body: page.seo_body,
    })
    setShowSeoForm(true)
    setSeoError("")
    setSeoSuccess("")
  }

  // Handle SEO delete
  const handleDeleteSeoPage = (pageId: string) => {
    if (!window.confirm("Er du sikker på at du vil slette denne SEO-siden?")) return
    const newSeoPages = seoPages.filter((p) => p.id !== pageId)
    setSeoPages(newSeoPages)
    saveSeoToStorage(newSeoPages)
    setSeoSuccess("SEO-side slettet")
  }

  // Reset code form
  const resetCodeForm = () => {
    setCodeFormData({
      country: "NO",
      store_domain: "",
      code: "",
      coupon_code: "",
      benefit_type: "percent_off",
      scope: "cart",
      value_percent: "",
      value_amount: "",
      currency: "NOK",
      min_purchase_amount: "",
      applies_to_product: "",
      tested_products_count: "1",
      is_visible_to_users: true,
    })
    setEditingCode(null)
    setPublishError("")
    setPublishSuccess("")
  }

  // Handle code save (manual form)
  const handleSaveCode = async (publish: boolean = false) => {
    if (savingCode) return

    setPublishError("")
    setPublishSuccess("")

    // Validation
    if (!codeFormData.store_domain) {
      setPublishError("Velg en butikk")
      return
    }
    // coupon_code is REQUIRED for all published codes
    const couponCodeTrimmed = codeFormData.coupon_code.trim()
    if (!couponCodeTrimmed) {
      setPublishError("Rabattkode må fylles ut (påkrevd for alle synlige koder)")
      return
    }
    if (codeFormData.benefit_type === "percent_off" && !codeFormData.value_percent) {
      setPublishError("Prosentverdi må fylles ut")
      return
    }
    if (codeFormData.benefit_type === "amount_off" && !codeFormData.value_amount) {
      setPublishError("Beløpsverdi må fylles ut")
      return
    }

    setSavingCode(true)

    try {
      // coupon_code is what user sees (REQUIRED); code is internal identifier
      const couponCode = couponCodeTrimmed.toUpperCase()
      
      // ALWAYS normalize store_domain - it comes from dropdown (already normalized) but double-check
      const normalizedStoreDomain = normalizeDomain(codeFormData.store_domain)
      
      const newCode: PublishedCode = {
        id: editingCode?.id || generateId(),
        country: codeFormData.country,
        store_domain: normalizedStoreDomain, // ALWAYS use normalized domain
        code: codeFormData.code.trim().toUpperCase() || generateId(), // internal ID
        coupon_code: couponCode, // always non-empty string
        benefit_type: codeFormData.benefit_type,
        scope: codeFormData.scope,
        value_percent: codeFormData.value_percent ? Number(codeFormData.value_percent) : undefined,
        value_amount: codeFormData.value_amount ? Number(codeFormData.value_amount) : undefined,
        currency: codeFormData.currency || "NOK",
        min_purchase_amount: codeFormData.min_purchase_amount ? Number(codeFormData.min_purchase_amount) : undefined,
        applies_to_product: codeFormData.applies_to_product || undefined,
        tested_products_count: Number(codeFormData.tested_products_count) || 1,
        is_visible_to_users: publish ? codeFormData.is_visible_to_users : false,
        created_at: editingCode?.created_at || new Date().toISOString(),
      }

      let newCodes: PublishedCode[]
      if (editingCode) {
        newCodes = publishedCodes.map((c) => (c.id === editingCode.id ? newCode : c))
      } else {
        newCodes = [...publishedCodes, newCode]
      }

      setPublishedCodes(newCodes)
      saveCodesToStorage(newCodes)

      const action = editingCode ? "oppdatert" : "lagret"
      const visibility = publish ? " og publisert" : " (ikke synlig ennå)"
      setPublishSuccess(`Rabattkode ${action}${visibility}`)
      resetCodeForm()
      setShowCodeForm(false)
    } catch (e) {
      setPublishError(`Feil ved lagring: ${e instanceof Error ? e.message : "Ukjent feil"}`)
    } finally {
      setSavingCode(false)
    }
  }

  // Handle code edit
  const handleEditCode = (code: PublishedCode) => {
    setEditingCode(code)
    setCodeFormData({
      country: code.country,
      store_domain: code.store_domain,
      code: code.code,
      coupon_code: code.coupon_code || "",
      benefit_type: code.benefit_type,
      scope: code.scope,
      value_percent: code.value_percent?.toString() || "",
      value_amount: code.value_amount?.toString() || "",
      currency: code.currency || "NOK",
      min_purchase_amount: code.min_purchase_amount?.toString() || "",
      applies_to_product: code.applies_to_product || "",
      tested_products_count: code.tested_products_count?.toString() || "1",
      is_visible_to_users: code.is_visible_to_users,
    })
    setShowCodeForm(true)
    setPublishError("")
    setPublishSuccess("")
  }

  // Handle code delete
  const handleDeleteCode = (codeId: string) => {
    if (!window.confirm("Er du sikker på at du vil slette denne rabattkoden?")) return
    const newCodes = publishedCodes.filter((c) => c.id !== codeId)
    setPublishedCodes(newCodes)
    saveCodesToStorage(newCodes)
    setPublishSuccess("Rabattkode slettet")
  }

  // Handle start job
  const handleStartJob = async () => {
    if (startingJob) return // Prevent double-click

    setJobError("")
    setJobSuccess("")

    if (!selectedJobDomain.trim()) {
      setJobError("Velg en butikk før du starter en jobb")
      return
    }

    setStartingJob(true)

    try {
      const newJob: Job = {
        id: generateId(),
        store_domain: selectedJobDomain,
        status: "pending",
        created_at: new Date().toISOString(),
      }

      const newJobs = [...jobs, newJob]
      setJobs(newJobs)
      saveJobsToStorage(newJobs)

      setJobSuccess(`Jobb startet for ${selectedJobDomain} (prototype-modus)`)
      setSelectedJobDomain("")

      // Log analytics event
      console.log("[Dealtested] Event: job_started", { store_domain: newJob.store_domain })
    } catch (e) {
      setJobError(`Feil ved oppstart av jobb: ${e instanceof Error ? e.message : "Ukjent feil"}`)
    } finally {
      setStartingJob(false)
    }
  }

  // Handle publish codes
  const handlePublishCodes = async () => {
    if (publishingCodes) return // Prevent double-click

    setPublishError("")
    setPublishSuccess("")

    if (!codesJsonInput.trim()) {
      setPublishError("Lim inn JSON-data før du publiserer")
      return
    }

    setPublishingCodes(true)

    try {
      // Parse JSON
      let parsedData: {
        country?: string
        store_domain?: string
        codes?: Array<{
          code?: string
          coupon_code?: string
          benefit_type: "percent_off" | "amount_off" | "free_shipping"
          scope?: "cart" | "product"
          value_percent?: number
          value_amount?: number
          currency?: string
          min_purchase_amount?: number
          applies_to_product?: string
          tested_products_count?: number
          is_visible_to_users?: boolean
        }>
      }

      try {
        parsedData = JSON.parse(codesJsonInput)
      } catch {
        setPublishError("Ugyldig JSON-format. Sjekk syntaksen og prøv igjen.")
        setPublishingCodes(false)
        return
      }

      // Validate required fields
      if (!parsedData.country) {
        setPublishError("Mangler felt: country (f.eks. 'NO' eller 'UK')")
        setPublishingCodes(false)
        return
      }

      if (!parsedData.store_domain) {
        setPublishError("Mangler felt: store_domain (f.eks. 'elkjop.no')")
        setPublishingCodes(false)
        return
      }

      if (!parsedData.codes || !Array.isArray(parsedData.codes) || parsedData.codes.length === 0) {
        setPublishError("Mangler felt: codes (må være en ikke-tom array)")
        setPublishingCodes(false)
        return
      }

      // Convert to PublishedCode format
      // Support both "code" and "coupon_code" fields - coupon_code takes precedence
      // FILTER OUT any codes without a valid coupon_code
      // ALWAYS normalize store_domain
      const normalizedStoreDomain = normalizeDomain(parsedData.store_domain!)
      
      const totalCodes = parsedData.codes.length
      const validCodes = parsedData.codes.filter((c) => {
        const couponCode = (c.coupon_code || c.code || "").trim()
        return couponCode.length > 0
      })
      const skippedCount = totalCodes - validCodes.length
      
      const newCodes: PublishedCode[] = validCodes.map((c) => {
        const couponCode = (c.coupon_code || c.code || "").trim().toUpperCase()
        return {
          id: generateId(),
          country: parsedData.country!,
          store_domain: normalizedStoreDomain, // ALWAYS use normalized domain
          code: c.code || generateId(), // internal ID
          coupon_code: couponCode, // guaranteed non-empty
          benefit_type: c.benefit_type,
          scope: c.scope || "cart",
          value_percent: c.value_percent,
          value_amount: c.value_amount,
          currency: c.currency,
          min_purchase_amount: c.min_purchase_amount,
          applies_to_product: c.applies_to_product,
          tested_products_count: c.tested_products_count,
          is_visible_to_users: c.is_visible_to_users ?? true,
          created_at: new Date().toISOString(),
        }
      })

      // Remove old codes for this store_domain and add new ones (match normalized)
      const filteredCodes = publishedCodes.filter((c) => normalizeDomain(c.store_domain) !== normalizedStoreDomain)
      const allCodes = [...filteredCodes, ...newCodes]

      setPublishedCodes(allCodes)
      saveCodesToStorage(allCodes)

      // Mark related jobs as done
      const updatedJobs = jobs.map((j) =>
        j.store_domain === parsedData.store_domain && j.status === "pending" ? { ...j, status: "done" as const } : j
      )
      setJobs(updatedJobs)
      saveJobsToStorage(updatedJobs)

      // Show summary with skipped count
      const skippedMsg = skippedCount > 0 ? `. Skippet ${skippedCount} uten rabattkode.` : ""
      setPublishSuccess(`Publisert ${newCodes.length} koder for ${parsedData.store_domain}${skippedMsg}`)
      setCodesJsonInput("")

      // Log analytics event
      console.log("[Dealtested] Event: codes_published", {
        store_domain: parsedData.store_domain,
        count: newCodes.length,
      })
    } catch (e) {
      setPublishError(`Feil ved publisering: ${e instanceof Error ? e.message : "Ukjent feil"}`)
    } finally {
      setPublishingCodes(false)
    }
  }

  if (!mounted) {
    return (
      <div className="p-8 text-center text-neutral-500">
        Laster administrasjonspanel...
      </div>
    )
  }

  return (
    <TooltipProvider>
      <div>
        {/* Dashboard stats */}
        <div className="grid grid-cols-4 gap-4 mb-6">
        <Card className="p-4 text-center">
          <div className="text-3xl font-bold text-green-600">{stores.length}</div>
          <div className="text-sm text-neutral-600">Butikker</div>
        </Card>
        <Card className="p-4 text-center">
          <div className="text-3xl font-bold text-blue-600">{partnerCodes.length}</div>
          <div className="text-sm text-neutral-600">Partnerkoder</div>
        </Card>
        <Card className="p-4 text-center">
          <div className="text-3xl font-bold text-orange-600">{publishedCodes.length}</div>
          <div className="text-sm text-neutral-600">Verifiserte koder</div>
        </Card>
        <Card className="p-4 text-center">
          <div className="text-3xl font-bold text-purple-600">{seoPages.length}</div>
          <div className="text-sm text-neutral-600">SEO-sider</div>
        </Card>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="grid w-full grid-cols-5 bg-neutral-200">
<TabsTrigger value="stores">Butikker</TabsTrigger>
            <TabsTrigger value="affiliate">Partnerkoder</TabsTrigger>
            <TabsTrigger value="codes">Koder</TabsTrigger>
            <TabsTrigger value="seo">SEO</TabsTrigger>
            <TabsTrigger value="analytics">Analyse</TabsTrigger>
            <TabsTrigger value="settings">Innstillinger</TabsTrigger>
        </TabsList>

        {/* Stores Tab - Uses Supabase */}
        <TabsContent value="stores" className="space-y-4 mt-4">
          <div className="flex justify-between items-center">
            <h3 className="font-semibold text-lg">Butikker</h3>
            <div className="flex gap-2">
              <Button
                onClick={handleImportStores}
                disabled={importingStores}
                variant="outline"
                className="bg-transparent border-orange-400 text-orange-600 hover:bg-orange-50"
              >
                {importingStores ? "Importerer..." : "Importer eksisterende butikker"}
              </Button>
              <Button
                onClick={() => {
                  resetStoreForm()
                  setShowStoreForm(!showStoreForm)
                }}
                className="bg-green-600 hover:bg-green-700"
              >
                Legg til butikk
              </Button>
            </div>
          </div>

          {storeSuccess && (
            <div className="p-3 bg-green-100 border border-green-300 text-green-800 rounded">
              {storeSuccess}
            </div>
          )}

          {storeError && (
            <div className="p-3 bg-red-100 border border-red-300 text-red-800 rounded">
              {storeError}
            </div>
          )}

          {showStoreForm && (
            <Card className="p-6 space-y-4 bg-neutral-100">
              <h4 className="font-semibold">{editingStore ? "Rediger butikk" : "Ny butikk"}</h4>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium mb-1">Land *</label>
                  <select
                    value={storeFormData.country}
                    onChange={(e) => setStoreFormData({ ...storeFormData, country: e.target.value })}
                    className="w-full px-3 py-2 border rounded"
                  >
                    <option value="no">Norge (no)</option>
                    <option value="uk">Storbritannia (uk)</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">Butikknavn *</label>
                  <Input
                    placeholder="F.eks. Elkjøp"
                    value={storeFormData.store_name ?? ""}
                    onChange={(e) => setStoreFormData({ ...storeFormData, store_name: e.target.value })}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">Domene *</label>
                  <Input
                    placeholder="F.eks. elkjop.no"
                    value={storeFormData.store_domain ?? ""}
                    onChange={(e) => setStoreFormData({ ...storeFormData, store_domain: e.target.value })}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">Logo URL</label>
                  <Input
                    placeholder="https://..."
                    value={storeFormData.logo_url ?? ""}
                    onChange={(e) => setStoreFormData({ ...storeFormData, logo_url: e.target.value })}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">Rekkefølge (sort_order)</label>
                  <Input
                    type="number"
                    placeholder="0"
                    value={storeFormData.sort_order}
                    onChange={(e) => setStoreFormData({ ...storeFormData, sort_order: parseInt(e.target.value) || 0 })}
                  />
                </div>
                
                {/* SEO fields */}
                <div className="col-span-2 border-t pt-4 mt-2">
                  <p className="text-sm text-neutral-500 mb-3">SEO (valgfritt)</p>
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">SEO tittel</label>
                  <Input
                    placeholder="Tilpasset sidetittel"
                    value={storeFormData.seo_title ?? ""}
                    onChange={(e) => setStoreFormData({ ...storeFormData, seo_title: e.target.value })}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">SEO beskrivelse</label>
                  <Input
                    placeholder="Meta-beskrivelse"
                    value={storeFormData.seo_description ?? ""}
                    onChange={(e) => setStoreFormData({ ...storeFormData, seo_description: e.target.value })}
                  />
                </div>
                
                {/* Reveal limits overrides */}
                <div className="col-span-2 border-t pt-4 mt-2">
                  <p className="text-sm text-neutral-500 mb-3">
                    Overstyringer (valgfritt) - tom = bruk landstandard
                  </p>
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">Overstyr: antall vanlige koder</label>
                  <Input
                    type="number"
                    placeholder="Standard fra land"
                    value={storeFormData.reveal_limit_cart_override ?? ""}
                    onChange={(e) => setStoreFormData({ ...storeFormData, reveal_limit_cart_override: e.target.value })}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">Overstyr: antall produktkoder</label>
                  <Input
                    type="number"
                    placeholder="Standard fra land"
                    value={storeFormData.reveal_limit_product_override ?? ""}
                    onChange={(e) => setStoreFormData({ ...storeFormData, reveal_limit_product_override: e.target.value })}
                    min={0}
                    max={20}
                  />
                </div>
                
                <div>
                  <label className="flex items-center gap-2 mt-6">
                    <input
                      type="checkbox"
                      checked={storeFormData.is_featured}
                      onChange={(e) => setStoreFormData({ ...storeFormData, is_featured: e.target.checked })}
                    />
                    Fremhevet på forsiden
                  </label>
                </div>
              </div>
              <div className="flex gap-2 pt-4">
                <Button
                  onClick={handleSaveStore}
                  disabled={savingStore}
                  className="flex-1 bg-green-600 hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {savingStore ? "Lagrer..." : editingStore ? "Lagre endringer" : "Lagre butikk"}
                </Button>
                <Button onClick={handleCancelStoreForm} variant="outline" className="flex-1 bg-transparent">
                  Avbryt
                </Button>
              </div>
            </Card>
          )}

          {stores.length === 0 ? (
            <Card className="p-6 text-center text-neutral-500">
              Ingen butikker lagt til ennå. Klikk "Legg til butikk" for å starte.
            </Card>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="border-b bg-neutral-50">
                  <tr>
                    <th className="text-left py-3 px-3 font-semibold">Navn</th>
                    <th className="text-left py-3 px-3 font-semibold">Domene</th>
                    <th className="text-left py-3 px-3 font-semibold">Land</th>
                    <th className="text-left py-3 px-3 font-semibold">Effektiv: vanlige</th>
                    <th className="text-left py-3 px-3 font-semibold">Effektiv: produkt</th>
                    <th className="text-left py-3 px-3 font-semibold">Fremhevet</th>
                    <th className="text-left py-3 px-3 font-semibold">Handlinger</th>
                  </tr>
                </thead>
                <tbody>
                  {stores.map((store) => {
                    const limits = getEffectiveLimits(store)
                    const hasCartOverride = store.reveal_limit_cart_override !== null
                    const hasProductOverride = store.reveal_limit_product_override !== null
                    return (
                      <tr key={store.id} className="border-b hover:bg-neutral-50">
                        <td className="py-3 px-3 font-medium">{store.store_name}</td>
                        <td className="py-3 px-3 text-neutral-600">{store.store_domain}</td>
                        <td className="py-3 px-3">{store.country}</td>
                        <td className="py-3 px-3">
                          <span className={hasCartOverride ? "text-blue-600 font-medium" : "text-neutral-500"}>
                            {limits.cartLimit}
                          </span>
                          {hasCartOverride && <span className="text-xs ml-1 text-blue-500">*</span>}
                        </td>
                        <td className="py-3 px-3">
                          <span className={hasProductOverride ? "text-blue-600 font-medium" : "text-neutral-500"}>
                            {limits.productLimit}
                          </span>
                          {hasProductOverride && <span className="text-xs ml-1 text-blue-500">*</span>}
                        </td>
                        <td className="py-3 px-3 font-mono text-sm">
                          {store.is_featured === true ? (
                            <span className="text-green-600 font-semibold">true</span>
                          ) : (
                            <span className="text-neutral-400">false</span>
                          )}
                        </td>
                        <td className="py-3 px-3">
                          <div className="flex gap-2">
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => handleEditStore(store)}
                              className="bg-transparent hover:bg-blue-50 text-blue-600 border-blue-300"
                            >
                              Rediger
                            </Button>
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => handleDeleteStore(store.id)}
                              className="bg-transparent hover:bg-red-50 text-red-600 border-red-300"
                            >
                              Slett
                            </Button>
                          </div>
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          )}
        </TabsContent>

        {/* Partnerkoder Tab - Uses Supabase */}
        <TabsContent value="affiliate" className="space-y-4 mt-4">
          <div className="flex justify-between items-center">
            <h3 className="font-semibold text-lg">Partnerkoder (gratis tilbud)</h3>
            <Button
              onClick={() => {
                resetPartnerForm()
                setShowPartnerForm(!showPartnerForm)
              }}
              className="bg-green-600 hover:bg-green-700"
            >
              Legg til partnerkode
            </Button>
          </div>

          {partnerSuccess && (
            <div className="p-3 bg-green-100 border border-green-300 text-green-800 rounded">
              {partnerSuccess}
            </div>
          )}

          {partnerError && (
            <div className="p-3 bg-red-100 border border-red-300 text-red-800 rounded">
              {partnerError}
            </div>
          )}

          {showPartnerForm && (
            <Card className="p-6 space-y-4 bg-neutral-100">
              <h4 className="font-semibold">{editingPartner ? "Rediger partnerkode" : "Ny partnerkode"}</h4>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium mb-1">Land</label>
                  <select
                    value={partnerFormData.country}
                    onChange={(e) => setPartnerFormData({ ...partnerFormData, country: e.target.value })}
                    className="w-full px-3 py-2 border rounded"
                  >
                    <option value="no">Norge (no)</option>
                    <option value="uk">Storbritannia (uk)</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">Butikknavn *</label>
                  <Input
                    placeholder="F.eks. Elkjøp"
                    value={partnerFormData.store_name}
                    onChange={(e) => setPartnerFormData({ ...partnerFormData, store_name: e.target.value })}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">Butikkdomene</label>
                  <Input
                    placeholder="F.eks. elkjop.no"
                    value={partnerFormData.store_domain}
                    onChange={(e) => setPartnerFormData({ ...partnerFormData, store_domain: e.target.value })}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">Rabatttekst</label>
                  <Input
                    placeholder="F.eks. 10% rabatt"
                    value={partnerFormData.discount_text}
                    onChange={(e) => setPartnerFormData({ ...partnerFormData, discount_text: e.target.value })}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">Rabattkode</label>
                  <Input
                    placeholder="F.eks. SPAR10"
                    value={partnerFormData.code}
                    onChange={(e) => setPartnerFormData({ ...partnerFormData, code: e.target.value })}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">Rekkefølge (sort_order)</label>
                  <Input
                    type="number"
                    placeholder="0"
                    value={partnerFormData.sort_order}
                    onChange={(e) => setPartnerFormData({ ...partnerFormData, sort_order: parseInt(e.target.value) || 0 })}
                  />
                </div>
                <div className="col-span-2">
                  <label className="block text-sm font-medium mb-1">Partner URL *</label>
                  <Input
                    placeholder="https://partner.example.com/..."
                    value={partnerFormData.partner_url}
                    onChange={(e) => setPartnerFormData({ ...partnerFormData, partner_url: e.target.value })}
                  />
                </div>
                <div className="col-span-2">
                  <label className="block text-sm font-medium mb-1">Logo URL</label>
                  <Input
                    placeholder="https://example.com/logo.png"
                    value={partnerFormData.logo_url}
                    onChange={(e) => setPartnerFormData({ ...partnerFormData, logo_url: e.target.value })}
                  />
                </div>
                <div className="col-span-2">
                  <label className="block text-sm font-medium mb-1">Beskrivelse</label>
                  <Input
                    placeholder="F.eks. Gjelder alle varer"
                    value={partnerFormData.description}
                    onChange={(e) => setPartnerFormData({ ...partnerFormData, description: e.target.value })}
                  />
                </div>
                <div>
                  <label className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      checked={partnerFormData.free_shipping}
                      onChange={(e) => setPartnerFormData({ ...partnerFormData, free_shipping: e.target.checked })}
                    />
                    Gratis frakt
                  </label>
                </div>
                <div>
                  <label className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      checked={partnerFormData.is_active}
                      onChange={(e) => setPartnerFormData({ ...partnerFormData, is_active: e.target.checked })}
                    />
                    Aktiv
                  </label>
                </div>
                <div>
                  <label className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      checked={partnerFormData.is_featured}
                      onChange={(e) => setPartnerFormData({ ...partnerFormData, is_featured: e.target.checked })}
                    />
                    Fremhevet på forsiden
                  </label>
                </div>
              </div>
              <div className="flex gap-2 pt-4">
                <Button
                  onClick={handleSavePartner}
                  disabled={savingPartner}
                  className="flex-1 bg-green-600 hover:bg-green-700 disabled:opacity-50"
                >
                  {savingPartner ? "Lagrer..." : editingPartner ? "Lagre endringer" : "Lagre partnerkode"}
                </Button>
                <Button
                  onClick={() => {
                    resetPartnerForm()
                    setShowPartnerForm(false)
                  }}
                  variant="outline"
                  className="flex-1 bg-transparent"
                >
                  Avbryt
                </Button>
              </div>
            </Card>
          )}

          {partnerCodes.length === 0 ? (
            <Card className="p-6 text-center text-neutral-500">
              Ingen partnerkoder lagt til ennå.
            </Card>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="border-b bg-neutral-50">
                  <tr>
                    <th className="text-left py-3 px-3 font-semibold">Land</th>
                    <th className="text-left py-3 px-3 font-semibold">Butikk</th>
                    <th className="text-left py-3 px-3 font-semibold">Rabatt</th>
                    <th className="text-left py-3 px-3 font-semibold">Kode</th>
                    <th className="text-left py-3 px-3 font-semibold">Rekkefølge</th>
                    <th className="text-left py-3 px-3 font-semibold">Aktiv</th>
                    <th className="text-left py-3 px-3 font-semibold">Fremhevet</th>
                    <th className="text-left py-3 px-3 font-semibold">Handlinger</th>
                  </tr>
                </thead>
                <tbody>
                  {partnerCodes.map((partner) => (
                    <tr key={partner.id} className="border-b hover:bg-neutral-50">
                      <td className="py-3 px-3 uppercase font-mono text-xs">{partner.country}</td>
                      <td className="py-3 px-3 font-medium">{partner.store_name}</td>
                      <td className="py-3 px-3">
                        {partner.discount_text || (partner.free_shipping ? "Gratis frakt" : "-")}
                      </td>
                      <td className="py-3 px-3 font-mono">{partner.code || "-"}</td>
                      <td className="py-3 px-3">{partner.sort_order}</td>
                      <td className="py-3 px-3">{partner.is_active ? "Ja" : "Nei"}</td>
                      <td className="py-3 px-3">{partner.is_featured ? "Ja" : "Nei"}</td>
                      <td className="py-3 px-3">
                        <div className="flex gap-2">
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => handleEditPartner(partner)}
                            className="bg-transparent hover:bg-blue-50 text-blue-600 border-blue-300"
                          >
                            Rediger
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => handleDeletePartner(partner.id)}
                            className="bg-transparent hover:bg-red-50 text-red-600 border-red-300"
                          >
                            Slett
                          </Button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </TabsContent>

        {/* Codes Tab */}
        <TabsContent value="codes" className="space-y-4 mt-4">
          <div className="flex justify-between items-center">
            <h3 className="font-semibold text-lg">Verifiserte rabattkoder</h3>
            <Button
              onClick={() => {
                resetCodeForm()
                setShowCodeForm(!showCodeForm)
              }}
              className="bg-green-600 hover:bg-green-700"
            >
              Legg til rabattkode
            </Button>
          </div>

          {/* Success/Error messages */}
          {publishSuccess && (
            <div className="p-3 bg-green-100 border border-green-300 text-green-800 rounded">
              {publishSuccess}
            </div>
          )}
          {publishError && (
            <div className="p-3 bg-red-100 border border-red-300 text-red-800 rounded">
              {publishError}
            </div>
          )}

          {/* Manual Code Form */}
          {showCodeForm && (
            <Card className="p-6 space-y-4 bg-neutral-100">
              <h4 className="font-semibold">{editingCode ? "Rediger rabattkode" : "Ny rabattkode"}</h4>
              
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium mb-1">Land *</label>
                  <select
                    className="w-full px-3 py-2 border rounded"
                    value={codeFormData.country}
                    onChange={(e) => setCodeFormData({ ...codeFormData, country: e.target.value })}
                  >
                    <option value="NO">Norge (NO)</option>
                    <option value="UK">Storbritannia (UK)</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">Butikk *</label>
                  <select
                    className="w-full px-3 py-2 border rounded"
                    value={codeFormData.store_domain}
                    onChange={(e) => setCodeFormData({ ...codeFormData, store_domain: e.target.value })}
                  >
                    <option value="">Velg butikk...</option>
                    {stores
                      .filter((s) => s.country === codeFormData.country.toLowerCase() && s.is_active !== false)
                      .sort((a, b) => a.store_name.localeCompare(b.store_name))
                      .map((store) => (
                        <option key={store.id} value={store.store_domain}>
                          {store.store_name} ({store.store_domain})
                        </option>
                      ))}
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium mb-1">Intern ID (valgfritt)</label>
                <Input
                  value={codeFormData.code}
                  onChange={(e) => setCodeFormData({ ...codeFormData, code: e.target.value.toUpperCase() })}
                  placeholder="Genereres automatisk om tom"
                  className="font-mono text-xs"
                />
                <p className="text-xs text-neutral-500 mt-1">Brukes kun internt for sporingsformål</p>
              </div>

<div>
  <label className="block text-sm font-medium mb-1">Rabattkode *</label>
  <Input
  value={codeFormData.coupon_code}
  onChange={(e) => setCodeFormData({ ...codeFormData, coupon_code: e.target.value.toUpperCase() })}
  placeholder="F.eks. SPAR10"
  className="font-mono"
  required
                />
                <p className="text-xs text-neutral-500 mt-1">Koden brukeren skal taste inn. Påkrevd for alle synlige rabattkoder.</p>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium mb-1">Rabatt-type *</label>
                  <select
                    className="w-full px-3 py-2 border rounded"
                    value={codeFormData.benefit_type}
                    onChange={(e) => setCodeFormData({ 
                      ...codeFormData, 
                      benefit_type: e.target.value as "percent_off" | "amount_off" | "free_shipping" 
                    })}
                  >
                    <option value="percent_off">Prosent rabatt</option>
                    <option value="amount_off">Beløpsrabatt</option>
                    <option value="free_shipping">Gratis frakt</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">Gjelder for</label>
                  <select
                    className="w-full px-3 py-2 border rounded"
                    value={codeFormData.scope}
                    onChange={(e) => setCodeFormData({ 
                      ...codeFormData, 
                      scope: e.target.value as "cart" | "product" 
                    })}
                  >
                    <option value="cart">Hele handlekurven</option>
                    <option value="product">Produkt</option>
                  </select>
                </div>
              </div>

              {codeFormData.benefit_type === "percent_off" && (
                <div>
                  <label className="block text-sm font-medium mb-1">Rabattverdi (%) *</label>
                  <Input
                    type="number"
                    min="1"
                    max="100"
                    value={codeFormData.value_percent}
                    onChange={(e) => setCodeFormData({ ...codeFormData, value_percent: e.target.value })}
                    placeholder="F.eks. 10"
                  />
                </div>
              )}

              {codeFormData.benefit_type === "amount_off" && (
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium mb-1">Beløp *</label>
                    <Input
                      type="number"
                      min="1"
                      value={codeFormData.value_amount}
                      onChange={(e) => setCodeFormData({ ...codeFormData, value_amount: e.target.value })}
                      placeholder="F.eks. 100"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-1">Valuta</label>
                    <select
                      className="w-full px-3 py-2 border rounded"
                      value={codeFormData.currency}
                      onChange={(e) => setCodeFormData({ ...codeFormData, currency: e.target.value })}
                    >
                      <option value="NOK">NOK</option>
                      <option value="GBP">GBP</option>
                      <option value="EUR">EUR</option>
                    </select>
                  </div>
                </div>
              )}

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium mb-1">Minstekjøp (valgfritt)</label>
                  <Input
                    type="number"
                    min="0"
                    value={codeFormData.min_purchase_amount}
                    onChange={(e) => setCodeFormData({ ...codeFormData, min_purchase_amount: e.target.value })}
                    placeholder="F.eks. 500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">Gjelder produkt (valgfritt)</label>
                  <Input
                    value={codeFormData.applies_to_product}
                    onChange={(e) => setCodeFormData({ ...codeFormData, applies_to_product: e.target.value })}
                    placeholder="F.eks. TV, Mobil"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium mb-1">Antall testede produkter</label>
                  <Input
                    type="number"
                    min="1"
                    value={codeFormData.tested_products_count}
                    onChange={(e) => setCodeFormData({ ...codeFormData, tested_products_count: e.target.value })}
                    disabled
                  />
                </div>
                <div className="flex items-center pt-6">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={codeFormData.is_visible_to_users}
                      onChange={(e) => setCodeFormData({ ...codeFormData, is_visible_to_users: e.target.checked })}
                      className="w-4 h-4"
                    />
                    <span className="text-sm">Synlig for brukere</span>
                  </label>
                </div>
              </div>

              <div className="flex gap-2 pt-2">
                <Button
                  onClick={() => handleSaveCode(false)}
                  disabled={savingCode}
                  variant="outline"
                  className="bg-transparent hover:bg-neutral-200"
                >
                  {savingCode ? "Lagrer..." : "Lagre kode"}
                </Button>
                <Button
                  onClick={() => handleSaveCode(true)}
                  disabled={savingCode}
                  className="bg-green-600 hover:bg-green-700"
                >
                  {savingCode ? "Lagrer..." : "Lagre og publiser"}
                </Button>
                <Button
                  onClick={() => {
                    resetCodeForm()
                    setShowCodeForm(false)
                  }}
                  variant="outline"
                  className="bg-transparent hover:bg-neutral-200"
                >
                  Avbryt
                </Button>
              </div>
            </Card>
          )}

          {/* Published codes table */}
          {publishedCodes.length === 0 && !showCodeForm ? (
            <Card className="p-12 text-center">
              <p className="text-neutral-500">Ingen rabattkoder lagt til ennå</p>
              <p className="text-sm text-neutral-400 mt-1">Klikk "Legg til rabattkode" for å starte</p>
            </Card>
          ) : publishedCodes.length > 0 && (
            <Card className="overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="border-b bg-neutral-100">
                    <tr>
                      <th className="text-left py-3 px-3">Butikk</th>
                      <th className="text-left py-3 px-3">Kode</th>
                      <th className="text-left py-3 px-3">Type</th>
                      <th className="text-left py-3 px-3">Verdi</th>
                      <th className="text-left py-3 px-3">Synlig</th>
                      <th className="text-left py-3 px-3">Handlinger</th>
                    </tr>
                  </thead>
                  <tbody>
                    {publishedCodes.map((code) => (
                      <tr key={code.id} className="border-b hover:bg-neutral-50">
                        <td className="py-3 px-3">
                          <div className="flex flex-col">
                            <span className="font-medium">{getStoreNameByDomain(code.store_domain)}</span>
                            <span className="text-xs text-neutral-500">{code.store_domain}</span>
                          </div>
                        </td>
                        <td className="py-3 px-3 font-mono font-semibold">{code.code}</td>
                        <td className="py-3 px-3">
                          {code.benefit_type === "percent_off"
                            ? "Prosent"
                            : code.benefit_type === "amount_off"
                              ? "Beløp"
                              : "Gratis frakt"}
                        </td>
                        <td className="py-3 px-3">
                          {code.benefit_type === "percent_off"
                            ? `${code.value_percent}%`
                            : code.benefit_type === "amount_off"
                              ? `${code.value_amount} ${code.currency || "NOK"}`
                              : "-"}
                        </td>
                        <td className="py-3 px-3">
                          <span className={code.is_visible_to_users ? "text-green-600" : "text-neutral-400"}>
                            {code.is_visible_to_users ? "Ja" : "Nei"}
                          </span>
                        </td>
                        <td className="py-3 px-3">
                          <div className="flex gap-2">
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => handleEditCode(code)}
                              className="bg-transparent hover:bg-blue-50 text-blue-600 border-blue-300"
                            >
                              Rediger
                            </Button>
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => handleDeleteCode(code.id)}
                              className="bg-transparent hover:bg-red-50 text-red-600 border-red-300"
                            >
                              Slett
                            </Button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </Card>
          )}

          {/* Advanced: JSON Import (collapsible) */}
          <Card className="p-4">
            <button
              type="button"
              onClick={() => setShowJsonImport(!showJsonImport)}
              className="w-full flex justify-between items-center text-left"
            >
              <span className="text-sm font-medium text-neutral-600">
                Avansert: Lim inn maskinimport (valgfritt)
              </span>
              <span className="text-neutral-400">{showJsonImport ? "▲" : "▼"}</span>
            </button>
            
            {showJsonImport && (
              <div className="mt-4 space-y-3">
                <p className="text-xs text-neutral-500">
                  For bulk-import fra automatiske systemer. Ikke nødvendig for vanlig bruk.
                </p>
                <textarea
                  placeholder={`{\n  "country": "NO",\n  "store_domain": "elkjop.no",\n  "codes": [{ "code": "SPAR10", "benefit_type": "percent_off", "value_percent": 10 }]\n}`}
                  className="w-full px-3 py-2 border rounded h-32 font-mono text-xs"
                  value={codesJsonInput}
                  onChange={(e) => setCodesJsonInput(e.target.value)}
                  disabled={publishingCodes}
                />
                <Button
                  onClick={handlePublishCodes}
                  disabled={publishingCodes || !codesJsonInput.trim()}
                  size="sm"
                  className="bg-neutral-600 hover:bg-neutral-700 disabled:opacity-50"
                >
                  {publishingCodes ? "Importerer..." : "Importer JSON"}
                </Button>
              </div>
            )}
          </Card>
        </TabsContent>

        {/* SEO Tab */}
        <TabsContent value="seo" className="space-y-4 mt-4">
          <div className="flex justify-between items-center">
            <h3 className="font-semibold text-lg">SEO-sider</h3>
            <Button
              onClick={() => {
                resetSeoForm()
                setShowSeoForm(!showSeoForm)
              }}
              className="bg-green-600 hover:bg-green-700"
            >
              Legg til SEO-side
            </Button>
          </div>

          {seoSuccess && (
            <div className="p-3 bg-green-100 border border-green-300 text-green-800 rounded">
              {seoSuccess}
            </div>
          )}

          {seoError && (
            <div className="p-3 bg-red-100 border border-red-300 text-red-800 rounded">
              {seoError}
            </div>
          )}

          {showSeoForm && (
            <Card className="p-6 space-y-4 bg-neutral-100">
              <h4 className="font-semibold">{editingSeoPage ? "Rediger SEO-side" : "Ny SEO-side"}</h4>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium mb-1">Land</label>
                  <select
                    value={seoFormData.country_code}
                    onChange={(e) => setSeoFormData({ ...seoFormData, country_code: e.target.value })}
                    className="w-full px-3 py-2 border rounded"
                  >
                    <option value="NO">Norge (NO)</option>
                    <option value="UK">Storbritannia (UK)</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">Butikk-slug *</label>
                  <Input
                    placeholder="F.eks. elkjop"
                    value={seoFormData.store_slug}
                    onChange={(e) => setSeoFormData({ ...seoFormData, store_slug: e.target.value })}
                  />
                </div>
                <div className="col-span-2">
                  <label className="block text-sm font-medium mb-1">SEO-tittel *</label>
                  <Input
                    placeholder="F.eks. Elkjøp rabattkoder - Spar opptil 30%"
                    value={seoFormData.seo_title}
                    onChange={(e) => setSeoFormData({ ...seoFormData, seo_title: e.target.value })}
                  />
                </div>
                <div className="col-span-2">
                  <label className="block text-sm font-medium mb-1">SEO-beskrivelse</label>
                  <Input
                    placeholder="Meta description for søkemotorer"
                    value={seoFormData.seo_description}
                    onChange={(e) => setSeoFormData({ ...seoFormData, seo_description: e.target.value })}
                  />
                </div>
                <div className="col-span-2">
                  <label className="block text-sm font-medium mb-1">SEO-innhold</label>
                  <textarea
                    placeholder="Skriv SEO-vennlig innhold om butikken..."
                    value={seoFormData.seo_body}
                    onChange={(e) => setSeoFormData({ ...seoFormData, seo_body: e.target.value })}
                    className="w-full px-3 py-2 border rounded h-32"
                  />
                </div>
              </div>
              <div className="flex gap-2 pt-4">
                <Button
                  onClick={handleSaveSeoPage}
                  disabled={savingSeoPage}
                  className="flex-1 bg-green-600 hover:bg-green-700 disabled:opacity-50"
                >
                  {savingSeoPage ? "Lagrer..." : editingSeoPage ? "Lagre endringer" : "Lagre SEO-side"}
                </Button>
                <Button
                  onClick={() => {
                    resetSeoForm()
                    setShowSeoForm(false)
                  }}
                  variant="outline"
                  className="flex-1 bg-transparent"
                >
                  Avbryt
                </Button>
              </div>
            </Card>
          )}

          {seoPages.length === 0 ? (
            <Card className="p-6 text-center text-neutral-500">
              Ingen SEO-sider lagt til ennå.
            </Card>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="border-b bg-neutral-50">
                  <tr>
                    <th className="text-left py-3 px-3 font-semibold">Butikk-slug</th>
                    <th className="text-left py-3 px-3 font-semibold">Tittel</th>
                    <th className="text-left py-3 px-3 font-semibold">Land</th>
                    <th className="text-left py-3 px-3 font-semibold">Handlinger</th>
                  </tr>
                </thead>
                <tbody>
                  {seoPages.map((page) => (
                    <tr key={page.id} className="border-b hover:bg-neutral-50">
                      <td className="py-3 px-3 font-mono">{page.store_slug}</td>
                      <td className="py-3 px-3">{page.seo_title}</td>
                      <td className="py-3 px-3">{page.country_code}</td>
                      <td className="py-3 px-3">
                        <div className="flex gap-2">
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => handleEditSeoPage(page)}
                            className="bg-transparent hover:bg-blue-50 text-blue-600 border-blue-300"
                          >
                            Rediger
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => handleDeleteSeoPage(page.id)}
                            className="bg-transparent hover:bg-red-50 text-red-600 border-red-300"
                          >
                            Slett
                          </Button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </TabsContent>

        {/* Analytics Tab */}
        <TabsContent value="analytics" className="space-y-4 mt-4">
          <div className="flex justify-between items-center">
            <h3 className="font-semibold text-lg">Konverteringstrakt</h3>
            <Button 
              onClick={loadAnalyticsEvents} 
              variant="outline" 
              size="sm"
              className="bg-transparent"
            >
              Oppdater
            </Button>
          </div>
          
          <p className="text-sm text-neutral-500">
            Data fra siste 30 dager
          </p>
          
          <div className="grid grid-cols-3 gap-4">
            <Card className="p-4 text-center">
              <div className="text-2xl font-bold">{funnelMetrics.page_views}</div>
              <div className="text-sm text-neutral-600 flex items-center justify-center gap-1">
                Sidevisninger
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Info className="h-3.5 w-3.5 text-neutral-400 cursor-help" />
                  </TooltipTrigger>
                  <TooltipContent className="max-w-xs">
                    Antall sidevisninger på tvers av hele tjenesten (forside, søk, butikksider, checkout og visning av koder).
                  </TooltipContent>
                </Tooltip>
              </div>
            </Card>
            <Card className="p-4 text-center">
              <div className="text-2xl font-bold">{funnelMetrics.searches}</div>
              <div className="text-sm text-neutral-600 flex items-center justify-center gap-1">
                Søk
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Info className="h-3.5 w-3.5 text-neutral-400 cursor-help" />
                  </TooltipTrigger>
                  <TooltipContent className="max-w-xs">
                    Antall søk etter butikk/domene i tjenesten.
                  </TooltipContent>
                </Tooltip>
              </div>
            </Card>
            <Card className="p-4 text-center">
              <div className="text-2xl font-bold">{funnelMetrics.checkout_starts}</div>
              <div className="text-sm text-neutral-600 flex items-center justify-center gap-1">
                Kjøp startet
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Info className="h-3.5 w-3.5 text-neutral-400 cursor-help" />
                  </TooltipTrigger>
                  <TooltipContent className="max-w-xs">
                    Antall ganger brukere starter opplåsing av verifiserte rabattkoder (går til checkout).
                  </TooltipContent>
                </Tooltip>
              </div>
            </Card>
            <Card className="p-4 text-center">
              <div className="text-2xl font-bold">{funnelMetrics.purchases}</div>
              <div className="text-sm text-neutral-600 flex items-center justify-center gap-1">
                Kjøp fullført
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Info className="h-3.5 w-3.5 text-neutral-400 cursor-help" />
                  </TooltipTrigger>
                  <TooltipContent className="max-w-xs">
                    Antall ganger opplåsing er fullført (betaling/unlock gjennomført og token er laget).
                  </TooltipContent>
                </Tooltip>
              </div>
            </Card>
            <Card className="p-4 text-center">
              <div className="text-2xl font-bold">{funnelMetrics.reveals}</div>
              <div className="text-sm text-neutral-600 flex items-center justify-center gap-1">
                Viste koder
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Info className="h-3.5 w-3.5 text-neutral-400 cursor-help" />
                  </TooltipTrigger>
                  <TooltipContent className="max-w-xs">
                    Antall ganger verifiserte rabattkoder faktisk ble vist på reveal-siden.
                  </TooltipContent>
                </Tooltip>
              </div>
            </Card>
            <Card className="p-4 text-center">
              <div className="text-2xl font-bold">{funnelMetrics.partner_clicks}</div>
              <div className="text-sm text-neutral-600 flex items-center justify-center gap-1">
                Partnerklikk
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Info className="h-3.5 w-3.5 text-neutral-400 cursor-help" />
                  </TooltipTrigger>
                  <TooltipContent className="max-w-xs">
                    Antall klikk på gratis partnerkoder/partnerbutikker (lenke ut til partner).
                  </TooltipContent>
                </Tooltip>
              </div>
            </Card>
          </div>

          <Card className="p-6 space-y-4">
            <h4 className="font-semibold">Søk etter sesjon</h4>
            <div className="flex gap-2">
              <Input
                placeholder="Lim inn gjeste-ID..."
                value={guestId}
                onChange={(e) => setGuestId(e.target.value)}
              />
              <Button className="bg-green-600 hover:bg-green-700">Søk</Button>
            </div>
            <p className="text-sm text-neutral-500">
              Søk etter gjeste-ID for å se aktivitet fra en bestemt bruker.
            </p>
            
            {/* Show filtered activity if guestId is set */}
            {guestId && (
              <div className="mt-4 border-t pt-4">
                <h5 className="font-medium mb-2">Aktivitet for {guestId}:</h5>
                <div className="max-h-60 overflow-y-auto space-y-1 text-sm">
                  {analyticsEvents
                    .filter(e => e.guest_id === guestId)
                    .map((event, idx) => (
                      <div key={idx} className="flex justify-between py-1 border-b border-neutral-100">
                        <span>{event.event_type}</span>
                        <span className="text-neutral-500">{new Date(event.created_at).toLocaleString("no-NO")}</span>
                      </div>
                    ))}
                  {analyticsEvents.filter(e => e.guest_id === guestId).length === 0 && (
                    <p className="text-neutral-500">Ingen aktivitet funnet</p>
                  )}
                </div>
              </div>
            )}
          </Card>
        </TabsContent>

        {/* Settings Tab (Innstillinger) */}
        <TabsContent value="settings" className="space-y-4 mt-4">
          <h3 className="font-semibold text-lg">Innstillinger</h3>
          
          <Card className="p-6 space-y-6">
            <div>
              <h4 className="font-semibold mb-4">Standardgrenser for kodevisning (per land)</h4>
              <p className="text-sm text-neutral-500 mb-4">
                Disse grensene brukes som standard for alle butikker i hvert land.
                Du kan overstyre per butikk i Butikker-fanen.
              </p>
              
              <div className="space-y-6">
                {countrySettings.map((setting, index) => (
                  <div key={setting.country_code} className="border rounded-lg p-4">
                    <h5 className="font-medium mb-3">
                      {setting.country_code === "NO" ? "Norge (NO)" : "Storbritannia (UK)"}
                    </h5>
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-medium mb-1">
                          Antall vanlige koder (prosent/beløp)
                        </label>
                        <Input
                          type="number"
                          value={setting.reveal_limit_cart_codes_default}
                          onChange={(e) => {
                            const newSettings = [...countrySettings]
                            newSettings[index] = {
                              ...setting,
                              reveal_limit_cart_codes_default: Number.parseInt(e.target.value) || 0,
                            }
                            setCountrySettings(newSettings)
                          }}
                          min={0}
                          max={20}
                        />
                        <p className="text-xs text-neutral-500 mt-1">
                          Rabattkoder som gjelder hele handlekurven
                        </p>
                      </div>
                      <div>
                        <label className="block text-sm font-medium mb-1">
                          Antall produktkoder
                        </label>
                        <Input
                          type="number"
                          value={setting.reveal_limit_product_codes_default}
                          onChange={(e) => {
                            const newSettings = [...countrySettings]
                            newSettings[index] = {
                              ...setting,
                              reveal_limit_product_codes_default: Number.parseInt(e.target.value) || 0,
                            }
                            setCountrySettings(newSettings)
                          }}
                          min={0}
                          max={20}
                        />
                        <p className="text-xs text-neutral-500 mt-1">
                          Koder som gjelder spesifikke produkter
                        </p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="flex items-center gap-4 pt-4 border-t">
              <Button onClick={saveCountrySettings} className="bg-green-600 hover:bg-green-700">
                Lagre innstillinger
              </Button>
              {settingsSaved && (
                <span className="text-green-600 text-sm">Lagret!</span>
              )}
            </div>
          </Card>
          
          <Card className="p-6 space-y-4">
            <h4 className="font-semibold">Om kodevisningsgrenser</h4>
            <div className="text-sm text-neutral-600 space-y-2">
              <p>
                <strong>Handlekurv-koder (K):</strong> Koder som gir rabatt på hele handlekurven,
                for eksempel "10% på alt" eller "100 kr rabatt".
              </p>
              <p>
                <strong>Produkt-koder (P):</strong> Koder som kun gjelder spesifikke produkter
                eller kategorier.
              </p>
              <p>
                <strong>Teasere:</strong> Før betaling vises alltid de 2 beste handlekurv-kodene
                + gratis frakt (hvis tilgjengelig). Etter betaling vises opptil N handlekurv-koder
                og M produkt-koder basert på grensene.
              </p>
            </div>
          </Card>
        </TabsContent>
      </Tabs>
      </div>
    </TooltipProvider>
  )
}
