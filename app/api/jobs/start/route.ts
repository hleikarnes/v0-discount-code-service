import { createClient } from "@/lib/supabase/server"
import { getAppConfig, isLiveMode } from "@/lib/config"
import { normalizeDomain } from "@/lib/routing"
import { NextResponse } from "next/server"

export async function POST(request: Request) {
  try {
    const body = await request.json()
    const { store_domain, reason } = body

    if (!store_domain || typeof store_domain !== "string") {
      return NextResponse.json({ error: "store_domain is required" }, { status: 400 })
    }
    
    // ALWAYS normalize domain
    const normalizedStoreDomain = normalizeDomain(store_domain)

    const supabase = await createClient()
    const config = getAppConfig()

    // Create job with normalized domain
    const { data: job, error: jobError } = await supabase
      .from("jobs")
      .insert({
        store_domain: normalizedStoreDomain,
        status: "pending",
        mode: isLiveMode() ? "worker" : "manual",
        priority: 0,
      })
      .select()
      .single()

    if (jobError || !job) {
      console.error("[v0] Failed to create job:", jobError)
      return NextResponse.json({ error: "Failed to create job" }, { status: 500 })
    }

    // In live mode, trigger worker webhook if configured
    if (isLiveMode() && config.workerWebhookUrl) {
      try {
        await fetch(config.workerWebhookUrl, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            job_id: job.id,
            store_domain: job.store_domain,
            reason: reason || "manual_trigger",
          }),
        })
        console.log("[v0] Worker webhook triggered for job:", job.id)
      } catch (webhookError) {
        console.error("[v0] Worker webhook failed (non-fatal):", webhookError)
        // Don't fail the request if webhook fails
      }
    }

    return NextResponse.json({
      job_id: job.id,
      status: job.status,
      mode: job.mode,
    })
  } catch (error) {
    console.error("[v0] API error:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
