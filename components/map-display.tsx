"use client"

import { useEffect, useRef } from "react"
import mapboxgl from "mapbox-gl"
import "mapbox-gl/dist/mapbox-gl.css"
import type { City, Attraction } from "@/types/travel"

interface MapDisplayProps {
  city: City | null
  attractions: Attraction[]
}

export default function MapDisplay({ city, attractions }: MapDisplayProps) {
  const mapContainer = useRef<HTMLDivElement>(null)
  const map = useRef<mapboxgl.Map | null>(null)
  const markersRef = useRef<mapboxgl.Marker[]>([])

  // Initialize map when component mounts
  useEffect(() => {
    if (!mapContainer.current) return

    console.log("Initializing map")
    mapboxgl.accessToken = process.env.NEXT_PUBLIC_MAPBOX_ACCESS_TOKEN || ""

    map.current = new mapboxgl.Map({
      container: mapContainer.current,
      style: "mapbox://styles/mapbox/streets-v12",
      center: [103.8198, 1.3521], // Singapore coordinates as default center
      zoom: 2,
    })

    // Add navigation controls
    map.current.addControl(new mapboxgl.NavigationControl(), "top-right")

    // Cleanup on unmount
    return () => {
      if (map.current) {
        map.current.remove()
        map.current = null
      }
    }
  }, [])

  // Update map when city changes
  useEffect(() => {
    if (!map.current || !city) return

    console.log("City changed, updating map:", city)

    // Clear existing markers
    markersRef.current.forEach((marker) => marker.remove())
    markersRef.current = []

    // If we have valid coordinates, fly to the city
    if (city.coordinates[0] !== 0 && city.coordinates[1] !== 0) {
      console.log("Flying to city coordinates:", city.coordinates)
      map.current.flyTo({
        center: city.coordinates,
        zoom: 11,
        essential: true,
      })
    } else {
      // If we don't have coordinates, use geocoding to find the city
      console.log("Geocoding city:", city.name)
      fetch(
        `https://api.mapbox.com/geocoding/v5/mapbox.places/${encodeURIComponent(city.name)}.json?access_token=${mapboxgl.accessToken}`,
      )
        .then((response) => response.json())
        .then((data) => {
          if (data.features && data.features.length > 0) {
            const [lng, lat] = data.features[0].center
            console.log("Found city coordinates:", [lng, lat])
            city.coordinates = [lng, lat] // Update the city coordinates

            map.current?.flyTo({
              center: [lng, lat],
              zoom: 11,
              essential: true,
            })
          } else {
            console.warn("No geocoding results found for city:", city.name)
          }
        })
        .catch((error) => console.error("Error geocoding city:", error))
    }
  }, [city])

  // Add markers for attractions
  useEffect(() => {
    if (!map.current) return

    console.log("Attractions changed, updating markers:", attractions)

    // Clear existing markers
    markersRef.current.forEach((marker) => marker.remove())
    markersRef.current = []

    if (!attractions.length) {
      console.log("No attractions to display")
      return
    }

    // Add markers for each attraction
    attractions.forEach((attraction, index) => {
      if (!attraction.coordinates) {
        console.warn("Attraction missing coordinates:", attraction)
        return
      }

      console.log(`Adding marker for ${attraction.name} at ${attraction.coordinates}`)

      // Create custom marker element
      const el = document.createElement("div")
      el.className = "marker"
      el.style.backgroundColor = "#F97316"
      el.style.width = "24px"
      el.style.height = "24px"
      el.style.borderRadius = "50%"
      el.style.display = "flex"
      el.style.justifyContent = "center"
      el.style.alignItems = "center"
      el.style.color = "white"
      el.style.fontWeight = "bold"
      el.style.fontSize = "14px"
      el.textContent = `${index + 1}`

      // Create popup
      const popup = new mapboxgl.Popup({ offset: 25 }).setHTML(
        `<h3 style="font-weight: bold">${attraction.name}</h3>
   <p>${attraction.description || ""}</p>
   <p style="margin-top: 8px; font-size: 12px; color: #666;">
     Coordinates: ${attraction.coordinates[0].toFixed(4)}, ${attraction.coordinates[1].toFixed(4)}
   </p>`,
      )

      // Add marker to map
      const marker = new mapboxgl.Marker(el).setLngLat(attraction.coordinates).setPopup(popup).addTo(map.current)

      markersRef.current.push(marker)
    })

    // Fit bounds to include all markers if we have more than one
    if (attractions.length > 1 && attractions.every((a) => a.coordinates)) {
      console.log("Fitting bounds to include all attractions")
      const bounds = new mapboxgl.LngLatBounds()
      attractions.forEach((attraction) => {
        if (attraction.coordinates) {
          bounds.extend(attraction.coordinates)
        }
      })

      map.current.fitBounds(bounds, {
        padding: 50,
        maxZoom: 15,
      })
    }
  }, [attractions])

  return <div ref={mapContainer} className="w-full h-full rounded-lg overflow-hidden shadow-lg" />
}

