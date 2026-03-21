# Zero to Agent Hackathon SF Deep Research and Winning Build Recommendations

## Hackathon selection signal and what it implies for winners

The entity["city","San Francisco","California, US"] “Zero to Agent” hackathon is explicitly framed as “go from idea to working AI agent,” and the organizers are unusually clear about what they want to reward: agents that solve real problems (not just demos), creative use of multimodal + reasoning capabilities, and projects that take full advantage of an infrastructure stack for deploying/scaling AI-native apps.citeturn2view0 This is not a “best prompt” contest—it’s a systems contest, where robustness, end‑to‑end execution, and operational credibility are part of the score.citeturn2view0

The SF event is hosted by entity["company","Vercel","web hosting platform"] and entity["organization","Google DeepMind","ai research lab"] in partnership with entity["organization","Cerebral Valley","ai community"], running Saturday, March 21, 2026 (9:00 AM–10:00 PM PDT).citeturn2view0turn3search0 The venue shown publicly for SF is entity["point_of_interest","Shack15","San Francisco, CA, US"] (Ferry Building).citeturn3search0

image_group{"layout":"carousel","aspect_ratio":"16:9","query":["Shack15 San Francisco Ferry Building interior","Shack15 Ferry Building San Francisco exterior"]}

From those signals, the “winning shape” is fairly predictable:

A winner will show an agent that (1) ingests messy real artifacts (screenshots/logs/PDFs/audio), (2) reasons + plans, (3) executes meaningful actions safely, (4) verifies outcomes, and (5) produces a durable “receipt” that can be audited and debugged. That aligns directly with the sponsors’ “agent stack” narrative: multi-platform interfaces, safe execution environments, durable orchestration for long-running runs/approvals, and first-class observability.citeturn2view0turn11search23turn12view0turn16search2

## The winning wedge: PatchPilot as the flagship agent, with Foundry and Voice as productized extensions

Your “Incident-to-PR Verified Fix Agent” concept (PatchPilot) is the strongest core to bet on because it naturally forces an end-to-end arc: intake → root-cause hypothesis → reproduction → patch → tests → PR → receipts. It is also the cleanest way to prove “real work,” because the outcome is externally legible (a green test run + a PR link) rather than “trust me, it reasoned well.”citeturn11search23turn12view0turn16search2

To “combine everything” you described without collapsing under scope, treat PatchPilot as the **hero workflow**, then implement the other concepts as _productized surfaces over the same engine_:

- **Agent Foundry** becomes your internal abstraction layer: a way to define “agent recipes” (tools + policies + workflow graph + connectors) that can be instantiated per org/repo. This doesn’t need to fully scaffold/deploy new repos during the hackathon—what needs to exist is a visible “Recipe Builder” UI backed by the same runtime primitives (durable workflows, tool policies, observability). The judges should feel: *this isn’t a one-off demo, it’s a platform.*citeturn12view0turn20search3turn21view0
- **VoiceOps / Voice-first incident commander** becomes a high‑impact interface to the same PatchPilot engine: voice in → structured incident intake → agent run continues durably even after the call ends → receipt posted to chat. This is doable if you keep voice minimal (one realtime STT path + one TTS response) and push everything else into the web dashboard + chat receipts.citeturn6search4turn6search0turn12view0turn21view0

This strategy fits your ambition while still giving you a hackathon-feasible thin slice: PatchPilot must work end-to-end; Foundry and Voice must exist enough to show the platform story.

## Sponsor-maximized system architecture for PatchPilot

This is the architecture that will read as “inevitable” given the sponsors’ stack: the only way to build this quickly and credibly is to use their primitives as intended.

### Control-plane vs run-plane

**Control-plane (human-facing, multi-platform):**

- Chat surfaces for “incident intake” and “approval gates.”
- A web dashboard for run history, live step timeline, artifacts, and “why did this fail?” visibility.

**Run-plane (durable + executable):**

- A durable workflow that can pause/resume for approvals, retries, and long tasks.
- A sandboxed execution environment where the agent can run commands, tests, and validations without risking organizer Wi‑Fi or your laptop.
- A model/tool loop that can reason over multimodal artifacts, call tools with strong schemas, and produce structured receipts.

This maps tightly onto:

- **Durability + approvals:** Vercel Workflow + WDK-style hooks/sleep/steps. Workflows are resumable and durable with deterministic replays; steps compile into isolated routes; hooks let you pause for external events (approvals).citeturn12view0
- **Safe execution:** Vercel Sandbox for isolated microVM execution of untrusted/AI-generated code, plus network egress restrictions.citeturn11search23turn11search2turn11search27
- **Model access + reliability:** AI Gateway + AI SDK for unified calls, budgets, monitoring, and provider routing/fallbacks, with Gemini 3.1 Pro available as a single model string.citeturn16search2turn13search7turn15search0turn15search3
- **Tool reliability:** AI SDK tool calling in strict mode for schema-valid tool invocations; ToolLoopAgent for iterative reason→act loops.citeturn14view2turn20search0
- **Multimodal reasoning:** Gemini 3.1 Pro supports text, images, video, audio, and PDFs, plus very large context (1,048,576 input tokens).citeturn19search7
- **Tool-first Gemini endpoint:** Gemini 3.1 has a separate `gemini-3.1-pro-preview-customtools` endpoint intended to prioritize custom tools in bash/tool-heavy workflows.citeturn19search7turn19search14turn8search2

### The PatchPilot workflow graph (thin slice that can win)

Implement the agent as a single durable workflow, broken into auditable steps. The important thing is: every step produces artifacts, and every risky step can pause for approval.

A minimal winning graph:

1. **Ingest incident**  
   Normalize inputs (chat text + pasted traces + screenshot + log files). Extract structured incident fields (service, endpoint, error signature, timeframe, “what changed”). Store raw artifacts and the structured incident object.

2. **Triage + hypothesis**  
   Model produces: (a) suspected root cause(s), (b) files likely involved, (c) a reproduction recipe, (d) a patch plan, (e) what “verification evidence” will be collected.

3. **Provision execution sandbox**  
   Create sandbox, clone repo snapshot, install deps, set up deterministic test command, lock down outbound network.citeturn11search23turn11search2turn0search37

4. **Reproduce**  
   Run the reproduction recipe (tests and/or a minimal harness). Capture stdout/stderr logs and the failing test name(s) or failing request response.

5. **Generate patch → apply → test**  
   Use a tool loop: inspect repo via filesystem commands, edit files, re-run targeted tests, then full suite (or a curated fast suite). Use strict tool schemas for “run command,” “edit file,” and “collect diff.”

6. **Approval gate → open PR**  
   If tests are green, the agent proposes a PR: title, description, risk assessment, and the evidence bundle. Wait for explicit human approval before pushing and creating the PR. This aligns with Vertex AI function calling best practices: validate tool calls with significant consequences (e.g., updating a repo / sending orders / DB writes) with the user before executing.citeturn10view0

7. **Receipt + audit trail**  
   Post: PR link, summary, reproduction steps, tests run, and pointers to logs/artifacts. Also write a full run record to the DB and emit realtime updates to the dashboard.

This is deliberately not “just a code review bot.” It’s incident → verified fix → PR, with safety gates and proof.

## Full tech stack blueprint with “what is used where” and “why it wins”

This is a sponsor-heavy stack that is realistic to wire up in a single day because each piece directly reduces glue work.

### Application framework and deployment

- **Next.js on Vercel** as the single repo/app that hosts:
  - Web dashboard (App Router).
  - Chat webhooks / adapters endpoints.
  - Workflow routes (compiled by Workflow).
  - Sandbox orchestration API routes.
  - Voice endpoints (token minting / audio streaming relays).citeturn12view0turn21view1

### Chat + distribution layer

- **Chat SDK** for “write once, deploy across chat platforms,” including Slack/GitHub/Discord/Linear/Telegram and more, plus platform‑native UI via cards/modals and streamed posting.citeturn21view0turn21view1  
  Use it for:
  - Incident intake (“start run”).
  - Interactive approval (Approve/Reject buttons).
  - Posting receipts (PR link + evidence).
  - Optional: running as both Slack bot _and_ GitHub bot from a single codebase.

Recommended initial surfaces (hackathon-feasible):

- entity["company","Slack","enterprise messaging"] for the “wow” live interaction.
- entity["company","GitHub","code hosting platform"] for the credibility anchor (PR creation + linking).citeturn21view0turn21view1

### Model access, routing, and agent framework

- **AI Gateway** as the default model endpoint: single key, budgets, usage monitoring, load balancing, and fallback routing.citeturn16search2turn13search7
- **Gemini 3.1 Pro Preview on AI Gateway** via `google/gemini-3.1-pro-preview`, with thinking-level control.citeturn15search0turn15search3turn15search1
- **AI SDK** for:
  - Tool calling with strict schemas.citeturn14view2
  - ToolLoopAgent (or manual loop control) for iterative “reason → tool → observe → next action” behavior.citeturn20search0turn20search3turn20search1
  - (Optional) MCP client integration (AI SDK supports MCP servers to access tools/resources/prompts).citeturn1search31
- **Gemini model realities you must acknowledge in 2026:**
  - Gemini 3 Pro Preview was shut down March 9, 2026; migration guidance says to move to Gemini 3.1 Pro Preview to avoid disruption.citeturn8search0turn8search2turn8search1
  - Gemini 3.1 Pro Preview supports multimodal inputs and 1,048,576 input tokens.citeturn19search7
  - There is a tool-prioritizing endpoint `gemini-3.1-pro-preview-customtools` for bash/custom tool mixes.citeturn19search7turn19search14

**Winning implementation detail:** Use Gemini 3.1 Pro for “triage + patch reasoning,” and consider using “lower thinking” for cheap steps (parsing/formatting) while keeping “medium/high thinking” for the patch loop. AI Gateway exposes thinking configuration for Google/Vertex models via provider options.citeturn15search1turn17search18

### Durable orchestration + approvals

- **Vercel Workflow** (built on WDK) as your agent runtime—not “a background job queue you wrote this morning.” Workflow supports:
  - `'use workflow'` and `'use step'` directives for durable, resumable async/await logic.
  - `sleep()` for long waits without compute usage.
  - `defineHook()` for approvals/human-in-the-loop pauses.
  - Per-step observability in Vercel dashboard.citeturn12view0

This is a differentiator because most hackathon agents die when an HTTP request times out. Workflow is explicitly designed to make “long runs with approvals” a core runtime property.citeturn12view0

### Safe execution + verification

- **Vercel Sandbox** as the only place the agent executes anything:
  - It’s designed to safely run untrusted or user-generated code for dynamic workloads and agents.citeturn11search23
  - You can restrict outbound network access (egress lockdown) by allowlisting only required domains/endpoints.citeturn11search2
  - You can execute AI-generated code safely with isolation/resource limits/timeouts.citeturn11search27
  - You can connect to private repos (GitHub auth patterns) and use snapshots to speed up repeated setup.citeturn0search37turn0search33

**Why judges will care:** this turns your project from “the model suggested a fix” into “the agent ran the code, proved the fix, and can show logs.”

### Data + realtime progress

- **Supabase** as the persisted run store:
  - Postgres is your system of record for runs, audit events, approvals, connectors, and PR metadata.
  - Realtime gives you Broadcast, Presence, and Postgres Changes in one websocket channel, which is perfect for streaming agent progress to a dashboard without building your own websocket server.citeturn4search0turn4search7
  - For a very polished demo: have the Workflow write step events into Postgres; use Postgres Changes to update the UI live; optionally use Broadcast for “log line streamed” events.citeturn4search0

### Auth and access control

- **Better Auth** for authentication/authorization in the web dashboard and to secure “dangerous actions”:
  - It’s a TypeScript auth framework with a plugin ecosystem.citeturn4search9turn4search15
  - The OAuth 2.1 Provider plugin can turn your auth server into an OAuth provider with OIDC compatibility—useful if you want short-lived tokens for API clients, MCP servers, or connector flows.citeturn4search2

### Observability that saves your demo

- **Sentry** for full-stack errors + performance + “agent monitoring”:
  - Standard Next.js instrumentation with spans lets you wrap each workflow step and see where time/errors occur.citeturn4search3turn5search3
  - AI Agent Monitoring explicitly targets token usage, latency, tool execution, and error rates with full-stack context.citeturn5search0turn5search9
  - Sentry has a Vercel AI SDK integration (`vercelAIIntegration`) that instruments AI SDK spans via built-in telemetry.citeturn5search27turn5search7

### Voice layer

- **ElevenLabs** for “voice in / voice out”:
  - Realtime speech-to-text is available via WebSocket, streaming partial and committed transcripts.citeturn6search4
  - WebSocket TTS supports generating audio from partial text for low-latency speaking.citeturn6search0turn6search3

For hackathon stability, use realtime STT for input, but keep TTS output short (read back the plan + next required confirmation), and always post the full receipt to Slack/dashboard.

### Context engine and codebase intelligence

- **Augment Code Context Engine SDK** as your “semantic codebase retrieval” layer:
  - The SDK supports both FileSystem Context (index a local directory) and DirectContext (explicit file indexing via API calls).
  - DirectContext supports import/export state to avoid re-indexing between sessions.citeturn7search4turn7search0

In PatchPilot, Augment becomes a competitive advantage if you use it to jump from “incident signature” → “likely files/functions” quickly, reducing the amount of blind filesystem exploration in the sandbox. (You can still use filesystem+grep for the deterministic proof path.)

## Hackathon-day build plan with an execution-first milestone order

The plan below is structured to maximize your chance of shipping a working end-to-end run by mid-afternoon, then layering “wow” and polish.

### Phase zero: lock your demo target

Pick a target repo/service where:

- tests run in <5 minutes,
- failures are easy to reproduce deterministically,
- a small patch can flip red → green,
- you can safely open a PR (your own repo or an agreed open-source repo).

The credibility comes from: “here is the failing test, here is the patch, here is the green test, here is the PR.” Your system architecture can be generalized; your demo must be reliable.

### Phase one: skeleton that already looks “real”

Build a Next.js app with:

- Supabase project + schema,
- Sentry enabled,
- Better Auth sign-in,
- AI Gateway key configured,
- a basic dashboard page that can list runs (even if empty).

This phase is about avoiding the “we built a bot, but there’s no product” impression. Sentry + auth + DB schema makes it read production-grade immediately.citeturn5search0turn4search0turn4search9turn16search2

### Phase two: PatchPilot workflow end-to-end (no chat yet)

Implement Vercel Workflow first, because it becomes your backbone:

- `patchPilotWorkflow(runId)` marked with `'use workflow'`.citeturn12view0
- Steps (`'use step'`) for ingest → triage → sandbox setup → reproduce → patch loop → tests → propose PR.citeturn12view0
- Approval gate implemented as a Workflow Hook (`defineHook`) so the run can pause and resume safely.citeturn12view0

At the end of this phase, you should be able to start a run from the dashboard (button click), watch logs, and get to a “Ready to open PR—Approve?” state.

### Phase three: Vercel Sandbox patch loop with verified proof

Make Sandbox the only executor:

- Create sandbox.
- Clone repo snapshot and install deps.
- Lock down egress.citeturn11search2turn11search23turn0search37
- Run reproduction/test.
- Apply patch.
- Re-run tests; store the logs.

If you have time, add snapshotting so repeated runs don’t reinstall deps.citeturn0search33

**Important:** Implement “filesystem + bash tooling” inside the sandbox for deterministic context and debugging. Vercel explicitly describes the filesystem-based agent pattern: agents explore with `ls/find/grep/cat`, then send only what matters back to the model.citeturn11search1

### Phase four: add chat as the front door

Once the workflow works, wire Chat SDK so judges can drive it from chat:

- Implement Chat SDK adapters for Slack and GitHub.
- Use cards/modals + buttons for:
  - “Start run”
  - “Approve PR”
  - “Reject / request changes”
- Stream progress updates and final receipt back into the thread. Chat SDK supports platform-native UI and streaming into `post()`.citeturn21view0turn21view1

This is where the project becomes a “multi-platform agent,” not a web app with a chat bubble.

### Phase five: voice as a controlled “wow” layer

Add one page: “Call PatchPilot.”

- Realtime STT transcribes speech into an incident summary.citeturn6search4
- The agent reads back a short plan with realtime TTS.citeturn6search0turn6search3
- The full receipt still goes to Slack/dashboard (voice is not the system of record).

### Phase six: Foundry framing (minimal but impactful)

Ship a minimal “Agent recipe” UI:

- PatchPilot recipe is visible: tools enabled, approval policy, workflow steps, connectors.
- Show (even as read-only) how a second recipe could exist (e.g., “VoiceOnCall Incident Commander”) that uses the same runtime.

This is what lets you credibly say you’re building a _product platform_, not a one-off bot.

## Reliability, safety, and judge-proofing that makes your demo hard to kill

### Approval gates must be real, not performative

Tool use becomes scary the moment you enable “create PR,” “push branch,” “run SQL,” etc. Vertex AI’s own function-calling best practices explicitly recommend validating function calls with significant consequences with the user before executing.citeturn10view0  
In PatchPilot, make this a hard invariant:

- No push.
- No PR creation.
- No secret exfiltration.
  Without explicit approval.

Workflow Hooks make this pause/resume path durable and first-class.citeturn12view0

### Sandbox egress lockdown is your security story in one sentence

“Everything runs in an isolated microVM, and the network can only reach approved domains.” That’s instantly legible risk reduction, and Vercel’s Sandbox guidance explicitly calls out restricting outbound traffic with network policy controls.citeturn11search2turn11search23

### Observability must be visible in the product

In a hackathon, observability is not just engineering—it’s demo insurance.

Do three things:

1. **Sentry AI Agent Monitoring enabled** so you can show: token usage, tool calls, latency, error rate.citeturn5search0turn5search9
2. **Sentry Vercel AI SDK integration** so the model/tool spans correlate with DB and workflow spans.citeturn5search27
3. **A “Run Trace” dashboard tab** backed by Supabase Realtime, showing each Workflow step, the sandbox command executed, and a link to logs.

This is exactly what separates “cool demo” from “operational product.”

### Model risk management for 2026 Gemini realities

Two practical constraints you should assume during a crowded hackathon:

- Models and endpoints can be under load.
- Tool-calling edge cases happen.

What you can do immediately (and credibly) with sponsor tooling:

- Use AI Gateway provider routing/fallback configuration so a transient failure does not kill the demo.citeturn13search7turn16search2
- Keep a fallback model tier for non-core steps (e.g., move formatting/summarization to a cheaper faster model) while keeping Gemini 3.1 Pro for the patch loop. Gemini thinking levels are configurable, giving you a lever when latency spikes.citeturn15search1turn15search3
- Be explicit that Gemini 3 Pro Preview is shut down and you’re already migrated, which signals you’re using current docs and avoiding disruption.citeturn8search0turn8search2turn8search1

### Judge-facing demo script

A stable, repeatable sequence:

1. In Slack: “Here’s an incident: 500s after deploy” + attach a screenshot/log.
2. Agent replies with a structured hypothesis + reproduction plan + asks “Start verified run?”
3. Click “Start run.” The run posts progress every step (and dashboard updates live).
4. Agent shows: failing test / failing reproduction output.
5. Agent applies patch and reruns tests: “All green.”
6. Agent asks approval: “Open PR?” (buttons).
7. Click “Approve.” Agent opens PR with:
   - root cause summary,
   - diff,
   - tests run + logs,
   - rollback/risk notes,
   - links to artifacts.
8. Agent posts receipt in Slack and (optionally) in a GitHub issue comment.

This script works because it demonstrates every judging axis: real problem, multimodal input, tool use, safe execution, durable orchestration, and observability—without needing judges to “believe” the model. The proof is in the execution trail.citeturn2view0turn11search23turn12view0turn21view0
