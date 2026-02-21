import { type NextRequest, NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"
import { getGuestId } from "@/lib/guest"
import { verifyRevealToken } from "@/lib/reveal-token"
import { logEvent } from "@/lib/events"
import { checkRateLimit } from "@/lib/rate-limit"
import { isManualMode, isPrototypeMode } from "@/lib/config"
import { getMockRepository } from "@/lib/db/repository"
import { normalizeDomain } from "@/lib/routing"
import type { RevealedCode } from "@/lib/types"

export async function GET(request: NextRequest) {
  try {
    const authHeader = request.headers.get("authorization")
    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return NextResponse.json({ error: "Missing authorization token" }, { status: 401 })
    }

    const token = authHeader.substring(7)
    const payload = verifyRevealToken(token)

    if (!payload) {
      return NextResponse.json({ error: "Invalid or expired token" }, { status: 401 })
    }

    const guestId = await getGuestId()

    // In prototype mode with manual DB, skip strict guestId verification and purchase checks
    // This allows testing without needing cookie persistence
    if (isPrototypeMode() && isManualMode()) {
      const repo = getMockRepository()
      // ALWAYS use normalized domain for code lookup
      const normalizedStoreDomain = normalizeDomain(payload.store_domain)
      const allMockCodes = await repo.getStoreCodesByDomain(normalizedStoreDomain)
      
      // ONLY include codes with a valid coupon_code AND visible to users
      const mockCodes = allMockCodes.filter((c) => {
        const couponCode = (c as { coupon_code?: string }).coupon_code
        const isVisible = (c as { is_visible_to_users?: boolean }).is_visible_to_users !== false
        return couponCode && couponCode.trim().length > 0 && isVisible
      })
      
      // In manual mode, limits come from request headers or defaults
      // Client sends country and store info, we extract limits
      // For now, use sensible defaults that match the admin UI defaults
      const cartLimit = 3
      const productLimit = 2

      // Sort codes by value (best first) before applying limits
      const sortByValue = (codes: typeof mockCodes) => {
        return [...codes].sort((a, b) => {
          // Free shipping always last among cart codes
          if (a.benefit_type === "free_shipping" && b.benefit_type !== "free_shipping") return 1
          if (b.benefit_type === "free_shipping" && a.benefit_type !== "free_shipping") return -1
          // Sort by percent first, then amount
          if (a.benefit_type === "percent_off" && b.benefit_type === "percent_off") {
            return (b.value_percent ?? 0) - (a.value_percent ?? 0)
          }
          if (a.benefit_type === "amount_off" && b.benefit_type === "amount_off") {
            return (b.value_amount ?? 0) - (a.value_amount ?? 0)
          }
          // Prefer percent over amount
          if (a.benefit_type === "percent_off") return -1
          if (b.benefit_type === "percent_off") return 1
          return 0
        })
      }

      // Apply limits with sorting
      const cartCodes = sortByValue(mockCodes.filter((c) => c.scope === "cart")).slice(0, cartLimit)
      const productCodes = sortByValue(mockCodes.filter((c) => c.scope === "product")).slice(0, productLimit)
      const revealedCodes = [...cartCodes, ...productCodes]

      await logEvent("reveal_view", {
        guestId,
        storeDomain: payload.store_domain,
        purchaseId: payload.purchase_id,
        meta: { codes_revealed: revealedCodes.length, prototype_mode: true },
      })

      // coupon_code is guaranteed to be non-empty after filtering
      const response = revealedCodes.map((code) => ({
        code: code.code,
        coupon_code: (code as { coupon_code?: string }).coupon_code!,
        benefit_type: code.benefit_type,
        scope: code.scope,
        value_percent: code.value_percent,
        value_amount: code.value_amount,
        currency: code.currency,
        min_purchase_amount: code.min_purchase_amount,
        applies_to_product: code.applies_to_product,
        terms: code.terms,
        last_tested_at: code.last_tested_at,
      }))

      return NextResponse.json({
        store_domain: payload.store_domain,
        codes: response,
        limits: { cart_limit: cartLimit, product_limit: productLimit },
      })
    }

    // Non-manual mode: use Supabase for everything
    const supabase = await createClient()

    // Verify purchase
    const { data: purchase } = await supabase.from("purchases").select("*").eq("id", payload.purchase_id).single()

    if (!purchase || purchase.status !== "succeeded") {
      return NextResponse.json({ error: "Purchase not found or not paid" }, { status: 403 })
    }

    // Get country settings and store overrides
    const { data: countrySetting } = await supabase
      .from("country_settings")
      .select("*")
      .eq("country_code", purchase.country_code)
      .single()

    // ALWAYS use normalized domain for lookups
    const normalizedStoreDomain = normalizeDomain(payload.store_domain)
    
    // Try to find store by normalized domain
    const { data: storesData } = await supabase.from("stores").select("*")
    const store = storesData?.find((s: { domain: string }) => normalizeDomain(s.domain) === normalizedStoreDomain) || null

    const cartLimit = store?.reveal_cart_limit_override ?? countrySetting?.default_reveal_cart_limit ?? 5
    const productLimit = store?.reveal_product_limit_override ?? countrySetting?.default_reveal_product_limit ?? 5

    // Get all codes and filter by normalized domain
    const { data: allCodesRaw } = await supabase
      .from("store_codes")
      .select("*")
      .order("created_at", { ascending: false })

    // Filter by normalized domain AND valid coupon_code
    const allCodes = (allCodesRaw ?? []).filter((c: { store_domain: string; coupon_code?: string }) => 
      normalizeDomain(c.store_domain) === normalizedStoreDomain && 
      c.coupon_code && 
      c.coupon_code.trim().length > 0
    )

    // If no codes with coupon_code, return empty array (not an error)
    if (allCodes.length === 0) {
      return NextResponse.json({
        store_domain: payload.store_domain,
        codes: [],
        limits: { cart_limit: cartLimit, product_limit: productLimit },
        message: "No codes available for this store",
      })
    }

    // Apply limits
    const cartCodes = allCodes.filter((c) => c.scope === "cart").slice(0, cartLimit)
    const productCodes = allCodes.filter((c) => c.scope === "product").slice(0, productLimit)
    const revealedCodes = [...cartCodes, ...productCodes]

    await logEvent("reveal_view", {
      guestId,
      storeDomain: payload.store_domain,
      countryCode: purchase.country_code,
      purchaseId: payload.purchase_id,
      meta: { codes_revealed: revealedCodes.length },
    })

    // coupon_code is guaranteed to be non-empty after filtering
    const response = revealedCodes.map((code) => ({
      code: code.code,
      coupon_code: code.coupon_code!,
      benefit_type: code.benefit_type,
      scope: code.scope,
      value_percent: code.value_percent,
      value_amount: code.value_amount,
      currency: code.currency,
      min_purchase_amount: code.min_purchase_amount,
      applies_to_product: code.applies_to_product,
      terms: code.terms,
      last_tested_at: code.last_tested_at,
    }))

    return NextResponse.json({
      store_domain: payload.store_domain,
      codes: response,
      limits: { cart_limit: cartLimit, product_limit: productLimit },
    })
  } catch (error) {
    console.error("[v0] Reveal error:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
