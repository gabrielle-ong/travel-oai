import type { NextRequest } from "next/server"

export async function POST(request: NextRequest) {
  try {
    const { city, attractions }: { city: string; attractions: { name: string }[] } = await request.json()
    const openAIKey = process.env.OPENAI_API_KEY

    if (!city || !attractions) {
      return new Response(JSON.stringify({ error: "City and attractions are required" }), {
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

    console.log(`Generating adventure for ${city} with ${attractions.length} attractions`)
    console.log("Attractions:", attractions)

    // Create a new ReadableStream for streaming the response
    const stream = new ReadableStream({
      async start(controller) {
        try {
          // Generate a mystery story that connects the attractions
          console.log("Generating story...")
          const storyResponse = await fetch("https://api.openai.com/v1/chat/completions", {
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
                  content: "You are a creative travel guide that creates engaging mystery adventures.",
                },
                {
                  role: "user",
                  content: `Create a mystery adventure story that connects these 3 attractions in ${city}: ${attractions.map((a) => a.name).join(", ")}. 
              
                  The story should have 5 parts:
                  1. Introduction to the first landmark
                  2. A clue that leads to the second landmark
                  3. Description of the second landmark
                  4. A clue that leads to the third landmark
                  5. Description of the third landmark and conclusion
                  
                  Format the response as a JSON object with an array called "cards". Each card should have "type" (either "landmark" or "clue"), "title", and "content" properties.`,
                },
              ],
              response_format: { type: "json_object" },
            }),
          })

          if (!storyResponse.ok) {
            const errorData = await storyResponse.json()
            console.error("OpenAI API error:", errorData)
            throw new Error(`OpenAI API error: ${JSON.stringify(errorData)}`)
          }

          const storyData = await storyResponse.json()
          console.log("Story response received")

          let storyCards
          try {
            storyCards = JSON.parse(storyData.choices[0].message.content).cards
            console.log("Parsed story cards:", storyCards)
          } catch (error) {
            console.error("Error parsing story cards:", error)
            throw new Error("Failed to parse story cards from OpenAI response")
          }

          console.log("Story generated, sending first card immediately...")

          // Send the first card immediately
          if (storyCards.length > 0) {
            const firstCard = {
              id: `card-0`,
              type: storyCards[0].type,
              title: storyCards[0].title,
              content: storyCards[0].content,
              imageLoading: true,
            }

            // Send the first card
            const firstCardMessage = JSON.stringify({
              type: "card",
              card: firstCard,
            })
            console.log("Sending first card:", firstCardMessage)
            controller.enqueue(new TextEncoder().encode(firstCardMessage + "\n"))
          }

          // Then send the rest of the cards
          for (let i = 1; i < storyCards.length; i++) {
            const card = {
              id: `card-${i}`,
              type: storyCards[i].type,
              title: storyCards[i].title,
              content: storyCards[i].content,
              imageLoading: true,
            }

            const cardMessage = JSON.stringify({
              type: "card",
              card: card,
            })
            console.log("Sending card:", cardMessage)
            controller.enqueue(new TextEncoder().encode(cardMessage + "\n"))
          }

          // Generate images for each card with a simple prompt
          for (let i = 0; i < storyCards.length; i++) {
            const card = storyCards[i]
            try {
              console.log(`Generating image for card ${i}: ${card.title}`)

              // Simple prompt for image generation
              const imagePrompt = `A stylized image of ${card.title} in ${city}. Dramatic and atmospheric.`

              // Generate image with DALL-E
              const imageResponse = await fetch("https://api.openai.com/v1/images/generations", {
                method: "POST",
                headers: {
                  "Content-Type": "application/json",
                  Authorization: `Bearer ${openAIKey}`,
                },
                body: JSON.stringify({
                  model: "dall-e-2",
                  prompt: imagePrompt,
                  n: 1,
                  size: "1024x1024",
                }),
              })

              if (imageResponse.ok) {
                const imageData = await imageResponse.json()
                const imageUrl = imageData.data[0].url
                console.log(`Image generated for card ${i}, sending update`)

                // Send the image update for this specific card
                const imageUpdateMessage = JSON.stringify({
                  type: "image",
                  cardId: `card-${i}`,
                  imageUrl: imageUrl,
                })
                console.log("Sending image update:", imageUpdateMessage)
                controller.enqueue(new TextEncoder().encode(imageUpdateMessage + "\n"))
              } else {
                console.error(`Error generating image for card ${i}:`, await imageResponse.text())
                throw new Error("Failed to generate image")
              }
            } catch (error) {
              console.error(`Error generating image for ${card.title}:`, error)
              // Send error update for this card's image
              const errorMessage = JSON.stringify({
                type: "image-error",
                cardId: `card-${i}`,
              })
              controller.enqueue(new TextEncoder().encode(errorMessage + "\n"))
            }
          }

          // Send completion message
          const completionMessage = JSON.stringify({ type: "complete" })
          console.log("Sending completion:", completionMessage)
          controller.enqueue(new TextEncoder().encode(completionMessage + "\n"))
        } catch (error) {
          console.error("Error in adventure generation:", error)
          const errorMessage = error instanceof Error ? error.message : "Failed to generate adventure"
          console.log("Sending error response:", errorMessage)
          controller.enqueue(new TextEncoder().encode(errorMessage + "\n"))
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
    console.error("Error in adventure API:", error)
    const errorMessage = error instanceof Error ? error.message : "Failed to generate adventure"
    console.log("Sending error response:", errorMessage)
    return new Response(JSON.stringify({ error: errorMessage }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    })
  }
}

