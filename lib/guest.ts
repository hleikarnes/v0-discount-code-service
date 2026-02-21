import { cookies } from "next/headers"

const GUEST_ID_COOKIE = "guest_id"

/**
 * Get the current guest ID from cookies (server-side only)
 */
export async function getGuestId(): Promise<string | null> {
  const cookieStore = await cookies()
  const guestIdCookie = cookieStore.get(GUEST_ID_COOKIE)
  return guestIdCookie?.value || null
}

/**
 * Get guest ID or throw error if not found
 */
export async function requireGuestId(): Promise<string> {
  const guestId = await getGuestId()
  if (!guestId) {
    throw new Error("Guest ID not found")
  }
  return guestId
}
