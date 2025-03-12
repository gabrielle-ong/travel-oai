"use client"

import { useState, useEffect } from "react"
import CitySearch from "./city-search"
import MapDisplay from "./map-display"
import AdventureCarousel from "./adventure-carousel"
import { Button } from "@/components/ui/button"
import { useToast } from "@/components/ui/use-toast"
import type { Attraction, City, AdventureCard } from "@/types/travel"
import { useMobile } from "@/hooks/use-mobile"
import { Loader2 } from "lucide-react"

export default function TravelExplorer() {
  const [selectedCity, setSelectedCity] = useState<City | null>(null)
  const [attractions, setAttractions] = useState<Attraction[]>([])
  const [adventureCards, setAdventureCards] = useState<AdventureCard[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [isSearching, setIsSearching] = useState(false)
  const [showAdventure, setShowAdventure] = useState(false)
  const [isGeneratingAdventure, setIsGeneratingAdventure] = useState(false)
  const { toast } = useToast()
  const isMobile = useMobile()

  // Debug effect to log attractions when they change
  useEffect(() => {
    console.log("Attractions updated:", attractions)
  }, [attractions])

  const handleCitySelect = async (city: City) => {
    console.log("City selected:", city)

    setSelectedCity(city)
    setShowAdventure(false)
    setIsSearching(true)
    setAttractions([]) // Clear existing attractions

    try {
      console.log("Fetching attractions for:", city.name)
      const response = await fetch("/api/attractions", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          city: city.name,
        }),
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || "Failed to fetch attractions")
      }

      const data = await response.json()
      console.log("Attractions API response:", data)

      if (data.attractions && Array.isArray(data.attractions)) {
        console.log(`Received ${data.attractions.length} attractions`)
        setAttractions(data.attractions)
      } else {
        console.error("Invalid attractions data format:", data)
        throw new Error("Invalid attractions data received")
      }
    } catch (error) {
      console.error("Error fetching attractions:", error)
      toast({
        title: "Error",
        description:
          error instanceof Error
            ? error.message
            : "Failed to fetch attractions. Please check your API key and try again.",
        variant: "destructive",
      })
    } finally {
      setIsSearching(false)
    }
  }

  const startAdventure = async () => {
    if (!selectedCity || attractions.length === 0) {
      console.error("Cannot start adventure: city or attractions missing", {
        city: selectedCity,
        attractionsCount: attractions.length,
      })
      return
    }

    setIsGeneratingAdventure(true)
    setShowAdventure(true) // Show the adventure UI immediately
    setAdventureCards([]) // Clear any existing cards

    try {
      console.log("Starting adventure generation...")
      console.log("Using attractions:", attractions)

      // Start a streaming connection to get adventure cards as they're generated
      const response = await fetch("/api/adventure", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          city: selectedCity.name,
          attractions,
        }),
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || "Failed to generate adventure")
      }

      // Handle streaming response
      const reader = response.body?.getReader()
      if (!reader) throw new Error("Response body is not readable")

      const decoder = new TextDecoder()
      let buffer = ""

      while (true) {
        const { done, value } = await reader.read()
        if (done) break

        const chunk = decoder.decode(value, { stream: true })
        console.log("Received chunk:", chunk)
        buffer += chunk

        // Process complete lines in the buffer
        const lines = buffer.split("\n")
        // Keep the last line in the buffer if it's incomplete
        buffer = lines.pop() || ""

        for (const line of lines) {
          if (!line.trim()) continue

          try {
            const data = JSON.parse(line)
            console.log("Processed data:", data)

            if (data.type === "card") {
              // Add a new card
              setAdventureCards((prev) => [...prev, data.card])
            } else if (data.type === "image") {
              // Update a specific card with its image
              setAdventureCards((prev) =>
                prev.map((card) =>
                  card.id === data.cardId ? { ...card, imageUrl: data.imageUrl, imageLoading: false } : card,
                ),
              )
            } else if (data.type === "image-error") {
              // Mark image loading as complete even if there was an error
              setAdventureCards((prev) =>
                prev.map((card) => (card.id === data.cardId ? { ...card, imageLoading: false } : card)),
              )
            } else if (data.type === "complete") {
              console.log("Adventure generation complete")
              setIsGeneratingAdventure(false)
            } else if (data.type === "error") {
              throw new Error(data.message)
            }
          } catch (e) {
            console.error("Error processing line:", line, e)
          }
        }
      }
    } catch (error) {
      console.error("Error generating adventure:", error)
      toast({
        title: "Error",
        description:
          error instanceof Error
            ? error.message
            : "Failed to generate adventure. Please check your API key and try again.",
        variant: "destructive",
      })
      setShowAdventure(false)
    } finally {
      setIsGeneratingAdventure(false)
    }
  }

  return (
    <div className="space-y-6">
      <div className={`${isMobile ? "flex flex-col space-y-4" : "grid grid-cols-3 gap-6"}`}>
        <div className={isMobile ? "w-full" : "col-span-1"}>
          <div className="bg-white rounded-lg p-4 shadow-sm border border-sky-100">
            <h2 className="text-xl font-semibold mb-4 text-sky-700">Choose a Destination</h2>
            <CitySearch onCitySelect={handleCitySelect} isSearching={isSearching} />

            {selectedCity && attractions.length > 0 && (
              <div className="mt-6">
                <h3 className="text-lg font-medium mb-2 text-slate-700">Top Attractions in {selectedCity.name}</h3>
                <ul className="list-disc pl-5 space-y-1 text-slate-600">
                  {attractions.map((attraction, index) => (
                    <li key={index}>{attraction.name}</li>
                  ))}
                </ul>
                <Button
                  className="w-full mt-4 bg-sky-500 hover:bg-sky-600 text-white"
                  onClick={startAdventure}
                  disabled={isGeneratingAdventure}
                >
                  {isGeneratingAdventure ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Preparing Adventure...
                    </>
                  ) : (
                    "Start Mystery Adventure"
                  )}
                </Button>
              </div>
            )}
          </div>
        </div>

        <div className={isMobile ? "w-full h-[300px]" : "col-span-2 h-[500px]"}>
          <MapDisplay city={selectedCity} attractions={attractions} />
        </div>
      </div>

      {showAdventure && (
        <div className="mt-8">
          {adventureCards.length > 0 ? (
            <AdventureCarousel cards={adventureCards} city={selectedCity!.name} />
          ) : (
            <div className="bg-white rounded-lg p-8 shadow-sm border border-sky-100 text-center">
              <Loader2 className="h-8 w-8 animate-spin mx-auto mb-4 text-sky-500" />
              <p className="text-lg text-slate-700">
                Generating your mystery adventure
                <span className="inline-block ml-1">
                  <span className="animate-pulse">.</span>
                  <span className="animate-pulse animation-delay-200">.</span>
                  <span className="animate-pulse animation-delay-400">.</span>
                </span>
              </p>
              <p className="text-sm text-slate-500 mt-2">
                This may take a moment as we craft your personalized experience
              </p>
            </div>
          )}
        </div>
      )}
    </div>
  )
}

