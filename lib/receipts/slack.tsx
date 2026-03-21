import { Card, CardText, Actions, Button, Divider, Fields, Field, LinkButton } from "chat";

export function runStartedCard(opts: {
  runId: string;
  repo: string;
  summary: string;
  traceUrl?: string;
}) {
  return Card({
    title: "PatchPilot — Run Started",
    children: [
      CardText(`Run ID: \`${opts.runId}\``),
      CardText(`Repo: ${opts.repo}`),
      CardText(`Incident: ${opts.summary.slice(0, 200)}`),
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
  prTitle: string;
  diffstat: string;
  testSummary: string;
  confidence?: number;
}) {
  return Card({
    title: "Approval Required: Open PR?",
    children: [
      CardText("What PatchPilot wants to do:", { style: "bold" }),
      CardText(opts.prTitle),
      Divider(),
      Fields([
        Field({ label: "Tests", value: opts.testSummary }),
        Field({ label: "Diffstat", value: opts.diffstat }),
        ...(opts.confidence != null
          ? [Field({ label: "Confidence", value: `${opts.confidence}/100` })]
          : []),
      ]),
      Divider(),
      Actions([
        Button({
          id: "approve",
          label: "Approve PR",
          style: "primary",
          value: opts.runId,
        }),
        Button({
          id: "reject",
          label: "Reject",
          style: "danger",
          value: opts.runId,
        }),
      ]),
    ],
  });
}

export function finalReceiptCard(opts: {
  runId: string;
  prUrl: string;
  prNumber: number;
  summary: string;
  testCount?: string;
  traceUrl?: string;
}) {
  return Card({
    title: "PatchPilot — PR Created",
    children: [
      CardText(`PR: #${opts.prNumber}`, { style: "bold" }),
      CardText(opts.summary.slice(0, 300)),
      Divider(),
      Fields([
        ...(opts.testCount ? [Field({ label: "Tests", value: opts.testCount })] : []),
        Field({ label: "Run ID", value: `\`${opts.runId}\`` }),
      ]),
      Actions([
        LinkButton({ url: opts.prUrl, label: "View PR" }),
        ...(opts.traceUrl
          ? [LinkButton({ url: opts.traceUrl, label: "Run Trace" })]
          : []),
      ]),
    ],
  });
}

export function runFailedCard(opts: {
  runId: string;
  reason: string;
}) {
  return Card({
    title: "PatchPilot — Run Failed",
    children: [
      CardText(`Run \`${opts.runId}\` failed.`),
      CardText(opts.reason.slice(0, 500)),
    ],
  });
}
