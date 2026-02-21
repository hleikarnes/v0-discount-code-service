import { type NextRequest, NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams
    const country = searchParams.get("country") ?? "NO"

    const supabase = await createClient()

    const { data: offers, error } = await supabase
      .from("affiliate_offers")
      .select("*")
      .eq("country_code", country)
      .eq("is_active", true)
      .order("sort_order", { ascending: true })

    if (error) throw error

    return NextResponse.json({ offers: offers ?? [] })
  } catch (error) {
    console.error("[v0] Error fetching affiliate offers:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
