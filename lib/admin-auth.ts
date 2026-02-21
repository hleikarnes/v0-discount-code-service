export function verifyAdminSecret(request: Request): boolean {
  const adminSecret = request.headers.get("x-admin-secret")
  const expectedSecret = process.env.ADMIN_SECRET

  if (!expectedSecret) {
    console.warn("[v0] ADMIN_SECRET not configured")
    return false
  }

  return adminSecret === expectedSecret
}
