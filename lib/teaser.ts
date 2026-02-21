import type { StoreCode, TeaserCode } from "./types"

/**
 * TEASER SELECTION RULES:
 * Pre-payment teasers should show:
 * - Top 2 cart codes (best value: highest percent, then highest amount)
 * - + Free shipping (if available, as a dedicated third slot)
 * 
 * Teasers only consider codes with a valid coupon_code.
 * Max 3 teasers shown.
 */
export function selectTeasers(codes: StoreCode[]): TeaserCode[] {
  const teasers: TeaserCode[] = []

  // Separate codes by scope - only consider cart codes for teasers
  const cartCodes = codes.filter((c) => c.scope === "cart")

  // Separate free shipping from discount codes
  const freeShipping = cartCodes.find((c) => c.benefit_type === "free_shipping")
  const discountCodes = cartCodes.filter((c) => c.benefit_type !== "free_shipping")

  // Sort discount codes by value (best first)
  const sortedDiscounts = [...discountCodes].sort((a, b) => {
    // Sort by percent first (higher is better)
    if (a.benefit_type === "percent_off" && b.benefit_type === "percent_off") {
      return (b.value_percent ?? 0) - (a.value_percent ?? 0)
    }
    // Sort by amount (higher is better)
    if (a.benefit_type === "amount_off" && b.benefit_type === "amount_off") {
      return (b.value_amount ?? 0) - (a.value_amount ?? 0)
    }
    // Prefer percent over amount (percent codes first)
    if (a.benefit_type === "percent_off") return -1
    if (b.benefit_type === "percent_off") return 1
    return 0
  })

  // Add top 2 discount codes
  if (sortedDiscounts.length > 0) {
    teasers.push(codeToTeaser(sortedDiscounts[0]))
  }
  if (sortedDiscounts.length > 1) {
    teasers.push(codeToTeaser(sortedDiscounts[1]))
  }

  // Add free shipping in dedicated third slot (if available)
  if (freeShipping) {
    teasers.push(codeToTeaser(freeShipping))
  }

  return teasers
}

function codeToTeaser(code: StoreCode): TeaserCode {
  return {
    benefit_type: code.benefit_type,
    scope: code.scope,
    value_percent: code.value_percent,
    value_amount: code.value_amount,
    currency: code.currency,
    min_purchase_amount: code.min_purchase_amount,
  }
}
