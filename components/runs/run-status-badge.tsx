import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

const STATUS_CONFIG: Record<
  string,
  { label: string; className: string; dotClass: string }
> = {
  pending: {
    label: "Pending",
    className: "text-zinc-300 [--surface-fill:var(--glass-fill-quiet)]",
    dotClass: "bg-zinc-300",
  },
  running: {
    label: "Running",
    className: "text-sky-300 [--surface-fill:var(--glass-fill)]",
    dotClass: "bg-sky-300 animate-pulse shadow-[0_0_8px_rgba(125,211,252,0.75)]",
  },
  awaiting_approval: {
    label: "Awaiting",
    className: "text-amber-300 [--surface-fill:var(--glass-fill)]",
    dotClass: "bg-amber-300 animate-pulse shadow-[0_0_8px_rgba(252,211,77,0.8)]",
  },
  approved: {
    label: "Approved",
    className: "text-emerald-300 [--surface-fill:var(--glass-fill)]",
    dotClass: "bg-emerald-300",
  },
  completed: {
    label: "Completed",
    className: "text-emerald-300 [--surface-fill:var(--glass-fill)]",
    dotClass: "bg-emerald-300 shadow-[0_0_8px_rgba(110,231,183,0.6)]",
  },
  blocked: {
    label: "Blocked",
    className: "text-orange-300 [--surface-fill:var(--glass-fill-quiet)]",
    dotClass: "bg-orange-300",
  },
  skipped: {
    label: "Skipped",
    className: "text-slate-300 [--surface-fill:var(--glass-fill-quiet)]",
    dotClass: "bg-slate-300",
  },
  rejected: {
    label: "Rejected",
    className: "text-rose-300 [--surface-fill:var(--glass-fill-quiet)]",
    dotClass: "bg-rose-300",
  },
  failed: {
    label: "Failed",
    className: "text-rose-300 [--surface-fill:var(--glass-fill-quiet)]",
    dotClass: "bg-rose-300 shadow-[0_0_8px_rgba(253,164,175,0.75)]",
  },
};

export function RunStatusBadge({ status }: { status: string }) {
  const config = STATUS_CONFIG[status] ?? STATUS_CONFIG.pending;
  return (
    <Badge
      variant="outline"
      className={cn("gap-2 px-3 py-0.5 font-medium tracking-[0.14em]", config.className)}
    >
      <span className={cn("h-1.5 w-1.5 rounded-full", config.dotClass)} />
      {config.label}
    </Badge>
  );
}
