import { Badge } from "@/components/ui/badge";

const STATUS_CONFIG: Record<string, { label: string; className: string }> = {
  pending: { label: "Pending", className: "bg-zinc-500/20 text-zinc-400 border-zinc-500/30" },
  running: { label: "Running", className: "bg-blue-500/20 text-blue-400 border-blue-500/30 animate-pulse" },
  awaiting_approval: { label: "Awaiting Approval", className: "bg-amber-500/20 text-amber-400 border-amber-500/30" },
  approved: { label: "Approved", className: "bg-green-500/20 text-green-400 border-green-500/30" },
  completed: { label: "Completed", className: "bg-green-500/20 text-green-400 border-green-500/30" },
  rejected: { label: "Rejected", className: "bg-red-500/20 text-red-400 border-red-500/30" },
  failed: { label: "Failed", className: "bg-red-500/20 text-red-400 border-red-500/30" },
};

export function RunStatusBadge({ status }: { status: string }) {
  const config = STATUS_CONFIG[status] ?? STATUS_CONFIG.pending;
  return (
    <Badge variant="outline" className={config.className}>
      {config.label}
    </Badge>
  );
}
