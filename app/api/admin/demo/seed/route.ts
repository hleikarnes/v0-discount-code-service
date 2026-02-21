import { createClient } from "@/lib/supabase/server"
import { NextResponse } from "next/server"

export async function POST() {
  try {
    const supabase = await createClient()

    // This endpoint just confirms seed data exists
    // Actual seeding is done via SQL scripts

    const { data: stores } = await supabase.from("stores").select("count")

    return NextResponse.json({
      success: true,
      message: "Seed data should be loaded via SQL scripts (009_seed_dual_mode_data.sql)",
      stores_count: stores?.[0]?.count || 0,
    })
  } catch (error) {
    console.error("[v0] API error:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
