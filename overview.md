# RePro Expanded Product Prompt

## Executive summary

RePro is a human-friendly “incident-to-PR” agent that turns messy incident evidence (screenshots, logs, PDFs, voice notes) into a verified fix with receipts: it diagnoses the likely root cause, reproduces the problem in a safe test sandbox, proposes and verifies a patch (tests passing), and only then, after role-based human approval, opens a pull request and posts a clear, audit-ready explanation. The standout differentiator is **observability as part of the product experience**: every run produces a readable Run Trace (timeline + tool receipts + approvals), an admin audit console for accountability, and failure-the-right-way behavior (clear error messages, remediation steps, and safe fallback paths) that judges can trust during a live demo.

RePro should be framed not as a “bug-fixing chatbot,” but as a **verification-first software reliability system**: a closed-loop agent that can ingest ambiguous real-world evidence, take accountable action, prove its work, and leave behind reusable operational memory. That positioning increases both **impact potential** and **creativity/originality** because the product is simultaneously a debugging agent, an approval-gated remediation workflow, and a trust layer for production-facing AI operations.

## Why this has durable impact

- **Long-lived operational value**: RePro converts one-off incident firefighting into a repeatable system of record with receipts, approvals, traces, and replayable verification.
- **Broad applicability**: the same workflow is useful for SRE, platform engineering, support escalations, QA, release engineering, and internal developer tooling, not only hackathon judges.
- **Institutional memory**: each run preserves what happened, why it happened, what changed, and what evidence justified the change, reducing repeated investigation cost over time.
- **Production readiness wedge**: approval gates, allowlists, sandbox isolation, and observability make the system credible for regulated or high-risk environments where “autonomous code change” normally fails trust checks.
- **Platform expansion path**: the same core runtime can extend into multi-repo remediation, CI coordination, rollback planning, flaky-test triage, and voice-triggered incident response.

## Why this is creative and original

- **Artifact-native multimodal intake**: RePro starts from screenshots, PDFs, logs, stack traces, and voice notes instead of assuming a clean, developer-authored prompt.
- **Observability as product UX**: most agent demos hide tool execution; RePro makes run traces, receipts, approvals, and Sentry-linked evidence central to the user experience.
- **Verification-first autonomy**: the core loop is not “generate code,” but “reproduce, patch, verify, gate, and only then ship,” which is materially different from generic coding copilots.
- **Replayable proof**: judges and teams can rerun verification in a clean sandbox, making the agent’s claim reproducible rather than theatrical.
- **Human-in-the-loop remediation**: RePro treats approvals as a design feature that unlocks trustworthy autonomy, rather than as a last-minute safety disclaimer.

## How users interact step-by-step across chat, voice, and web

### Entry points and “where work shows up”

RePro must feel consistent across three entry points while keeping **one shared Run Trace** as the system of record:

- **Chat (primary)**: Users start and supervise work in chat (Slack-style experience and GitHub-style experience). The agent posts progress updates and “receipts” back into the thread.
- **Web UI (primary)**: Users see a clear, visual Run Trace timeline, approve high-impact actions, replay runs, and download receipts. This is also where observability is showcased to judges.
- **Voice (optional wow, never required)**: Users can speak an incident when away from a laptop; RePro transcribes, confirms intent, then continues the workflow and posts a text receipt to chat + web.

**Sponsor tech usage requirement (must be used):**

- Chat interactions: Vercel Chat SDK
- Safe execution: Vercel Sandbox
- Durable multi-step runs and approvals: Vercel Workflow/WDK
- Model routing + agent runtime: Vercel AI Gateway + AI SDK
- Reasoning + multimodal: Gemini 3.1 Pro
- Run history + progress streams: Supabase
- Authentication + roles: BetterAuth
- Monitoring + judge-friendly trace linking: Sentry
- Voice: ElevenLabs  
  If any detail below is not decided, mark it as **[UNSPECIFIED]** in your implementation notes.

---

### Chat-first interaction flow (example with artifacts)

**User goal:** “I have incident evidence. I want a verified fix + PR, not commentary.”

**User input example (chat message):**

> “RePro, we’re seeing 500s in checkout after today’s deploy.  
> Attached: screenshot of the error dashboard, log snippet for the last 2 minutes.  
> Repo: `shop-api` (main).  
> What changed? Can you fix it and open a PR once tested?”

**Expected agent response (what it posts back within ~30 seconds):**

- **Acknowledgement + clarity check** (short, non-technical):
  - “Got it. I can attempt a verified fix. Before I start: is the failing behavior happening in prod only, or also staging? [Choose one]”
- **What I understood** (summarize the incident evidence):
  - “You’re seeing 500 responses on checkout after a new deploy; logs show repeated `X` errors; screenshot indicates spike started at ~[time].”
- **What I will do next (preview of steps)**:
  - “1) Extract key signals from your attachments  
    2) Reproduce safely in a test sandbox  
    3) Propose a patch + run tests  
    4) Ask for approval before opening a PR  
    5) Post receipts (diff + test proof + run trace link).”
- **Safety preview**:
  - “I won’t push code or open a PR without explicit approval from an authorized role.”
- **Action button** (or clear prompt):
  - “Start Verified Fix Run →”

**Expected agent progress updates (as the run executes):**

- “Run started: _Run ID_ `PP-2026-03-21-001` — View Run Trace (web)”
- “Step: Evidence extraction complete — Found 3 suspect files, 1 likely root cause”
- “Step: Reproduction attempt — Reproducible ✅ / Not reproducible ⚠️ (with explanation)”
- “Step: Patch drafted — Tests running”
- “Step: Verification complete — Tests passed ✅ / Failed ❌ (with what failed and what I’ll do next)”
- “Approval required: Open PR? [Approve] [Reject]”

**Expected agent final output after approval:**

- “PR opened: `#___`  
  Summary: what changed + why (1–2 paragraphs)  
  Evidence: tests passed + reproduction steps + artifacts (downloadable)  
  Run Trace link (web)  
  Rollback guidance (if relevant)  
  Confidence score: \_\_/100 (what drove it up/down).”

---

### GitHub-style interaction flow (issue comment / PR comment)

**User goal:** “Start from an issue; end with a PR that fixes it.”

**User input example (GitHub issue comment):**

> “RePro: investigate this crash; reproduce and propose a tested fix.  
> Steps: happened after deploy; stack trace in issue body; screenshot attached.”

**Expected agent behavior:**

- Posts a **structured comment** with:
  - “What I understood”
  - “Reproduction plan”
  - “I’m starting a sandbox run; receipts will be attached”
- Links to the Run Trace in the web UI
- Requests approval (in GitHub context or via web UI) before opening a PR
- Opens PR with:
  - concise explanation
  - links back to the issue
  - test proof and reproducibility notes

**[UNSPECIFIED]**: exact GitHub permissions model (GitHub App vs token), repo selection workflow, and PR labeling conventions.

---

### Web UI interaction flow (Run Trace, approvals, receipts, replay)

**User goal:** “See exactly what happened. Approve safely. Download proof.”

**Web UI must include these screens:**

1. **New Run**
   - Upload evidence (drag-and-drop): screenshot(s), logs, PDF runbook, etc.
   - Select repo(s) scope (single repo or multi-repo correlation)
   - Choose mode: “Dry Run” vs “Apply + Verify”
2. **Run Trace (the core demo screen)**
   - A readable timeline: Ingest → Plan → Sandbox Setup → Reproduce → Patch → Verify → Approval → PR
   - Each step expands to show: what was decided, what tool ran, what logs were captured, what changed
3. **Approval Console**
   - A clear “Approve PR” panel that shows:
     - what RePro wants to do
     - what evidence supports it
     - what risk level it is
     - who is allowed to approve
4. **Receipts Download**
   - A single “Download Receipts” package containing:
     - reproduction steps
     - test outputs
     - patch summary
     - diff
     - tool-call ledger outline
     - approvals record
5. **Replay**
   - “Replay Run” button that reruns the same run (or key steps) in a fresh sandbox to demonstrate reproducibility.

**[UNSPECIFIED]**: receipt file format (zip vs single PDF), retention duration, and artifact redaction rules.

---

### Voice interaction flow (optional wow; must remain reliable)

**User goal:** “I’m away from my laptop; I want a safe plan + a recorded receipt.”

**Voice user story example:**

- User taps “Call RePro” in the web UI.
- User speaks: “Checkout is throwing 500s after the last deploy. Can you diagnose and fix it? Don’t open a PR without approval.”
- Agent responds (voice) with a short confirmation:
  - “Understood. I’ll extract signals, reproduce in a safe sandbox, draft a patch, and ask for approval before opening a PR. Which repo should I focus on: `shop-api` or `checkout-service`?”
- Agent continues execution even if the call ends, then posts a **text receipt** to chat and a full Run Trace to the web UI.

**Voice constraint:** Voice is for speed and “wow,” but every meaningful action must still produce a readable text receipt in chat/web.

**[UNSPECIFIED]**: whether voice is web-only or also phone dial-in; supported languages; voice persona.

## Human-centered safety flows that feel mature, not restrictive

RePro must behave like a cautious, helpful teammate. Safety is not just “we asked for approval”; it is a clear, role-aware, user-friendly flow.

### Roles and approvals

Use BetterAuth-backed roles with clear defaults:

- **Viewer**: can watch runs, download receipts (if permitted), cannot approve.
- **Operator**: can start runs and request actions; cannot approve high-impact actions by default.
- **Approver**: can approve PR creation, rollback actions, and production-impact steps.
- **Admin**: manages allowlists, connectors, retention, audit settings.

**Role rules (required):**

- PR creation requires Approver (or Admin).
- Auto-rollback proposals require explicit Approver confirmation and a “dry-run preview” first.
- Multi-repo access requires Admin-managed allowlist (to prevent lateral access).

**[UNSPECIFIED]**: default mapping for hackathon demo accounts, and whether approvals can be delegated.

### Allowlists and guardrails (must be visible to judges)

RePro must show “what it is allowed to do” plainly:

- **Repo allowlist**: only approved repos can be accessed.
- **Command allowlist**: only safe categories of commands can run in the sandbox (tests, linters, build).
- **Network allowlist**: sandbox outbound access limited to required endpoints (e.g., dependency registries) and logged.
- **Secrets policy**: secrets are never echoed in logs and are only usable within the sandbox environment.

### Dry-run mode

Dry-run mode is a first-class user option:

- RePro will still ingest evidence, propose a patch, and verify in sandbox
- It will **not** push commits or open PRs
- It will produce a diff preview + receipts, and request approval to proceed if desired

### Confirmation UX that doesn’t annoy users

Confirmations must be:

- Short (“You are about to open PR #** to repo ** with \_\_ files changed. Approve?”)
- Evidence-backed (tests passed, reproduction proof)
- Role-aware (show who can approve)
- Reversible (easy to reject and refine)

## Observability as the product: what is captured, how it’s shown, and how failures are handled

### What RePro must capture every run (explicit checklist)

**Each run must produce an Observability Checklist with these items:**

- Run metadata: Run ID, initiator, time started/ended, mode (dry-run vs apply), repo scope
- Inputs ledger: what evidence was provided (filenames/types), plus a human-readable summary of what was extracted
- Model decisions (human-readable):
  - “Hypotheses considered”
  - “Chosen hypothesis and why”
  - “Confidence score and what lowered it”
  - “Requests for missing information”
- Tool calls ledger:
  - what tools were invoked, in what order
  - high-level parameters (redacted if sensitive)
  - tool outcomes (success/failure) and duration
- Sandbox execution receipts:
  - commands executed (safe summary)
  - stdout/stderr logs (redacted)
  - test results and exit codes
  - artifact pointers (e.g., test report file)
- Network policy events:
  - any blocked outbound requests
  - any allowlisted outbound requests (summary)
- Workflow state:
  - step-by-step status, retries, pauses, resumes
  - approvals requested and received
- Approval record:
  - who approved/denied
  - what they approved
  - when it happened
- Final outputs:
  - patch summary
  - PR link (if approved)
  - reproducibility score
  - confidence score
  - rollback recommendation (if relevant)
- “Open trace in Sentry” link (judge-friendly)
- Downloadable receipts package

### How observability is presented (what judges see)

**In chat:** short, readable status without noise

- “Run Trace link”
- “Current step”
- “What I found”
- “What I need from you”
- “Approval required”

**In web UI (the hero demo screen): Run Trace Timeline**

- A vertical timeline with expandable steps:
  - Step title + status + duration
  - “What RePro decided” (1–3 sentences)
  - “What RePro did” (tool/sandbox receipts)
  - “What evidence supports this”
  - “What you can do next” (approve, add info, replay)
- A “Receipts” panel:
  - Download button
  - Evidence summary
  - Proof of verification (tests passed)
- A “Trace” panel:
  - Sentry-linked view for the same Run ID (so judges see real monitoring)

**In the admin audit console (judge wow)**

- Searchable run history
- Approval log (who approved what)
- Policy config viewer (allowlists, role rules, retention)
- Incident correlation view (runs linked by repo, error signature, timeframe)

### Failure modes and remediation (must be explicit and friendly)

RePro must “fail like a professional system” with next steps.

**Failure: Cannot reproduce the issue**

- What RePro says:
  - “I couldn’t reproduce this yet. That usually means missing environment details or the issue is data-dependent.”
- Remediation options (choose one):
  - “Upload additional logs or a request ID”
  - “Select the environment profile: staging vs prod-like”
  - “Enable ‘Trace Mode’ to capture more verbose sandbox logs”
  - “Run a guided repro: I’ll generate exact commands for you to run and paste outputs”
- Output behavior:
  - No PR creation attempt
  - A clear “reproducibility score” that reflects the problem

**Failure: Tests fail after patch**

- What RePro says:
  - “The patch reduced the error, but tests are still failing. I’m not going to open a PR.”
- Remediation steps:
  - “Show failing tests and why”
  - “Offer two options: iterate on patch, or stop and write a diagnostic summary”
  - “Offer replay with different strategy (e.g., smaller patch)”
- Output behavior:
  - Keeps an artifacted log of failures
  - Produces a suggested next experiment

**Failure: Flaky tests detected**

- What RePro says:
  - “The failure appears flaky (non-deterministic). I re-ran it and got inconsistent results.”
- Remediation steps:
  - “Run N replays to estimate flakiness”
  - “Mark suspected flaky tests and propose quarantine steps”
  - “Proceed only if core verification is stable; otherwise request a human decision”
- Output behavior:
  - Flakiness indicator is visible in the Run Trace and receipts

**Failure: Sandbox dependency install / environment mismatch**

- Remediation steps:
  - “Use a known-good sandbox profile”
  - “Retry with cached snapshot”
  - “Ask user for lockfile or exact runtime version”
- Output behavior:
  - No high-impact actions
  - Clear missing requirement shown in the run timeline

**Failure: Tool/network request blocked by policy**

- What RePro says:
  - “A network request was blocked by policy; I did not bypass it.”
- Remediation steps:
  - “Admin can allowlist the endpoint for this org”
  - “Alternative: upload the dependency or artifact directly”
- Output behavior:
  - Shows blocked event in the Run Trace (no ambiguity)

## Advanced features that expand RePro beyond thin-slice

These features should be framed as “product capabilities” users can understand, with receipts and safety.

### Multi-repo correlation (real-world realism)

**What it does:** When incidents span multiple repos (frontend + backend + shared SDK), RePro can correlate symptoms and changes across repos, then propose a coordinated fix path.

**User experience:**

- User chooses “Multi-repo mode” in web UI (or says “this might be affecting frontend too” in chat).
- RePro responds with:
  - “Top 3 suspect repos and why”
  - “Which repo I’ll start with”
  - “What access I need (and who can approve it)”

**Safety:** Multi-repo access requires explicit allowlist + admin approval.

### Flaky-test detection and test confidence

**What it does:** RePro distinguishes “real breakage” from flaky failures, reruns tests, and reports stability.

**User-facing outputs:**

- “Flakiness score: \_\_”
- “Stable verification achieved? Yes/No”
- “Replay count and outcome summary”

### CI integration (trust and credibility)

**What it does:** After local sandbox verification, RePro can optionally trigger CI, wait for results, and attach CI proof to the receipts.

**User-facing outputs:**

- “CI run started”
- “CI passed ✅ / failed ❌”
- “CI link included in receipts”

**[UNSPECIFIED]**: CI provider scope beyond GitHub Actions and required permissions.

### Auto-rollbacks (proposal-first, never automatic)

**What it does:** For severe incidents, RePro can propose a rollback plan and gather evidence, but requires explicit approvals.

**User-facing outputs:**

- “Rollback recommendation: Yes/No”
- “Risk estimate and why”
- “Dry-run preview: what will happen if you approve”
- “Approval required from: Approver/Admin”

**[UNSPECIFIED]**: rollback target (Vercel deployment rollback vs other infra) and integration boundaries.

### Patch confidence scoring (a judge-friendly metric)

**What it does:** RePro produces a transparent confidence score based on evidence, verification strength, and risk factors.

**User-facing output example:**

- “Patch confidence: 82/100”
- “Boosters: reproducible issue, tests passed, small diff”
- “Reducers: limited coverage in module X, flaky test suspicion”

### Test-sandbox replay (the “proof button”)

**What it does:** Judges (or users) can click “Replay verification” to re-run the same patch verification in a clean sandbox and confirm results.

**User-facing output:**

- “Replay verification: PASS ✅”
- “Diff unchanged; tests matched previous run”

### Explainability without jargon

**What it does:** RePro explains its decisions as a short story with evidence, not a wall of reasoning.

**Required explainability outputs:**

- “What changed recently that matters”
- “Why this file/function is implicated”
- “Why this patch fixes it”
- “What could still be wrong (known unknowns)”

### Admin audit console (trust and accountability)

**What it does:** For team adoption, admins get a clear record of what happened and who approved it.

**Admin console features:**

- searchable run history
- approval ledger
- allowlists (repos/commands/network)
- incident correlation (related runs grouped)
- exportable audit report

## Success criteria, judge-facing metrics, feature comparison table, and demo assets

### Minimal success criteria (must hit in hackathon demo)

- A user can start a run from chat with an attached artifact and get a Run Trace link within 30 seconds.
- RePro produces a patch and verifies it in a sandbox with at least one concrete piece of proof:
  - tests passing, or
  - a deterministic repro harness passing after failing before
- RePro requests explicit approval before opening a PR, and records who approved.
- A PR is opened with a clear summary and receipts attached/linked.
- Observability coverage is visibly strong:
  - at least 90% of steps show tool receipts + outcomes in the Run Trace
  - the run has a Sentry-linked trace view that matches the Run ID

**[UNSPECIFIED]**: exact target repo and test target, and the time budget you promise (e.g., “under 10 minutes end-to-end”).

### Judge-facing metrics to display prominently (in web UI and final chat message)

- **Time-to-fix:** run start → verified patch ready (minutes)
- **Time-to-PR:** run start → PR opened (minutes, after approval)
- **Tests passed:** # passed / # failed, plus what changed vs baseline
- **Reproducibility score:** 0–100 (how reliably the agent reproduced the incident)
- **Patch confidence score:** 0–100 (with 3–5 plain-language drivers)
- **Observability coverage:** % of steps with complete receipts (tool logs + decisions + artifacts)
- **Approval latency:** time from “approval requested” → “approval granted”

### Core vs advanced features and required user actions

| Capability area   | Core (hackathon-winning) behavior       | Advanced expansion behavior                            | Required user actions                             | What the user/judge sees as proof                     |
| ----------------- | --------------------------------------- | ------------------------------------------------------ | ------------------------------------------------- | ----------------------------------------------------- |
| Start a run       | Start from chat message + attachments   | Start from chat + voice + web + templates              | Provide incident summary + upload evidence        | Run ID + Run Trace link posted immediately            |
| Evidence handling | Extract signals from screenshot/log/PDF | Correlate across multiple artifacts + runbooks         | Upload artifacts; optionally tag severity         | Evidence summary + “what I extracted” panel           |
| Diagnosis         | One best hypothesis + plan              | Multiple hypotheses with confidence + correlation      | Confirm environment (staging/prod-like)           | Plain explanation + confidence drivers                |
| Reproduction      | Repro in sandbox if possible            | Guided repro + replay + data-dependent modes           | Provide repo/ref; optional “repro mode”           | Reproducibility score + replay result                 |
| Patch creation    | Small safe patch proposal               | Multi-file + multi-repo coordinated patch              | Approve “apply patch” if needed                   | Diff preview, rationale, minimal risk summary         |
| Verification      | Run tests in sandbox; attach logs       | Flaky-test detection + multiple replays                | Choose verification strictness (fast vs thorough) | Test outcomes + flakiness indicator + replay receipts |
| PR creation       | Approval gate + PR opened               | CI-trigger + wait + annotate PR with CI receipts       | Approver clicks “Approve PR”                      | PR link + test proof + downloadable receipts          |
| Rollback handling | Suggest rollback as guidance only       | Dry-run rollback plan + approval-gated execution       | Approver must approve rollback                    | Rollback plan + risk notes + audit log                |
| Observability UX  | Run Trace timeline + receipts download  | Timeline + correlation + “Open in Sentry” + dashboards | None (automatic)                                  | Step-by-step ledger + Sentry-linked trace             |
| Admin controls    | Basic role gating                       | Full audit console + allowlists + multi-tenant orgs    | Admin sets roles + allowlists                     | Visible policy + approval ledger + exports            |
| Voice wow         | Optional voice summary and receipt      | Full voice workflow with live status                   | User taps “Call RePro”                       | Voice response + text receipt + same Run Trace        |

### Copy-ready demo script (short, live-friendly)

**Goal:** Make judges _feel_ the difference: “verified, safe, observable agent” vs “chat demo.”

**Setup (before you start):**

- Open 3 tabs: Chat thread, Web UI Run Trace page (empty), and a PR list page for the target repo.
- Have one prepared incident artifact (screenshot + small log snippet).

**Script (2–3 minutes):**

1. **In chat:** “Here’s a real incident: 500s on checkout after deploy. I’m attaching a screenshot and logs. RePro, fix it—only open a PR after tests pass and I approve.”
2. **Agent responds:** It summarizes the incident and shows a short plan with a “Start Verified Fix Run” action. Click it.
3. **Web UI:** Immediately show the Run Trace timeline with the run ID and the first 1–2 steps completing (“Evidence extracted,” “Plan generated”).
4. **Run Trace expansion:** Click into “Sandbox verification” and show: tests running, command receipts, and a clear outcome.
5. **Approval moment:** The agent asks for approval to open a PR. Highlight the safety flow (“Approver required”) and click Approve.
6. **PR proof:** Show the new PR with RePro’s summary and verification receipts (tests passed + repro steps).
7. **Observability punchline:** Click “Open trace in Sentry” (or equivalent link) and show that the same Run ID has a trace view.
8. **Close:** “This isn’t a demo that _talks about fixing bugs_. It safely reproduces, verifies, and ships the fix with receipts and an auditable trail.”

### Three judge talking points (concise)

1. **End-to-end work, not commentary:** RePro goes from messy incident evidence to a verified patch and PR—only after tests pass and a human approves.
2. **Trust through observability:** Every model decision, tool action, sandbox log, and approval is captured in a Run Trace with downloadable receipts and a Sentry-linked trace view.
3. **Safety by design:** Role-based approvals, allowlists, and dry-run mode make it deployable in real teams—this is an “AI agent you can trust,” not a risky automation.

**Implementation placeholders to fill later (mark as [UNSPECIFIED] until decided):**

- [UNSPECIFIED] Supported chat platforms beyond Slack/GitHub
- [UNSPECIFIED] CI provider scope and exact permissions model
- [UNSPECIFIED] Rollback target (Vercel deployments vs other infra)
- [UNSPECIFIED] Receipt packaging format and retention policy
- [UNSPECIFIED] Redaction rules for logs/secrets and compliance requirements
