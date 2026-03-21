"use client";

import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { useRunTrace, type RunEvent, type RunStep } from "@/hooks/use-run-events";
import { RunStatusBadge } from "@/components/runs/run-status-badge";
import { RUN_EVENT_LABELS, RUN_STEP_TITLES } from "@/lib/patchpilot/contracts";

export type { RunStep } from "@/hooks/use-run-events";

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
  initialSteps,
  initialEvents,
}: {
  runId: string;
  initialSteps: RunStep[];
  initialEvents: RunEvent[];
}) {
  const { events, steps } = useRunTrace(runId, initialEvents, initialSteps);

  if (events.length === 0 && steps.length === 0) {
    return (
      <p className="text-muted-foreground text-sm">No events yet.</p>
    );
  }

  return (
    <div className="space-y-8">
      <section className="space-y-3">
        <div>
          <h3 className="text-base font-semibold">Step Timeline</h3>
          <p className="text-sm text-muted-foreground">
            What RePro decided, what it ran, and what happens next.
          </p>
        </div>
        <Accordion className="space-y-3">
          {[...steps]
            .sort((left, right) => {
              const leftTimestamp = new Date(left.started_at).getTime();
              const rightTimestamp = new Date(right.started_at).getTime();
              return leftTimestamp - rightTimestamp;
            })
            .map((step) => (
            <AccordionItem key={step.id} value={step.id} className="rounded-2xl border border-border/60 bg-card/60 px-4">
              <AccordionTrigger className="py-4 hover:no-underline">
                <div className="flex w-full flex-col gap-3 text-left sm:flex-row sm:items-center sm:justify-between">
                  <div>
                    <div className="flex items-center gap-3">
                      <span className="font-medium">
                        {step.title || RUN_STEP_TITLES[step.step_type] || step.step_type}
                      </span>
                      <RunStatusBadge status={step.status} />
                    </div>
                    <p className="mt-1 text-sm text-muted-foreground">
                      {step.summary ?? "No summary recorded for this step."}
                    </p>
                  </div>
                  <div className="text-xs text-muted-foreground">
                    {step.duration_ms != null ? `${step.duration_ms}ms` : formatTimestamp(step.started_at)}
                  </div>
                </div>
              </AccordionTrigger>
              <AccordionContent className="space-y-4 pb-4">
                {step.decision && Object.keys(step.decision).length > 0 ? (
                  <div className="space-y-2">
                    <p className="text-xs font-semibold uppercase tracking-[0.18em] text-muted-foreground">
                      What RePro decided
                    </p>
                    <DataDisplay data={step.decision} />
                  </div>
                ) : null}
                {step.evidence && Object.keys(step.evidence).length > 0 ? (
                  <div className="space-y-2">
                    <p className="text-xs font-semibold uppercase tracking-[0.18em] text-muted-foreground">
                      What evidence supports this
                    </p>
                    <DataDisplay data={step.evidence} />
                  </div>
                ) : null}
                {step.tool_receipts && step.tool_receipts.length > 0 ? (
                  <div className="space-y-2">
                    <p className="text-xs font-semibold uppercase tracking-[0.18em] text-muted-foreground">
                      What RePro did
                    </p>
                    <pre className="overflow-x-auto rounded-xl bg-muted p-3 text-xs">
                      {JSON.stringify(step.tool_receipts, null, 2)}
                    </pre>
                  </div>
                ) : null}
                {step.next_action ? (
                  <div className="rounded-xl border border-dashed border-border/70 px-3 py-2 text-sm text-muted-foreground">
                    Next: {step.next_action}
                  </div>
                ) : null}
              </AccordionContent>
            </AccordionItem>
          ))}
        </Accordion>
      </section>

      <section className="space-y-3">
        <div>
          <h3 className="text-base font-semibold">Event Ledger</h3>
          <p className="text-sm text-muted-foreground">
            Raw receipts, transitions, and workflow events for this run.
          </p>
        </div>
        <div className="relative">
          <div className="absolute left-4 top-0 bottom-0 w-px bg-border" />
          <Accordion className="space-y-2">
            {[...events]
              .sort((a, b) => a.seq - b.seq)
              .map((event) => (
                <AccordionItem key={event.id} value={String(event.id)} className="border-none">
                  <div className="flex items-start gap-4">
                    <div className="relative z-10 mt-3 h-3 w-3 shrink-0 rounded-full border-2 border-background bg-primary" />
                    <div className="min-w-0 flex-1">
                      <AccordionTrigger className="py-2 hover:no-underline">
                        <div className="flex items-center gap-3 text-left">
                          <span className="font-medium">
                            {RUN_EVENT_LABELS[event.type as keyof typeof RUN_EVENT_LABELS] ?? event.type}
                          </span>
                          <span className="text-xs font-mono text-muted-foreground">
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
      </section>
    </div>
  );
}
