import { type NextRequest, NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"
import { getGuestId } from "@/lib/guest"
import { generateRevealToken } from "@/lib/reveal-token"

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { purchase_id } = body

    if (!purchase_id) {
      return NextResponse.json({ error: "purchase_id is required" }, { status: 400 })
    }

    const supabase = await createClient()
    const guestId = await getGuestId()

    const { data: purchase, error } = await supabase.from("purchases").select("*").eq("id", purchase_id).single()

    if (error || !purchase) {
      return NextResponse.json({ error: "Purchase not found" }, { status: 404 })
    }

    // Verify guest_id matches
    if (purchase.guest_id !== guestId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 403 })
    }

    if (purchase.status !== "succeeded") {
      return NextResponse.json({ error: "Purchase not completed" }, { status: 400 })
    }

    // Generate short-lived reveal token (10 minutes)
    const token = generateRevealToken(guestId, purchase.store_domain, purchase.id, 10)

    return NextResponse.json({
      token,
      purchase_id: purchase.id,
      store_domain: purchase.store_domain,
      expires_in: 600, // 10 minutes in seconds
    })
  } catch (error) {
    console.error("[v0] Token generation error:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
