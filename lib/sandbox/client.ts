import { Sandbox } from "@vercel/sandbox";
import type { RepoPolicy } from "@/lib/patchpilot/contracts";

export async function createRepoSandbox(opts: {
  repoUrl: string;
  username?: string;
  password?: string;
  runtime?: string;
  timeoutMs?: number;
}) {
  console.log(`[sandbox] creating from git: ${opts.repoUrl}`);

  const timeout = opts.timeoutMs ?? 10 * 60 * 1000;
  const runtime = (opts.runtime ?? "node24") as "node24";

  let sandbox: Sandbox;

  if (opts.password) {
    sandbox = await Sandbox.create({
      source: {
        type: "git",
        url: opts.repoUrl,
        username: opts.username ?? "x-access-token",
        password: opts.password,
        depth: 50,
      },
      timeout,
      runtime,
    });
  } else {
    sandbox = await Sandbox.create({
      source: {
        type: "git",
        url: opts.repoUrl,
        depth: 50,
      },
      timeout,
      runtime,
    });
  }

  console.log(`[sandbox] created: ${sandbox.sandboxId}`);
  return sandbox;
}

export async function createFromSnapshot(snapshotId: string) {
  console.log(`[sandbox] creating from snapshot: ${snapshotId}`);

  const sandbox = await Sandbox.create({
    source: { type: "snapshot", snapshotId },
    timeout: 10 * 60 * 1000,
  });

  console.log(`[sandbox] created from snapshot: ${sandbox.sandboxId}`);
  return sandbox;
}

export async function applyInstallNetworkPolicy(
  sandbox: Sandbox,
  policy: RepoPolicy
) {
  if (policy.allowedOutboundDomains.length === 0) {
    console.log(`[sandbox:${sandbox.sandboxId}] network policy: allow-all (no domains configured)`);
    return "allow-all";
  }

  console.log(
    `[sandbox:${sandbox.sandboxId}] network policy: allow ${policy.allowedOutboundDomains.join(", ")}`
  );
  await sandbox.updateNetworkPolicy({
    allow: policy.allowedOutboundDomains,
  });

  return policy.allowedOutboundDomains;
}

export async function lockdownEgress(sandbox: Sandbox) {
  console.log(`[sandbox:${sandbox.sandboxId}] locking down egress`);
  await sandbox.updateNetworkPolicy("deny-all");
  return "deny-all";
}

export async function cleanupSandbox(sandbox: Sandbox) {
  try {
    console.log(`[sandbox:${sandbox.sandboxId}] stopping`);
    await sandbox.stop();
  } catch (err) {
    console.warn(`[sandbox] cleanup error (non-fatal):`, err);
  }
}
