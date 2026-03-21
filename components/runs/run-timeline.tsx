"use client";

import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { useRunEvents, type RunEvent } from "@/hooks/use-run-events";

const EVENT_LABELS: Record<string, string> = {
  "run.started": "Run Started",
  "incident.parsed": "Evidence Extracted",
  "repo.focus": "Files Identified",
  "sandbox.created": "Sandbox Created",
  "sandbox.repro": "Reproduction Attempted",
  "sandbox.patch_attempt": "Patch Attempt",
  "sandbox.tests": "Tests Executed",
  "verification.done": "Verification Complete",
  "approval.requested": "Approval Requested",
  "approval.resolved": "Approval Resolved",
  "pr.created": "PR Created",
  "run.completed": "Run Completed",
  "run.failed": "Run Failed",
};

function formatTimestamp(ts: string) {
  return new Date(ts).toLocaleTimeString();
}

function DataDisplay({ data }: { data: Record<string, unknown> }) {
  const entries = Object.entries(data).filter(
    ([, v]) => v !== null && v !== undefined && v !== ""
  );
  if (entries.length === 0) return null;

  return (
    <dl className="grid grid-cols-[auto_1fr] gap-x-4 gap-y-1 text-sm">
      {entries.map(([key, value]) => (
        <div key={key} className="contents">
          <dt className="text-muted-foreground font-mono">{key}</dt>
          <dd className="break-all">
            {typeof value === "object" ? (
              <pre className="text-xs bg-muted rounded p-2 overflow-x-auto">
                {JSON.stringify(value, null, 2)}
              </pre>
            ) : (
              String(value)
            )}
          </dd>
        </div>
      ))}
    </dl>
  );
}

export function RunTimeline({
  runId,
  initialEvents,
}: {
  runId: string;
  initialEvents: RunEvent[];
}) {
  const events = useRunEvents(runId, initialEvents);

  if (events.length === 0) {
    return (
      <p className="text-muted-foreground text-sm">No events yet.</p>
    );
  }

  return (
    <div className="relative">
      {/* Vertical line */}
      <div className="absolute left-4 top-0 bottom-0 w-px bg-border" />

      <Accordion className="space-y-2">
        {events
          .sort((a, b) => a.seq - b.seq)
          .map((event) => (
            <AccordionItem
              key={event.id}
              className="border-none"
            >
              <div className="flex items-start gap-4">
                {/* Dot */}
                <div className="relative z-10 mt-3 h-3 w-3 shrink-0 rounded-full bg-primary border-2 border-background" />

                <div className="flex-1 min-w-0">
                  <AccordionTrigger className="py-2 hover:no-underline">
                    <div className="flex items-center gap-3 text-left">
                      <span className="font-medium">
                        {EVENT_LABELS[event.type] ?? event.type}
                      </span>
                      <span className="text-xs text-muted-foreground font-mono">
                        {formatTimestamp(event.ts)}
                      </span>
                    </div>
                  </AccordionTrigger>
                  <AccordionContent>
                    <DataDisplay data={event.data} />
                  </AccordionContent>
                </div>
              </div>
            </AccordionItem>
          ))}
      </Accordion>
    </div>
  );
}
