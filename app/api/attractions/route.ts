import { type NextRequest, NextResponse } from "next/server"
import type { Attraction } from "@/types/travel"

export async function POST(request: NextRequest) {
  try {
    const { city } = await request.json()
    const openAIKey = process.env.OPENAI_API_KEY

    if (!city) {
      return NextResponse.json({ error: "City is required" }, { status: 400 })
    }

    if (!openAIKey) {
      return NextResponse.json({ error: "OpenAI API key is not configured on the server" }, { status: 500 })
    }

    console.log(`Fetching attractions for ${city}...`)

    // Define add marker tool with coordinates
    const addMarkerTool = {
      type: "function",
      function: {
        name: "addMapMarker",
        description: "Add a marker for an attraction on the map",
        parameters: {
          type: "object",
          properties: {
            name: {
              type: "string",
              description: "The name of the attraction",
            },
            description: {
              type: "string",
              description: "A brief description of the attraction",
            },
            longitude: {
              type: "number",
              description: "The longitude coordinate of the attraction",
            },
            latitude: {
              type: "number",
              description: "The latitude coordinate of the attraction",
            },
          },
          required: ["name", "description", "longitude", "latitude"],
        },
      },
    }

    // Create a new ReadableStream for streaming the response
    const stream = new ReadableStream({
      async start(controller) {
        try {
          // Get the top attractions with coordinates directly from OpenAI
          console.log("Getting top attractions with coordinates for", city)
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
                    "You are a helpful travel assistant that provides information about top attractions in cities, including their precise coordinates.",
                },
                {
                  role: "user",
                  content: `Identify the top 3 must-visit attractions in ${city}. For each attraction, provide its name, a brief description, and its precise coordinates (longitude and latitude). Use the addMapMarker function to add each attraction to the map.`,
                },
              ],
              tools: [addMarkerTool],
              tool_choice: "auto",
            }),
          })

          if (!response.ok) {
            const errorData = await response.json()
            throw new Error(`OpenAI API error: ${JSON.stringify(errorData)}`)
          }

          const data = await response.json()
          const attractions: Attraction[] = []

          // Process tool calls to add markers
          if (data.choices[0]?.message?.tool_calls) {
            const toolCalls = data.choices[0].message.tool_calls

            for (const toolCall of toolCalls) {
              if (toolCall.function.name === "addMapMarker") {
                try {
                  const args = JSON.parse(toolCall.function.arguments)

                  // Use the coordinates provided directly by OpenAI
                  const longitude = args.longitude
                  const latitude = args.latitude

                  console.log(`Using provided coordinates for ${args.name}: [${longitude}, ${latitude}]`)

                  // Add to attractions
                  attractions.push({
                    name: args.name,
                    description: args.description,
                    coordinates: [longitude, latitude],
                  })
                } catch (e) {
                  console.error("Error processing tool call:", e)
                }
              }
            }
          }

          if (attractions.length === 0) {
            throw new Error("Failed to get any attractions with coordinates")
          }

          // Send the final result
          controller.enqueue(new TextEncoder().encode(JSON.stringify({ attractions })))
        } catch (error) {
          console.error("Error in attractions API:", error)
          controller.enqueue(
            new TextEncoder().encode(
              JSON.stringify({
                error: error instanceof Error ? error.message : "Failed to fetch attractions. Please try again.",
              }),
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
      },
    })
  } catch (error) {
    console.error("Error in attractions API:", error)
    return NextResponse.json({ error: "Failed to fetch attractions. Please try again." }, { status: 500 })
  }
}

