<!-- BEGIN:nextjs-agent-rules -->
# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` before writing any code. Heed deprecation notices.
<!-- END:nextjs-agent-rules -->

# PatchPilot Agent Rules

## Critical runtime constraints

1. **Never use `setTimeout`/`setInterval` inside `"use workflow"` functions.** The Workflow DevKit runs workflows in a restricted VM. All async side effects (database writes, notifications) must happen inside `"use step"` functions.

2. **Always use the Supabase pooler connection string** (`aws-0-us-west-2.pooler.supabase.com:5432`), not the direct host. The direct host is IPv6-only and unreachable from most networks.

3. **Better Auth requires `pg.Pool`**, not `{ type: "postgres", url }`. The URL-based adapter fails silently with the Supabase pooler.

4. **`run_events.run_id` is `TEXT`, not `UUID`.** Run IDs are nanoid strings. Never use `gen_random_uuid()`.

5. **Chat SDK adapters validate env vars at construction time.** Use lazy initialization (`getBot()`) to avoid build-time crashes.

6. **AI model calls**: use `getPrimaryModel()` from `lib/ai/models.ts`. It returns `@ai-sdk/google` provider when `GOOGLE_GENERATIVE_AI_API_KEY` is set, falling back to AI Gateway string when only OIDC is available.

7. **All Supabase clients in workflow steps** must set `{ auth: { persistSession: false, autoRefreshToken: false } }` to prevent `setInterval` in the workflow VM.

## Database schema

14 tables across 3 migrations:
- `001_init.sql` — runs, run_events, artifacts, approvals, patches, prs, recipes
- `002_better_auth.sql` — user, session, account, verification
- `002_productization.sql` — run_steps, ci_runs, receipt_packages + enhanced columns

All ID columns referencing `runs` are `TEXT` type.

## Auth flow

1. Landing page (`/`) shows sign-in button
2. GitHub OAuth via Better Auth social provider (needs `GITHUB_CLIENT_ID` + `GITHUB_CLIENT_SECRET`)
3. Callback URL: `http://localhost:3000/api/auth/callback/github`
4. Session stored in `session` table, user in `user` table
5. `requireAuth()` in `lib/auth-guard.ts` redirects to `/` if no session
6. `requireAdmin()` additionally checks role

## Repo policies

Runs require an allowlisted repo in the `recipes` table. The `/api/runs/start` endpoint calls `requireRepoPolicy()` which throws 403 if the repo isn't configured. Add repos via the admin console or direct SQL insert into `recipes`.

## Workflow step execution order

1. `createRunRecord` → `storeArtifacts` → emit `run.started`
2. `requireRepoPolicy` → emit `repo.policy_resolved`
3. `parseIncidentStep` → emit `incident.parsed`
4. `extractFilesStep` → emit `repo.focus`
5. `sandboxFixStep` → emit `sandbox.created`, `reproduction.completed`, `verification.completed`
6. `storePatch` → emit `patch.generated`
7. If mode=dry_run: finalize receipts and return
8. `createApprovalRecord` → emit `approval.requested` → **workflow pauses**
9. On resume: `resolveApprovalRecord` → emit `approval.resolved`
10. If rejected: finalize receipts and return
11. `createPrStep` → `storePrRecord` → emit `pr.created`
12. `checkCiRunStep` → `storeCiRun` → emit `ci.completed`
13. `finalizeReceiptsStep` → emit `receipts.created` → emit `run.completed`
