import { getWriteToken } from "@/lib/github";

type FileStatus = "modify" | "add" | "delete";
type HunkLineType = "context" | "add" | "remove";

interface HunkLine {
  type: HunkLineType;
  text: string;
}

interface Hunk {
  oldStart: number;
  oldCount: number;
  newStart: number;
  newCount: number;
  lines: HunkLine[];
}

interface ParsedDiffFile {
  path: string;
  previousPath: string;
  status: FileStatus;
  oldEndsWithNewline: boolean;
  newEndsWithNewline: boolean;
  hunks: Hunk[];
}

function normalizeDiffPath(value: string): string | null {
  const withoutMeta = value.split("\t")[0]?.trim() ?? "";
  if (withoutMeta === "/dev/null") {
    return null;
  }

  if (withoutMeta.startsWith("a/") || withoutMeta.startsWith("b/")) {
    return withoutMeta.slice(2);
  }

  return withoutMeta;
}

function splitContentLines(content: string) {
  const normalized = content.replace(/\r\n/g, "\n");
  if (normalized.length === 0) {
    return [];
  }

  const rawLines = normalized.split("\n");
  if (normalized.endsWith("\n")) {
    rawLines.pop();
  }
  return rawLines;
}

function joinContentLines(lines: string[], endsWithNewline: boolean) {
  const joined = lines.join("\n");
  if (joined.length === 0) {
    return "";
  }
  return endsWithNewline ? `${joined}\n` : joined;
}

function encodeGitHubContentPath(path: string) {
  return path
    .split("/")
    .map((segment) => encodeURIComponent(segment))
    .join("/");
}

export function parseUnifiedDiff(unifiedDiff: string): ParsedDiffFile[] {
  const lines = unifiedDiff.replace(/\r\n/g, "\n").split("\n");
  const files: ParsedDiffFile[] = [];
  let currentFile: ParsedDiffFile | null = null;
  let currentHunk: Hunk | null = null;
  let lastLineType: HunkLineType | null = null;

  const finalizeCurrentFile = () => {
    if (!currentFile) {
      return;
    }

    if (currentHunk) {
      currentFile.hunks.push(currentHunk);
      currentHunk = null;
    }

    files.push(currentFile);
    currentFile = null;
    lastLineType = null;
  };

  for (const line of lines) {
    if (line.startsWith("diff --git ")) {
      finalizeCurrentFile();

      const match = line.match(/^diff --git a\/(.+) b\/(.+)$/);
      if (!match) {
        throw new Error(`Unsupported diff header: ${line}`);
      }

      currentFile = {
        path: match[2],
        previousPath: match[1],
        status: "modify",
        oldEndsWithNewline: true,
        newEndsWithNewline: true,
        hunks: [],
      };
      continue;
    }

    if (!currentFile) {
      continue;
    }

    if (line.startsWith("rename from ") || line.startsWith("rename to ")) {
      throw new Error("Rename patches are not supported.");
    }

    if (line.startsWith("copy from ") || line.startsWith("copy to ")) {
      throw new Error("Copy patches are not supported.");
    }

    if (line.startsWith("Binary files ") || line === "GIT binary patch") {
      throw new Error("Binary patches are not supported.");
    }

    if (line.startsWith("new file mode ")) {
      currentFile.status = "add";
      continue;
    }

    if (line.startsWith("deleted file mode ")) {
      currentFile.status = "delete";
      continue;
    }

    if (line.startsWith("--- ")) {
      const previousPath = normalizeDiffPath(line.slice(4));
      if (previousPath === null) {
        currentFile.status = "add";
      } else {
        currentFile.previousPath = previousPath;
      }
      continue;
    }

    if (line.startsWith("+++ ")) {
      const nextPath = normalizeDiffPath(line.slice(4));
      if (nextPath === null) {
        currentFile.status = "delete";
      } else {
        currentFile.path = nextPath;
      }
      continue;
    }

    if (line.startsWith("@@ ")) {
      if (currentHunk) {
        currentFile.hunks.push(currentHunk);
      }

      const match = line.match(/^@@ -(\d+)(?:,(\d+))? \+(\d+)(?:,(\d+))? @@/);
      if (!match) {
        throw new Error(`Unsupported hunk header: ${line}`);
      }

      currentHunk = {
        oldStart: Number.parseInt(match[1], 10),
        oldCount: Number.parseInt(match[2] ?? "1", 10),
        newStart: Number.parseInt(match[3], 10),
        newCount: Number.parseInt(match[4] ?? "1", 10),
        lines: [],
      };
      lastLineType = null;
      continue;
    }

    if (line.startsWith("\\ No newline at end of file")) {
      if (lastLineType === "remove" || lastLineType === "context") {
        currentFile.oldEndsWithNewline = false;
      }
      if (lastLineType === "add" || lastLineType === "context") {
        currentFile.newEndsWithNewline = false;
      }
      continue;
    }

    if (!currentHunk) {
      continue;
    }

    if (line.startsWith("+")) {
      currentHunk.lines.push({ type: "add", text: line.slice(1) });
      lastLineType = "add";
      continue;
    }

    if (line.startsWith("-")) {
      currentHunk.lines.push({ type: "remove", text: line.slice(1) });
      lastLineType = "remove";
      continue;
    }

    if (line.startsWith(" ")) {
      currentHunk.lines.push({ type: "context", text: line.slice(1) });
      lastLineType = "context";
      continue;
    }

    if (line.length === 0) {
      continue;
    }

    throw new Error(`Unsupported diff line: ${line}`);
  }

  finalizeCurrentFile();

  return files.filter((file) => file.hunks.length > 0 || file.status !== "modify");
}

function applyHunksToLines(originalLines: string[], filePatch: ParsedDiffFile) {
  const lines = [...originalLines];
  let offset = 0;

  for (const hunk of filePatch.hunks) {
    const startIndex = (hunk.oldStart > 0 ? hunk.oldStart - 1 : 0) + offset;
    const expectedLines = hunk.lines
      .filter((line) => line.type !== "add")
      .map((line) => line.text);
    const replacementLines = hunk.lines
      .filter((line) => line.type !== "remove")
      .map((line) => line.text);

    if (startIndex < 0 || startIndex > lines.length) {
      throw new Error(`Hunk for ${filePatch.path} applies outside the file bounds.`);
    }

    const currentSlice = lines.slice(startIndex, startIndex + expectedLines.length);
    if (
      currentSlice.length !== expectedLines.length ||
      currentSlice.some((line, index) => line !== expectedLines[index])
    ) {
      throw new Error(`Patch context mismatch while applying ${filePatch.path}.`);
    }

    lines.splice(startIndex, expectedLines.length, ...replacementLines);
    offset += replacementLines.length - expectedLines.length;
  }

  return lines;
}

export function applyPatchToContent(original: string, filePatch: ParsedDiffFile) {
  const originalLines = splitContentLines(original);
  const nextLines = applyHunksToLines(originalLines, filePatch);
  return joinContentLines(nextLines, filePatch.newEndsWithNewline);
}

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

  console.log(
    `[run:${input.runId}] pr step: creating PR for ${input.repo.owner}/${input.repo.name}`
  );

  if (!process.env.GITHUB_APP_ID || !process.env.GITHUB_PRIVATE_KEY) {
    throw new Error("GitHub App credentials are not configured.");
  }

  if (!input.repo.installationId) {
    throw new Error(
      `No GitHub App installation is configured for ${input.repo.owner}/${input.repo.name}.`
    );
  }

  const filePatches = parseUnifiedDiff(input.patch.unifiedDiff);
  if (filePatches.length === 0) {
    throw new Error("No supported file changes were found in the generated patch.");
  }

  const token = await getWriteToken(input.repo.installationId);
  const headers = {
    Authorization: `token ${token}`,
    Accept: "application/vnd.github.v3+json",
    "Content-Type": "application/json",
  };
  const apiBase = `https://api.github.com/repos/${input.repo.owner}/${input.repo.name}`;

  const refRes = await fetch(`${apiBase}/git/ref/heads/${input.repo.baseBranch}`, {
    headers,
  });
  if (!refRes.ok) {
    throw new Error(`Failed to get base branch ref: ${refRes.status} ${await refRes.text()}`);
  }
  const refData = await refRes.json();
  const baseSha = refData.object.sha;

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

  for (const filePatch of filePatches) {
    const encodedPath = encodeGitHubContentPath(filePatch.path);
    const fileRes = await fetch(
      `${apiBase}/contents/${encodedPath}?ref=${encodeURIComponent(input.branchName)}`,
      { headers }
    );

    let originalContent = "";
    let fileSha: string | undefined;

    if (fileRes.ok) {
      const fileData = await fileRes.json();
      fileSha = fileData.sha;
      originalContent = Buffer.from(fileData.content, "base64").toString("utf-8");
    } else if (filePatch.status !== "add") {
      throw new Error(
        `Failed to fetch ${filePatch.path}: ${fileRes.status} ${await fileRes.text()}`
      );
    }

    if (filePatch.status === "add" && fileRes.ok) {
      throw new Error(`Patch expected ${filePatch.path} to be a new file, but it already exists.`);
    }

    if (filePatch.status === "delete") {
      if (!fileSha) {
        throw new Error(`Patch expected ${filePatch.path} to exist before deletion.`);
      }

      const remainingContent = applyPatchToContent(originalContent, filePatch);
      if (remainingContent.length > 0) {
        throw new Error(
          `Delete patch for ${filePatch.path} did not remove the entire file content.`
        );
      }

      const deleteRes = await fetch(`${apiBase}/contents/${encodedPath}`, {
        method: "DELETE",
        headers,
        body: JSON.stringify({
          message: `fix: ${input.title}`,
          sha: fileSha,
          branch: input.branchName,
        }),
      });

      if (!deleteRes.ok) {
        throw new Error(
          `Failed to delete ${filePatch.path}: ${deleteRes.status} ${await deleteRes.text()}`
        );
      }

      console.log(`[run:${input.runId}] pr step: deleted ${filePatch.path}`);
      continue;
    }

    const newContent = applyPatchToContent(originalContent, filePatch);
    const commitBody: Record<string, string> = {
      message: `fix: ${input.title}`,
      content: Buffer.from(newContent).toString("base64"),
      branch: input.branchName,
    };
    if (fileSha) {
      commitBody.sha = fileSha;
    }

    const updateRes = await fetch(`${apiBase}/contents/${encodedPath}`, {
      method: "PUT",
      headers,
      body: JSON.stringify(commitBody),
    });

    if (!updateRes.ok) {
      throw new Error(
        `Failed to update ${filePatch.path}: ${updateRes.status} ${await updateRes.text()}`
      );
    }

    console.log(`[run:${input.runId}] pr step: committed ${filePatch.path}`);
  }

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

  console.log(`[run:${input.runId}] pr step: created PR #${prData.number}`);

  const headRefRes = await fetch(`${apiBase}/git/ref/heads/${input.branchName}`, {
    headers,
  });
  const headRefData = headRefRes.ok ? await headRefRes.json() : null;

  return {
    prUrl: prData.html_url as string,
    prNumber: prData.number as number,
    branchName: input.branchName,
    headSha: (headRefData?.object?.sha as string | undefined) ?? baseSha,
  };
}
