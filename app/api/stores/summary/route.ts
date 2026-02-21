import { createClient } from "@/lib/supabase/server"
import { getMockRepository } from "@/lib/db/repository"
import { getGuestId } from "@/lib/guest"
import { logEvent } from "@/lib/events"
import { selectTeasers } from "@/lib/teaser"
import { normalizeDomain } from "@/lib/routing"
import type { StoreSummary } from "@/lib/types"
import { NextResponse } from "next/server"

export async function GET(request: Request) {
  try {
    const searchParams = request.nextUrl.searchParams
    const query = searchParams.get("query")
    const country = searchParams.get("country") ?? "NO"

    if (!query) {
      return NextResponse.json({ error: "Query parameter required" }, { status: 400 })
    }

    let supabase
    try {
      supabase = await createClient()
    } catch (error) {
      console.error("[v0] Supabase client creation failed:", error)
      return NextResponse.json({ stores: [] })
    }

    const guestId = await getGuestId()

    const repo = getMockRepository()

    // Log event but don't fail if logging fails
    try {
      await logEvent("search", {
        guestId,
        countryCode: country,
        meta: { query },
      })
    } catch (e) {
      console.error("[v0] Event logging failed:", e)
    }

    const stores = await repo.searchStores(country, query)

    if (!stores || stores.length === 0) {
      return NextResponse.json({ stores: [] })
    }

    const summaries: StoreSummary[] = []

    for (const store of stores) {
      // ALWAYS use normalized domain for code lookup
      const normalizedStoreDomain = normalizeDomain(store.domain)
      const allCodes = await repo.getStoreCodesByDomain(normalizedStoreDomain)
      // Only include codes with a valid coupon_code AND visible to users
      const codes = allCodes?.filter((c) => {
        const couponCode = (c as { coupon_code?: string }).coupon_code
        const isVisible = (c as { is_visible_to_users?: boolean }).is_visible_to_users !== false
        return couponCode && couponCode.trim().length > 0 && isVisible
      }) ?? []
      const teasers = codes.length > 0 ? selectTeasers(codes) : []

      summaries.push({
        store,
        teasers,
        total_codes: codes.length,
      })

      try {
        await logEvent("summary_view", {
          guestId,
          storeDomain: store.domain,
          countryCode: country,
        })
      } catch (e) {
        console.error("[v0] Event logging failed:", e)
      }
    }

    return NextResponse.json({ stores: summaries })
  } catch (error) {
    console.error("[v0] Error in stores/summary:", error)
    // Return empty result on any error
    return NextResponse.json({ stores: [] })
  }
}
