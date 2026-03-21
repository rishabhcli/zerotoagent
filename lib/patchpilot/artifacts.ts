import type { FilePart, ImagePart } from "ai";
import { requireSupabaseAdmin, PATCHPILOT_ARTIFACTS_BUCKET } from "@/lib/patchpilot/supabase";
import type { ArtifactInput, ArtifactKind } from "@/lib/patchpilot/contracts";

function sanitizePathSegment(value: string) {
  return value.replace(/[^A-Za-z0-9._-]+/g, "-");
}

function normalizeKind(mimeType: string, filename: string): ArtifactKind {
  if (mimeType.startsWith("image/")) return "screenshot";
  if (mimeType === "application/pdf" || filename.toLowerCase().endsWith(".pdf")) return "pdf";
  if (mimeType.startsWith("audio/")) return "audio";
  if (mimeType.startsWith("text/") || /\.(log|txt|json|ndjson|md)$/i.test(filename)) return "log";
  return "other";
}

export async function createArtifactUploadTicket(input: {
  runId: string;
  filename: string;
  mimeType: string;
  source?: string;
}) {
  const supabase = requireSupabaseAdmin();
  const normalizedName = sanitizePathSegment(input.filename);
  const storagePath = `${input.runId}/${Date.now()}-${normalizedName}`;

  const { data, error } = await supabase.storage
    .from(PATCHPILOT_ARTIFACTS_BUCKET)
    .createSignedUploadUrl(storagePath);

  if (error || !data) {
    throw new Error(error?.message ?? "Failed to create artifact upload URL");
  }

  return {
    bucket: PATCHPILOT_ARTIFACTS_BUCKET,
    path: storagePath,
    signedUrl: data.signedUrl,
    token: data.token,
    kind: normalizeKind(input.mimeType, input.filename),
    source: input.source ?? "web",
  };
}

export async function createArtifactSignedUrl(path: string, expiresIn = 60 * 60) {
  const supabase = requireSupabaseAdmin();
  const { data, error } = await supabase.storage
    .from(PATCHPILOT_ARTIFACTS_BUCKET)
    .createSignedUrl(path, expiresIn);

  if (error || !data) {
    throw new Error(error?.message ?? `Failed to create signed URL for ${path}`);
  }

  return data.signedUrl;
}

export async function downloadArtifact(path: string) {
  const supabase = requireSupabaseAdmin();
  const { data, error } = await supabase.storage
    .from(PATCHPILOT_ARTIFACTS_BUCKET)
    .download(path);

  if (error || !data) {
    throw new Error(error?.message ?? `Failed to download artifact ${path}`);
  }

  return Buffer.from(await data.arrayBuffer());
}

export async function buildArtifactModelContent(
  artifacts: ArtifactInput[]
): Promise<Array<ImagePart | FilePart>> {
  const content: Array<ImagePart | FilePart> = [];

  for (const artifact of artifacts) {
    if (artifact.kind === "screenshot") {
      const signedUrl = await createArtifactSignedUrl(artifact.storagePath);
      content.push({
        type: "image",
        image: signedUrl,
      });
      continue;
    }

    const fileData = await downloadArtifact(artifact.storagePath);
    content.push({
      type: "file",
      mediaType: artifact.mimeType,
      data: fileData,
      filename: artifact.filename,
    });
  }

  return content;
}
