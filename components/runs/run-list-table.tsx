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
      <TableHeader>
        <TableRow>
          <TableHead>Status</TableHead>
          <TableHead>Repository</TableHead>
          <TableHead>Started</TableHead>
          <TableHead>Run ID</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {runs.map((run) => (
          <TableRow key={run.id}>
            <TableCell>
              <RunStatusBadge status={run.status} />
            </TableCell>
            <TableCell className="font-medium">
              {run.repo_owner}/{run.repo_name}
            </TableCell>
            <TableCell className="text-muted-foreground">
              {timeAgo(run.created_at)}
            </TableCell>
            <TableCell>
              <Link
                href={`/runs/${run.id}`}
                className="font-mono text-sm text-primary underline-offset-4 hover:underline"
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
