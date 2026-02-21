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
      domain,
      name,
      logo_url,
      website_url,
      description,
      is_active,
      is_featured,
      reveal_cart_limit_override,
      reveal_product_limit_override,
    } = body

    if (!country_code || !slug || !domain || !name) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 })
    }

    const supabase = await createClient()

    const { data, error } = await supabase
      .from("stores")
      .upsert(
        {
          country_code,
          slug,
          domain,
          name,
          logo_url: logo_url || null,
          website_url: website_url || null,
          description: description || null,
          is_active: is_active ?? true,
          is_featured: is_featured ?? false,
          reveal_cart_limit_override: reveal_cart_limit_override || null,
          reveal_product_limit_override: reveal_product_limit_override || null,
          updated_at: new Date().toISOString(),
        },
        { onConflict: "country_code,domain" },
      )
      .select()
      .single()

    if (error) throw error

    return NextResponse.json({ success: true, store: data })
  } catch (error) {
    console.error("[v0] Store upsert error:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
