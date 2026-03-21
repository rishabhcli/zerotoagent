import { Badge } from "@/components/ui/badge";

const STATUS_CONFIG: Record<string, { label: string; className: string; dotClass: string }> = {
  pending: { label: "Pending", className: "bg-zinc-500/[0.08] text-zinc-400 border-white/[0.08] backdrop-blur-md", dotClass: "bg-zinc-400" },
  running: { label: "Running", className: "bg-blue-500/[0.08] text-blue-400 border-white/[0.08] backdrop-blur-md", dotClass: "bg-blue-400 animate-pulse shadow-[0_0_8px_rgba(96,165,250,0.8)]" },
  awaiting_approval: { label: "Awaiting", className: "bg-amber-500/[0.08] text-amber-400 border-white/[0.08] backdrop-blur-md", dotClass: "bg-amber-400 animate-pulse shadow-[0_0_8px_rgba(251,191,36,0.8)]" },
  approved: { label: "Approved", className: "bg-green-500/[0.08] text-green-400 border-white/[0.08] backdrop-blur-md", dotClass: "bg-green-400" },
  completed: { label: "Completed", className: "bg-emerald-500/[0.08] text-emerald-400 border-white/[0.08] backdrop-blur-md", dotClass: "bg-emerald-400 shadow-[0_0_8px_rgba(52,211,153,0.5)]" },
  blocked: { label: "Blocked", className: "bg-orange-500/[0.08] text-orange-400 border-white/[0.08] backdrop-blur-md", dotClass: "bg-orange-400" },
  skipped: { label: "Skipped", className: "bg-slate-500/[0.08] text-slate-300 border-white/[0.08] backdrop-blur-md", dotClass: "bg-slate-300" },
  rejected: { label: "Rejected", className: "bg-red-500/[0.08] text-red-400 border-white/[0.08] backdrop-blur-md", dotClass: "bg-red-400" },
  failed: { label: "Failed", className: "bg-red-500/[0.08] text-red-500 border-white/[0.08] backdrop-blur-md", dotClass: "bg-red-500 shadow-[0_0_8px_rgba(239,68,68,0.8)]" },
};

export function RunStatusBadge({ status }: { status: string }) {
  const config = STATUS_CONFIG[status] ?? STATUS_CONFIG.pending;
  return (
    <Badge variant="outline" className={`${config.className} gap-2 px-2.5 py-0.5 rounded-full font-medium transition-all shadow-sm`}>
      <span className={`w-1.5 h-1.5 rounded-full ${config.dotClass}`} />
      {config.label}
    </Badge>
  );
}
