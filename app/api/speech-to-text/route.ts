import { type NextRequest, NextResponse } from "next/server"

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData()
    const audioBlob = formData.get("audio") as Blob
    const openAIKey = process.env.OPENAI_API_KEY

    if (!audioBlob) {
      return NextResponse.json({ error: "Audio file is required" }, { status: 400 })
    }

    if (!openAIKey) {
      return NextResponse.json({ error: "OpenAI API key is not configured on the server" }, { status: 500 })
    }

    // Create a form data object for the OpenAI API request
    const openAIFormData = new FormData()
    openAIFormData.append("file", audioBlob, "recording.webm")
    openAIFormData.append("model", "whisper-1")

    // Call OpenAI API to transcribe audio
    const response = await fetch("https://api.openai.com/v1/audio/transcriptions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${openAIKey}`,
      },
      body: openAIFormData,
    })

    if (!response.ok) {
      const errorData = await response.json()
      throw new Error(`OpenAI API error: ${JSON.stringify(errorData)}`)
    }

    const data = await response.json()
    return NextResponse.json({ text: data.text })
  } catch (error) {
    console.error("Error in speech-to-text API:", error)
    return NextResponse.json({ error: "Failed to transcribe audio" }, { status: 500 })
  }
}

