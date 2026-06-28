# /orchestrator — CI/CD Pipeline

Run the full CI/CD pipeline for TravelPlan AI. Spawns focused subagents in parallel where
stages are independent, then gates on results before proceeding.

## Usage

```
/orchestrator           # full pipeline: validate → build → security → report
/orchestrator deploy    # full pipeline + Vercel preview deploy on success
/orchestrator prod      # full pipeline + Vercel production deploy on success
```

---

## Pipeline stages

### Stage 1 — Validate (parallel, fast-fail gate)

Spawn TWO subagents in a single message (parallel):

**Subagent A — TypeScript check**
```
Agent({
  description: "TypeScript type check",
  prompt: "Run `npx tsc --noEmit` in /Users/jasewang/Documents/AI/Claude/ai_project/travel-plan-ai.
           Report: PASS or FAIL with every error line. Do not fix anything — just report.
           Return a one-line status: TYPECHECK_PASS or TYPECHECK_FAIL."
})
```

**Subagent B — ESLint**
```
Agent({
  description: "ESLint check",
  prompt: "Run `npx eslint src/ --max-warnings 0` in the project root
           /Users/jasewang/Documents/AI/Claude/ai_project/travel-plan-ai.
           Report: PASS or FAIL with every warning/error. Do not fix anything.
           Return a one-line status: LINT_PASS or LINT_FAIL."
})
```

If either subagent reports FAIL → stop, surface the errors, do NOT proceed to Stage 2.

---

### Stage 2 — Build (sequential, depends on Stage 1)

Spawn ONE subagent:

**Subagent C — Production build**
```
Agent({
  description: "Next.js production build",
  prompt: "Run `npm run build` in /Users/jasewang/Documents/AI/Claude/ai_project/travel-plan-ai.
           Capture stdout/stderr. Report PASS if exit code is 0, FAIL otherwise.
           On failure quote the first error block verbatim.
           Return a one-line status: BUILD_PASS or BUILD_FAIL."
})
```

If BUILD_FAIL → stop, surface the error, do NOT proceed to Stage 3.

---

### Stage 3 — Security (parallel with Stage 2 output known)

Spawn TWO subagents in a single message (parallel):

**Subagent D — Dependency audit**
```
Agent({
  description: "npm audit",
  prompt: "Run `npm audit --audit-level=high` in
           /Users/jasewang/Documents/AI/Claude/ai_project/travel-plan-ai.
           Report any HIGH or CRITICAL vulnerabilities. List each with package name,
           severity, and fix command.
           Return a one-line status: AUDIT_PASS (no high/critical) or AUDIT_FAIL."
})
```

**Subagent E — Secret scan**
```
Agent({
  description: "Secret / credential scan",
  subagent_type: "Explore",
  prompt: "Search ALL source files under src/ in
           /Users/jasewang/Documents/AI/Claude/ai_project/travel-plan-ai
           for patterns that look like hardcoded secrets:
           - strings matching sk-ant-, AIza, amad, Bearer followed by long tokens
           - any key/secret/password variable assigned a non-env-var string literal
           - any API URL with credentials embedded
           Exclude node_modules, .next, .env* files.
           Report each finding: file:line — pattern found.
           Return a one-line status: SECRETS_PASS (nothing found) or SECRETS_FAIL."
})
```

Security failures are WARNING level — report them but do NOT block deployment unless
SECRETS_FAIL (hardcoded credentials are a hard stop).

---

### Stage 4 — Deploy (conditional, only if /orchestrator deploy or prod)

**Subagent F — Vercel deploy**
```
Agent({
  description: "Vercel deployment",
  subagent_type: "vercel:deployment-expert",
  prompt: "Deploy the Next.js app at
           /Users/jasewang/Documents/AI/Claude/ai_project/travel-plan-ai to Vercel.
           Mode: [PREVIEW | PRODUCTION] (set by caller).
           Steps:
           1. Run `vercel deploy` (preview) OR `vercel deploy --prod` (production).
           2. Capture the deployment URL.
           3. Verify the deployment succeeded (HTTP 200 on the root URL).
           Report the deployment URL and status.
           Return a one-line status: DEPLOY_PASS <url> or DEPLOY_FAIL <reason>."
})
```

---

## Result summary

After all stages complete, print a summary table:

```
┌──────────────────┬────────────┬─────────────────────────┐
│ Stage            │ Status     │ Notes                   │
├──────────────────┼────────────┼─────────────────────────┤
│ TypeScript       │ ✅ PASS    │                         │
│ ESLint           │ ✅ PASS    │                         │
│ Build            │ ✅ PASS    │                         │
│ npm audit        │ ⚠️  WARN   │ 1 moderate vuln         │
│ Secret scan      │ ✅ PASS    │                         │
│ Deploy           │ ✅ PASS    │ https://...vercel.app   │
└──────────────────┴────────────┴─────────────────────────┘
```

Exit conditions:
- TYPECHECK or LINT FAIL → abort at Stage 1, fix errors first
- BUILD FAIL → abort at Stage 2
- SECRETS FAIL → abort before deploy, never ship hardcoded credentials
- AUDIT FAIL (high/critical) → warn but allow override with `/orchestrator deploy --force`

---

## Subagent reference

| ID | Type | Purpose |
|----|------|---------|
| A | `claude` | `npx tsc --noEmit` |
| B | `claude` | `npx eslint src/` |
| C | `claude` | `npm run build` |
| D | `claude` | `npm audit` |
| E | `Explore` | grep for hardcoded secrets in src/ |
| F | `vercel:deployment-expert` | Vercel deploy + verify |

Stages 1 subagents (A+B) run in parallel.
Stages 3 subagents (D+E) run in parallel after Stage 2 passes.
Stage 4 subagent (F) runs after Stage 3 clears.
