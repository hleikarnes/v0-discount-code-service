import { type NextRequest, NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"
import { verifyAdminSecret } from "@/lib/admin-auth"

export async function POST(request: NextRequest) {
  if (!verifyAdminSecret(request)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  try {
    const body = await request.json()
    const {
      country_code,
      slug,
      store_name,
      store_domain,
      logo_url,
      offer_type,
      discount_type,
      discount_value,
      code,
      terms,
      affiliate_url,
      is_active,
      sort_order,
    } = body

    if (!country_code || !slug || !store_name || !store_domain || !offer_type || !affiliate_url) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 })
    }

    const supabase = await createClient()

    const { data, error } = await supabase
      .from("affiliate_offers")
      .upsert(
        {
          country_code,
          slug,
          store_name,
          store_domain,
          logo_url: logo_url || null,
          offer_type,
          discount_type: discount_type || null,
          discount_value: discount_value || null,
          code: code || null,
          terms: terms || null,
          affiliate_url,
          is_active: is_active ?? true,
          sort_order: sort_order ?? 0,
          updated_at: new Date().toISOString(),
        },
        { onConflict: "country_code,slug" },
      )
      .select()
      .single()

    if (error) throw error

    return NextResponse.json({ success: true, offer: data })
  } catch (error) {
    console.error("[v0] Affiliate upsert error:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
