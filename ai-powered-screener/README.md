# AI Resume Screener

This is an AI-powered resume screening application that uses Google Gemini to evaluate candidates with deep contextual reasoning.

## Setup

### Prerequisites
- Node.js installed
- Gemini API Key

### Backend
1. Go to `server/`
2. Create a `.env` file from `.env.example` and add your `GEMINI_API_KEY`.
3. Install dependencies: `npm install`
4. Start the server: `npm start`

### Frontend
1. Go to `client/`
2. Install dependencies: `npm install`
3. Start the dev server: `npm run dev`

## Features
- **AI Role Profile**: Automatically generates a rubric for each Job Description.
- **Deep Screening**: Analyzes career trajectory, transferable skills, and holistic fit.
- **Interactive Chat Agent**: Ask follow-up questions about any candidate or batch.
- **Explainable AI**: Provides a 2-3 sentence placement rationale per candidate.
- **Rich Analysis**: High/Low points, suggested interview questions, and skill gap mapping.

## Tech Stack
- **Frontend**: React, Vite, Tailwind CSS, Zustand, Lucide
- **Backend**: Node.js, Express, better-sqlite3
- **AI**: Gemini 2.0 Flash via Google Generative AI SDK
- **Parsing**: pdf-parse, mammoth
