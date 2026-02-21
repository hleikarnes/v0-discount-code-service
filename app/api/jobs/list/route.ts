import { createClient } from "@/lib/supabase/server"
import { NextResponse } from "next/server"

export async function GET() {
  try {
    const supabase = await createClient()

    const { data: jobs, error } = await supabase
      .from("jobs")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(20)

    if (error) {
      console.error("[v0] Failed to fetch jobs:", error)
      return NextResponse.json({ error: "Failed to fetch jobs" }, { status: 500 })
    }

    return NextResponse.json({ jobs: jobs || [] })
  } catch (error) {
    console.error("[v0] API error:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
