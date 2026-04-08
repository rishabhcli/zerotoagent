import { describe, expect, it } from "vitest";
import { applyPatchToContent, parseUnifiedDiff } from "./pr";

describe("parseUnifiedDiff", () => {
  it("parses modified files with multiple hunks", () => {
    const files = parseUnifiedDiff(`diff --git a/src/app.txt b/src/app.txt
--- a/src/app.txt
+++ b/src/app.txt
@@ -1,3 +1,3 @@
 alpha
-bravo
+beta
 charlie
@@ -5,2 +5,3 @@
 echo
 foxtrot
+golf
`);

    expect(files).toHaveLength(1);
    expect(files[0]).toMatchObject({
      path: "src/app.txt",
      previousPath: "src/app.txt",
      status: "modify",
    });
    expect(files[0]?.hunks).toHaveLength(2);
  });

  it("parses file additions and deletions", () => {
    const files = parseUnifiedDiff(`diff --git a/src/new.txt b/src/new.txt
new file mode 100644
--- /dev/null
+++ b/src/new.txt
@@ -0,0 +1,2 @@
+hello
+world
diff --git a/src/old.txt b/src/old.txt
deleted file mode 100644
--- a/src/old.txt
+++ /dev/null
@@ -1,2 +0,0 @@
-old
-file
`);

    expect(files).toHaveLength(2);
    expect(files[0]).toMatchObject({ path: "src/new.txt", status: "add" });
    expect(files[1]).toMatchObject({ path: "src/old.txt", status: "delete" });
  });

  it("rejects rename patches", () => {
    expect(() =>
      parseUnifiedDiff(`diff --git a/src/old.txt b/src/new.txt
similarity index 100%
rename from src/old.txt
rename to src/new.txt
`)
    ).toThrow("Rename patches are not supported.");
  });
});

describe("applyPatchToContent", () => {
  it("applies context-aware modifications across multiple hunks", () => {
    const [filePatch] = parseUnifiedDiff(`diff --git a/src/app.txt b/src/app.txt
--- a/src/app.txt
+++ b/src/app.txt
@@ -1,3 +1,3 @@
 alpha
-bravo
+beta
 charlie
@@ -5,2 +5,3 @@
 echo
 foxtrot
+golf
`);

    const result = applyPatchToContent(
      "alpha\nbravo\ncharlie\ndelta\necho\nfoxtrot\n",
      filePatch!
    );

    expect(result).toBe("alpha\nbeta\ncharlie\ndelta\necho\nfoxtrot\ngolf\n");
  });

  it("builds new file content from an add patch", () => {
    const [filePatch] = parseUnifiedDiff(`diff --git a/src/new.txt b/src/new.txt
new file mode 100644
--- /dev/null
+++ b/src/new.txt
@@ -0,0 +1,2 @@
+hello
+world
`);

    expect(applyPatchToContent("", filePatch!)).toBe("hello\nworld\n");
  });

  it("returns empty content for a delete patch", () => {
    const [filePatch] = parseUnifiedDiff(`diff --git a/src/old.txt b/src/old.txt
deleted file mode 100644
--- a/src/old.txt
+++ /dev/null
@@ -1,2 +0,0 @@
-old
-file
`);

    expect(applyPatchToContent("old\nfile\n", filePatch!)).toBe("");
  });

  it("fails closed when the target file does not match the hunk context", () => {
    const [filePatch] = parseUnifiedDiff(`diff --git a/src/app.txt b/src/app.txt
--- a/src/app.txt
+++ b/src/app.txt
@@ -1,2 +1,2 @@
 alpha
-bravo
+beta
`);

    expect(() => applyPatchToContent("alpha\ncharlie\n", filePatch!)).toThrow(
      "Patch context mismatch while applying src/app.txt."
    );
  });
});
