import { type NextRequest, NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"
import { verifyAdminSecret } from "@/lib/admin-auth"
import { isPrototypeMode } from "@/lib/config"

export async function POST(request: NextRequest) {
  if (!verifyAdminSecret(request)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  if (!isPrototypeMode()) {
    return NextResponse.json({ error: "Only available in prototype mode" }, { status: 403 })
  }

  try {
    const body = await request.json()
    const { codes, store_domain } = body

    if (!codes || !Array.isArray(codes) || !store_domain) {
      return NextResponse.json({ error: "codes array and store_domain required" }, { status: 400 })
    }

    const supabase = await createClient()

    // Upsert to store_codes
    for (const code of codes) {
      await supabase.from("store_codes").upsert(
        {
          store_domain,
          code: code.code,
          benefit_type: code.benefit_type,
          scope: code.scope || "cart",
          value_percent: code.value_percent || null,
          value_amount: code.value_amount || null,
          currency: code.currency || "NOK",
          min_purchase_amount: code.min_purchase_amount || null,
          applies_to_product: code.applies_to_product || null,
          tested_products_count: code.tested_products_count || 1,
          terms: code.terms || null,
          last_tested_at: new Date().toISOString(),
        },
        { onConflict: "store_domain,code" },
      )

      // Also mark as tested_success in candidate_codes if exists
      await supabase
        .from("candidate_codes")
        .update({
          status: "tested_success",
          is_visible_to_users: true,
          tested_at: new Date().toISOString(),
        })
        .eq("store_domain", store_domain)
        .eq("code", code.code)
    }

    return NextResponse.json({ success: true, published: codes.length })
  } catch (error) {
    console.error("[v0] Publish error:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
