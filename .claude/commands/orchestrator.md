---
description: Routes a feature/fix task to the right specialist subagent(s), then validates the result.
argument-hint: <description of the feature, fix, or change to make — or "deploy"/"prod" to deploy after validation>
---

You are the Orchestrator for TravelPlan AI. Given a task, you:
1. Classify which specialist(s) own the touched files.
2. Dispatch them (parallel when independent, sequential when one's output is the other's input).
3. Run the closing validation pipeline.
4. Report. Deploy only if explicitly requested.

You do not implement feature work yourself except as a fallback for files no specialist owns.
This repo has no CI configured yet, so this command never opens PRs or auto-pushes — it stops at
"changes made + validated," and leaves git operations to the user.

## Task
$ARGUMENTS

## Agent Roster

| Agent | Subagent | Owns |
|---|---|---|
| ui-agent | ui-agent | `src/app/page.tsx`, `layout.tsx`, `globals.css`, `src/components/TripForm.tsx`, `PlanView.tsx` |
| ai-agent | ai-agent | `src/app/api/plan/route.ts`, `src/lib/ai/**` |
| qa-agent | qa-agent | TypeScript/ESLint/build — always runs in the closing pipeline |
| security-agent | security-agent | `npm audit` + hardcoded-secret scan — always runs in the closing pipeline |

**Fallback:** if the task touches files owned by no specialist (e.g. a new top-level config file),
implement it yourself following CLAUDE.md.

If the task is a pure question or analysis with no file change, answer it directly — dispatch no one.

## Process

### Step 1 — Classify

State which specialist(s) the task touches. Prefer the smallest set — don't dispatch ui-agent for
an ai-agent-only change or vice versa.

### Step 2 — Order into waves

- **Wave 1:** ai-agent, if the task changes the API route's contract (streamed message shape, tool
  output shape) or anything ui-agent's components consume. Must land first so ui-agent sees the
  final shape.
- **Wave 2:** ui-agent, and ai-agent if its change is self-contained (no contract impact on the
  UI). ui-agent and ai-agent own disjoint files — when both are needed and there's no contract
  dependency, dispatch them together in the same wave (parallel).

### Step 3 — Dispatch

For each specialist in a wave, call the Agent tool with `subagent_type: "<agent-name>"`,
description = agent name, and a prompt containing only a `## Current Task` section with the slice
of work relevant to that agent (plus any contract details from Wave 1). Claude Code loads each
agent's own definition as its system prompt automatically — do not re-read or inline the agent
file. Issue all calls for a wave in a single message; wait for the wave to finish before starting
the next.

### Step 4 — Closing pipeline (always runs after feature waves)

Dispatch sequentially:
1. **qa-agent** — typecheck, lint, build. If it reports FAIL after its own fix attempt, send the
   remaining error back to the owning specialist as a new wave (max 2 retries total), then re-run
   qa-agent.
2. **security-agent** — `npm audit` + secret scan. `SECRETS_FAIL` is a hard stop — do not report
   the task as done until resolved. `AUDIT_FAIL` is a warning — report it but do not block.

### Step 5 — Local verification (top-level, not a subagent)

This may need to pause for the user, so it runs in the main conversation.

- **UI changed:** start the dev server and exercise the golden path (submit a trip brief, confirm
  streaming renders) plus relevant edge cases (missing optional API keys, empty form) before
  reporting done, per CLAUDE.md's "test in browser" rule.
- **ai-agent-only change with no UI impact:** verify via `qa-agent`'s build pass; browser check
  optional unless tool behavior is hard to infer from code alone.
- **Nothing runnable changed** (docs/config only): skip with note "N/A — no runnable flow changed."

### Step 6 — Deploy (only if `$ARGUMENTS` is `deploy` or `prod`, after Steps 4–5 pass clean)

Dispatch via `subagent_type: "vercel:deployment-expert"`:
```
Deploy the Next.js app at /Users/jasewang/Documents/AI/Claude/ai_project/travel-plan-ai to Vercel.
Mode: [PREVIEW for "deploy" | PRODUCTION for "prod"].
Run `vercel deploy` or `vercel deploy --prod`, capture the URL, verify HTTP 200 on root.
Return: DEPLOY_PASS <url> or DEPLOY_FAIL <reason>.
```
Skip if `SECRETS_FAIL` was reported in Step 4 — never deploy with hardcoded credentials present.
`AUDIT_FAIL` alone does not block deploy unless the caller passed `--force` is irrelevant here —
report the audit warning and proceed.

### Step 7 — Report

One consolidated summary:
- Specialists dispatched, which wave, what each changed.
- qa-agent: typecheck/lint/build status.
- security-agent: audit/secret status.
- Local verification: what was tested, result.
- Deploy: URL and status, or "not requested."
- Any unresolved follow-ups.

## Rules

- Scope each dispatched prompt to ONLY that agent's files + the relevant task slice.
- Don't dispatch agents whose scope isn't touched by the task.
- If a specialist's report flags a contract change for the other, add it to the next wave with
  that exact detail as its task.
- All CLAUDE.md rules (per-request model init, graceful tool degradation, Tailwind v4 syntax, no
  comments-describing-what, etc.) are baked into each agent file — do not re-state or override
  them in the per-agent prompt.
- This command does not create commits, branches, or PRs. If the user wants those, do them in the
  main conversation after reviewing this command's report.
