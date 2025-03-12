import type { NextRequest } from "next/server"

export async function POST(request: NextRequest) {
  try {
    const { location, city, userInput } = await request.json()
    const openAIKey = process.env.OPENAI_API_KEY

    if (!location || !city) {
      return new Response(JSON.stringify({ error: "Location and city are required" }), {
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

    // Create a new ReadableStream for streaming the response
    const stream = new ReadableStream({
      async start(controller) {
        try {
          // Prepare the prompt based on whether there's user input
          let promptContent = `Provide 1 interesting fact about ${location} in ${city}.`

          // If there's user input, incorporate it into the prompt
          if (userInput && userInput.trim()) {
            promptContent = `The user asked: "${userInput}" about ${location} in ${city}. 
            Respond directly to their question with relevant information. 
            If they're asking for general information, provide 1 interesting fact about this location.`
          }

          // Call OpenAI API with streaming enabled
          const response = await fetch("https://api.openai.com/v1/chat/completions", {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              Authorization: `Bearer ${openAIKey}`,
            },
            body: JSON.stringify({
              model: "gpt-4o",
              messages: [
                {
                  role: "system",
                  content:
                    "You are a knowledgeable travel guide that provides interesting and factual information about landmarks and locations.",
                },
                {
                  role: "user",
                  content: promptContent,
                },
              ],
              stream: true,
            }),
          })

          if (!response.ok) {
            const errorData = await response.json()
            throw new Error(`OpenAI API error: ${JSON.stringify(errorData)}`)
          }

          const reader = response.body?.getReader()
          if (!reader) throw new Error("Response body is not readable")

          let accumulatedText = ""

          while (true) {
            const { done, value } = await reader.read()
            if (done) break

            // Process the chunk
            const chunk = new TextDecoder().decode(value)
            const lines = chunk.split("\n").filter((line) => line.trim() !== "")

            for (const line of lines) {
              if (line.startsWith("data: ")) {
                const data = line.slice(6)
                if (data === "[DONE]") continue

                try {
                  const parsed = JSON.parse(data)
                  const content = parsed.choices[0]?.delta?.content || ""
                  if (content) {
                    accumulatedText += content
                    // Send each chunk immediately to the client
                    controller.enqueue(new TextEncoder().encode(content))
                  }
                } catch (e) {
                  console.error("Error parsing JSON:", e)
                }
              }
            }
          }
        } catch (error) {
          console.error("Error in streaming:", error)
          controller.enqueue(
            new TextEncoder().encode(`Error: ${error instanceof Error ? error.message : "Unknown error"}`),
          )
        } finally {
          controller.close()
        }
      },
    })

    return new Response(stream, {
      headers: {
        "Content-Type": "text/plain; charset=utf-8",
        "Transfer-Encoding": "chunked",
      },
    })
  } catch (error) {
    console.error("Error in additional-info API:", error)
    return new Response(JSON.stringify({ error: "Failed to fetch additional information" }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    })
  }
}

