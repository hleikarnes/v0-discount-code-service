import { createClient } from "@/lib/supabase/server"
import { NextResponse } from "next/server"

export async function GET(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const supabase = await createClient()

  try {
    // Fetch purchase with discount code and store info
    const { data: purchase, error } = await supabase
      .from("purchases")
      .select(
        `
        id,
        discount_codes:discount_code_id (
          id,
          code,
          description,
          discount_percentage,
          discount_amount_cents,
          terms,
          stores (
            name,
            slug,
            website_url,
            logo_url
          )
        )
      `,
      )
      .eq("id", id)
      .single()

    if (error || !purchase) {
      return NextResponse.json({ error: "Purchase not found" }, { status: 404 })
    }

    return NextResponse.json({
      discountCode: purchase.discount_codes,
    })
  } catch (error) {
    console.error("[v0] Error fetching purchase:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
