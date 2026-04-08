import { GlassSurface } from "@/components/ui/glass-surface";
import { NewRunForm } from "@/components/runs/new-run-form";
import { requireOperator } from "@/lib/auth-guard";
import { getEnabledRepoOptions } from "@/lib/dashboard-data";

export default async function NewRunPage() {
  await requireOperator();
  const repos = await getEnabledRepoOptions();

  return (
    <div className="space-y-6">
      <GlassSurface
        variant="hero-panel"
        motionStrength={0.3}
        className="p-8 md:p-10"
      >
        <p className="section-kicker">New run</p>
        <h1 className="mt-3 text-4xl font-semibold tracking-tight text-foreground">
          Start a verified run.
        </h1>
        <p className="mt-4 max-w-3xl text-base leading-7 text-muted-foreground">
          Add the incident, choose the repo, then verify or stop at approval.
        </p>
      </GlassSurface>

      {repos.length === 0 ? (
        <GlassSurface
          variant="card"
          motionStrength={0.26}
          className="p-10 text-center text-muted-foreground"
        >
          <p>
            No allowlisted repos yet. Add one in admin first.
          </p>
        </GlassSurface>
      ) : (
        <NewRunForm repos={repos} />
      )}
    </div>
  );
}
