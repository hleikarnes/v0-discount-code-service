"use server"

import { stripe } from "@/lib/stripe"
import { createClient } from "@/lib/supabase/server"

export async function startCheckoutSession(discountCodeId: string) {
  const supabase = await createClient()

  // Fetch the discount code with store info
  const { data: discountCode, error } = await supabase
    .from("discount_codes")
    .select(
      `
      *,
      stores (
        name,
        domain
      )
    `,
    )
    .eq("id", discountCodeId)
    .eq("is_active", true)
    .single()

  if (error || !discountCode) {
    throw new Error("Discount code not found or inactive")
  }

  // Create the discount display name
  let discountDisplay = ""
  if (discountCode.discount_percentage) {
    discountDisplay = `${discountCode.discount_percentage}% rabatt`
  } else if (discountCode.discount_amount_cents) {
    discountDisplay = `${(discountCode.discount_amount_cents / 100).toFixed(0)} kr rabatt`
  }

  // Create Checkout Session
  const session = await stripe.checkout.sessions.create({
    ui_mode: "embedded",
    return_url: `${process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000"}/thank-you?session_id={CHECKOUT_SESSION_ID}`,
    line_items: [
      {
        price_data: {
          currency: "nok",
          product_data: {
            name: `${discountCode.stores.name} - Rabattkode`,
            description: `${discountCode.description || "Rabattkode"} (${discountDisplay})`,
          },
          unit_amount: discountCode.price_cents,
        },
        quantity: 1,
      },
    ],
    mode: "payment",
    metadata: {
      discount_code_id: discountCodeId,
      store_domain: discountCode.stores.domain,
    },
  })

  return session.client_secret
}

export async function getSessionStatus(sessionId: string) {
  const session = await stripe.checkout.sessions.retrieve(sessionId)

  return {
    status: session.status,
    customer_email: session.customer_details?.email,
    payment_intent: session.payment_intent as string,
  }
}

export async function recordPurchase(sessionId: string) {
  const supabase = await createClient()

  // Get session details from Stripe
  const session = await stripe.checkout.sessions.retrieve(sessionId)

  if (session.payment_status !== "paid") {
    throw new Error("Payment not completed")
  }

  const discountCodeId = session.metadata?.discount_code_id
  if (!discountCodeId) {
    throw new Error("No discount code ID in session metadata")
  }

  // Check if purchase already recorded
  const { data: existing } = await supabase.from("purchases").select("id").eq("stripe_session_id", sessionId).single()

  if (existing) {
    return existing.id
  }

  // Record the purchase
  const { data: purchase, error: purchaseError } = await supabase
    .from("purchases")
    .insert({
      discount_code_id: discountCodeId,
      stripe_payment_intent_id: session.payment_intent as string,
      stripe_session_id: sessionId,
      email: session.customer_details?.email,
      amount_paid_cents: session.amount_total || 0,
    })
    .select("id")
    .single()

  if (purchaseError) {
    throw new Error("Failed to record purchase")
  }

  // Increment times_sold counter
  const { error: updateError } = await supabase.rpc("increment_times_sold", {
    code_id: discountCodeId,
  })

  if (updateError) {
    console.error("[v0] Failed to increment times_sold:", updateError)
  }

  return purchase.id
}
