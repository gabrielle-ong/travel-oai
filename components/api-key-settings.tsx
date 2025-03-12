"use client"

import { useState, useEffect } from "react"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { useLocalStorage } from "@/hooks/use-local-storage"
import { useToast } from "@/components/ui/use-toast"
import { Check, AlertCircle } from "lucide-react"

export default function ApiKeySettings() {
  const [openAIKey, setOpenAIKey] = useLocalStorage("openai-api-key", "")
  const [inputOpenAIKey, setInputOpenAIKey] = useState("")
  const [isValidating, setIsValidating] = useState(false)
  const [isKeyValid, setIsKeyValid] = useState<boolean | null>(null)
  const { toast } = useToast()

  useEffect(() => {
    setInputOpenAIKey(openAIKey || "")
  }, [openAIKey])

  const validateAndSaveKey = async () => {
    if (!inputOpenAIKey.trim()) {
      toast({
        title: "API Key Required",
        description: "Please enter your OpenAI API key.",
        variant: "destructive",
      })
      return
    }

    setIsValidating(true)
    setIsKeyValid(null)

    try {
      // Simple validation to check if the key starts with "sk-"
      if (!inputOpenAIKey.trim().startsWith("sk-")) {
        throw new Error("Invalid API key format")
      }

      // Save the key to local storage
      setOpenAIKey(inputOpenAIKey.trim())
      setIsKeyValid(true)

      toast({
        title: "API Key Saved",
        description: "Your OpenAI API key has been saved successfully.",
      })

      // Force a page reload to ensure all components recognize the new key
      window.location.reload()
    } catch (error) {
      console.error("Error validating API key:", error)
      setIsKeyValid(false)

      toast({
        title: "Invalid API Key",
        description: "Please check your OpenAI API key and try again.",
        variant: "destructive",
      })
    } finally {
      setIsValidating(false)
    }
  }

  return (
    <Card className="bg-white border border-sky-100 shadow-sm">
      <CardHeader>
        <CardTitle className="text-sky-700">API Settings</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          <div>
            <label htmlFor="openai-key" className="block text-sm font-medium mb-1 text-slate-700">
              OpenAI API Key
            </label>
            <div className="flex gap-2">
              <div className="relative flex-1">
                <Input
                  id="openai-key"
                  type="password"
                  value={inputOpenAIKey}
                  onChange={(e) => {
                    setInputOpenAIKey(e.target.value)
                    setIsKeyValid(null)
                  }}
                  placeholder="sk-..."
                  className="pr-8 border-slate-200"
                />
                {isKeyValid === true && (
                  <Check className="absolute right-2 top-1/2 transform -translate-y-1/2 h-4 w-4 text-green-500" />
                )}
                {isKeyValid === false && (
                  <AlertCircle className="absolute right-2 top-1/2 transform -translate-y-1/2 h-4 w-4 text-red-500" />
                )}
              </div>
              <Button
                onClick={validateAndSaveKey}
                disabled={isValidating}
                className="bg-sky-500 hover:bg-sky-600 text-white"
              >
                {isValidating ? "Saving..." : "Save"}
              </Button>
            </div>
            <p className="text-xs text-slate-500 mt-1">
              Your API key is stored locally in your browser and never sent to our servers.
              {openAIKey && <span className="text-green-600 ml-1">API key is currently set.</span>}
              <br />
              <span className="text-amber-600">Note: The page will reload after saving to apply your new API key.</span>
            </p>
          </div>

          <div>
            <p className="text-sm text-slate-600">Mapbox API is already configured for this application.</p>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}

