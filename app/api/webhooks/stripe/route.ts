import { createClient } from "@/lib/supabase/server"
import { stripe } from "@/lib/stripe"
import { getAppConfig } from "@/lib/config"
import { NextResponse } from "next/server"
import { headers } from "next/headers"

export async function POST(request: Request) {
  try {
    const body = await request.text()
    const headersList = await headers()
    const signature = headersList.get("stripe-signature")

    if (!signature) {
      return NextResponse.json({ error: "No signature" }, { status: 400 })
    }

    const config = getAppConfig()

    // Verify webhook signature
    const event = stripe.webhooks.constructEvent(body, signature, config.stripeWebhookSecret)

    if (event.type === "checkout.session.completed") {
      const session = event.data.object

      if (session.payment_status === "paid") {
        const supabase = await createClient()
        const purchaseId = session.metadata?.purchase_id
        const storeDomain = session.metadata?.store_domain
        const guestId = session.metadata?.guest_id

        if (purchaseId) {
          // Update purchase status
          await supabase
            .from("purchases")
            .update({
              status: "succeeded",
              succeeded_at: new Date().toISOString(),
            })
            .eq("id", purchaseId)

          // Log purchase_success event
          if (guestId && storeDomain) {
            await supabase.from("events").insert({
              event_type: "purchase_success",
              guest_id: guestId,
              store_domain: storeDomain,
              purchase_id: purchaseId,
              meta: { store_domain: storeDomain },
            })
          }
        }
      }
    }

    return NextResponse.json({ received: true })
  } catch (error) {
    console.error("[v0] Webhook error:", error)
    return NextResponse.json({ error: "Webhook failed" }, { status: 500 })
  }
}
