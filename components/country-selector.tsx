"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import type { SupportedCountry } from "@/lib/country"

const COUNTRY_NAMES: Record<SupportedCountry, string> = {
  NO: "Norge",
  SE: "Sverige",
  DK: "Danmark",
  GB: "United Kingdom",
}

interface CountrySelectorProps {
  currentCountry: SupportedCountry
  showSelector: boolean
}

export function CountrySelector({ currentCountry, showSelector }: CountrySelectorProps) {
  const [selected, setSelected] = useState<SupportedCountry>(currentCountry)
  const [isLoading, setIsLoading] = useState(false)

  const handleSave = async () => {
    setIsLoading(true)
    try {
      await fetch("/api/country/set", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ country: selected }),
      })
      window.location.reload()
    } catch (error) {
      console.error("Failed to set country:", error)
    } finally {
      setIsLoading(false)
    }
  }

  if (!showSelector) {
    return <div className="text-sm text-muted-foreground">{COUNTRY_NAMES[currentCountry]}</div>
  }

  return (
    <div className="flex items-center gap-2">
      <Select value={selected} onValueChange={(v) => setSelected(v as SupportedCountry)}>
        <SelectTrigger className="w-40">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          {Object.entries(COUNTRY_NAMES).map(([code, name]) => (
            <SelectItem key={code} value={code}>
              {name}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
      <Button onClick={handleSave} disabled={isLoading || selected === currentCountry}>
        {isLoading ? "Lagrer..." : "Lagre"}
      </Button>
    </div>
  )
}
