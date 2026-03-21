export function runStartedComment(opts: {
  runId: string;
  repo: string;
  summary: string;
  traceUrl?: string;
}) {
  return [
    `## PatchPilot — Run Started`,
    `- **Run ID**: \`${opts.runId}\``,
    `- **Repo**: ${opts.repo}`,
    `- **Status**: In Progress`,
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
  prTitle: string;
  diffstat: string;
  testSummary: string;
}) {
  return [
    `## PatchPilot — Approval Required`,
    `- **Run ID**: \`${opts.runId}\``,
    `- **Proposed PR**: ${opts.prTitle}`,
    "",
    `### Verification`,
    `- Tests: ${opts.testSummary}`,
    "",
    `### Diffstat`,
    "```",
    opts.diffstat,
    "```",
    "",
    `> Approve or reject this fix via the dashboard or Slack.`,
  ].join("\n");
}

export function finalReceiptComment(opts: {
  runId: string;
  prUrl: string;
  prNumber: number;
  rootCause: string;
  testSummary: string;
  traceUrl?: string;
}) {
  return [
    `## PatchPilot — Verified Fix`,
    `- **PR**: [#${opts.prNumber}](${opts.prUrl})`,
    `- **Run ID**: \`${opts.runId}\``,
    "",
    `### Root cause`,
    opts.rootCause.slice(0, 500),
    "",
    `### Verification`,
    `- ${opts.testSummary}`,
    "",
    opts.traceUrl ? `[View Run Trace](${opts.traceUrl})` : "",
  ]
    .filter(Boolean)
    .join("\n");
}

export function runFailedComment(opts: {
  runId: string;
  reason: string;
}) {
  return [
    `## PatchPilot — Run Failed`,
    `- **Run ID**: \`${opts.runId}\``,
    "",
    `### Reason`,
    opts.reason.slice(0, 500),
  ].join("\n");
}
