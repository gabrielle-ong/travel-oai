"use client"

import type React from "react"

import { useState, useRef, useEffect } from "react"
import Image from "next/image"
import { ChevronLeft, ChevronRight, Volume2, Mic, Info, X, Square, Loader2, ImageIcon } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import type { AdventureCard } from "@/types/travel"
import { useMobile } from "@/hooks/use-mobile"
import { useToast } from "@/components/ui/use-toast"

interface AdventureCarouselProps {
  cards: AdventureCard[]
  city: string
}

export default function AdventureCarousel({ cards, city }: AdventureCarouselProps) {
  const [activeIndex, setActiveIndex] = useState(0)
  const [isPlaying, setIsPlaying] = useState(false)
  const [userInput, setUserInput] = useState("")
  const [isListening, setIsListening] = useState(false)
  const [additionalInfo, setAdditionalInfo] = useState<string | null>(null)
  const [isLoadingInfo, setIsLoadingInfo] = useState(false)
  const audioRef = useRef<HTMLAudioElement | null>(null)
  const mediaRecorderRef = useRef<MediaRecorder | null>(null)
  const audioChunksRef = useRef<Blob[]>([])
  const isMobile = useMobile()
  const { toast } = useToast()
  const [isTranscribing, setIsTranscribing] = useState(false)

  // Initialize audio recording
  useEffect(() => {
    return () => {
      if (mediaRecorderRef.current && mediaRecorderRef.current.state === "recording") {
        mediaRecorderRef.current.stop()
      }
      if (audioRef.current) {
        audioRef.current.pause()
      }
    }
  }, [activeIndex])

  const playAudio = async (text: string) => {
    try {
      setIsPlaying(true)

      const response = await fetch("/api/text-to-speech", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          text,
        }),
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || "Failed to convert text to speech")
      }

      const audioBlob = await response.blob()
      const audioUrl = URL.createObjectURL(audioBlob)

      if (audioRef.current) {
        audioRef.current.src = audioUrl
        audioRef.current.play()
      }
    } catch (error) {
      console.error("Error playing audio:", error)
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to play audio.",
        variant: "destructive",
      })
      setIsPlaying(false)
    }
  }

  const stopAudio = () => {
    if (audioRef.current) {
      audioRef.current.pause()
      audioRef.current.currentTime = 0
      setIsPlaying(false)
    }
  }

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true })

      audioChunksRef.current = []

      const mediaRecorder = new MediaRecorder(stream)
      mediaRecorderRef.current = mediaRecorder

      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          audioChunksRef.current.push(event.data)
        }
      }

      mediaRecorder.onstop = async () => {
        const audioBlob = new Blob(audioChunksRef.current, { type: "audio/webm" })
        await transcribeAudio(audioBlob)

        // Stop all tracks to release the microphone
        stream.getTracks().forEach((track) => track.stop())
      }

      mediaRecorder.start()
      setIsListening(true)
    } catch (error) {
      console.error("Error starting recording:", error)
      toast({
        title: "Microphone Access Error",
        description: "Could not access your microphone. Please check your browser permissions.",
        variant: "destructive",
      })
      setIsListening(false)
    }
  }

  const stopRecording = () => {
    if (mediaRecorderRef.current && mediaRecorderRef.current.state === "recording") {
      mediaRecorderRef.current.stop()
      setIsListening(false)
    }
  }

  const transcribeAudio = async (audioBlob: Blob) => {
    try {
      setIsTranscribing(true)
      const formData = new FormData()
      formData.append("audio", audioBlob)

      const response = await fetch("/api/speech-to-text", {
        method: "POST",
        body: formData,
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || "Failed to transcribe audio")
      }

      const data = await response.json()
      setUserInput(data.text)
      handleUserCommand(data.text)
    } catch (error) {
      console.error("Error transcribing audio:", error)
      toast({
        title: "Transcription Error",
        description: "Failed to transcribe your speech. Please try again or type your command.",
        variant: "destructive",
      })
    } finally {
      setIsTranscribing(false)
    }
  }

  const toggleListening = () => {
    if (isListening) {
      stopRecording()
    } else {
      startRecording()
    }
  }

  const handleUserCommand = async (input: string) => {
    const lowerInput = input.toLowerCase()

    if (lowerInput.includes("learn more") || lowerInput.includes("tell me more")) {
      fetchAdditionalInfo(input)
    } else if (lowerInput.includes("next clue") || lowerInput.includes("see next clue")) {
      if (activeIndex < cards.length - 1) {
        goToNextCard()
      }
    } else if (lowerInput.includes("visit next") || lowerInput.includes("next landmark")) {
      if (activeIndex < cards.length - 1) {
        goToNextCard()
      }
    } else {
      // Process with AI to determine intent
      processUserInput(input)
    }
  }

  const processUserInput = async (input: string) => {
    try {
      const response = await fetch("/api/process-input", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          input,
          cardType: cards[activeIndex].type,
        }),
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || "Failed to process input")
      }

      const data = await response.json()

      if (data.action === "learn_more") {
        fetchAdditionalInfo(input)
      } else if (data.action === "next") {
        if (activeIndex < cards.length - 1) {
          goToNextCard()
        }
      }
    } catch (error) {
      console.error("Error processing user input:", error)
      toast({
        title: "Processing Error",
        description: "Failed to process your input. Please try again with different wording.",
        variant: "destructive",
      })
    }
  }

  const fetchAdditionalInfo = async (userInput?: string) => {
    try {
      setIsLoadingInfo(true)
      setAdditionalInfo("")

      const card = cards[activeIndex]

      const response = await fetch("/api/additional-info", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          location: card.title,
          city,
          userInput: userInput || "",
        }),
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || "Failed to fetch additional info")
      }

      // Handle streaming response
      const reader = response.body?.getReader()
      if (!reader) throw new Error("Response body is not readable")

      const decoder = new TextDecoder()
      let accumulatedInfo = ""

      while (true) {
        const { value, done } = await reader.read()
        if (done) break

        if (value) {
          const chunk = decoder.decode(value, { stream: true })
          accumulatedInfo += chunk
          // Update the UI immediately with each chunk
          setAdditionalInfo(accumulatedInfo)
        }
      }
    } catch (error) {
      console.error("Error fetching additional info:", error)
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to fetch additional information.",
        variant: "destructive",
      })
      setAdditionalInfo(null)
    } finally {
      setIsLoadingInfo(false)
    }
  }

  const goToNextCard = () => {
    if (activeIndex < cards.length - 1) {
      setActiveIndex(activeIndex + 1)
      setAdditionalInfo(null)
      setUserInput("")
    }
  }

  const goToPrevCard = () => {
    if (activeIndex > 0) {
      setActiveIndex(activeIndex - 1)
      setAdditionalInfo(null)
      setUserInput("")
    }
  }

  const handleAudioEnded = () => {
    setIsPlaying(false)
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (userInput.trim()) {
      handleUserCommand(userInput)
    }
  }

  const activeCard = cards[activeIndex]

  return (
    <div className="relative">
      <audio ref={audioRef} onEnded={handleAudioEnded} className="hidden" />

      <div className="flex justify-between items-center mb-4">
        <h2 className="text-2xl font-bold text-sky-700">Mystery Adventure in {city}</h2>
        <div className="flex gap-2">
          <Button
            variant="outline"
            size="icon"
            onClick={goToPrevCard}
            disabled={activeIndex === 0}
            className="border-sky-200 text-sky-700 hover:bg-sky-50"
          >
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <Button
            variant="outline"
            size="icon"
            onClick={goToNextCard}
            disabled={activeIndex === cards.length - 1}
            className="border-sky-200 text-sky-700 hover:bg-sky-50"
          >
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
      </div>

      <Card className="bg-white border border-sky-100 shadow-sm">
        <CardContent className="p-6">
          <div className={`${isMobile ? "flex flex-col" : "grid grid-cols-2 gap-6"}`}>
            <div className="space-y-2">
              <div className="relative aspect-[4/3] overflow-hidden rounded-lg">
                {/* Navigation arrows on the image */}
                {activeIndex > 0 && (
                  <button
                    onClick={goToPrevCard}
                    className="absolute left-2 top-1/2 transform -translate-y-1/2 z-10 bg-black/30 hover:bg-black/50 text-white rounded-full p-2 transition-all duration-200"
                    aria-label="Previous card"
                  >
                    <ChevronLeft className="h-5 w-5" />
                  </button>
                )}

                {activeIndex < cards.length - 1 && (
                  <button
                    onClick={goToNextCard}
                    className="absolute right-2 top-1/2 transform -translate-y-1/2 z-10 bg-black/30 hover:bg-black/50 text-white rounded-full p-2 transition-all duration-200"
                    aria-label="Next card"
                  >
                    <ChevronRight className="h-5 w-5" />
                  </button>
                )}

                {/* Image with loading state */}
                {activeCard.imageLoading ? (
                  <div className="absolute inset-0 flex items-center justify-center bg-slate-100">
                    <div className="text-center">
                      <Loader2 className="h-10 w-10 animate-spin mx-auto mb-2 text-sky-500" />
                      <p className="text-sm text-slate-500">Generating image...</p>
                    </div>
                  </div>
                ) : activeCard.imageUrl ? (
                  <Image
                    src={activeCard.imageUrl || "/placeholder.svg"}
                    alt={activeCard.title}
                    fill
                    className="object-cover"
                  />
                ) : (
                  <div className="absolute inset-0 flex items-center justify-center bg-slate-100">
                    <div className="text-center">
                      <ImageIcon className="h-10 w-10 mx-auto mb-2 text-slate-400" />
                      <p className="text-sm text-slate-500">No image available</p>
                    </div>
                  </div>
                )}

                <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/80 to-transparent p-4">
                  <div className="flex items-center gap-2">
                    <span className="bg-sky-500 text-white px-2 py-1 rounded text-sm font-medium">
                      {activeCard.type === "landmark" ? "Landmark" : "Clue"}
                    </span>
                    <span className="text-white font-bold">
                      {activeIndex + 1} of {cards.length}
                    </span>
                  </div>
                  <h3 className="text-xl font-bold text-white mt-1">{activeCard.title}</h3>
                </div>
              </div>

              {/* Card navigation dots - moved below the image */}
              <div className="flex justify-center gap-1.5 py-1">
                {cards.map((_, index) => (
                  <button
                    key={index}
                    onClick={() => {
                      setActiveIndex(index)
                      setAdditionalInfo(null)
                      setUserInput("")
                    }}
                    className={`w-2.5 h-2.5 rounded-full transition-all ${
                      index === activeIndex ? "bg-sky-500 scale-110" : "bg-sky-200 hover:bg-sky-300"
                    }`}
                    aria-label={`Go to card ${index + 1}`}
                  />
                ))}
              </div>
            </div>

            <div className="space-y-4 mt-4 md:mt-0">
              <div className="relative">
                <div className="prose max-w-none text-slate-700">
                  <p>{activeCard.content}</p>

                  {additionalInfo !== null && (
                    <div className="mt-4 p-3 bg-sky-50 rounded-md border border-sky-100">
                      <h4 className="text-lg font-medium mb-2 text-sky-700 flex items-center">
                        Additional Information
                        {isLoadingInfo && (
                          <span className="ml-2 inline-block">
                            <span className="animate-pulse">.</span>
                            <span className="animate-pulse animation-delay-200">.</span>
                            <span className="animate-pulse animation-delay-400">.</span>
                          </span>
                        )}
                      </h4>
                      <p className="text-slate-600">{additionalInfo || "Loading information..."}</p>
                    </div>
                  )}
                </div>

                <Button
                  variant="outline"
                  size="icon"
                  className="absolute top-0 right-0 border-sky-200 text-sky-700 hover:bg-sky-50"
                  onClick={isPlaying ? stopAudio : () => playAudio(activeCard.content)}
                  disabled={false}
                >
                  {isPlaying ? <X className="h-4 w-4" /> : <Volume2 className="h-4 w-4" />}
                </Button>
              </div>

              <form onSubmit={handleSubmit} className="flex gap-2 mt-4">
                <input
                  type="text"
                  value={userInput}
                  onChange={(e) => setUserInput(e.target.value)}
                  placeholder="Ask a question or say a command..."
                  className="flex-1 px-3 py-2 bg-white border border-slate-200 rounded-md text-slate-700"
                />
                <Button
                  type="button"
                  variant="outline"
                  size="icon"
                  className={
                    isListening
                      ? "bg-red-100 text-red-500 border-red-200"
                      : isTranscribing
                        ? "bg-sky-100 text-sky-500 border-sky-200"
                        : "border-sky-200 text-sky-700 hover:bg-sky-50"
                  }
                  onClick={toggleListening}
                  disabled={isTranscribing}
                >
                  {isListening ? (
                    <Square className="h-4 w-4" />
                  ) : isTranscribing ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Mic className="h-4 w-4" />
                  )}
                </Button>
                <Button type="submit" className="bg-sky-500 hover:bg-sky-600 text-white">
                  Send
                </Button>
              </form>

              <div className="flex flex-wrap gap-2 mt-4">
                <Button
                  variant="secondary"
                  size="sm"
                  onClick={() => handleUserCommand("learn more")}
                  className="bg-sky-100 text-sky-700 hover:bg-sky-200 border-none"
                >
                  <Info className="h-4 w-4 mr-1" />
                  Learn More
                </Button>

                {activeCard.type === "clue" ? (
                  <Button
                    variant="secondary"
                    size="sm"
                    onClick={() => handleUserCommand("visit next landmark")}
                    disabled={activeIndex >= cards.length - 1}
                    className="bg-sky-100 text-sky-700 hover:bg-sky-200 border-none"
                  >
                    Visit Next Landmark
                  </Button>
                ) : (
                  <Button
                    variant="secondary"
                    size="sm"
                    onClick={() => handleUserCommand("see next clue")}
                    disabled={activeIndex >= cards.length - 1}
                    className="bg-sky-100 text-sky-700 hover:bg-sky-200 border-none"
                  >
                    See Next Clue
                  </Button>
                )}
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

