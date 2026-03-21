# PatchPilot

**Incident-to-PR verified fix agent** — turns messy incident evidence into a tested, human-approved pull request with full observability.

Built for the [Zero to Agent](https://zerotoagent.com) hackathon (Vercel × Google DeepMind, San Francisco, March 21 2026).

---

## What it does

1. **Ingest** — accepts screenshots, logs, PDFs, and stack traces from Slack, GitHub, or the web UI
2. **Triage** — diagnoses the likely root cause with a confidence score
3. **Reproduce** — verifies the issue in an isolated Vercel Sandbox
4. **Patch** — generates a fix, applies it, and runs the test suite
5. **Gate** — pauses for explicit human approval before opening any PR
6. **Ship** — opens the PR with a summary, diff, test proof, and downloadable receipts
7. **Trace** — every step is logged to a live Run Trace timeline with a Sentry-linked view

---

## Tech stack

| Concern               | Technology                                            |
| --------------------- | ----------------------------------------------------- |
| Framework             | Next.js (App Router) on Vercel                        |
| Durable orchestration | Vercel Workflow DevKit                                |
| Safe execution        | Vercel Sandbox                                        |
| Multi-platform chat   | Vercel Chat SDK (Slack + GitHub)                      |
| AI models             | AI SDK + AI Gateway (`google/gemini-3.1-pro-preview`) |
| Database + realtime   | Supabase (Postgres + Realtime)                        |
| Auth                  | Better Auth                                           |
| Observability         | Sentry + Vercel AI SDK integration                    |
| Voice                 | ElevenLabs (STT + TTS)                                |
| UI                    | shadcn/ui + Geist                                     |
| Code intelligence     | Augment Code SDK                                      |

---

## Getting started

```bash
# 1. Clone and install
git clone https://github.com/your-org/zerotoagent
cd zerotoagent
npm install

# 2. Link to Vercel and pull env vars (provisions OIDC token for Sandbox + AI Gateway)
vercel link
vercel env pull

# 3. Set remaining env vars (see .env.example)
cp .env.example .env.local

# 4. Run locally
npm run dev
```

---

## Key features

- **Run Trace timeline** — every model decision, tool call, sandbox command, and approval is visible in the dashboard
- **Durable workflows** — runs survive crashes and deployments; approvals can wait days without compute
- **Sandboxed execution** — code runs in isolated Firecracker microVMs with egress lockdown
- **Role-based approval gates** — PR creation requires explicit Approver action; no pushes happen automatically
- **Multi-platform** — one bot codebase, deployed to Slack and GitHub simultaneously
- **Receipts** — downloadable package with reproduction steps, test outputs, diff, tool ledger, and approval record

---

## Observability

Every run is linked to a Sentry trace by Run ID. The admin console shows searchable run history, approval logs, allowlist configuration, and incident correlation across repos.

---

## Roles

| Role     | Permissions                                         |
| -------- | --------------------------------------------------- |
| Viewer   | View runs, download receipts                        |
| Operator | Start runs                                          |
| Approver | Approve PR creation and rollbacks                   |
| Admin    | Manage allowlists, connectors, roles, audit exports |

---

## Research

- [`overview.md`](overview.md) — full product spec and UX flows
- [`deep-research-report-shallow.md`](deep-research-report-shallow.md) — hackathon strategy and winning wedge
- [`deep-research-report-deep.md`](deep-research-report-deep.md) — architecture blueprint, tech stack mapping, and implementation plan
