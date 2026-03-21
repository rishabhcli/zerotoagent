"use client";

import { useState } from "react";
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

export function ApprovalCard({
  runId,
  token,
}: {
  runId: string;
  token: string;
}) {
  const [status, setStatus] = useState<"pending" | "submitting" | "done">("pending");
  const [result, setResult] = useState<string | null>(null);

  const handleDecision = async (approved: boolean) => {
    setStatus("submitting");
    try {
      const res = await fetch("/api/hooks/approval", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token, approved }),
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
    <Card className="border-amber-500/30">
      <CardHeader>
        <CardTitle className="text-lg">Approval Required</CardTitle>
      </CardHeader>
      <CardContent>
        <p className="text-sm text-muted-foreground">
          Run <code className="font-mono">{runId}</code> has a verified patch
          ready. Approve to create the PR.
        </p>
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
