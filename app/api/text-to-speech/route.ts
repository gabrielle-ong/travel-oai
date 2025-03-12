import type { NextRequest } from "next/server"

export async function POST(request: NextRequest) {
  try {
    const { text } = await request.json()
    const openAIKey = process.env.OPENAI_API_KEY

    if (!text) {
      return new Response(JSON.stringify({ error: "Text is required" }), {
        status: 400,
        headers: { "Content-Type": "application/json" },
      })
    }

    if (!openAIKey) {
      return new Response(JSON.stringify({ error: "OpenAI API key is not configured on the server" }), {
        status: 500,
        headers: { "Content-Type": "application/json" },
      })
    }

    // Call OpenAI TTS API
    const response = await fetch("https://api.openai.com/v1/audio/speech", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${openAIKey}`,
      },
      body: JSON.stringify({
        model: "tts-1",
        voice: "alloy",
        input: text,
      }),
    })

    if (!response.ok) {
      const errorData = await response.json()
      throw new Error(`OpenAI API error: ${JSON.stringify(errorData)}`)
    }

    // Return the audio stream directly
    const audioBuffer = await response.arrayBuffer()

    return new Response(audioBuffer, {
      headers: {
        "Content-Type": "audio/mpeg",
      },
    })
  } catch (error) {
    console.error("Error in text-to-speech API:", error)
    return new Response(JSON.stringify({ error: "Failed to convert text to speech" }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    })
  }
}

