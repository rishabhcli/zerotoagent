import "server-only";

import type { ReProRole, RequestSession } from "@/lib/auth";
import { getSessionRole, getSessionUserId, sessionHasAnyRole } from "@/lib/auth";
import { getSupabaseAdmin } from "@/lib/patchpilot/supabase";
import type { RunEvent } from "@/hooks/use-run-events";
import type { RunStep } from "@/components/runs/run-timeline";

export type DashboardNavIcon = "activity" | "plus" | "book-open" | "shield" | "mic";

export interface DashboardNavItem {
  href: string;
  label: string;
  icon: DashboardNavIcon;
}

export interface DashboardUser {
  name: string;
  email: string;
  image?: string | null;
  role: ReProRole;
}

export interface DashboardRun {
  id: string;
  created_at: string;
  status: string;
  repo_owner: string;
  repo_name: string;
  source?: string | null;
  mode?: string | null;
  confidence_score?: number | null;
  observability_coverage?: number | null;
}

export interface RepoOption {
  id: string;
  owner: string;
  name: string;
  defaultBranch: string;
  enabled: boolean;
}

export interface RecipePolicy {
  id: string;
  repo_owner: string;
  repo_name: string;
  test_command: string;
  install_command: string;
  build_command: string | null;
  repro_command: string | null;
  package_manager: string;
  allowed_domains: string[];
  allowed_command_categories?: string[];
  snapshot_id: string | null;
  ci_workflow_name?: string | null;
  installation_id?: number | null;
  enabled?: boolean;
}

export interface RunData {
  id: string;
  created_at: string;
  status: string;
  repo_owner: string;
  repo_name: string;
  base_branch: string;
  source: string;
  mode: string;
  environment: string;
  outcome_summary: string | null;
  confidence_score: number | null;
  reproducibility_score: number | null;
  observability_coverage: number | null;
  sentry_trace_url: string | null;
  trace_id: string | null;
}

export interface ApprovalData {
  token: string;
  approved: boolean | null;
  resolved_at: string | null;
  required_role: string | null;
  decision_summary: Record<string, unknown> | null;
}

export interface PatchData {
  unified_diff: string;
  diffstat: string | null;
}

export interface PrData {
  pr_url: string;
  pr_number: number;
  summary: string | null;
}

export interface CiData {
  status: string;
  conclusion: string | null;
  summary: string | null;
  url: string | null;
}

export interface ReceiptPackageData {
  storage_path: string;
  manifest: Record<string, unknown> | null;
}

export interface RunDetailView {
  run: RunData | null;
  events: RunEvent[];
  steps: RunStep[];
  approval: ApprovalData | null;
  patch: PatchData | null;
  pr: PrData | null;
  ci: CiData | null;
  receipts: ReceiptPackageData | null;
}

export interface AdminRunRow {
  id: string;
  created_at: string;
  status: string;
  repo_owner: string;
  repo_name: string;
  source: string | null;
  mode: string | null;
  error_signature: string | null;
  confidence_score: number | null;
  observability_coverage: number | null;
}

export interface AdminApprovalRow {
  token: string;
  run_id: string;
  requested_at: string;
  resolved_at: string | null;
  approved: boolean | null;
  comment: string | null;
  resolved_by_user_id: string | null;
}

export interface AdminRecipeRow {
  id: string;
  repo_owner: string;
  repo_name: string;
  enabled: boolean;
  ci_workflow_name: string | null;
  installation_id: number | null;
  allowed_domains: string[];
  allowed_command_categories: string[];
}

export interface AdminConsoleData {
  runs: AdminRunRow[];
  approvals: AdminApprovalRow[];
  recipes: AdminRecipeRow[];
}

const DASHBOARD_RUN_SELECT =
  "id, created_at, status, repo_owner, repo_name, source, mode, confidence_score, observability_coverage";
const ENABLED_REPO_SELECT = "id, repo_owner, repo_name, enabled, metadata";
const RECIPE_POLICY_SELECT =
  "id, repo_owner, repo_name, test_command, install_command, build_command, repro_command, package_manager, allowed_domains, allowed_command_categories, snapshot_id, ci_workflow_name, installation_id, enabled";
const RUN_DETAIL_SELECT =
  "id, created_at, status, repo_owner, repo_name, base_branch, source, mode, environment, outcome_summary, confidence_score, reproducibility_score, observability_coverage, sentry_trace_url, trace_id";
const APPROVAL_SELECT = "token, approved, resolved_at, required_role, decision_summary";
const PATCH_SELECT = "unified_diff, diffstat";
const PR_SELECT = "pr_url, pr_number, summary";
const CI_SELECT = "status, conclusion, summary, url";
const RECEIPT_SELECT = "storage_path, manifest";
const ADMIN_RUN_SELECT =
  "id, created_at, status, repo_owner, repo_name, source, mode, error_signature, confidence_score, observability_coverage";
const ADMIN_APPROVAL_SELECT =
  "token, run_id, requested_at, resolved_at, approved, comment, resolved_by_user_id";
const ADMIN_RECIPE_SELECT =
  "id, repo_owner, repo_name, enabled, ci_workflow_name, installation_id, allowed_domains, allowed_command_categories";

function canSeeAllRuns(session: RequestSession) {
  return sessionHasAnyRole(session, ["approver", "admin"]);
}

export function canStartRuns(session: RequestSession) {
  return sessionHasAnyRole(session, ["operator", "approver", "admin"]);
}

export function canResolveApprovals(session: RequestSession) {
  return sessionHasAnyRole(session, ["approver", "admin"]);
}

export function canViewPolicies(session: RequestSession) {
  return sessionHasAnyRole(session, ["admin"]);
}

export function getDashboardUser(session: RequestSession): DashboardUser {
  const role = getSessionRole(session);
  const fallbackName =
    role === "admin"
      ? "RePro Admin"
      : role === "approver"
        ? "RePro Approver"
        : role === "operator"
          ? "RePro Operator"
          : "RePro Viewer";

  const rawName = session.user?.name;
  const rawEmail = session.user?.email;

  return {
    name:
      typeof rawName === "string" && rawName.trim().length > 0
        ? rawName
        : rawEmail?.split("@")[0] || fallbackName,
    email:
      typeof rawEmail === "string" && rawEmail.trim().length > 0
        ? rawEmail
        : "unknown@patchpilot.local",
    image: typeof session.user?.image === "string" ? session.user.image : null,
    role,
  };
}

export function getDashboardNavItems(session: RequestSession): DashboardNavItem[] {
  const navItems: DashboardNavItem[] = [
    { href: "/dashboard", label: "Runs", icon: "activity" },
  ];

  if (canStartRuns(session)) {
    navItems.push(
      { href: "/dashboard/new", label: "New Run", icon: "plus" },
      { href: "/voice", label: "Voice", icon: "mic" }
    );
  }

  if (canViewPolicies(session)) {
    navItems.push(
      { href: "/dashboard/recipes", label: "Recipes", icon: "book-open" },
      { href: "/dashboard/admin", label: "Admin", icon: "shield" }
    );
  }

  return navItems;
}

export async function getDashboardRuns(session: RequestSession): Promise<DashboardRun[]> {
  const supabase = getSupabaseAdmin();
  if (!supabase) {
    return [];
  }

  let query = supabase
    .from("runs")
    .select(DASHBOARD_RUN_SELECT)
    .order("created_at", { ascending: false })
    .limit(50);

  if (!canSeeAllRuns(session)) {
    const userId = getSessionUserId(session);
    if (!userId) {
      return [];
    }
    query = query.eq("created_by_user_id", userId);
  }

  const { data, error } = await query;
  if (error) {
    throw new Error(`Failed to load runs: ${error.message}`);
  }

  return (data as DashboardRun[]) ?? [];
}

export async function getEnabledRepoOptions(): Promise<RepoOption[]> {
  const supabase = getSupabaseAdmin();
  if (!supabase) {
    return [];
  }

  const { data, error } = await supabase
    .from("recipes")
    .select(ENABLED_REPO_SELECT)
    .eq("enabled", true)
    .order("repo_owner")
    .order("repo_name");

  if (error) {
    throw new Error(`Failed to load enabled repos: ${error.message}`);
  }

  return (((data ?? []) as Array<{
    id: string;
    repo_owner: string;
    repo_name: string;
    enabled: boolean;
    metadata: Record<string, unknown> | null;
  }>) ?? []).map((repo) => ({
    id: repo.id,
    owner: repo.repo_owner,
    name: repo.repo_name,
    defaultBranch:
      typeof repo.metadata?.defaultBranch === "string"
        ? (repo.metadata.defaultBranch as string)
        : "main",
    enabled: repo.enabled,
  }));
}

export async function getRecipePolicies(): Promise<RecipePolicy[]> {
  const supabase = getSupabaseAdmin();
  if (!supabase) {
    return [];
  }

  const { data, error } = await supabase
    .from("recipes")
    .select(RECIPE_POLICY_SELECT)
    .order("repo_owner")
    .order("repo_name");

  if (error) {
    throw new Error(`Failed to load recipe policies: ${error.message}`);
  }

  return (data as RecipePolicy[]) ?? [];
}

export async function getRunDetailView(
  session: RequestSession,
  runId: string
): Promise<RunDetailView> {
  const emptyState: RunDetailView = {
    run: null,
    events: [],
    steps: [],
    approval: null,
    patch: null,
    pr: null,
    ci: null,
    receipts: null,
  };

  const supabase = getSupabaseAdmin();
  if (!supabase) {
    return emptyState;
  }

  let runQuery = supabase.from("runs").select(RUN_DETAIL_SELECT).eq("id", runId);

  if (!canSeeAllRuns(session)) {
    const userId = getSessionUserId(session);
    if (!userId) {
      return emptyState;
    }
    runQuery = runQuery.eq("created_by_user_id", userId);
  }

  const { data: run, error: runError } = await runQuery.maybeSingle();
  if (runError) {
    throw new Error(`Failed to load run: ${runError.message}`);
  }

  if (!run) {
    return emptyState;
  }

  const [eventsRes, stepsRes, approvalRes, patchRes, prRes, ciRes, receiptsRes] =
    await Promise.all([
      supabase.from("run_events").select("*").eq("run_id", runId).order("seq"),
      supabase.from("run_steps").select("*").eq("run_id", runId).order("started_at"),
      supabase.from("approvals").select(APPROVAL_SELECT).eq("run_id", runId).maybeSingle(),
      supabase.from("patches").select(PATCH_SELECT).eq("run_id", runId).maybeSingle(),
      supabase.from("prs").select(PR_SELECT).eq("run_id", runId).maybeSingle(),
      supabase
        .from("ci_runs")
        .select(CI_SELECT)
        .eq("run_id", runId)
        .order("started_at", { ascending: false })
        .limit(1)
        .maybeSingle(),
      supabase
        .from("receipt_packages")
        .select(RECEIPT_SELECT)
        .eq("run_id", runId)
        .maybeSingle(),
    ]);

  if (eventsRes.error) {
    throw new Error(`Failed to load run events: ${eventsRes.error.message}`);
  }
  if (stepsRes.error) {
    throw new Error(`Failed to load run steps: ${stepsRes.error.message}`);
  }
  if (approvalRes.error) {
    throw new Error(`Failed to load approval data: ${approvalRes.error.message}`);
  }
  if (patchRes.error) {
    throw new Error(`Failed to load patch data: ${patchRes.error.message}`);
  }
  if (prRes.error) {
    throw new Error(`Failed to load PR data: ${prRes.error.message}`);
  }
  if (ciRes.error) {
    throw new Error(`Failed to load CI data: ${ciRes.error.message}`);
  }
  if (receiptsRes.error) {
    throw new Error(`Failed to load receipt data: ${receiptsRes.error.message}`);
  }

  return {
    run: run as RunData,
    events: (eventsRes.data as RunEvent[]) ?? [],
    steps: (stepsRes.data as RunStep[]) ?? [],
    approval: approvalRes.data as ApprovalData | null,
    patch: patchRes.data as PatchData | null,
    pr: prRes.data as PrData | null,
    ci: ciRes.data as CiData | null,
    receipts: receiptsRes.data as ReceiptPackageData | null,
  };
}

export async function getAdminConsoleData(): Promise<AdminConsoleData> {
  const supabase = getSupabaseAdmin();
  if (!supabase) {
    return {
      runs: [],
      approvals: [],
      recipes: [],
    };
  }

  const [runsRes, approvalsRes, recipesRes] = await Promise.all([
    supabase
      .from("runs")
      .select(ADMIN_RUN_SELECT)
      .order("created_at", { ascending: false })
      .limit(100),
    supabase
      .from("approvals")
      .select(ADMIN_APPROVAL_SELECT)
      .order("requested_at", { ascending: false })
      .limit(100),
    supabase
      .from("recipes")
      .select(ADMIN_RECIPE_SELECT)
      .order("repo_owner")
      .order("repo_name"),
  ]);

  if (runsRes.error) {
    throw new Error(`Failed to load admin runs: ${runsRes.error.message}`);
  }
  if (approvalsRes.error) {
    throw new Error(`Failed to load admin approvals: ${approvalsRes.error.message}`);
  }
  if (recipesRes.error) {
    throw new Error(`Failed to load admin recipes: ${recipesRes.error.message}`);
  }

  return {
    runs: (runsRes.data as AdminRunRow[]) ?? [],
    approvals: (approvalsRes.data as AdminApprovalRow[]) ?? [],
    recipes: (recipesRes.data as AdminRecipeRow[]) ?? [],
  };
}
