"use client";

import { useState } from "react";
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

export function ApprovalCard({
  runId,
  requiredRole = "approver",
  patchSummary,
  testSummary,
  diffstat,
}: {
  runId: string;
  requiredRole?: string;
  patchSummary?: string | null;
  testSummary?: string | null;
  diffstat?: string | null;
}) {
  const [status, setStatus] = useState<"pending" | "submitting" | "done">("pending");
  const [result, setResult] = useState<string | null>(null);

  const handleDecision = async (approved: boolean) => {
    setStatus("submitting");
    try {
      const res = await fetch(`/api/runs/${runId}/approve`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ approved }),
      });
      if (res.ok) {
        setResult(approved ? "Approved" : "Rejected");
        setStatus("done");
      } else {
        setResult(`Error: ${await res.text()}`);
        setStatus("pending");
      }
    } catch (err) {
      setResult(`Error: ${err}`);
      setStatus("pending");
    }
  };

  return (
    <Card className="liquid-glass !rounded-[24px] !border-amber-400/20">
      <CardHeader>
        <CardTitle className="text-lg">Approval Required</CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        <p className="text-sm text-muted-foreground">
          Run <code className="font-mono">{runId}</code> has a verified patch
          ready. Approve to create the PR.
        </p>
        <div className="grid gap-2 rounded-lg border border-border/60 bg-muted/30 p-3 text-sm">
          <div className="flex items-center justify-between gap-4">
            <span className="text-muted-foreground">Required role</span>
            <span className="font-medium capitalize">{requiredRole}</span>
          </div>
          {testSummary ? (
            <div className="flex items-center justify-between gap-4">
              <span className="text-muted-foreground">Verification</span>
              <span className="font-medium">{testSummary}</span>
            </div>
          ) : null}
          {diffstat ? (
            <div className="flex items-center justify-between gap-4">
              <span className="text-muted-foreground">Diffstat</span>
              <span className="font-medium">{diffstat}</span>
            </div>
          ) : null}
        </div>
        {patchSummary ? (
          <p className="text-sm leading-6 text-foreground/90">{patchSummary}</p>
        ) : null}
        {result && (
          <p className="mt-2 text-sm font-medium">
            {result}
          </p>
        )}
      </CardContent>
      {status !== "done" && (
        <CardFooter className="gap-3">
          <Button
            onClick={() => handleDecision(true)}
            disabled={status === "submitting"}
          >
            {status === "submitting" ? "Submitting..." : "Approve PR"}
          </Button>
          <Button
            variant="destructive"
            onClick={() => handleDecision(false)}
            disabled={status === "submitting"}
          >
            Reject
          </Button>
        </CardFooter>
      )}
    </Card>
  );
}
