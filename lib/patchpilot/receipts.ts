import JSZip from "jszip";
import { PATCHPILOT_RECEIPTS_BUCKET, requireSupabaseAdmin } from "@/lib/patchpilot/supabase";
import type { ReceiptManifest } from "@/lib/patchpilot/contracts";
import { ReceiptManifestSchema } from "@/lib/patchpilot/contracts";
import { redactUnknown, truncateForReceipt } from "@/lib/patchpilot/redaction";

export function buildReceiptManifest(input: ReceiptManifest): ReceiptManifest {
  return ReceiptManifestSchema.parse(redactUnknown(input));
}

export async function createReceiptArchive(input: {
  manifest: ReceiptManifest;
  diff: string;
  runEvents: unknown[];
  runSteps: unknown[];
  approvalRecord?: unknown;
  ciRecord?: unknown;
}) {
  const zip = new JSZip();
  const manifest = buildReceiptManifest(input.manifest);

  zip.file("manifest.json", JSON.stringify(manifest, null, 2));
  zip.file(
    "summary.md",
    [
      `# RePro Receipt`,
      `Verification-first incident response package with audit-grade proof.`,
      ``,
      `- Run ID: \`${manifest.runId}\``,
      `- Status: ${manifest.status}`,
      `- Repo: ${manifest.repo.owner}/${manifest.repo.name} (${manifest.repo.branch})`,
      `- Mode: ${manifest.mode.replace("_", " ")}`,
      `- Source: ${manifest.source}`,
      `- Confidence: ${manifest.confidence.score}/100`,
      `- Reproducibility: ${manifest.reproducibility.score}/100`,
      `- Observability Coverage: ${manifest.observabilityCoverage}%`,
      `- PR: ${manifest.pr.url ?? "Not created"}`,
      `- CI: ${manifest.ci.status}`,
      ``,
      `## Summary`,
      manifest.summary,
      ``,
      `## Patch Summary`,
      manifest.patchSummary,
      ``,
      `## Why This Matters`,
      `RePro converts ambiguous incident evidence into verified, approval-aware remediation instead of stopping at diagnosis or code suggestion.`,
      ``,
      `## Proof and Trust Signals`,
      `- Isolated sandbox execution`,
      `- Verification completed before PR creation`,
      `- Human approval gate for high-impact actions`,
      `- Audit-grade receipts and trace linkage`,
      `- Replayable run history for future investigation`,
      ``,
      `## Differentiation`,
      `This project combines artifact-native multimodal intake, verification-first execution, observability as product UX, and human-in-the-loop autonomy in one workflow.`,
      ``,
      `## Long-term Value`,
      `Each run becomes reusable operational memory: what failed, why it failed, what changed, what proof was collected, and who approved the outcome.`,
    ].join("\n")
  );
  zip.file("patch.diff", truncateForReceipt(input.diff, 200_000));
  zip.file("run-events.json", JSON.stringify(redactUnknown(input.runEvents), null, 2));
  zip.file("run-steps.json", JSON.stringify(redactUnknown(input.runSteps), null, 2));

  if (input.approvalRecord) {
    zip.file("approval.json", JSON.stringify(redactUnknown(input.approvalRecord), null, 2));
  }

  if (input.ciRecord) {
    zip.file("ci.json", JSON.stringify(redactUnknown(input.ciRecord), null, 2));
  }

  return zip.generateAsync({ type: "nodebuffer" });
}

export async function storeReceiptArchive(input: {
  runId: string;
  archive: Buffer;
  manifest: ReceiptManifest;
}) {
  const supabase = requireSupabaseAdmin();
  const storagePath = `${input.runId}/receipts-${Date.now()}.zip`;

  const { error: uploadError } = await supabase.storage
    .from(PATCHPILOT_RECEIPTS_BUCKET)
    .upload(storagePath, input.archive, {
      contentType: "application/zip",
      upsert: true,
    });

  if (uploadError) {
    throw new Error(uploadError.message);
  }

  const { data: signedData, error: signedError } = await supabase.storage
    .from(PATCHPILOT_RECEIPTS_BUCKET)
    .createSignedUrl(storagePath, 60 * 60);

  if (signedError) {
    throw new Error(signedError.message);
  }

  await supabase.from("receipt_packages").upsert(
    {
      run_id: input.runId,
      format: "zip",
      storage_path: storagePath,
      manifest: input.manifest,
      retention_until: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
    },
    { onConflict: "run_id" }
  );

  return {
    storagePath,
    signedUrl: signedData?.signedUrl ?? null,
  };
}
