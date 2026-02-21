import { createClient } from "@/lib/supabase/server"
import { NextResponse } from "next/server"

export async function GET(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params
    const supabase = await createClient()

    const { data: job, error } = await supabase.from("jobs").select("*").eq("id", id).single()

    if (error || !job) {
      return NextResponse.json({ error: "Job not found" }, { status: 404 })
    }

    // If done, fetch fresh teasers
    let teasers = null
    if (job.status === "done") {
      const { data: codes } = await supabase
        .from("store_codes")
        .select("*")
        .eq("store_domain", job.store_domain)
        .order("last_discount_percent", { ascending: false })
        .limit(4)

      if (codes) {
        teasers = codes.map((code) => ({
          discount_percent: code.last_discount_percent,
          free_shipping: code.kind === "free_shipping",
          currency: code.currency,
          last_tested_at: code.last_tested_at,
        }))
      }
    }

    return NextResponse.json({
      status: job.status,
      store_domain: job.store_domain,
      result_summary: job.result_json,
      error: job.error,
      teasers,
    })
  } catch (error) {
    console.error("[v0] API error:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
