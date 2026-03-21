import {
  Search,
  Bug,
  Wrench,
  ShieldCheck,
  GitPullRequest,
} from "lucide-react";

const steps = [
  {
    icon: Search,
    title: "Diagnose",
    description: "Parses the incident, identifies the root cause and affected files",
    color: "from-blue-500 to-cyan-400",
  },
  {
    icon: Bug,
    title: "Reproduce",
    description: "Spins up an isolated sandbox and reproduces the failure",
    color: "from-amber-500 to-orange-400",
  },
  {
    icon: Wrench,
    title: "Patch",
    description: "Generates a targeted fix and applies it to the codebase",
    color: "from-primary to-indigo-400",
  },
  {
    icon: ShieldCheck,
    title: "Verify",
    description: "Runs the full test suite to confirm the fix and check for regressions",
    color: "from-emerald-500 to-green-400",
  },
  {
    icon: GitPullRequest,
    title: "PR",
    description: "Waits for your approval, then opens a verified pull request",
    color: "from-purple-500 to-pink-400",
  },
];

export function WorkflowSection() {
  return (
    <section
      id="workflow"
      className="relative z-10 mx-auto w-full max-w-6xl px-6 py-24 md:py-32"
    >
      <div className="mb-16 text-center animate-fade-in-up" style={{ animationDelay: "0.1s" }}>
        <p className="mb-3 text-sm font-medium uppercase tracking-widest text-primary">
          The Pipeline
        </p>
        <h2 className="text-3xl font-semibold tracking-tight md:text-5xl">
          Five steps. Zero guesswork.
        </h2>
      </div>

      <div className="relative grid gap-6 md:grid-cols-5">
        {/* Connecting line */}
        <div className="absolute top-1/2 left-[10%] right-[10%] hidden h-px bg-gradient-to-r from-transparent via-white/20 to-transparent md:block animate-scale-x-in" />

        {steps.map((step, i) => {
          const Icon = step.icon;
          return (
            <div
              key={step.title}
              className="group relative flex flex-col items-center gap-4 rounded-3xl liquid-glass p-6 text-center transition-all duration-300 hover:bg-white/[0.12] hover:shadow-[0_12px_40px_rgba(0,0,0,0.5)] animate-fade-in-up"
              style={{ animationDelay: `${0.2 + i * 0.12}s` }}
            >
              {/* Step number */}
              <span className="absolute -top-3 right-4 flex size-6 items-center justify-center rounded-full bg-white/10 text-[10px] font-bold text-muted-foreground">
                {i + 1}
              </span>

              {/* Icon */}
              <div
                className={`flex size-12 items-center justify-center rounded-2xl bg-gradient-to-br ${step.color} shadow-lg transition-transform duration-300 group-hover:scale-110`}
              >
                <Icon className="size-5 text-white" />
              </div>

              <h3 className="text-sm font-semibold tracking-wide">
                {step.title}
              </h3>
              <p className="text-xs leading-relaxed text-muted-foreground">
                {step.description}
              </p>
            </div>
          );
        })}
      </div>
    </section>
  );
}
