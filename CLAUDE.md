# CLAUDE.md — PatchPilot

## What this project is

> **Note:** The name "PatchPilot" is not finalized. Use it as a working name only — do not hardcode it into package names, env var prefixes, or branding until confirmed.

**PatchPilot** (working name) is an incident-to-PR verified fix agent built for the "Zero to Agent" hackathon (Vercel × Google DeepMind, San Francisco, March 21 2026).

It turns messy incident evidence (screenshots, logs, PDFs, stack traces) into a verified code fix + human-approved pull request, with full observability, durable orchestration, and role-based approval gates.

The core loop: **ingest → triage → sandbox reproduce → patch → verify → approval gate → open PR → receipt**

## Judge-facing positioning

When describing the product externally, frame it as a **verification-first software reliability system**, not a coding chatbot. The strongest language is:

- **Closed-loop remediation** instead of "bug analysis"
- **Approval-gated autonomy** instead of "autonomous coding"
- **Replayable proof** instead of "AI-generated suggestion"
- **Audit-grade receipts** instead of "logs"
- **Operational memory** instead of "run history"
- **Artifact-native multimodal debugging** instead of "chat input"

### Why it has impact potential

- Repeated incidents become reusable operational knowledge instead of one-off heroics.
- The same workflow can serve SRE, support, QA, platform engineering, release engineering, and internal developer tooling.
- Trust primitives such as allowlists, approval gates, sandbox isolation, and receipts make the system credible beyond a demo.
- The product can expand naturally into multi-repo remediation, CI orchestration, rollback planning, flaky-test investigation, and voice-triggered incident response.

### Why it feels original

- It starts from messy evidence like screenshots, PDFs, logs, and voice notes rather than ideal developer prompts.
- It treats observability as a first-class user experience, not an internal debugging layer.
- It optimizes for reproducible proof, not theatrical code generation.
- It makes human approval part of the core product design, which turns risky automation into accountable operations.

### Live demo language

Use phrases like:

- "This is not a diagnosis bot; it is a closed-loop remediation system."
- "The proof is visible live: reproduce, patch, verify, approve, and ship."
- "Every risky action is either sandboxed or approval-gated."
- "The Run Trace is the trust layer."
- "RePro leaves behind reusable operational memory, not just a chat transcript."

---

## Tech stack

| Layer | Technology |
|---|---|
| Framework | Next.js 16 (App Router) on Vercel |
| Durable orchestration | Vercel Workflow DevKit (`"use workflow"` / `"use step"`) |
| Safe execution | Vercel Sandbox (`@vercel/sandbox`) |
| Multi-platform chat | Vercel Chat SDK (`chat`, `@chat-adapter/slack`, `@chat-adapter/github`) |
| AI models | AI SDK v6 (`ai`) — direct Google provider with AI Gateway fallback |
| Primary model | `google/gemini-3.1-pro-preview` via `@ai-sdk/google` or AI Gateway |
| Database + realtime | Supabase (Postgres via pooler + Realtime) |
| Auth | Better Auth with GitHub OAuth social login |
| Observability | Sentry + `vercelAIIntegration` |
| UI components | shadcn/ui (Base UI primitives) + Outfit font |
| Voice | ElevenLabs WebSockets (STT + TTS) |
| Code indexing | Augment Code SDK (`@augmentcode/auggie-sdk`) |
| State adapter | `@chat-adapter/state-pg` (Supabase Postgres) |

---

## Project layout

```
/
├── app/
│   ├── page.tsx                    # Landing page (auth gate)
│   ├── dashboard/
│   │   ├── layout.tsx              # Dashboard shell with user menu
│   │   ├── page.tsx                # Runs list
│   │   ├── new/page.tsx            # New run form
│   │   ├── recipes/page.tsx        # Repo policy viewer
│   │   └── admin/page.tsx          # Audit console (runs, approvals, policies, correlation)
│   ├── runs/[runId]/page.tsx       # Run trace detail (realtime timeline + approval)
│   ├── voice/page.tsx              # ElevenLabs STT voice intake
│   └── api/
│       ├── auth/[...all]/route.ts  # Better Auth handler
│       ├── runs/start/route.ts     # Start workflow (validates against repo policy)
│       ├── runs/[runId]/approve/   # Per-run approval endpoint
│       ├── runs/[runId]/receipts/  # Receipt download
│       ├── runs/[runId]/replay/    # Replay run
│       ├── hooks/approval/route.ts # Resume workflow approval hook
│       ├── webhooks/[platform]/    # Chat SDK webhook dispatch (Slack, GitHub)
│       ├── voice/token/route.ts    # ElevenLabs token proxy (auth-gated)
│       └── artifacts/upload/       # Evidence upload
├── workflows/
│   ├── patchpilot.ts               # Main durable workflow
│   ├── hooks/pr-approval.ts        # Approval hook definition
│   └── steps/
│       ├── emit.ts                 # Event emission to Supabase + chat notifications
│       ├── db.ts                   # Database operations (runs, patches, approvals, steps, CI, receipts)
│       ├── parse.ts                # AI incident parsing (Gemini structured output)
│       ├── files.ts                # AI file extraction
│       ├── sandbox-fix.ts          # Sandbox execution + AI agent tool loop
│       ├── pr.ts                   # GitHub PR creation (hunk-based diff application)
│       ├── ci.ts                   # GitHub Actions CI monitoring
│       └── receipts.ts             # Receipt package generation
├── lib/
│   ├── auth.ts                     # Better Auth with GitHub OAuth, lazy Pool init
│   ├── auth-client.ts              # Client-side auth (signIn, signOut, useSession)
│   ├── auth-guard.ts               # requireAuth, requireAdmin, requireApprover
│   ├── github.ts                   # GitHub App token helpers (read/write two-token pattern)
│   ├── github-auth.ts              # GitHub OAuth scopes
│   ├── bot.tsx                     # Chat SDK instance (lazy init, Slack + GitHub adapters)
│   ├── bot-notifier.ts             # Workflow→chat thread bridge
│   ├── sentry.ts                   # Sentry helpers + traceToolCall
│   ├── supabase-admin.ts           # Re-exports from patchpilot/supabase
│   ├── ai/
│   │   ├── models.ts               # getPrimaryModel() — Google direct or AI Gateway
│   │   ├── prompts.ts              # System prompts per workflow step
│   │   └── tools.ts                # AI SDK tools for sandbox (read, edit, search, test, build, diff)
│   ├── sandbox/
│   │   ├── client.ts               # Sandbox lifecycle (create, lockdown, cleanup)
│   │   └── commands.ts             # Policy-aware command execution with redaction
│   ├── patchpilot/
│   │   ├── contracts.ts            # TypeScript types and Zod schemas
│   │   ├── policy.ts               # Repo policy resolution + command allowlist
│   │   ├── scoring.ts              # Confidence, reproducibility, observability scoring
│   │   ├── redaction.ts            # Secret/sensitive text redaction
│   │   ├── receipts.ts             # Receipt generation
│   │   ├── artifacts.ts            # Multimodal artifact handling
│   │   ├── run-id.ts               # Run ID generator
│   │   └── supabase.ts             # Supabase admin client (lazy, autoRefreshToken disabled)
│   ├── receipts/
│   │   ├── slack.tsx               # Chat SDK Card templates (Block Kit)
│   │   └── github.ts               # GitHub markdown comment templates
│   └── voice/
│       ├── stt-client.ts           # ElevenLabs STT WebSocket wrapper
│       └── audio-capture.ts        # Browser mic capture (PCM 16kHz)
├── components/
│   ├── ui/                         # shadcn/ui (accordion, badge, button, card, separator, table, tabs, tooltip)
│   ├── runs/
│   │   ├── run-list-table.tsx      # Runs table
│   │   ├── run-status-badge.tsx    # Color-coded status badge
│   │   ├── run-timeline.tsx        # Realtime event timeline (Supabase subscription)
│   │   ├── approval-card.tsx       # Web approval card (Approve/Reject)
│   │   ├── new-run-form.tsx        # New run creation form
│   │   └── run-action-bar.tsx      # Run detail action buttons
│   ├── recipes/
│   │   └── recipe-viewer.tsx       # Repo policy config display
│   ├── dashboard/
│   │   └── user-menu.tsx           # Avatar + role dropdown + sign out
│   ├── home/
│   │   └── github-sign-in-button.tsx # Landing page GitHub OAuth button
│   └── theme-provider.tsx          # next-themes dark mode wrapper
├── hooks/
│   └── use-run-events.ts           # Supabase Realtime subscription hook
└── supabase/migrations/
    ├── 001_init.sql                # Core schema (runs, events, artifacts, approvals, patches, prs, recipes)
    ├── 002_better_auth.sql         # Auth tables (user, session, account, verification)
    └── 002_productization.sql      # Enhanced columns + run_steps, ci_runs, receipt_packages
```

---

## Key architectural constraints

1. **Workflow DevKit is the agent runtime** — all multi-step logic lives in `workflows/patchpilot.ts`. No ad-hoc background jobs.
2. **Vercel Sandbox is the only executor** — never run AI-generated or user-supplied code outside a Sandbox. Lock down egress after dep install.
3. **PR creation requires explicit approval** — implemented via `createHook()`. No pushes, no PRs without an Approver clicking "Approve."
4. **No `setInterval`/`setTimeout` in workflow functions** — Supabase and all DB operations must be in `"use step"` functions, not in the `"use workflow"` body. The Supabase client uses `setInterval` for auth refresh which is banned in the workflow VM.
5. **AI model selection** — `getPrimaryModel()` from `lib/ai/models.ts` prefers `GOOGLE_GENERATIVE_AI_API_KEY` (direct, no billing gate) over AI Gateway (requires Vercel credit card). All steps import from this module.
6. **Supabase via pooler** — `POSTGRES_URL` must use the Supabase connection pooler (`aws-0-us-west-2.pooler.supabase.com:5432`), not the direct host. Direct IPv6 connection is unreachable from most local networks.
7. **Better Auth uses `pg.Pool`** — not the `{ type: "postgres", url }` adapter, which fails with the pooler. Pass `new Pool({ connectionString, ssl: { rejectUnauthorized: false } })` directly.
8. **Run IDs are nanoid strings** — the `runs.id` column is `TEXT`, not `UUID`. All foreign key columns referencing it are also `TEXT`.
9. **Run Trace is the product** — every workflow step writes events to Supabase; the dashboard shows them live via Realtime.
10. **Repo policies gate run creation** — the `/api/runs/start` endpoint validates against the `recipes` table. Repos without a policy are rejected.

---

## Roles (Better Auth)

| Role | Can do |
|---|---|
| Viewer | Watch runs, download receipts |
| Operator | Start runs |
| Approver | Approve PR creation, rollbacks |
| Admin | Manage allowlists, connectors, roles, audit exports |

---

## Environment variables

```bash
NEXT_PUBLIC_APP_URL=http://localhost:3000

# Vercel (from vercel link + vercel env pull)
VERCEL_OIDC_TOKEN=

# AI: Google Direct (preferred — no billing gate)
GOOGLE_GENERATIVE_AI_API_KEY=

# Supabase (use pooler connection string, not direct)
POSTGRES_URL=postgresql://postgres.<ref>:<password>@aws-0-<region>.pooler.supabase.com:5432/postgres
SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_URL=
SUPABASE_ANON_KEY=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=

# Better Auth
BETTER_AUTH_SECRET=     # openssl rand -hex 32
BETTER_AUTH_URL=http://localhost:3000

# GitHub App (PR creation + chat adapter)
GITHUB_APP_ID=
GITHUB_PRIVATE_KEY=     # full .pem contents
GITHUB_INSTALLATION_ID=
GITHUB_WEBHOOK_SECRET=
GITHUB_BOT_USERNAME=

# GitHub OAuth (social sign-in via Better Auth)
GITHUB_CLIENT_ID=       # from GitHub App → "Identifying and authorizing users"
GITHUB_CLIENT_SECRET=   # generate under Client secrets

# Chat SDK — Slack
SLACK_BOT_TOKEN=
SLACK_SIGNING_SECRET=

# Sentry
SENTRY_DSN=
NEXT_PUBLIC_SENTRY_DSN=

# ElevenLabs
ELEVENLABS_API_KEY=

# Augment Code (optional)
AUGMENT_API_TOKEN=
```

---

## Coding conventions

- **Default to Server Components**. Add `"use client"` only when interactivity or browser APIs are needed.
- **All request APIs are async** in Next.js 16: `await cookies()`, `await headers()`, `await params`.
- **Use `proxy.ts`** (not `middleware.ts`) for request interception in Next.js 16.
- **UI**: shadcn/ui with Base UI primitives. Dark mode default. `rounded-[24px]`+ for liquid glass aesthetic.
- **Commits**: no co-author footers. User is the sole author.
- **No `@vercel/postgres` or `@vercel/kv`** — they are sunset. Use Supabase.
- **Lazy initialization** for Chat SDK bot and Better Auth — adapters validate env vars at construction time, which breaks `next build`.
- **Redaction** — all tool receipts, command outputs, and event data pass through `redactUnknown()` or `redactSensitiveText()` before storage.
- **Policy-aware commands** — sandbox commands check `assertCommandAllowed(policy, category)` before execution.

---

## Scoring (every completed run produces)

- **Patch confidence** (0-100): boosted by reproduction, passing tests, small diff, CI pass; reduced by flaky tests, missing info, large diff
- **Reproducibility** (0-100): based on replay count and success rate
- **Observability coverage** (%): tracked steps with receipts / total expected steps

---

## Known limitations

- Sandbox requires Vercel project with sandbox enabled + OIDC token; falls back to mock data if unavailable
- `NODE_TLS_REJECT_UNAUTHORIZED=0` may be needed for local dev if network intercepts HTTPS (VPN/proxy)
- GitHub App callback URL must be set manually in GitHub App settings
- Better Auth tables must exist before first sign-in (migration 002_better_auth.sql)
