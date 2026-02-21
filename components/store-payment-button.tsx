"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Loader2 } from "lucide-react"

interface StorePaymentButtonProps {
  storeDomain: string
  storeName: string
}

export function StorePaymentButton({ storeDomain, storeName }: StorePaymentButtonProps) {
  const [loading, setLoading] = useState(false)

  const handlePayment = async () => {
    setLoading(true)

    try {
      const response = await fetch("/api/payments/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ store_domain: storeDomain }),
      })

      const data = await response.json()

      if (response.ok && data.checkout_url) {
        // Redirect to checkout (demo mode) or Stripe
        window.location.href = data.checkout_url
      } else {
        alert(`Feil: ${data.error || "Kunne ikke starte betaling"}`)
        setLoading(false)
      }
    } catch (error) {
      console.error("[v0] Payment error:", error)
      alert("Noe gikk galt. Prøv igjen.")
      setLoading(false)
    }
  }

  return (
    <Button
      onClick={handlePayment}
      disabled={loading}
      className="bg-green-600 hover:bg-green-700 text-white px-8 py-6 text-lg font-semibold"
    >
      {loading ? (
        <>
          <Loader2 className="mr-2 h-5 w-5 animate-spin" />
          Behandler...
        </>
      ) : (
        "Kjøp nå"
      )}
    </Button>
  )
}
