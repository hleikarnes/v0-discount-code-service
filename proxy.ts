import { cookies } from "next/headers"
import { type NextRequest, NextResponse } from "next/server"

const GUEST_ID_COOKIE = "guest_id"
const COOKIE_MAX_AGE = 365 * 24 * 60 * 60 // 1 year in seconds

function generateGuestId(): string {
  return `guest_${Date.now()}_${Math.random().toString(36).substring(2, 15)}`
}

export async function middleware(request: NextRequest) {
  const response = NextResponse.next()
  const cookieStore = await cookies()

  // Check if guest_id cookie exists
  const existingGuestId = cookieStore.get(GUEST_ID_COOKIE)

  if (!existingGuestId) {
    // Generate new guest_id
    const guestId = generateGuestId()

    // Set cookie on response
    response.cookies.set({
      name: GUEST_ID_COOKIE,
      value: guestId,
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      maxAge: COOKIE_MAX_AGE,
      path: "/",
    })

    console.log("[v0] Generated new guest_id:", guestId)
  }

  return response
}

// Match all paths
export const config = {
  matcher: "/:path*",
}
