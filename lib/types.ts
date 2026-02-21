export interface Store {
  id: string
  country_code: string
  slug: string
  domain: string
  name: string
  logo_url: string | null
  website_url: string | null
  description: string | null
  is_active: boolean
  is_featured: boolean
  reveal_cart_limit_override: number | null
  reveal_product_limit_override: number | null
  created_at: string
  updated_at: string
}

export interface CandidateCode {
  id: string
  store_domain: string
  code: string
  status: "found" | "tested_success" | "tested_failed"
  is_visible_to_users: boolean
  benefit_type: "free_shipping" | "percent_off" | "amount_off" | null
  scope: "cart" | "product" | null
  value_percent: number | null
  value_amount: number | null
  currency: string
  min_purchase_amount: number | null
  applies_to_product: string | null
  tested_products_count: number
  source_url: string | null
  terms: string | null
  expires_at: string | null
  discovered_at: string
  tested_at: string | null
  meta: Record<string, any>
}

export interface StoreCode {
  id: string
  store_domain: string
  code: string
  benefit_type: "free_shipping" | "percent_off" | "amount_off"
  scope: "cart" | "product"
  value_percent: number | null
  value_amount: number | null
  currency: string
  min_purchase_amount: number | null
  applies_to_product: string | null
  tested_products_count: number
  terms: string | null
  expires_at: string | null
  last_tested_at: string | null
  created_at: string
}

export interface AffiliateOffer {
  id: string
  country_code: string
  slug: string
  store_name: string
  store_domain: string
  logo_url: string | null
  offer_type: "code" | "link"
  discount_type: "percent_off" | "amount_off" | "free_shipping" | null
  discount_value: string | null
  code: string | null
  terms: string | null
  affiliate_url: string
  is_active: boolean
  sort_order: number
  created_at: string
  updated_at: string
}

export interface CountrySetting {
  country_code: string
  default_reveal_cart_limit: number
  default_reveal_product_limit: number
  created_at: string
  updated_at: string
}

export interface SeoPage {
  id: string
  country_code: string
  store_slug: string
  seo_title: string
  seo_description: string
  seo_body: string | null
  created_at: string
  updated_at: string
}

export interface Job {
  id: string
  store_domain: string
  status: "pending" | "running" | "done" | "failed"
  mode: "manual" | "worker"
  priority: number
  created_at: string
  updated_at: string
  result_json: Record<string, any> | null
  error: string | null
}

export interface Purchase {
  id: string
  guest_id: string
  store_domain: string
  country_code: string
  status: "pending" | "succeeded" | "failed"
  stripe_session_id: string | null
  amount: number
  currency: string
  succeeded_at: string | null
  created_at: string
}

export interface RevealToken {
  token: string
  guest_id: string
  store_domain: string
  purchase_id: string
  expires_at: string
  created_at: string
}

export interface Event {
  id: string
  event_type: string
  guest_id: string | null
  store_domain: string | null
  country_code: string | null
  purchase_id: string | null
  suspicious: boolean
  meta: Record<string, any>
  created_at: string
}

// API response types
export interface TeaserCode {
  benefit_type: "free_shipping" | "percent_off" | "amount_off"
  scope: "cart" | "product"
  value_percent: number | null
  value_amount: number | null
  currency: string
  min_purchase_amount: number | null
}

export interface StoreSummary {
  store: Store
  teasers: TeaserCode[]
  total_codes: number
}

export interface RevealedCode {
  code: string
  coupon_code?: string | null
  benefit_type: string
  scope: string
  value_percent: number | null
  value_amount: number | null
  currency: string
  min_purchase_amount: number | null
  applies_to_product: string | null
  terms: string | null
  last_tested_at: string | null
}
