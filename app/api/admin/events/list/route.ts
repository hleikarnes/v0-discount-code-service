import { type NextRequest, NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"
import { verifyAdminSecret } from "@/lib/admin-auth"

export async function GET(request: NextRequest) {
  if (!verifyAdminSecret(request)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  try {
    const searchParams = request.nextUrl.searchParams
    const event_type = searchParams.get("event_type")
    const suspicious = searchParams.get("suspicious")

    const supabase = await createClient()

    let query = supabase.from("events").select("*").order("created_at", { ascending: false }).limit(100)

    if (event_type) {
      query = query.eq("event_type", event_type)
    }

    if (suspicious === "true") {
      query = query.eq("suspicious", true)
    }

    const { data, error } = await query

    if (error) throw error

    return NextResponse.json({ events: data ?? [] })
  } catch (error) {
    console.error("[v0] Events list error:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
