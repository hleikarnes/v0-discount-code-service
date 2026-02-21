import { createClient } from "@/lib/supabase/server"
import { isManualMode } from "@/lib/config"
import { logEvent } from "@/lib/events"

const RATE_LIMIT_WINDOW_MS = 60 * 1000 // 1 minute
const MAX_REVEAL_CALLS = 5

export async function checkRateLimit(guestId: string, eventType: string): Promise<boolean> {
  // In manual mode, rate limiting is fail-open (always allow)
  if (isManualMode()) {
    return true
  }

  try {
    const supabase = await createClient()
    const windowStart = new Date(Date.now() - RATE_LIMIT_WINDOW_MS).toISOString()

    const { data, error } = await supabase
      .from("events")
      .select("id")
      .eq("guest_id", guestId)
      .eq("event_type", eventType)
      .gte("created_at", windowStart)

    if (error) throw error

    return (data?.length ?? 0) < MAX_REVEAL_CALLS
  } catch (error) {
    // Fail open - log and allow the request
    console.error("[v0] Rate limit check failed:", error)
    try {
      await logEvent("rate_limit_check_failed", {
        guestId,
        meta: { error: error instanceof Error ? error.message : "Unknown error", eventType },
      })
    } catch {
      // Ignore logging errors
    }
    return true
  }
}
