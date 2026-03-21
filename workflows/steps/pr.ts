import { getWriteToken } from "@/lib/github";

export async function createPrStep(input: {
  runId: string;
  repo: {
    owner: string;
    name: string;
    baseBranch: string;
    installationId?: number;
  };
  branchName: string;
  title: string;
  body: string;
  patch: { unifiedDiff: string };
  evidence: { testCommand: string; testLogsExcerpt: string };
}) {
  "use step";

  console.log(`[run:${input.runId}] pr step: creating PR for ${input.repo.owner}/${input.repo.name}`);

  // If GitHub App is not configured, return mock data for hackathon dev
  if (!process.env.GITHUB_APP_ID || !input.repo.installationId) {
    console.log(`[run:${input.runId}] pr step: no GitHub App configured, returning mock PR`);
    return {
      prUrl: `https://github.com/${input.repo.owner}/${input.repo.name}/pull/0`,
      prNumber: 0,
      branchName: input.branchName,
    };
  }

  const token = await getWriteToken(input.repo.installationId);
  const headers = {
    Authorization: `token ${token}`,
    Accept: "application/vnd.github.v3+json",
    "Content-Type": "application/json",
  };
  const apiBase = `https://api.github.com/repos/${input.repo.owner}/${input.repo.name}`;

  // 1. Get the HEAD SHA of the base branch
  const refRes = await fetch(`${apiBase}/git/ref/heads/${input.repo.baseBranch}`, { headers });
  if (!refRes.ok) {
    throw new Error(`Failed to get base branch ref: ${refRes.status} ${await refRes.text()}`);
  }
  const refData = await refRes.json();
  const baseSha = refData.object.sha;

  // 2. Create the new branch (idempotent — ignores "already exists")
  const createRefRes = await fetch(`${apiBase}/git/refs`, {
    method: "POST",
    headers,
    body: JSON.stringify({ ref: `refs/heads/${input.branchName}`, sha: baseSha }),
  });
  if (!createRefRes.ok) {
    const errText = await createRefRes.text();
    if (!errText.includes("Reference already exists")) {
      throw new Error(`Failed to create branch: ${createRefRes.status} ${errText}`);
    }
  }

  // 3. Parse diff to find changed files, then fetch original content and apply hunks
  const filePatches = parseDiffToFilePatches(input.patch.unifiedDiff);

  for (const filePatch of filePatches) {
    // Fetch the original file content from the branch
    const fileRes = await fetch(
      `${apiBase}/contents/${filePatch.path}?ref=${input.branchName}`,
      { headers }
    );

    let newContent: string;
    let fileSha: string | undefined;

    if (fileRes.ok) {
      const fileData = await fileRes.json();
      fileSha = fileData.sha;
      const originalContent = Buffer.from(fileData.content, "base64").toString("utf-8");
      newContent = applyHunks(originalContent, filePatch.hunks);
    } else {
      // New file — hunks contain only additions
      newContent = filePatch.hunks
        .flatMap((h) => h.additions)
        .join("\n");
    }

    const commitBody: Record<string, string> = {
      message: `fix: ${input.title}`,
      content: Buffer.from(newContent).toString("base64"),
      branch: input.branchName,
    };
    if (fileSha) commitBody.sha = fileSha;

    const updateRes = await fetch(`${apiBase}/contents/${filePatch.path}`, {
      method: "PUT",
      headers,
      body: JSON.stringify(commitBody),
    });

    if (!updateRes.ok) {
      throw new Error(`Failed to update ${filePatch.path}: ${updateRes.status} ${await updateRes.text()}`);
    }

    console.log(`[run:${input.runId}] pr step: committed ${filePatch.path}`);
  }

  // 4. Create the PR
  const prRes = await fetch(`${apiBase}/pulls`, {
    method: "POST",
    headers,
    body: JSON.stringify({
      title: input.title,
      body: input.body,
      head: input.branchName,
      base: input.repo.baseBranch,
    }),
  });

  if (!prRes.ok) {
    throw new Error(`Failed to create PR: ${prRes.status} ${await prRes.text()}`);
  }

  const prData = await prRes.json();

  // 5. Store in Supabase (idempotent upsert)
  if (process.env.SUPABASE_URL && process.env.SUPABASE_SERVICE_ROLE_KEY) {
    const { createClient } = await import("@supabase/supabase-js");
    const supabase = createClient(
      process.env.SUPABASE_URL,
      process.env.SUPABASE_SERVICE_ROLE_KEY,
      { auth: { persistSession: false } }
    );
    await supabase.from("prs").upsert({
      run_id: input.runId,
      provider: "github",
      repo_owner: input.repo.owner,
      repo_name: input.repo.name,
      pr_number: prData.number,
      pr_url: prData.html_url,
    }, { onConflict: "run_id" });
  }

  console.log(`[run:${input.runId}] pr step: created PR #${prData.number}`);

  return {
    prUrl: prData.html_url as string,
    prNumber: prData.number as number,
    branchName: input.branchName,
  };
}

// --- Diff parsing ---

interface Hunk {
  oldStart: number;
  oldCount: number;
  newStart: number;
  newCount: number;
  removals: string[];
  additions: string[];
  context: Array<{ line: number; text: string }>;
}

interface FilePatch {
  path: string;
  hunks: Hunk[];
}

/**
 * Parse a unified diff into per-file hunk data.
 * Extracts file paths and hunk headers so we can apply changes
 * against the original file content fetched from GitHub.
 */
function parseDiffToFilePatches(unifiedDiff: string): FilePatch[] {
  const files: FilePatch[] = [];
  const sections = unifiedDiff.split(/^diff --git/m).filter(Boolean);

  for (const section of sections) {
    const pathMatch = section.match(/\+\+\+ b\/(.+)/);
    if (!pathMatch) continue;

    const hunks: Hunk[] = [];
    const hunkRegex = /^@@ -(\d+)(?:,(\d+))? \+(\d+)(?:,(\d+))? @@/gm;
    let match;

    while ((match = hunkRegex.exec(section)) !== null) {
      const oldStart = parseInt(match[1], 10);
      const oldCount = parseInt(match[2] ?? "1", 10);
      const newStart = parseInt(match[3], 10);
      const newCount = parseInt(match[4] ?? "1", 10);

      // Extract lines belonging to this hunk (until next @@ or end)
      const hunkStartIdx = match.index + match[0].length;
      const nextHunk = section.indexOf("\n@@", hunkStartIdx);
      const hunkBody = section.slice(
        hunkStartIdx,
        nextHunk === -1 ? undefined : nextHunk
      );

      const removals: string[] = [];
      const additions: string[] = [];
      const context: Array<{ line: number; text: string }> = [];
      let lineNum = oldStart;

      for (const line of hunkBody.split("\n")) {
        if (line.startsWith("-")) {
          removals.push(line.slice(1));
          lineNum++;
        } else if (line.startsWith("+")) {
          additions.push(line.slice(1));
        } else if (line.length > 0 && !line.startsWith("\\")) {
          // Context line (starts with space)
          context.push({ line: lineNum, text: line.startsWith(" ") ? line.slice(1) : line });
          lineNum++;
        }
      }

      hunks.push({ oldStart, oldCount, newStart, newCount, removals, additions, context });
    }

    files.push({ path: pathMatch[1], hunks });
  }

  return files;
}

/**
 * Apply parsed hunks to original file content.
 * Works line-by-line: for each hunk, finds the target region in the original,
 * removes the old lines, and inserts the new lines.
 */
function applyHunks(original: string, hunks: Hunk[]): string {
  const lines = original.split("\n");

  // Apply hunks in reverse order (bottom to top) to preserve line numbers
  const sortedHunks = [...hunks].sort((a, b) => b.oldStart - a.oldStart);

  for (const hunk of sortedHunks) {
    const startIdx = hunk.oldStart - 1; // 1-indexed → 0-indexed
    const deleteCount = hunk.oldCount;
    lines.splice(startIdx, deleteCount, ...hunk.additions);
  }

  return lines.join("\n");
}
