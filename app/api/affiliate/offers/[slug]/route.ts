import { NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"
import { getGuestId } from "@/lib/guest"
import { logEvent } from "@/lib/events"

export async function GET(request: Request, { params }: { params: Promise<{ slug: string }> }) {
  try {
    const { slug } = await params
    const supabase = await createClient()

    const { data: offer, error } = await supabase
      .from("affiliate_offers")
      .select("*")
      .eq("slug", slug)
      .eq("is_active", true)
      .single()

    if (error || !offer) {
      return NextResponse.json({ error: "Offer not found" }, { status: 404 })
    }

    // Log affiliate click
    const guestId = await getGuestId()
    await logEvent("affiliate_click", {
      guestId,
      storeDomain: offer.store_domain,
      countryCode: offer.country_code,
      meta: { slug, affiliate_url: offer.affiliate_url },
    })

    return NextResponse.json({ offer })
  } catch (error) {
    console.error("[v0] Error fetching affiliate offer:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
