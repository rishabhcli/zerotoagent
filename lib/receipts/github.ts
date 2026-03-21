export function runStartedComment(opts: {
  runId: string;
  repo: string;
  summary: string;
  mode?: string;
  environment?: string;
  traceUrl?: string;
}) {
  return [
    `## RePro — Run Started`,
    `- **Run ID**: \`${opts.runId}\``,
    `- **Repo**: ${opts.repo}`,
    `- **Status**: In Progress`,
    `- **Execution model**: Verification-first, approval-gated remediation`,
    ...(opts.mode ? [`- **Mode**: ${opts.mode.replace("_", " ")}`] : []),
    ...(opts.environment ? [`- **Environment**: ${opts.environment}`] : []),
    opts.traceUrl ? `- **[View Run Trace](${opts.traceUrl})**` : "",
    "",
    `### What I understood`,
    opts.summary.slice(0, 500),
    "",
    `### Why this matters`,
    `This run is designed to turn ambiguous incident evidence into reproducible proof, a verified patch, and an auditable decision trail rather than a one-off suggestion.`,
    "",
    `### Next steps`,
    `1. Extract evidence signals`,
    `2. Reproduce in sandbox`,
    `3. Draft & verify patch`,
    `4. Request approval before PR`,
    `5. Attach audit-grade receipts and replayable proof`,
  ]
    .filter(Boolean)
    .join("\n");
}

export function approvalRequestComment(opts: {
  runId: string;
  prTitle?: string;
  patchSummary: string;
  diffstat?: string;
  testSummary: string;
  requiredRole?: string;
  approvalUrl: string;
  traceUrl?: string;
}) {
  return [
    `## RePro — Approval Required`,
    `- **Run ID**: \`${opts.runId}\``,
    `- **Proposed PR**: ${opts.prTitle ?? "Verified fix ready for PR creation"}`,
    `- **Decision class**: Approval-gated autonomous remediation`,
    ...(opts.requiredRole ? [`- **Required role**: ${opts.requiredRole}`] : []),
    "",
    `### Patch summary`,
    opts.patchSummary,
    "",
    `### Verification`,
    `- Tests: ${opts.testSummary}`,
    `- Proof standard: isolated sandbox verification completed before PR creation`,
    "",
    `### Why this is different`,
    `RePro does not ask for trust up front. It requests approval only after producing observable evidence, a bounded patch, and a replayable run trace.`,
    "",
    ...(opts.diffstat
      ? [
          `### Diffstat`,
          "```",
          opts.diffstat,
          "```",
          "",
        ]
      : []),
    `[Open Approval Console](${opts.approvalUrl})`,
    ...(opts.traceUrl ? [`[Review Run Trace](${opts.traceUrl})`] : []),
    "",
    `> Approval is handled in the authenticated web console.`,
  ].join("\n");
}

export function finalReceiptComment(opts: {
  runId: string;
  prUrl?: string;
  prNumber?: number;
  rootCause: string;
  testSummary: string;
  confidence?: number;
  receiptUrl?: string;
  traceUrl?: string;
}) {
  return [
    `## RePro — Verified Fix`,
    ...(opts.prUrl && opts.prNumber != null ? [`- **PR**: [#${opts.prNumber}](${opts.prUrl})`] : []),
    `- **Run ID**: \`${opts.runId}\``,
    `- **Outcome**: Closed-loop remediation completed with receipts`,
    ...(opts.confidence != null ? [`- **Patch confidence**: ${opts.confidence}/100`] : []),
    "",
    `### Root cause`,
    opts.rootCause.slice(0, 500),
    "",
    `### Verification`,
    `- ${opts.testSummary}`,
    "",
    `### Why this matters`,
    `This output is more than a generated patch: it is a verified, approval-aware software reliability action with an auditable trail that teams can inspect and reuse.`,
    "",
    ...(opts.receiptUrl ? [`[Download Receipts](${opts.receiptUrl})`] : []),
    opts.traceUrl ? `[View Run Trace](${opts.traceUrl})` : "",
  ]
    .filter(Boolean)
    .join("\n");
}

export function runFailedComment(opts: {
  runId: string;
  reason: string;
  remediation?: string[];
  traceUrl?: string;
}) {
  return [
    `## RePro — Run Failed`,
    `- **Run ID**: \`${opts.runId}\``,
    `- **Safety result**: No high-impact action was taken without sufficient proof`,
    "",
    `### Reason`,
    opts.reason.slice(0, 500),
    ...(opts.remediation && opts.remediation.length > 0
      ? [
          "",
          `### Remediation`,
          ...opts.remediation.map((item) => `- ${item}`),
        ]
      : []),
    ...(opts.traceUrl ? ["", `[Open Run Trace](${opts.traceUrl})`] : []),
  ].join("\n");
}
