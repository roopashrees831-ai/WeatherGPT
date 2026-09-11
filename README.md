# WeatherGPT — NEXORA

A fresh implementation of **WeatherGPT: Conversational AI for Weather Forecasting, Alerts, and Climate Information (PS 26068)**, designed around the submitted technical flow:

**Query + Location → NLP → Weather Data Integration → Processing & Analysis → Risk Detection → AI Response → Personalized Output → Decision Support**

## Core features
- Real-time weather retrieval and 7-day forecasting
- Natural-language WeatherGPT assistant grounded in live meteorological data
- Optional Gemini LLM integration; safe local NLP fallback works without any key
- 13-language voice input/output using browser speech APIs
- Location search and interactive GIS map
- Forecast-derived heavy-rain, flood, wind, heat and storm risk scoring
- Explainable risk factors and early-warning action cards
- Persona modes: Public, Farmer, Traveler, Disaster Team
- Smart Action Window: finds the lowest-risk 3-hour period in the next 24 hours
- What-If Risk Simulator for rain/wind impact scenarios
- 10-year historical climate trend analysis
- Offline resilience: last successful weather snapshot is cached in the browser
- Mobile-responsive interface

## Data sources used by the working prototype
- Open-Meteo Forecast API
- Open-Meteo Air Quality API
- Open-Meteo Historical Weather Archive
- OpenStreetMap / Nominatim for GIS mapping and reverse geocoding

> Forecast-derived risk cards are decision-support estimates, not official disaster warnings.

## Run

```powershell
npm install
npm run dev
```

Open http://localhost:3000

## Optional Gemini conversational AI
Copy `.env.example` to `.env.local` and add:

```env
GEMINI_API_KEY=your_key_here
```

Without a key, the app still runs using its grounded multilingual local NLP engine.

## Strong demo sequence
1. Search a city and show live weather.
2. Ask: **“Will it rain tomorrow?”** in WeatherGPT AI.
3. Use the microphone and change the language selector.
4. Open **Alerts & Risk** and explain the score and its contributing factors.
5. Open **Decision Center**, switch between Farmer and Traveler.
6. Show the **Smart Action Window**.
7. Move the What-If rain/wind sliders to demonstrate proactive scenario planning.
8. Open **Climate Intelligence** for 10-year trends.
9. Open **Weather Map** and click any location to recalculate weather and risk.

## Innovation statement
**Most weather tools stop at “what the weather will be.” WeatherGPT NEXORA converts live forecasts into “what it means for me, why it is risky, and what action I should take.”**
