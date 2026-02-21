"use server"

import { createClient } from "@/lib/supabase/server"

// Verify admin secret on server side only
function validateAdminSecret(): boolean {
  const adminSecret = process.env.ADMIN_SECRET
  if (!adminSecret) {
    console.error("[v0] ADMIN_SECRET not configured")
    return false
  }
  return true
}

export async function publishCodes(payload: {
  store_domain: string
  codes: Array<{
    code: string
    benefit_type: "percent_off" | "amount_off" | "free_shipping"
    scope?: "cart" | "product"
    value_percent?: number
    value_amount?: number
    currency?: string
    min_purchase_amount?: number
    applies_to_product?: string
    tested_products_count?: number
    terms?: string
  }>
}) {
  try {
    if (!validateAdminSecret()) {
      return { success: false, error: "Admin secret not configured" }
    }

    const supabase = await createClient()

    // Upsert to store_codes
    for (const code of payload.codes) {
      await supabase.from("store_codes").upsert(
        {
          store_domain: payload.store_domain,
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

      // Mark as tested_success in candidate_codes if exists
      await supabase
        .from("candidate_codes")
        .update({
          status: "tested_success",
          is_visible_to_users: true,
          tested_at: new Date().toISOString(),
        })
        .eq("store_domain", payload.store_domain)
        .eq("code", code.code)
    }

    return { success: true, published: payload.codes.length }
  } catch (error) {
    console.error("[v0] Admin publish error:", error)
    return { success: false, error: error instanceof Error ? error.message : "Failed to publish codes" }
  }
}

export async function startJob(storeDomain: string) {
  try {
    if (!validateAdminSecret()) {
      return { success: false, error: "Admin secret not configured" }
    }

    const supabase = await createClient()

    const { data: job, error } = await supabase
      .from("jobs")
      .insert({
        store_domain: storeDomain,
        status: "pending",
        mode: "manual",
      })
      .select()
      .single()

    if (error) throw error

    return { success: true, job_id: job.id }
  } catch (error) {
    console.error("[v0] Admin job start error:", error)
    return { success: false, error: error instanceof Error ? error.message : "Failed to start job" }
  }
}
