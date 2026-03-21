import Link from "next/link";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { RunStatusBadge } from "./run-status-badge";

export interface Run {
  id: string;
  created_at: string;
  status: string;
  repo_owner: string;
  repo_name: string;
  source?: string | null;
  mode?: string | null;
  confidence_score?: number | null;
  observability_coverage?: number | null;
}

function timeAgo(dateStr: string) {
  const seconds = Math.floor((Date.now() - new Date(dateStr).getTime()) / 1000);
  if (seconds < 60) return `${seconds}s ago`;
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  return `${Math.floor(hours / 24)}d ago`;
}

export function RunListTable({ runs }: { runs: Run[] }) {
  return (
    <Table>
      <TableHeader className="bg-white/[0.03]">
        <TableRow className="border-none hover:bg-transparent">
          <TableHead>Status</TableHead>
          <TableHead>Repository</TableHead>
          <TableHead>Mode</TableHead>
          <TableHead>Started</TableHead>
          <TableHead>Confidence</TableHead>
          <TableHead className="text-right">Run ID</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {runs.map((run) => (
          <TableRow key={run.id} className="group">
            <TableCell>
              <RunStatusBadge status={run.status} />
            </TableCell>
            <TableCell className="font-medium">
              <span className="opacity-70 group-hover:opacity-100 transition-opacity">{run.repo_owner}</span>
              <span className="text-muted-foreground/40">/</span>
              <span className="text-foreground group-hover:text-primary transition-colors">{run.repo_name}</span>
            </TableCell>
            <TableCell className="text-sm text-muted-foreground">
              <span className="capitalize">{run.source ?? "web"}</span>
              <span className="mx-1 text-white/20">·</span>
              <span>{run.mode === "dry_run" ? "Dry Run" : "Apply + Verify"}</span>
            </TableCell>
            <TableCell className="text-muted-foreground">
              {timeAgo(run.created_at)}
            </TableCell>
            <TableCell className="text-sm text-muted-foreground">
              {run.confidence_score != null ? `${run.confidence_score}/100` : "—"}
            </TableCell>
            <TableCell className="text-right">
              <Link
                href={`/runs/${run.id}`}
                className="rounded-full border border-white/[0.08] bg-white/[0.05] px-3 py-1.5 font-mono text-sm text-muted-foreground transition-colors hover:border-primary/20 hover:bg-primary/10 hover:text-primary"
              >
                {run.id.slice(0, 12)}...
              </Link>
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
}
