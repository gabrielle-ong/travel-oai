# Mystery Adventure Explorer

## Overview
Explore the world with Mystery Adventure Explorer! Search for cities and embark on a guided adventure in any that connects major landmarks through an intriguing mystery with clues and discoveries.

## Getting Started

### Prerequisites

- Node.js 18.x or higher
- npm or yarn
- OpenAI API key
- Mapbox API key

### Installation
1. Install dependencies: `npm install` or `yarn install`
2. Set up environment variables:
- Copy `.env.local.example` to `.env.local`
- Add your OpenAI API key
- Add your Mapbox Access Token (Create an account and generate at https://console.mapbox.com/account/access-tokens/)
```
# .env.local
# OpenAI API Key
OPENAI_API_KEY=sk-your-openai-api-key

# Mapbox Access Token (already set in the app as NEXT_PUBLIC_)
NEXT_PUBLIC_MAPBOX_ACCESS_TOKEN=pk-your-mapbox-token
```
3. Run Server: 
```
npm run dev
```
3. Open [http://localhost:3000](http://localhost:3000) in your browser to see the application.

## Features

### City Exploration
- **City Search**: Search for any city worldwide or select from suggested popular destinations
- **Interactive Map**: Visualize city locations and attractions with an interactive Mapbox map

### Mystery Adventures
- **Narrative Experience**: AI-generated mystery adventures that connect major landmarks in each city with clues.
- **Rich Content**: Each landmark and clue includes descriptive text and AI-generated imagery

### Interactive Features
- **Interactive Conversation**: Users can chat to learn more about each attraction via text or voice
- **Text-to-Speech**: Option to listen to descriptions and clues
- **Speech-to-Text**: Option to speak your questions and commands in multiple languages

### OpenAI APIs
- **Chat Completions with Tools**: Uses function calling to add map markers on the map
- **Chat Completions with Streaming**: Streamed responses for a optimized user experience (chat within adventure)
- **Image Generation**: Creates stylized images for each landmark and clue using DALL-E
- **Text-to-Speech**: Converts text descriptions to speech using OpenAI's TTS API
- **Speech-to-Text**: Transcribes user's spoken input using OpenAI's Whisper model

## Possible Enhancements
- **Real-time Chat**: Implement OpenAI's Realtime API for more responsive and immersive voice experiences
- **User-Generated Adventures**: Allow users further customize their mystery adventure, eg themed adventures (culinary, historical), characters
- **Augmented Reality**: Add 3D map features to overlay clues and information on real-world camera views
- **Agent / Operator Workflows**: Add to travel itinerary and booking workflow

