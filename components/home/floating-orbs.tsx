export function FloatingOrbs() {
  return (
    <div className="pointer-events-none fixed inset-0 z-0 overflow-hidden">
      <div className="absolute -left-[10%] -top-[15%] size-[500px] rounded-full bg-primary/[0.07] blur-[120px] animate-orb-1" />
      <div className="absolute left-[70%] top-[10%] size-[400px] rounded-full bg-indigo-500/[0.06] blur-[100px] animate-orb-2" />
      <div className="absolute left-[50%] top-[60%] size-[350px] rounded-full bg-purple-500/[0.05] blur-[110px] animate-orb-3" />
      <div className="absolute -left-[5%] top-[75%] size-[300px] rounded-full bg-cyan-500/[0.04] blur-[90px] animate-orb-4" />
    </div>
  );
}
