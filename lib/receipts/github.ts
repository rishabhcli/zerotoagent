export function runStartedComment(opts: {
  runId: string;
  repo: string;
  summary: string;
  mode?: string;
  environment?: string;
  traceUrl?: string;
}) {
  return [
    `## PatchPilot — Run Started`,
    `- **Run ID**: \`${opts.runId}\``,
    `- **Repo**: ${opts.repo}`,
    `- **Status**: In Progress`,
    ...(opts.mode ? [`- **Mode**: ${opts.mode.replace("_", " ")}`] : []),
    ...(opts.environment ? [`- **Environment**: ${opts.environment}`] : []),
    opts.traceUrl ? `- **[View Run Trace](${opts.traceUrl})**` : "",
    "",
    `### What I understood`,
    opts.summary.slice(0, 500),
    "",
    `### Next steps`,
    `1. Extract evidence signals`,
    `2. Reproduce in sandbox`,
    `3. Draft & verify patch`,
    `4. Request approval before PR`,
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
    `## PatchPilot — Approval Required`,
    `- **Run ID**: \`${opts.runId}\``,
    `- **Proposed PR**: ${opts.prTitle ?? "Verified fix ready for PR creation"}`,
    ...(opts.requiredRole ? [`- **Required role**: ${opts.requiredRole}`] : []),
    "",
    `### Patch summary`,
    opts.patchSummary,
    "",
    `### Verification`,
    `- Tests: ${opts.testSummary}`,
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
    `## PatchPilot — Verified Fix`,
    ...(opts.prUrl && opts.prNumber != null ? [`- **PR**: [#${opts.prNumber}](${opts.prUrl})`] : []),
    `- **Run ID**: \`${opts.runId}\``,
    ...(opts.confidence != null ? [`- **Patch confidence**: ${opts.confidence}/100`] : []),
    "",
    `### Root cause`,
    opts.rootCause.slice(0, 500),
    "",
    `### Verification`,
    `- ${opts.testSummary}`,
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
    `## PatchPilot — Run Failed`,
    `- **Run ID**: \`${opts.runId}\``,
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
