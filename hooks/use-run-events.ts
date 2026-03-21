"use client";

import { useEffect, useState } from "react";
import { createClient } from "@supabase/supabase-js";

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

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

export function useRunEvents(runId: string, initialEvents: RunEvent[]) {
  const [events, setEvents] = useState<RunEvent[]>(initialEvents);

  useEffect(() => {
    if (!supabaseUrl || !supabaseAnonKey) return;

    const supabase = createClient(supabaseUrl, supabaseAnonKey);

    const channel = supabase
      .channel(`run-events-${runId}`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "run_events",
          filter: `run_id=eq.${runId}`,
        },
        (payload) => {
          setEvents((prev) => [...prev, payload.new as RunEvent]);
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [runId]);

  return events;
}
