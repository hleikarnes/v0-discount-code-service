import { type NextRequest, NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"
import { verifyAdminSecret } from "@/lib/admin-auth"

export async function GET(request: NextRequest) {
  if (!verifyAdminSecret(request)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  try {
    const searchParams = request.nextUrl.searchParams
    const status = searchParams.get("status")
    const store_domain = searchParams.get("store_domain")

    const supabase = await createClient()

    let query = supabase.from("candidate_codes").select("*").order("discovered_at", { ascending: false }).limit(100)

    if (status) {
      query = query.eq("status", status)
    }

    if (store_domain) {
      query = query.eq("store_domain", store_domain)
    }

    const { data, error } = await query

    if (error) throw error

    return NextResponse.json({ candidates: data ?? [] })
  } catch (error) {
    console.error("[v0] Candidates list error:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
