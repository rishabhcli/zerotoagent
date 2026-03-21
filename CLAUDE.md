# CLAUDE.md — PatchPilot

## What this project is

> **Note:** The name "PatchPilot" is not finalized. Use it as a working name only — do not hardcode it into package names, env var prefixes, or branding until confirmed.

**PatchPilot** (working name) is an incident-to-PR verified fix agent built for the "Zero to Agent" hackathon (Vercel × Google DeepMind, San Francisco, March 21 2026).

It turns messy incident evidence (screenshots, logs, PDFs, stack traces) into a verified code fix + human-approved pull request, with full observability, durable orchestration, and role-based approval gates.

The core loop: **ingest → triage → sandbox reproduce → patch → verify → approval gate → open PR → receipt**

---

## Tech stack

| Layer                 | Technology                                                              |
| --------------------- | ----------------------------------------------------------------------- |
| Framework             | Next.js (App Router) on Vercel                                          |
| Durable orchestration | Vercel Workflow DevKit (`"use workflow"` / `"use step"`)                |
| Safe execution        | Vercel Sandbox (`@vercel/sandbox`)                                      |
| Multi-platform chat   | Vercel Chat SDK (`chat`, `@chat-adapter/slack`, `@chat-adapter/github`) |
| AI models             | AI SDK (`ai`) + AI Gateway (`@ai-sdk/gateway`)                          |
| Primary model         | `google/gemini-3.1-pro-preview` (via AI Gateway)                        |
| Database + realtime   | Supabase (Postgres + Realtime)                                          |
| Auth                  | Better Auth                                                             |
| Observability         | Sentry + `vercelAIIntegration`                                          |
| UI components         | shadcn/ui + Geist                                                       |
| Voice                 | ElevenLabs WebSockets (STT + TTS)                                       |
| Code indexing         | Augment Code SDK (`@augmentcode/auggie-sdk`)                            |
| State adapter         | `@chat-adapter/state-pg` (Supabase Postgres)                            |

---

## Monorepo layout (planned)

```
/
├── app/                    # Next.js App Router
│   ├── (dashboard)/        # Web UI — run trace, approval console, admin
│   ├── api/
│   │   ├── chat/           # Chat SDK webhook endpoints (Slack, GitHub)
│   │   ├── workflow/       # Workflow DevKit compiled routes
│   │   ├── approval/       # Hook resume endpoint
│   │   └── voice/          # ElevenLabs token + relay endpoints
│   └── ...
├── workflows/
│   └── patchpilot.ts       # Main durable workflow (use workflow / use step)
├── lib/
│   ├── bot.ts              # Chat SDK instance
│   ├── sandbox.ts          # Sandbox helpers
│   ├── ai.ts               # AI SDK + Gateway setup
│   └── db.ts               # Supabase client
└── components/             # shadcn/ui components + AI Elements
```

---

## Key architectural constraints

1. **Workflow DevKit is the agent runtime** — all multi-step logic lives in `workflows/patchpilot.ts`. No ad-hoc background jobs.
2. **Vercel Sandbox is the only executor** — never run AI-generated or user-supplied code outside a Sandbox. Lock down egress after dep install.
3. **PR creation requires explicit approval** — implemented via `defineHook()`. No pushes, no PRs without an Approver clicking "Approve."
4. **AI Gateway for all model calls** — use `"google/gemini-3.1-pro-preview"` as the model string. Do not use direct provider SDKs (`@ai-sdk/google`) unless a feature is missing from the Gateway.
5. **Run Trace is the product** — every workflow step writes events to Supabase; the dashboard shows them live via Realtime.

---

## Roles (Better Auth)

| Role     | Can do                                              |
| -------- | --------------------------------------------------- |
| Viewer   | Watch runs, download receipts                       |
| Operator | Start runs                                          |
| Approver | Approve PR creation, rollbacks                      |
| Admin    | Manage allowlists, connectors, roles, audit exports |

---

## Environment variables

```bash
NEXT_PUBLIC_APP_URL=

# Vercel Sandbox (populated by: vercel env pull)
VERCEL_OIDC_TOKEN=

# AI Gateway
AI_GATEWAY_API_KEY=

# Chat SDK — Slack
SLACK_BOT_TOKEN=
SLACK_SIGNING_SECRET=

# Chat SDK — GitHub
GITHUB_APP_ID=
GITHUB_PRIVATE_KEY=
GITHUB_INSTALLATION_ID=
GITHUB_WEBHOOK_SECRET=
GITHUB_BOT_USERNAME=patchpilot

# Supabase
POSTGRES_URL=
SUPABASE_URL=
SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=

# Better Auth
BETTER_AUTH_SECRET=
BETTER_AUTH_URL=

# Sentry
SENTRY_DSN=
SENTRY_AUTH_TOKEN=

# ElevenLabs
ELEVENLABS_API_KEY=

# Augment Code (optional)
AUGMENT_API_TOKEN=
AUGMENT_API_URL=
```

---

## Build order (hackathon phases)

1. **Phase 1 — skeleton**: Next.js + Supabase schema + Sentry + Better Auth + AI Gateway wired up. Empty dashboard that lists runs.
2. **Phase 2 — workflow**: PatchPilot durable workflow end-to-end (no chat). Start from dashboard button.
3. **Phase 3 — sandbox**: Sandbox patch loop — clone → repro → patch → tests → store logs.
4. **Phase 4 — chat**: Chat SDK adapters for Slack + GitHub. Drive runs from chat, approval buttons.
5. **Phase 5 — voice**: ElevenLabs STT/TTS page. Receipt still goes to Slack/dashboard.
6. **Phase 6 — foundry framing**: Minimal "recipe" UI showing PatchPilot's tool/policy config.

---

## Coding conventions

- **Default to Server Components**. Add `"use client"` only when interactivity or browser APIs are needed.
- **All request APIs are async** in Next.js: `await cookies()`, `await headers()`, `await params`.
- **Use `proxy.ts`** (not `middleware.ts`) for request interception in Next.js 16.
- **UI**: shadcn/ui + Geist. Dark mode default for dashboards. Never build raw controls from scratch when a shadcn primitive exists.
- **AI text rendering**: always use AI Elements (`<MessageResponse>`) — never render raw `{text}` or `<p>{content}</p>`.
- **Commits**: no co-author footers. User is the sole author.
- **No `@vercel/postgres` or `@vercel/kv`** — they are sunset. Use `@neondatabase/serverless` or Supabase, and `@upstash/redis` respectively.

---

## Observability checklist (every run must produce)

- Run ID, initiator, start/end time, mode (dry-run vs apply), repo scope
- Evidence ledger: filenames, types, extracted summary
- Model decisions: hypotheses, chosen path, confidence score, unknowns
- Tool call ledger: what ran, order, params (redacted), outcome, duration
- Sandbox receipts: commands, stdout/stderr (redacted), test results, exit codes
- Network policy events: blocked/allowed outbound requests
- Workflow state: step statuses, retries, pauses, resumes
- Approval record: who, what, when
- Final outputs: patch summary, PR link, confidence score, rollback recommendation
- Sentry trace link (matching Run ID)
