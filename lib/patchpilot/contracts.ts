import { z } from "zod";

export const RunModeSchema = z.enum(["dry_run", "apply_verify"]);
export type RunMode = z.infer<typeof RunModeSchema>;

export const RunSourceSchema = z.enum(["slack", "github", "web", "voice"]);
export type RunSource = z.infer<typeof RunSourceSchema>;

export const RunStatusSchema = z.enum([
  "pending",
  "running",
  "awaiting_approval",
  "approved",
  "rejected",
  "blocked",
  "failed",
  "completed",
]);
export type RunStatus = z.infer<typeof RunStatusSchema>;

export const ArtifactKindSchema = z.enum(["log", "screenshot", "pdf", "audio", "other"]);
export type ArtifactKind = z.infer<typeof ArtifactKindSchema>;

export const ApprovalActionSchema = z.enum(["open_pr", "rollback_preview"]);
export type ApprovalAction = z.infer<typeof ApprovalActionSchema>;

export const RunStepTypeSchema = z.enum([
  "intake",
  "parse_evidence",
  "resolve_repo_policy",
  "sandbox_setup",
  "reproduce",
  "patch",
  "verify",
  "approval",
  "pr_create",
  "ci_watch",
  "receipts_finalize",
]);
export type RunStepType = z.infer<typeof RunStepTypeSchema>;

export const RunStepStatusSchema = z.enum([
  "pending",
  "running",
  "completed",
  "failed",
  "blocked",
  "skipped",
]);
export type RunStepStatus = z.infer<typeof RunStepStatusSchema>;

export const RunEventKindSchema = z.enum([
  "run.started",
  "intake.completed",
  "incident.parsed",
  "repo.policy_resolved",
  "repo.focus",
  "sandbox.created",
  "sandbox.network_policy.updated",
  "sandbox.command.completed",
  "sandbox.command.blocked",
  "reproduction.completed",
  "patch.generated",
  "verification.completed",
  "verification.flaky_detected",
  "approval.requested",
  "approval.resolved",
  "pr.created",
  "ci.started",
  "ci.completed",
  "receipts.created",
  "rollback.proposed",
  "run.blocked",
  "run.completed",
  "run.failed",
]);
export type RunEventKind = z.infer<typeof RunEventKindSchema>;

export const CommandCategorySchema = z.enum([
  "install",
  "repro",
  "test",
  "build",
  "search",
  "read",
  "write",
  "diff",
]);
export type CommandCategory = z.infer<typeof CommandCategorySchema>;

export const ArtifactInputSchema = z.object({
  id: z.string().optional(),
  kind: ArtifactKindSchema,
  filename: z.string().min(1),
  mimeType: z.string().min(1),
  storagePath: z.string().min(1),
  sizeBytes: z.number().int().nonnegative().optional(),
  source: z.string().optional(),
  summary: z.string().optional(),
});
export type ArtifactInput = z.infer<typeof ArtifactInputSchema>;

export const ThreadContextSchema = z.object({
  platform: RunSourceSchema.extract(["slack", "github"]).optional(),
  threadId: z.string().min(1),
  channelId: z.string().optional(),
  messageId: z.string().optional(),
  issueNumber: z.number().int().positive().optional(),
}).partial().refine((value) => Object.keys(value).length > 0, {
  message: "threadContext cannot be empty",
});
export type ThreadContext = z.infer<typeof ThreadContextSchema>;

export const VoiceContextSchema = z.object({
  transcript: z.string().min(1),
  language: z.string().default("en"),
  persona: z.string().default("neutral"),
});
export type VoiceContext = z.infer<typeof VoiceContextSchema>;

export const RepoScopeSchema = z.object({
  owner: z.string().min(1),
  name: z.string().min(1),
  defaultBranch: z.string().min(1).default("main"),
  installationId: z.number().int().positive().optional(),
});
export type RepoScope = z.infer<typeof RepoScopeSchema>;

export const IncidentInputSchema = z.object({
  summaryText: z.string().min(1),
  artifacts: z.array(ArtifactInputSchema).default([]),
});
export type IncidentInput = z.infer<typeof IncidentInputSchema>;

export const RunConfigSchema = z.object({
  installCommand: z.string().min(1).optional(),
  reproCommand: z.string().min(1).optional(),
  testCommand: z.string().min(1).optional(),
  buildCommand: z.string().min(1).optional(),
  packageManager: z.enum(["pnpm", "npm", "yarn"]).optional(),
  maxAgentIterations: z.number().int().min(1).max(12).default(5),
});
export type RunConfig = z.infer<typeof RunConfigSchema>;

export const RunStartPayloadSchema = z.object({
  runId: z.string().min(1).optional(),
  source: RunSourceSchema,
  mode: RunModeSchema,
  environment: z.string().min(1),
  repo: RepoScopeSchema,
  incident: IncidentInputSchema,
  config: RunConfigSchema.default({ maxAgentIterations: 5 }),
  threadContext: ThreadContextSchema.optional(),
  voiceContext: VoiceContextSchema.optional(),
  replayOfRunId: z.string().min(1).optional(),
});
export type RunStartPayload = z.infer<typeof RunStartPayloadSchema>;

export const ApprovalDecisionSchema = z.object({
  approved: z.boolean(),
  comment: z.string().trim().max(500).optional(),
});
export type ApprovalDecision = z.infer<typeof ApprovalDecisionSchema>;

export const RepoPolicySchema = z.object({
  id: z.string(),
  repoOwner: z.string(),
  repoName: z.string(),
  enabled: z.boolean(),
  installationId: z.number().int().positive().nullable().optional(),
  packageManager: z.enum(["pnpm", "npm", "yarn"]).default("pnpm"),
  installCommand: z.string().min(1),
  reproCommand: z.string().min(1).nullable().optional(),
  testCommand: z.string().min(1),
  buildCommand: z.string().nullable().optional(),
  snapshotId: z.string().nullable().optional(),
  ciWorkflowName: z.string().nullable().optional(),
  allowedOutboundDomains: z.array(z.string()).default([]),
  allowedCommandCategories: z.array(CommandCategorySchema).default([
    "install",
    "repro",
    "test",
    "build",
    "search",
    "read",
    "write",
    "diff",
  ]),
  metadata: z.record(z.string(), z.unknown()).default({}),
});
export type RepoPolicy = z.infer<typeof RepoPolicySchema>;

export const ConfidenceBreakdownSchema = z.object({
  score: z.number().int().min(0).max(100),
  boosters: z.array(z.string()),
  reducers: z.array(z.string()),
});
export type ConfidenceBreakdown = z.infer<typeof ConfidenceBreakdownSchema>;

export const ReceiptManifestSchema = z.object({
  runId: z.string(),
  mode: RunModeSchema,
  source: RunSourceSchema,
  repo: z.object({
    owner: z.string(),
    name: z.string(),
    branch: z.string(),
  }),
  environment: z.string(),
  status: RunStatusSchema,
  summary: z.string(),
  patchSummary: z.string(),
  confidence: ConfidenceBreakdownSchema,
  reproducibility: ConfidenceBreakdownSchema,
  observabilityCoverage: z.number().int().min(0).max(100),
  approval: z.object({
    requestedAction: ApprovalActionSchema,
    requiredRole: z.string(),
    approved: z.boolean().nullable(),
    approvedBy: z.string().nullable(),
    comment: z.string().nullable(),
    resolvedAt: z.string().nullable(),
  }),
  pr: z.object({
    url: z.string().nullable(),
    number: z.number().int().nullable(),
  }),
  ci: z.object({
    provider: z.string(),
    status: z.string(),
    url: z.string().nullable(),
    summary: z.string().nullable(),
  }),
  trace: z.object({
    traceId: z.string().nullable(),
    sentryUrl: z.string().nullable(),
  }),
  files: z.array(
    z.object({
      path: z.string(),
      kind: z.string(),
      sizeBytes: z.number().int().nonnegative().optional(),
    })
  ),
});
export type ReceiptManifest = z.infer<typeof ReceiptManifestSchema>;

export const RUN_STEP_TITLES: Record<RunStepType, string> = {
  intake: "Ingest",
  parse_evidence: "Parse Evidence",
  resolve_repo_policy: "Resolve Repo Policy",
  sandbox_setup: "Sandbox Setup",
  reproduce: "Reproduce",
  patch: "Patch",
  verify: "Verify",
  approval: "Approval",
  pr_create: "Open PR",
  ci_watch: "Watch CI",
  receipts_finalize: "Finalize Receipts",
};

export const RUN_EVENT_LABELS: Record<RunEventKind, string> = {
  "run.started": "Run Started",
  "intake.completed": "Intake Completed",
  "incident.parsed": "Evidence Parsed",
  "repo.policy_resolved": "Repo Policy Resolved",
  "repo.focus": "Suspect Files Identified",
  "sandbox.created": "Sandbox Created",
  "sandbox.network_policy.updated": "Network Policy Updated",
  "sandbox.command.completed": "Sandbox Command Completed",
  "sandbox.command.blocked": "Sandbox Command Blocked",
  "reproduction.completed": "Reproduction Completed",
  "patch.generated": "Patch Generated",
  "verification.completed": "Verification Completed",
  "verification.flaky_detected": "Flaky Verification Detected",
  "approval.requested": "Approval Requested",
  "approval.resolved": "Approval Resolved",
  "pr.created": "Pull Request Created",
  "ci.started": "CI Started",
  "ci.completed": "CI Completed",
  "receipts.created": "Receipts Created",
  "rollback.proposed": "Rollback Proposed",
  "run.blocked": "Run Blocked",
  "run.completed": "Run Completed",
  "run.failed": "Run Failed",
};
