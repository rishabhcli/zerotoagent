import { Card, CardText, Divider, Fields, Field, LinkButton } from "chat";

export function runStartedCard(opts: {
  runId: string;
  repo: string;
  summary: string;
  mode?: string;
  environment?: string;
  nextSteps?: string[];
  traceUrl?: string;
}) {
  return Card({
    title: "PatchPilot — Run Started",
    children: [
      CardText(`Run ID: \`${opts.runId}\``),
      CardText(`Repo: ${opts.repo}`),
      ...(opts.mode ? [CardText(`Mode: ${opts.mode.replace("_", " ")}`)] : []),
      ...(opts.environment ? [CardText(`Environment: ${opts.environment}`)] : []),
      Divider(),
      CardText("What I understood", { style: "bold" }),
      CardText(opts.summary.slice(0, 300)),
      ...(opts.nextSteps && opts.nextSteps.length > 0
        ? [
            Divider(),
            CardText("What I will do next", { style: "bold" }),
            CardText(
              opts.nextSteps
                .slice(0, 5)
                .map((step, index) => `${index + 1}. ${step}`)
                .join("\n")
            ),
          ]
        : []),
      Divider(),
      ...(opts.traceUrl
        ? [LinkButton({ url: opts.traceUrl, label: "View Run Trace" })]
        : [CardText("Run trace will be available on the dashboard.", { style: "muted" })]),
    ],
  });
}

export function stepProgressCard(opts: {
  runId: string;
  stepName: string;
  description: string;
}) {
  return Card({
    title: `Step: ${opts.stepName}`,
    children: [
      CardText(opts.description),
      CardText(`Run: \`${opts.runId}\``, { style: "muted" }),
    ],
  });
}

export function approvalRequestCard(opts: {
  runId: string;
  prTitle?: string;
  patchSummary: string;
  diffstat?: string;
  testSummary: string;
  requiredRole?: string;
  confidence?: number;
  approvalUrl: string;
  traceUrl?: string;
}) {
  return Card({
    title: "Approval Required: Open PR?",
    children: [
      CardText("What PatchPilot wants to do:", { style: "bold" }),
      CardText(opts.prTitle ?? "Open a pull request for the verified patch."),
      Divider(),
      Fields([
        Field({ label: "Tests", value: opts.testSummary }),
        ...(opts.diffstat ? [Field({ label: "Diffstat", value: opts.diffstat })] : []),
        Field({ label: "Patch", value: opts.patchSummary.slice(0, 120) }),
        ...(opts.requiredRole ? [Field({ label: "Approver", value: opts.requiredRole })] : []),
        ...(opts.confidence != null
          ? [Field({ label: "Confidence", value: `${opts.confidence}/100` })]
          : []),
      ]),
      Divider(),
      LinkButton({ url: opts.approvalUrl, label: "Open Approval Console" }),
      ...(opts.traceUrl ? [LinkButton({ url: opts.traceUrl, label: "Review Run Trace" })] : []),
    ],
  });
}

export function finalReceiptCard(opts: {
  runId: string;
  prUrl?: string;
  prNumber?: number;
  summary: string;
  testCount?: string;
  confidence?: number;
  receiptUrl?: string;
  traceUrl?: string;
}) {
  return Card({
    title: opts.prUrl ? "PatchPilot — PR Created" : "PatchPilot — Run Complete",
    children: [
      ...(opts.prNumber != null ? [CardText(`PR: #${opts.prNumber}`, { style: "bold" })] : []),
      CardText(opts.summary.slice(0, 300)),
      Divider(),
      Fields([
        ...(opts.testCount ? [Field({ label: "Tests", value: opts.testCount })] : []),
        ...(opts.confidence != null
          ? [Field({ label: "Confidence", value: `${opts.confidence}/100` })]
          : []),
        Field({ label: "Run ID", value: `\`${opts.runId}\`` }),
      ]),
      ...(opts.prUrl ? [LinkButton({ url: opts.prUrl, label: "View PR" })] : []),
      ...(opts.receiptUrl ? [LinkButton({ url: opts.receiptUrl, label: "Download Receipts" })] : []),
      ...(opts.traceUrl ? [LinkButton({ url: opts.traceUrl, label: "Run Trace" })] : []),
    ],
  });
}

export function runFailedCard(opts: {
  runId: string;
  reason: string;
  remediation?: string[];
  traceUrl?: string;
}) {
  return Card({
    title: "PatchPilot — Run Failed",
    children: [
      CardText(`Run \`${opts.runId}\` failed.`),
      CardText(opts.reason.slice(0, 500)),
      ...(opts.remediation && opts.remediation.length > 0
        ? [
            Divider(),
            CardText("Recommended next step", { style: "bold" }),
            CardText(opts.remediation.slice(0, 3).join("\n")),
          ]
        : []),
      ...(opts.traceUrl ? [LinkButton({ url: opts.traceUrl, label: "Open Run Trace" })] : []),
    ],
  });
}
