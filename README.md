# RePro

**Verification-first incident response agent** — turns messy incident evidence into a tested, human-approved pull request with full observability, audit-grade receipts, and replayable proof.

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

## Why it matters

- **Closed-loop remediation** — RePro does not stop at diagnosis; it moves from incident evidence to verified code change
- **Durable operational impact** — every run becomes reusable institutional memory through receipts, approvals, and trace history
- **Built for real teams** — useful for SRE, support, platform, QA, and developer productivity workflows beyond a hackathon setting
- **Trustworthy autonomy** — approval-gated execution, sandbox verification, and policy controls make the system deployable in production environments

---

## Why it is different

- **Artifact-native multimodal debugging** — starts from screenshots, PDFs, logs, and voice notes instead of idealized prompts
- **Verification before generation theater** — reproduces the problem, patches it, and proves the outcome before asking to open a PR
- **Observability as a product surface** — the Run Trace is not backend plumbing; it is the trust layer judges and teams can inspect live
- **Replayable software reliability** — the same fix flow can be rerun in a clean sandbox to demonstrate reproducibility, not just one-off success
- **Human-in-the-loop by design** — role-based approvals convert risky automation into accountable agentic operations

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

## Demo proof points

- **Live, legible execution** — judges can watch evidence intake, reproduction, patch verification, approval, and PR creation in one continuous flow
- **Proof over promises** — every meaningful claim is backed by tests, logs, receipts, and a Sentry-linked trace
- **Platform wedge** — the same runtime can expand into multi-repo incident response, flaky-test triage, CI orchestration, and voice-driven operations

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
