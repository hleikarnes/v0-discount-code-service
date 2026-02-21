import { type NextRequest, NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"
import { getGuestId } from "@/lib/guest"
import { getAppConfig, isDemoMode, isPrototypeMode, isManualMode } from "@/lib/config"
import { logEvent } from "@/lib/events"
import { stripe } from "@/lib/stripe"
import { generateRevealToken } from "@/lib/reveal-token"
import { normalizeDomain } from "@/lib/routing"

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { store_domain, country_code = "NO" } = body

    if (!store_domain || typeof store_domain !== "string") {
      return NextResponse.json({ error: "store_domain is required" }, { status: 400 })
    }

    // ALWAYS normalize domain before any operation
    const normalizedStoreDomain = normalizeDomain(store_domain)

    // In prototype mode with manual DB, skip Supabase and return reveal token directly
    if (isPrototypeMode() && isManualMode()) {
      const guestId = await getGuestId()
      const mockPurchaseId = `proto_${Date.now()}_${Math.random().toString(36).substring(7)}`
      
      // Generate reveal token (valid for 60 minutes in prototype mode)
      // Use normalized domain in the token
      const revealToken = generateRevealToken(
        guestId || "anonymous",
        normalizedStoreDomain,
        mockPurchaseId,
        60 // 60 minutes expiry
      )

      // Log both checkout_start and purchase_success for prototype mode
      await logEvent("checkout_start", {
        guestId,
        storeDomain: normalizedStoreDomain,
        countryCode: country_code,
        purchaseId: mockPurchaseId,
        meta: { prototype_mode: true },
      })
      
      await logEvent("purchase_success", {
        guestId,
        storeDomain: normalizedStoreDomain,
        countryCode: country_code,
        purchaseId: mockPurchaseId,
        meta: { store_domain: normalizedStoreDomain, prototype_mode: true },
      })

      return NextResponse.json({
        success: true,
        prototype_mode: true,
        reveal_token: revealToken,
        purchase_id: mockPurchaseId,
      })
    }

    if (isPrototypeMode()) {
      const prototypeSecret = request.headers.get("x-prototype-secret")
      const config = getAppConfig()

      if (prototypeSecret !== process.env.ADMIN_SECRET && prototypeSecret !== process.env.PROTOTYPE_SECRET) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 403 })
      }
    }

    const supabase = await createClient()
    const guestId = await getGuestId()
    const config = getAppConfig()

    // Verify store exists (match by normalized domain)
    const { data: storesData } = await supabase
      .from("stores")
      .select("*")
      .eq("country_code", country_code)
      .eq("is_active", true)

    const store = storesData?.find((s: { domain: string }) => normalizeDomain(s.domain) === normalizedStoreDomain) || null

    if (!store) {
      return NextResponse.json({ error: "Store not found" }, { status: 404 })
    }

    const { data: purchase, error: purchaseError } = await supabase
      .from("purchases")
      .insert({
        guest_id: guestId || "unknown",
        store_domain: normalizedStoreDomain, // ALWAYS use normalized domain
        country_code,
        status: "pending",
        amount: 1900, // 19 NOK
        currency: "NOK",
      })
      .select()
      .single()

    if (purchaseError || !purchase) {
      console.error("[v0] Failed to create purchase:", purchaseError)
      return NextResponse.json({ error: "Failed to create purchase" }, { status: 500 })
    }

    await logEvent("checkout_start", {
      guestId,
      storeDomain: normalizedStoreDomain,
      countryCode: country_code,
      purchaseId: purchase.id,
    })

    if (isDemoMode()) {
      await supabase
        .from("purchases")
        .update({
          status: "succeeded",
          succeeded_at: new Date().toISOString(),
          stripe_session_id: `demo_${purchase.id}`,
        })
        .eq("id", purchase.id)

      await logEvent("purchase_success", {
        guestId,
        storeDomain: normalizedStoreDomain,
        countryCode: country_code,
        purchaseId: purchase.id,
        meta: { store_domain: normalizedStoreDomain, demo_mode: true },
      })

      return NextResponse.json({
        success: true,
        demo_mode: true,
        purchase_id: purchase.id,
        redirect_url: `/thank-you?purchase_id=${purchase.id}`,
      })
    }

    // Real Stripe checkout
    const session = await stripe.checkout.sessions.create({
      mode: "payment",
      line_items: [
        {
          price_data: {
            currency: "nok",
            product_data: {
              name: `${store.name} - Rabattkoder`,
              description: `Verifiserte rabattkoder for ${store.name}`,
            },
            unit_amount: 1900,
          },
          quantity: 1,
        },
      ],
      success_url: `${config.appOrigin}/thank-you?purchase_id=${purchase.id}`,
      cancel_url: `${config.appOrigin}/store/${normalizedStoreDomain}`,
      metadata: {
        purchase_id: purchase.id,
        store_domain: normalizedStoreDomain,
        guest_id: guestId || "",
        country_code,
      },
    })

    await supabase.from("purchases").update({ stripe_session_id: session.id }).eq("id", purchase.id)

    return NextResponse.json({
      success: true,
      demo_mode: false,
      checkout_url: session.url,
      session_id: session.id,
    })
  } catch (error) {
    console.error("[v0] Checkout error:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
