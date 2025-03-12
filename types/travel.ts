export interface City {
  name: string
  coordinates: [number, number] // [longitude, latitude]
}

export interface Attraction {
  name: string
  description?: string
  coordinates: [number, number] // [longitude, latitude]
}

export interface AdventureCard {
  id?: string
  type: "landmark" | "clue"
  title: string
  content: string
  imageUrl?: string
  imageLoading?: boolean
}

