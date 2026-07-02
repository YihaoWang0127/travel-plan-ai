@AGENTS.md

# TravelPlan AI — Project Bible

## What this project does
An AI-powered travel planner built on Next.js 16 + AI SDK v7. Users describe a trip; the app
streams a full day-by-day itinerary grounded in live data from three optional APIs:

| Source | Purpose | Key env var |
|--------|---------|-------------|
| Anthropic Claude | Planning engine, streaming | `ANTHROPIC_API_KEY` |
| Google Places (New) | Real venues, ratings, hours | `GOOGLE_MAPS_API_KEY` |
| Amadeus Self-Service | Live flight & hotel pricing | `AMADEUS_CLIENT_ID` / `_SECRET` |

When optional APIs are absent the app degrades gracefully — the model falls back to web search
for venue and pricing data. The app ships on one required key (`ANTHROPIC_API_KEY`).

---

## Tech stack

| Layer | Library | Version |
|-------|---------|---------|
| Framework | Next.js App Router | 16.2.9 |
| React | React | 19.2.4 |
| AI orchestration | AI SDK (`ai`) | 7.0.4 |
| Anthropic provider | `@ai-sdk/anthropic` | 4.0.1 |
| React AI hooks | `@ai-sdk/react` | 4.0.5 |
| Styling | Tailwind CSS | v4 |
| Icons | lucide-react | 1.22.0 |
| Markdown rendering | react-markdown + remark-gfm | latest |
| Schema validation | Zod | v4 |
| Runtime | Node.js | ≥ 22 |
| Bundler | Turbopack (default in Next 16) | — |

**All `@ai-sdk/*` packages are ESM-only in v4+.** Do not use `require()`.

---

## Repository layout

```
src/
  app/
    api/plan/route.ts      ← POST streaming endpoint; the only server route
    layout.tsx             ← root layout, metadata, font, Tailwind base
    page.tsx               ← client shell: useChat hook + sidebar + plan view
    globals.css            ← Tailwind v4 directives + custom scrollbar
  components/
    TripForm.tsx           ← controlled form → serialises into a text brief
    PlanView.tsx           ← renders streamed markdown, skeleton state
  lib/ai/
    model.ts               ← getPlannerModel(requestedModel?) — ALWAYS create per-request (see gotchas)
    models.ts              ← MODEL_OPTIONS allowlist + DEFAULT_MODEL_ID; zero deps, client-safe
    prompt.ts              ← SYSTEM_PROMPT constant
    amadeus.ts             ← thin Amadeus REST client
    tools/
      index.ts             ← plannerTools bundle
      places.ts            ← Google Places (New) Text Search
      flights.ts           ← Amadeus flight offers
      hotels.ts            ← Amadeus hotel offers (2-step: list then prices)
.claude/
  settings.json            ← Claude Code project permissions
  agents/
    ui-agent.md             ← owns components/, page.tsx, layout.tsx, globals.css
    ai-agent.md              ← owns api/plan/route.ts, lib/ai/**
    qa-agent.md               ← typecheck/lint/build, closing pipeline
    security-agent.md          ← npm audit + secret scan, closing pipeline
  commands/
    orchestrator.md        ← /orchestrator router + validation slash command
AGENTS.md                  ← Next.js 16 version guard (auto-loaded by CLAUDE.md; unrelated to
                              the .claude/agents/ subagents above — do not confuse the two)
CLAUDE.md                  ← this file
```

---

## Environment variables

Copy `.env.example` → `.env.local` and fill in keys. Never commit `.env.local` (already in
`.gitignore`).

```bash
ANTHROPIC_API_KEY=          # Required. Get at console.anthropic.com
GOOGLE_MAPS_API_KEY=        # Optional. Google Cloud → Places API (New)
AMADEUS_CLIENT_ID=          # Optional. developers.amadeus.com (free test tier)
AMADEUS_CLIENT_SECRET=      # Optional.
AMADEUS_ENV=                # Optional. "production" to use live Amadeus host
TRAVEL_MODEL=               # Optional. Server-side default model when a request omits `model`
                             # (default: claude-haiku-4-5). Must be an *enabled* entry in
                             # MODEL_OPTIONS (lib/ai/models.ts) or it's ignored.
```

---

## Development

```bash
npm install
cp .env.example .env.local  # then add ANTHROPIC_API_KEY
npm run dev                 # http://localhost:3000 (Turbopack)
```

The only script in use:
- `npm run dev` — Turbopack dev server
- `npm run build` — production build (validates types + bundling)

There is no test suite yet. TypeScript (`tsc --noEmit`) and the build are the primary correctness
gates.

**Keep `npm run dev` running across a work session.** Turbopack Fast Refresh applies most edits
live — don't stop/restart the dev server after every file change just to "test" it; leave it up
so changes are visible in real time. Only restart when env vars change, a new dependency is
installed, or the server itself has crashed/hung.

---

## Architecture decisions

### Per-request model initialisation (`model.ts`)
**Do not** export a module-level `PLANNER_MODEL` constant. In Next.js 16 / Turbopack,
module-level code can be evaluated in a static context where environment variables are not fully
populated. Always call `getPlannerModel(requestedModel?)` inside the route handler so
`process.env.TRAVEL_MODEL` is read at request time. The function also double-guards with a
`|| DEFAULT_MODEL_ID` to prevent an empty string from reaching the Anthropic API (which rejects
it with a 400).

### Per-trip model selection (`models.ts` + `model`)
`TripForm` lets the user pick a model per trip via a segmented-pill control (Opus 4.8 / Sonnet 5 /
Haiku 4.5 — `MODEL_OPTIONS` in `models.ts`). Each entry carries an `enabled` flag; only Haiku 4.5
is currently enabled — Opus 4.8 and Sonnet 5 render as disabled pills ("Soon") pending cost
review, matching upstream policy. The selection is sent to `/api/plan` as `model` in the request
body via `sendMessage`'s per-request `body` option; `isAllowedModelId()` in `model.ts` validates
it against only the *enabled* subset of `MODEL_OPTIONS` server-side before it ever reaches
`anthropic()`, so neither an arbitrary string nor a disabled model ID can reach the Anthropic API.
Resolution order: valid (enabled) `model` from the client → valid (enabled) `TRAVEL_MODEL` env
var → `DEFAULT_MODEL_ID` (`claude-haiku-4-5`). `models.ts` has zero dependencies (no
`@ai-sdk/anthropic` import) so it's safe for `TripForm.tsx` (a client component) to import
directly without bundling the provider.

### Tools degrade gracefully
Every tool returns `{ configured: false, note: "..." }` when its API key is absent. Claude reads
this signal and substitutes a web-search call. No key → no crash.

### Streaming via AI SDK v7
`streamText` + `result.toUIMessageStreamResponse()` on the server; `useChat` from `@ai-sdk/react`
on the client. The client transport uses `DefaultChatTransport({ api: '/api/plan' })`.
`convertToModelMessages` converts `UIMessage[]` → model-native messages before each call.

### stopWhen: stepCountIs(12)
The model is allowed up to 12 tool-call steps before it must write the final itinerary. This
prevents infinite tool loops while giving enough budget for thorough research (web search +
places + flights + hotels + follow-ups).

### Amadeus two-step hotel flow
Amadeus does not offer a single "search by city + get prices" endpoint. `hotels.ts` first calls
`/v1/reference-data/locations/hotels/by-city` (up to 25 IDs), then passes those IDs to
`/v3/shopping/hotel-offers`. Both calls must succeed for hotel prices to surface.

---

## Coding conventions

- **TypeScript strict mode** — no `any` without justification; prefer explicit return types on
  API boundary functions.
- **No comments describing what code does** — names carry that weight. Add a comment only when
  the WHY is non-obvious (hidden constraint, upstream bug workaround).
- **No module-level side-effects** that depend on `process.env` in Next.js server modules — read
  env inside the function body so Turbopack can evaluate the module statically.
- **Zod v4 only** — import from `'zod'` (v4 is installed). Do not use `'zod/v3'`.
- **Tailwind v4** — use CSS variables and `@theme` directive syntax; Tailwind v3 utility names
  may differ.
- **ESM only** — all `@ai-sdk/*` packages drop CommonJS in v4. Never use `require()`.
- Tool `execute` functions must be `async` even when the result is synchronous (AI SDK v7 type
  requirement).

---

## Known gotchas & past bugs

| Symptom | Root cause | Fix |
|---------|-----------|-----|
| `AI_APICallError: model: String should have at least 1 character` | `PLANNER_MODEL` was a module-level constant; Turbopack evaluated it before env vars were ready | Changed to `getPlannerModel()` called per-request |
| `next lint` command not found | Next.js 16 removed `next lint`; use `npx eslint` directly | — |
| `middleware.ts` not found warning | Next.js 16 renamed `middleware` → `proxy` convention | No proxy file needed for this project |

---

## Agent System

Specialist subagents are defined in `.claude/agents/` (`ui-agent`, `ai-agent`, `qa-agent`,
`security-agent`); the router lives in `.claude/commands/orchestrator.md`. Use `/orchestrator
<task>` for feature work or fixes — it owns the Agent Roster, routing table, wave ordering, and
closing validation pipeline. See `.claude/commands/orchestrator.md` for all of that; don't
duplicate those tables here.

**When to use `/orchestrator` vs. direct chat:** small, single-file edits you're already discussing
in chat can be made directly — there's no hard "every edit needs the router" rule here (this is a
single small Next.js app, not a multi-page/multi-stack project). Reach for `/orchestrator` when a
task spans both `ui-agent` and `ai-agent` territory, or when you want the typecheck/lint/build +
security closing pipeline run automatically after the change.

This repo has no CI configured yet, so `/orchestrator` never opens PRs or auto-pushes — it stops
after validation and reports; git operations stay with the user.

---

## Deployment (Vercel)

```bash
vercel link          # link to Vercel project
vercel env pull      # sync env vars to .env.local
vercel deploy        # preview deployment
vercel deploy --prod # production
```

Required Vercel env vars: same as `.env.example`. Set them in the Vercel dashboard or via
`vercel env add`.
