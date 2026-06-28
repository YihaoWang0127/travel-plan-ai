# TravelPlan AI ✈️

Describe a trip in plain language and TravelPlan AI researches **live data** —
the web, real places, flights and hotels — to generate a detailed, day-by-day
itinerary with a budget breakdown and practical tips.

Built with **Next.js 16** (App Router), **React 19**, the **Vercel AI SDK v7**,
and **Claude (Opus 4.8)** via the Anthropic provider.

## How it works

```
TripForm (UI)  ──►  /api/plan  ──►  streamText(Claude + tools)  ──►  streamed Markdown plan
                                        │
                                        ├─ webSearch      (Anthropic native, real-time)
                                        ├─ searchPlaces   (Google Places — venues, hours, ratings)
                                        ├─ searchFlights  (Amadeus — live fares)
                                        └─ searchHotels   (Amadeus — live nightly pricing)
```

Claude plans across up to 12 reasoning/tool steps: it researches first, then
writes one cohesive itinerary. Each external tool **degrades gracefully** to web
search when its API key is absent — so the app runs with only an Anthropic key.

## Setup

```bash
npm install
cp .env.example .env.local   # already done — add your keys
npm run dev
```

Then open http://localhost:3000.

### Environment variables

| Variable | Required | Purpose |
| --- | --- | --- |
| `ANTHROPIC_API_KEY` | ✅ | Claude planning engine |
| `GOOGLE_MAPS_API_KEY` | optional | Real places (Google Places New) |
| `AMADEUS_CLIENT_ID` / `AMADEUS_CLIENT_SECRET` | optional | Live flights & hotels |
| `AMADEUS_ENV` | optional | `production` to use the live Amadeus host |
| `TRAVEL_MODEL` | optional | Override the Claude model id |

## Project layout

| Path | What |
| --- | --- |
| `src/app/page.tsx` | Form + streaming plan UI (`useChat`) |
| `src/app/api/plan/route.ts` | Planning engine endpoint |
| `src/lib/ai/prompt.ts` | System prompt / itinerary spec |
| `src/lib/ai/tools/` | Web, places, flights, hotels tools |
| `src/lib/ai/amadeus.ts` | Shared Amadeus client (token caching) |
| `src/components/` | `TripForm`, `PlanView` |

## Roadmap ideas

- Map view of each day's stops (Google Maps embed)
- Export to PDF / calendar
- Save & share itineraries (add a database)
- Follow-up chat to refine ("make day 2 cheaper")
