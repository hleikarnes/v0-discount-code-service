import { type NextRequest, NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"
import { verifyAdminSecret } from "@/lib/admin-auth"

export async function POST(request: NextRequest) {
  if (!verifyAdminSecret(request)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  try {
    const body = await request.json()
    const { country_code, store_slug, seo_title, seo_description, seo_body } = body

    if (!country_code || !store_slug || !seo_title || !seo_description) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 })
    }

    const supabase = await createClient()

    const { data, error } = await supabase
      .from("seo_pages")
      .upsert(
        {
          country_code,
          store_slug,
          seo_title,
          seo_description,
          seo_body: seo_body || null,
          updated_at: new Date().toISOString(),
        },
        { onConflict: "country_code,store_slug" },
      )
      .select()
      .single()

    if (error) throw error

    return NextResponse.json({ success: true, page: data })
  } catch (error) {
    console.error("[v0] SEO upsert error:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
