import { Suspense } from "react"
import TravelExplorer from "@/components/travel-explorer"
import { Toaster } from "@/components/ui/toaster"

export default function Home() {
  return (
    <main className="min-h-screen bg-gradient-to-b from-sky-50 to-white text-slate-800">
      <div className="container mx-auto px-4 py-8">
        <h1 className="text-4xl font-bold text-center mb-8 text-sky-700">Mystery Adventure Explorer</h1>
        <Suspense fallback={<div className="text-center">Loading explorer...</div>}>
          <TravelExplorer />
        </Suspense>
        <Toaster />
      </div>
    </main>
  )
}

