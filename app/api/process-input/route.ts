import type { NextRequest } from "next/server"

export async function POST(request: NextRequest) {
  try {
    const { input, cardType } = await request.json()
    const openAIKey = process.env.OPENAI_API_KEY

    if (!input || !cardType) {
      return new Response(JSON.stringify({ error: "Input and card type are required" }), {
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
                  content: `You are an AI assistant that processes user input for a mystery adventure game and returns JSON. 
                  The user is currently viewing a ${cardType} card. 
                  Determine if the user wants to:
                  1. Learn more about the current location (action: learn_more)
                  2. Move to the next card (action: next)
                  3. Something else (action: other)
                  
                  Also generate a helpful response to the user's input that acknowledges what they said.
                  
                  Return a JSON object with:
                  1. The determined action
                  2. A response text that directly addresses the user's input in a conversational way
                  
                  Example response format:
                  {
                    "action": "learn_more",
                    "responseText": "I'd be happy to tell you more about this landmark! Here's some additional information..."
                  }`,
                },
                {
                  role: "user",
                  content: input,
                },
              ],
              response_format: { type: "json_object" },
              stream: true,
            }),
          })

          if (!response.ok) {
            const errorData = await response.json()
            throw new Error(`OpenAI API error: ${JSON.stringify(errorData)}`)
          }

          const reader = response.body?.getReader()
          if (!reader) throw new Error("Response body is not readable")

          let jsonContent = ""

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
                    jsonContent += content
                  }
                } catch (e) {
                  console.error("Error parsing JSON:", e)
                }
              }
            }
          }

          // Parse the complete JSON response
          try {
            const result = JSON.parse(jsonContent)
            controller.enqueue(
              new TextEncoder().encode(
                JSON.stringify({
                  action: result.action,
                  responseText: result.responseText,
                }),
              ),
            )
          } catch (e) {
            console.error("Error parsing final JSON:", e)
            throw new Error("Failed to parse response from OpenAI")
          }
        } catch (error) {
          console.error("Error in streaming:", error)
          controller.enqueue(
            new TextEncoder().encode(
              JSON.stringify({ error: error instanceof Error ? error.message : "Unknown error" }),
            ),
          )
        } finally {
          controller.close()
        }
      },
    })

    return new Response(stream, {
      headers: {
        "Content-Type": "application/json",
        "Transfer-Encoding": "chunked",
      },
    })
  } catch (error) {
    console.error("Error in process-input API:", error)
    return new Response(JSON.stringify({ error: "Failed to process input" }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    })
  }
}

