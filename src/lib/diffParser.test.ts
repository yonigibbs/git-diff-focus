import { describe, it, expect } from "vitest";
import { parseUnifiedDiff } from "./diffParser";
import type { DiffSource } from "../types/diff";

const source: DiffSource = { type: "github", owner: "test", repo: "test", pr_number: 1 };

describe("parseUnifiedDiff", () => {
  it("parses a simple modification", () => {
    const diff = `diff --git a/src/main.ts b/src/main.ts
index abc1234..def5678 100644
--- a/src/main.ts
+++ b/src/main.ts
@@ -1,5 +1,5 @@
 import { foo } from './foo';

-const x = 1;
+const x = 2;

 export default x;`;

    const result = parseUnifiedDiff(diff, source);

    expect(result.files).toHaveLength(1);
    expect(result.stats).toEqual({
      files_changed: 1,
      total_additions: 1,
      total_deletions: 1,
    });

    const file = result.files[0];
    expect(file.old_path).toBe("src/main.ts");
    expect(file.new_path).toBe("src/main.ts");
    expect(file.status).toEqual({ type: "modified" });
    expect(file.stats).toEqual({ additions: 1, deletions: 1 });

    expect(file.hunks).toHaveLength(1);
    const hunk = file.hunks[0];
    expect(hunk.old_start).toBe(1);
    expect(hunk.old_count).toBe(5);
    expect(hunk.new_start).toBe(1);
    expect(hunk.new_count).toBe(5);

    expect(hunk.lines).toHaveLength(6);
    expect(hunk.lines[0]).toMatchObject({ kind: "context", content: "import { foo } from './foo';" });
    expect(hunk.lines[1]).toMatchObject({ kind: "context", content: "" });
    expect(hunk.lines[2]).toMatchObject({ kind: "deletion", content: "const x = 1;", old_line_number: 3 });
    expect(hunk.lines[3]).toMatchObject({ kind: "addition", content: "const x = 2;", new_line_number: 3 });
    expect(hunk.lines[4]).toMatchObject({ kind: "context", content: "" });
    expect(hunk.lines[5]).toMatchObject({ kind: "context", content: "export default x;" });
  });

  it("parses a new file", () => {
    const diff = `diff --git a/src/new.ts b/src/new.ts
new file mode 100644
index 0000000..abc1234
--- /dev/null
+++ b/src/new.ts
@@ -0,0 +1,3 @@
+export function hello() {
+  return "world";
+}`;

    const result = parseUnifiedDiff(diff, source);

    expect(result.files).toHaveLength(1);
    const file = result.files[0];
    expect(file.old_path).toBeNull();
    expect(file.new_path).toBe("src/new.ts");
    expect(file.status).toEqual({ type: "added" });
    expect(file.stats).toEqual({ additions: 3, deletions: 0 });
  });

  it("parses a deleted file", () => {
    const diff = `diff --git a/src/old.ts b/src/old.ts
deleted file mode 100644
index abc1234..0000000
--- a/src/old.ts
+++ /dev/null
@@ -1,3 +0,0 @@
-export function goodbye() {
-  return "world";
-}`;

    const result = parseUnifiedDiff(diff, source);

    expect(result.files).toHaveLength(1);
    const file = result.files[0];
    expect(file.old_path).toBe("src/old.ts");
    expect(file.new_path).toBeNull();
    expect(file.status).toEqual({ type: "deleted" });
    expect(file.stats).toEqual({ additions: 0, deletions: 3 });
  });

  it("parses a renamed file", () => {
    const diff = `diff --git a/src/old-name.ts b/src/new-name.ts
similarity index 95%
rename from src/old-name.ts
rename to src/new-name.ts
index abc1234..def5678 100644
--- a/src/old-name.ts
+++ b/src/new-name.ts
@@ -1,3 +1,3 @@
-export const name = "old";
+export const name = "new";

 export default name;`;

    const result = parseUnifiedDiff(diff, source);

    expect(result.files).toHaveLength(1);
    const file = result.files[0];
    expect(file.old_path).toBe("src/old-name.ts");
    expect(file.new_path).toBe("src/new-name.ts");
    expect(file.status).toEqual({ type: "renamed", similarity: 95 });
  });

  it("parses multiple files", () => {
    const diff = `diff --git a/a.ts b/a.ts
index abc..def 100644
--- a/a.ts
+++ b/a.ts
@@ -1,3 +1,3 @@
-const a = 1;
+const a = 2;
 const b = 3;
 const c = 4;
diff --git a/b.ts b/b.ts
index abc..def 100644
--- a/b.ts
+++ b/b.ts
@@ -1,2 +1,3 @@
 const x = 1;
+const y = 2;
 const z = 3;`;

    const result = parseUnifiedDiff(diff, source);

    expect(result.files).toHaveLength(2);
    expect(result.stats).toEqual({
      files_changed: 2,
      total_additions: 2,
      total_deletions: 1,
    });
  });

  it("parses multiple hunks in one file", () => {
    const diff = `diff --git a/file.ts b/file.ts
index abc..def 100644
--- a/file.ts
+++ b/file.ts
@@ -1,3 +1,3 @@
-const a = 1;
+const a = 2;
 const b = 3;
 const c = 4;
@@ -10,3 +10,3 @@ function foo() {
-  return 1;
+  return 2;
   // done
 }`;

    const result = parseUnifiedDiff(diff, source);
    const file = result.files[0];

    expect(file.hunks).toHaveLength(2);
    expect(file.hunks[0].old_start).toBe(1);
    expect(file.hunks[1].old_start).toBe(10);
    expect(file.hunks[1].section_header).toBe("function foo() {");
  });

  it("assigns correct line numbers", () => {
    const diff = `diff --git a/file.ts b/file.ts
index abc..def 100644
--- a/file.ts
+++ b/file.ts
@@ -5,4 +5,5 @@
 line5
-line6
+line6a
+line6b
 line7
 line8`;

    const result = parseUnifiedDiff(diff, source);
    const lines = result.files[0].hunks[0].lines;

    expect(lines[0]).toMatchObject({ kind: "context", old_line_number: 5, new_line_number: 5 });
    expect(lines[1]).toMatchObject({ kind: "deletion", old_line_number: 6, new_line_number: null });
    expect(lines[2]).toMatchObject({ kind: "addition", old_line_number: null, new_line_number: 6 });
    expect(lines[3]).toMatchObject({ kind: "addition", old_line_number: null, new_line_number: 7 });
    expect(lines[4]).toMatchObject({ kind: "context", old_line_number: 7, new_line_number: 8 });
    expect(lines[5]).toMatchObject({ kind: "context", old_line_number: 8, new_line_number: 9 });
  });

  it("handles binary files", () => {
    const diff = `diff --git a/image.png b/image.png
index abc..def 100644
Binary files a/image.png and b/image.png differ`;

    const result = parseUnifiedDiff(diff, source);
    const file = result.files[0];
    expect(file.is_binary).toBe(true);
    expect(file.hunks).toHaveLength(0);
  });

  it("assigns unique IDs to hunks and lines", () => {
    const diff = `diff --git a/a.ts b/a.ts
index abc..def 100644
--- a/a.ts
+++ b/a.ts
@@ -1,2 +1,2 @@
-old
+new
diff --git a/b.ts b/b.ts
index abc..def 100644
--- a/b.ts
+++ b/b.ts
@@ -1,2 +1,2 @@
-old2
+new2`;

    const result = parseUnifiedDiff(diff, source);

    expect(result.files[0].hunks[0].id).toBe("0_0");
    expect(result.files[0].hunks[0].lines[0].id).toBe("0_0_0");
    expect(result.files[1].hunks[0].id).toBe("1_0");
    expect(result.files[1].hunks[0].lines[0].id).toBe("1_0_0");
  });

  it("handles no newline at end of file marker", () => {
    const diff = `diff --git a/file.ts b/file.ts
index abc..def 100644
--- a/file.ts
+++ b/file.ts
@@ -1,2 +1,2 @@
-old line
+new line
\\ No newline at end of file`;

    const result = parseUnifiedDiff(diff, source);
    const lines = result.files[0].hunks[0].lines;
    expect(lines).toHaveLength(2);
    expect(lines[0]).toMatchObject({ kind: "deletion", content: "old line" });
    expect(lines[1]).toMatchObject({ kind: "addition", content: "new line" });
  });

  it("handles empty diff", () => {
    const result = parseUnifiedDiff("", source);
    expect(result.files).toHaveLength(0);
    expect(result.stats).toEqual({ files_changed: 0, total_additions: 0, total_deletions: 0 });
  });
});
