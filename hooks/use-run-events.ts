"use client";

import { useEffect, useState } from "react";
import { createClient } from "@supabase/supabase-js";
import type { RunStepType } from "@/lib/patchpilot/contracts";

export interface RunEvent {
  id: number;
  run_id: string;
  ts: string;
  seq: number;
  type: string;
  data: Record<string, unknown>;
  span_id: string | null;
  tool_name: string | null;
}

export interface RunStep {
  id: string;
  run_id: string;
  step_type: RunStepType;
  status: string;
  title: string;
  summary: string | null;
  decision: Record<string, unknown> | null;
  evidence: Record<string, unknown> | null;
  tool_receipts: unknown[] | null;
  next_action: string | null;
  retry_count: number;
  started_at: string;
  ended_at: string | null;
  duration_ms: number | null;
}

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

function upsertById<T extends { id: string | number }>(items: T[], item: T) {
  const index = items.findIndex((candidate) => candidate.id === item.id);
  if (index === -1) {
    return [...items, item];
  }

  return items.map((candidate) => (candidate.id === item.id ? item : candidate));
}

export function useRunTrace(
  runId: string,
  initialEvents: RunEvent[],
  initialSteps: RunStep[]
) {
  const [events, setEvents] = useState<RunEvent[]>(initialEvents);
  const [steps, setSteps] = useState<RunStep[]>(initialSteps);

  useEffect(() => {
    if (!supabaseUrl || !supabaseAnonKey) return;

    const supabase = createClient(supabaseUrl, supabaseAnonKey, {
      auth: { persistSession: false, autoRefreshToken: false },
    });

    const channel = supabase
      .channel(`run-trace-${runId}`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "run_events",
          filter: `run_id=eq.${runId}`,
        },
        (payload) => {
          setEvents((prev) => upsertById(prev, payload.new as RunEvent));
        }
      )
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "run_steps",
          filter: `run_id=eq.${runId}`,
        },
        (payload) => {
          setSteps((prev) => upsertById(prev, payload.new as RunStep));
        }
      )
      .on(
        "postgres_changes",
        {
          event: "UPDATE",
          schema: "public",
          table: "run_steps",
          filter: `run_id=eq.${runId}`,
        },
        (payload) => {
          setSteps((prev) => upsertById(prev, payload.new as RunStep));
        }
      )
      .subscribe();

    return () => {
      void supabase.removeChannel(channel);
    };
  }, [runId]);

  return { events, steps };
}
