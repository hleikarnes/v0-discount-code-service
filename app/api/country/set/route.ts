import { type NextRequest, NextResponse } from "next/server"
import { setPreferredCountry, isSupportedCountry } from "@/lib/country"

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { country } = body

    if (!country || !isSupportedCountry(country)) {
      return NextResponse.json({ error: "Invalid country code" }, { status: 400 })
    }

    await setPreferredCountry(country)

    return NextResponse.json({ success: true, country })
  } catch (error) {
    console.error("[v0] Error setting country:", error)
    return NextResponse.json({ error: "Failed to set country" }, { status: 500 })
  }
}
