"use client"

import type React from "react"

import { useState } from "react"
import { Search, Loader2 } from "lucide-react"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import type { City } from "@/types/travel"

const SUGGESTED_CITIES: City[] = [
  { name: "Singapore", coordinates: [103.8198, 1.3521] },
  { name: "Bangkok", coordinates: [100.5018, 13.7563] },
  { name: "Jakarta", coordinates: [106.8456, -6.2088] },
  { name: "Ho Chi Minh City", coordinates: [106.6297, 10.8231] },
]

interface CitySearchProps {
  onCitySelect: (city: City) => void
  isSearching?: boolean
}

export default function CitySearch({ onCitySelect, isSearching = false }: CitySearchProps) {
  const [searchInput, setSearchInput] = useState("")

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault()
    if (!searchInput.trim() || isSearching) return

    // Create a city object with the search input
    // For a custom city, we'll use a placeholder coordinate that will be refined by geocoding
    const city: City = {
      name: searchInput.trim(),
      coordinates: [0, 0], // Placeholder, will be updated by the map component
    }

    onCitySelect(city)
  }

  // Update the button styling
  return (
    <div className="space-y-4">
      <form onSubmit={handleSearch} className="flex gap-2">
        <div className="relative flex-1">
          <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-slate-400" />
          <Input
            type="text"
            placeholder="Enter any city..."
            className="pl-8 border-slate-200"
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
            disabled={isSearching}
          />
        </div>
        <Button type="submit" className="bg-sky-500 hover:bg-sky-600 text-white" disabled={isSearching}>
          {isSearching ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Searching
              <span className="inline-block ml-1">
                <span className="animate-pulse">.</span>
                <span className="animate-pulse animation-delay-200">.</span>
                <span className="animate-pulse animation-delay-400">.</span>
              </span>
            </>
          ) : (
            "Search"
          )}
        </Button>
      </form>

      <div>
        <p className="text-sm text-slate-500 mb-2">Suggested cities:</p>
        <div className="flex flex-wrap gap-2">
          {SUGGESTED_CITIES.map((city) => (
            <Button
              key={city.name}
              variant="outline"
              size="sm"
              className="border-sky-200 text-sky-700 hover:bg-sky-50"
              onClick={() => {
                setSearchInput(city.name)
                onCitySelect(city)
              }}
              disabled={isSearching}
            >
              {city.name}
            </Button>
          ))}
        </div>
      </div>
    </div>
  )
}

