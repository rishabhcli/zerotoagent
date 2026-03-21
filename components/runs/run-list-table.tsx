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
      <TableHeader className="bg-white/5 border-b border-white/10">
        <TableRow className="border-none hover:bg-transparent">
          <TableHead className="font-semibold text-muted-foreground/80 h-12">Status</TableHead>
          <TableHead className="font-semibold text-muted-foreground/80 h-12">Repository</TableHead>
          <TableHead className="font-semibold text-muted-foreground/80 h-12">Mode</TableHead>
          <TableHead className="font-semibold text-muted-foreground/80 h-12">Started</TableHead>
          <TableHead className="font-semibold text-muted-foreground/80 h-12">Confidence</TableHead>
          <TableHead className="font-semibold text-muted-foreground/80 h-12 text-right">Run ID</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {runs.map((run) => (
          <TableRow key={run.id} className="border-b border-white/5 hover:bg-white/5 transition-colors group">
            <TableCell className="py-4">
              <RunStatusBadge status={run.status} />
            </TableCell>
            <TableCell className="font-medium flex items-center gap-2 py-4">
              <span className="opacity-70 group-hover:opacity-100 transition-opacity">{run.repo_owner}</span>
              <span className="text-muted-foreground/40">/</span>
              <span className="text-foreground group-hover:text-primary transition-colors">{run.repo_name}</span>
            </TableCell>
            <TableCell className="py-4 text-sm text-muted-foreground">
              <span className="capitalize">{run.source ?? "web"}</span>
              <span className="mx-1 text-white/20">·</span>
              <span>{run.mode === "dry_run" ? "Dry Run" : "Apply + Verify"}</span>
            </TableCell>
            <TableCell className="text-muted-foreground py-4">
              {timeAgo(run.created_at)}
            </TableCell>
            <TableCell className="py-4 text-sm text-muted-foreground">
              {run.confidence_score != null ? `${run.confidence_score}/100` : "—"}
            </TableCell>
            <TableCell className="text-right py-4">
              <Link
                href={`/runs/${run.id}`}
                className="font-mono text-sm text-muted-foreground hover:text-primary transition-colors px-3 py-1.5 rounded-md bg-white/5 hover:bg-primary/10 border border-transparent hover:border-primary/20"
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
