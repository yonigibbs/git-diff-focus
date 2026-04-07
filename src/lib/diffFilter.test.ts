import { describe, it, expect } from "vitest";
import { applyFilters } from "./diffFilter";
import { parseUnifiedDiff } from "./diffParser";
import type { DiffSource } from "../types/diff";
import type { FilterPattern } from "../types/filter";

const source: DiffSource = { type: "github", owner: "test", repo: "test", pr_number: 1 };

function makeFilter(overrides: Partial<FilterPattern>): FilterPattern {
  return {
    id: "f1",
    name: "Test filter",
    oldRegex: "",
    newRegex: "",
    diffRegex: "",
    flags: "",
    combinator: "or",
    enabled: true,
    ...overrides,
  };
}

const simpleDiff = `diff --git a/file.ts b/file.ts
index abc..def 100644
--- a/file.ts
+++ b/file.ts
@@ -1,7 +1,7 @@
 import { foo } from './foo';
-import { bar } from './bar';
+import { baz } from './baz';

-const x = 1;
+const x = 2;

 export default x;`;

describe("applyFilters", () => {
  it("returns everything visible when no filters", () => {
    const diffSet = parseUnifiedDiff(simpleDiff, source);
    const result = applyFilters(diffSet, []);

    expect(result.filter_stats.hidden_changes).toBe(0);
    expect(result.filter_stats.visible_changes).toBe(4);
  });

  it("returns everything visible when all filters are disabled", () => {
    const diffSet = parseUnifiedDiff(simpleDiff, source);
    const filters = [makeFilter({ oldRegex: "import", enabled: false })];
    const result = applyFilters(diffSet, filters);

    expect(result.filter_stats.hidden_changes).toBe(0);
  });

  it("skips filters with neither regex set", () => {
    const diffSet = parseUnifiedDiff(simpleDiff, source);
    const filters = [makeFilter({})];
    const result = applyFilters(diffSet, filters);

    expect(result.filter_stats.hidden_changes).toBe(0);
  });

  describe("oldRegex only — hides both sides of matching diffs", () => {
    it("hides the deletion AND its paired addition when old side matches", () => {
      const diffSet = parseUnifiedDiff(simpleDiff, source);
      const filters = [makeFilter({ oldRegex: "import" })];
      const result = applyFilters(diffSet, filters);

      // The import pair (deletion + addition) should BOTH be hidden
      expect(result.filter_stats.hidden_changes).toBe(2);

      const vis = result.files[0].filtered_hunks[0].line_visibility;
      expect(vis[1]).toEqual({ visible: false, hidden_by_filter_id: "f1" }); // deletion
      expect(vis[2]).toEqual({ visible: false, hidden_by_filter_id: "f1" }); // paired addition
      expect(vis[4].visible).toBe(true); // const x = 1 (doesn't match "import")
      expect(vis[5].visible).toBe(true); // const x = 2
    });

    it("hides unpaired deletions that match", () => {
      const diff = `diff --git a/file.ts b/file.ts
index abc..def 100644
--- a/file.ts
+++ b/file.ts
@@ -1,4 +1,2 @@
 context
-import { foo } from './foo';
-import { bar } from './bar';
+const combined = require('./all');`;

      const diffSet = parseUnifiedDiff(diff, source);
      const filters = [makeFilter({ oldRegex: "import" })];
      const result = applyFilters(diffSet, filters);

      const vis = result.files[0].filtered_hunks[0].line_visibility;
      // 1st deletion pairs with the addition: deletion matches → both hidden
      expect(vis[1].visible).toBe(false);
      expect(vis[3].visible).toBe(false); // paired addition hidden too
      // 2nd deletion is unpaired: matches → hidden
      expect(vis[2].visible).toBe(false);
    });
  });

  describe("newRegex only — hides both sides of matching diffs", () => {
    it("hides the addition AND its paired deletion when new side matches", () => {
      const diffSet = parseUnifiedDiff(simpleDiff, source);
      const filters = [makeFilter({ newRegex: "baz" })];
      const result = applyFilters(diffSet, filters);

      // "baz" appears in the addition of the import pair → both sides hidden
      expect(result.filter_stats.hidden_changes).toBe(2);

      const vis = result.files[0].filtered_hunks[0].line_visibility;
      expect(vis[1].visible).toBe(false); // deletion hidden (paired with matching addition)
      expect(vis[2].visible).toBe(false); // addition hidden (matches)
    });
  });

  describe("both regexes with OR combinator", () => {
    it("hides pairs where either side matches its regex", () => {
      const diff = `diff --git a/file.ts b/file.ts
index abc..def 100644
--- a/file.ts
+++ b/file.ts
@@ -1,5 +1,5 @@
 context
-import { foo } from './foo';
+import { bar } from './bar';
-const x = 1;
+const x = 2;`;

      const diffSet = parseUnifiedDiff(diff, source);
      // oldRegex matches "import" on deletions, newRegex matches "const" on additions
      const filters = [makeFilter({ oldRegex: "import", newRegex: "const", combinator: "or" })];
      const result = applyFilters(diffSet, filters);

      // Import pair: deletion matches oldRegex → both hidden
      // Const pair: addition matches newRegex → both hidden
      expect(result.filter_stats.hidden_changes).toBe(4);
    });

    it("hides unpaired deletions when oldRegex matches (e.g. removed import)", () => {
      const diff = `diff --git a/file.kt b/file.kt
index abc..def 100644
--- a/file.kt
+++ b/file.kt
@@ -1,4 +1,3 @@
 context
-import com.example.Foo
-import com.example.Bar
 val x = 1;`;

      const diffSet = parseUnifiedDiff(diff, source);
      // Same pattern as built-in Kotlin import preset: both oldRegex and newRegex set, OR
      const filters = [makeFilter({ oldRegex: "^\\s*import\\s", newRegex: "^\\s*import\\s", combinator: "or" })];
      const result = applyFilters(diffSet, filters);

      expect(result.filter_stats.hidden_changes).toBe(2);
    });

    it("hides unpaired additions when newRegex matches (e.g. added import)", () => {
      const diff = `diff --git a/file.kt b/file.kt
index abc..def 100644
--- a/file.kt
+++ b/file.kt
@@ -1,3 +1,5 @@
 context
+import com.example.Foo
+import com.example.Bar
 val x = 1;`;

      const diffSet = parseUnifiedDiff(diff, source);
      const filters = [makeFilter({ oldRegex: "^\\s*import\\s", newRegex: "^\\s*import\\s", combinator: "or" })];
      const result = applyFilters(diffSet, filters);

      expect(result.filter_stats.hidden_changes).toBe(2);
    });
  });

  describe("both regexes with AND combinator", () => {
    it("hides pairs only when BOTH sides match their respective regex", () => {
      const diff = `diff --git a/file.ts b/file.ts
index abc..def 100644
--- a/file.ts
+++ b/file.ts
@@ -1,5 +1,5 @@
 context
-  oldFunction();
+  newFunction();
-  keepThis();
+  keepThisToo();`;

      const diffSet = parseUnifiedDiff(diff, source);
      const filters = [makeFilter({ oldRegex: "oldFunction", newRegex: "newFunction", combinator: "and" })];
      const result = applyFilters(diffSet, filters);

      const vis = result.files[0].filtered_hunks[0].line_visibility;
      expect(vis[1].visible).toBe(false); // deletion: oldFunction() — both match
      expect(vis[2].visible).toBe(false); // addition: newFunction() — both match
      expect(vis[3].visible).toBe(true);  // deletion: keepThis() — doesn't match
      expect(vis[4].visible).toBe(true);  // addition: keepThisToo()
    });

    it("does not hide if only one side of the pair matches", () => {
      const diff = `diff --git a/file.ts b/file.ts
index abc..def 100644
--- a/file.ts
+++ b/file.ts
@@ -1,3 +1,3 @@
 context
-  import { foo } from './foo';
+  const foo = require('./foo');`;

      const diffSet = parseUnifiedDiff(diff, source);
      const filters = [makeFilter({ oldRegex: "import", newRegex: "import", combinator: "and" })];
      const result = applyFilters(diffSet, filters);

      // Addition doesn't contain "import" → AND fails → neither hidden
      expect(result.filter_stats.hidden_changes).toBe(0);
    });

    it("does not hide unpaired lines (AND needs both sides)", () => {
      const diff = `diff --git a/file.ts b/file.ts
index abc..def 100644
--- a/file.ts
+++ b/file.ts
@@ -1,3 +1,2 @@
 context
-import { foo } from './foo';
-import { bar } from './bar';`;

      const diffSet = parseUnifiedDiff(diff, source);
      const filters = [makeFilter({ oldRegex: "import", newRegex: "import", combinator: "and" })];
      const result = applyFilters(diffSet, filters);

      // No additions at all → AND can't be satisfied → nothing hidden
      expect(result.filter_stats.hidden_changes).toBe(0);
    });
  });

  describe("fully hidden hunks", () => {
    it("marks hunk as fully hidden when all changes are filtered", () => {
      const diff = `diff --git a/file.ts b/file.ts
index abc..def 100644
--- a/file.ts
+++ b/file.ts
@@ -1,3 +1,3 @@
 context
-import { foo } from './foo';
+import { bar } from './bar';`;

      const diffSet = parseUnifiedDiff(diff, source);
      const filters = [makeFilter({ oldRegex: "import", newRegex: "import", combinator: "or" })];
      const result = applyFilters(diffSet, filters);

      expect(result.files[0].filtered_hunks[0].fully_hidden).toBe(true);
    });
  });

  describe("multiple filters", () => {
    it("applies all enabled filters", () => {
      const diffSet = parseUnifiedDiff(simpleDiff, source);
      const filters = [
        makeFilter({ id: "f1", oldRegex: "import", newRegex: "import", combinator: "or" }),
        makeFilter({ id: "f2", oldRegex: "const x", newRegex: "const x", combinator: "or" }),
      ];
      const result = applyFilters(diffSet, filters);

      expect(result.filter_stats.hidden_changes).toBe(4);
      expect(result.filter_stats.hidden_by_filter).toEqual({ f1: 2, f2: 2 });
    });
  });

  describe("case insensitive", () => {
    it("supports case-insensitive matching", () => {
      const diffSet = parseUnifiedDiff(simpleDiff, source);
      const filters = [makeFilter({ oldRegex: "IMPORT", newRegex: "IMPORT", flags: "i", combinator: "or" })];
      const result = applyFilters(diffSet, filters);

      expect(result.filter_stats.hidden_changes).toBe(2);
    });
  });

  it("handles invalid regex gracefully", () => {
    const diffSet = parseUnifiedDiff(simpleDiff, source);
    const filters = [makeFilter({ oldRegex: "[invalid" })];
    const result = applyFilters(diffSet, filters);

    expect(result.filter_stats.hidden_changes).toBe(0);
  });

  describe("diffRegex (normalize-and-compare)", () => {
    it("hides pairs where stripping the regex makes both sides identical", () => {
      const diff = `diff --git a/file.kt b/file.kt
index abc..def 100644
--- a/file.kt
+++ b/file.kt
@@ -1,3 +1,3 @@
 context
-  assertPermitIsStoredInDb(testAccount.guid, response.enrollmentDetails!!.permitId!!)
+  assertPermitIsStoredInDb(testAccount.guid, response.enrollmentDetails.permitId!!)`;

      const diffSet = parseUnifiedDiff(diff, source);
      // Strip "!!" from both sides — old becomes identical to new → hide
      const filters = [makeFilter({ diffRegex: "!!" })];
      const result = applyFilters(diffSet, filters);

      expect(result.filter_stats.hidden_changes).toBe(2);
      const vis = result.files[0].filtered_hunks[0].line_visibility;
      expect(vis[1].visible).toBe(false);
      expect(vis[2].visible).toBe(false);
    });

    it("does not hide if stripping the regex still leaves differences", () => {
      const diff = `diff --git a/file.kt b/file.kt
index abc..def 100644
--- a/file.kt
+++ b/file.kt
@@ -1,3 +1,3 @@
 context
-  foo(bar!!.baz)
+  foo(qux.baz)`;

      const diffSet = parseUnifiedDiff(diff, source);
      // Stripping "!!" from old gives "  foo(bar.baz)", new is "  foo(qux.baz)" — still different
      const filters = [makeFilter({ diffRegex: "!!" })];
      const result = applyFilters(diffSet, filters);

      expect(result.filter_stats.hidden_changes).toBe(0);
    });

    it("works with a regex pattern (not just literal)", () => {
      const diff = `diff --git a/file.ts b/file.ts
index abc..def 100644
--- a/file.ts
+++ b/file.ts
@@ -1,3 +1,3 @@
 context
-  const x: string | null = getValue();
+  const x: string = getValue();`;

      const diffSet = parseUnifiedDiff(diff, source);
      // Strip " | null" — makes old identical to new
      const filters = [makeFilter({ diffRegex: " \\| null" })];
      const result = applyFilters(diffSet, filters);

      expect(result.filter_stats.hidden_changes).toBe(2);
    });

    it("does not match unpaired lines (needs both sides to compare)", () => {
      const diff = `diff --git a/file.ts b/file.ts
index abc..def 100644
--- a/file.ts
+++ b/file.ts
@@ -1,3 +1,2 @@
 context
-  foo!!.bar
-  baz!!.qux`;

      const diffSet = parseUnifiedDiff(diff, source);
      const filters = [makeFilter({ diffRegex: "!!" })];
      const result = applyFilters(diffSet, filters);

      // No additions to compare against → can't normalize → not hidden
      expect(result.filter_stats.hidden_changes).toBe(0);
    });

    describe("combined with oldRegex/newRegex", () => {
      it("AND: all populated checks must pass", () => {
        const diff = `diff --git a/file.kt b/file.kt
index abc..def 100644
--- a/file.kt
+++ b/file.kt
@@ -1,5 +1,5 @@
 context
-  assertPermit(response.details!!.id!!)
+  assertPermit(response.details.id!!)
-  unrelated(foo!!.bar)
+  unrelated(foo.bar)`;

        const diffSet = parseUnifiedDiff(diff, source);
        // diffRegex strips "!!", AND oldRegex must match "assertPermit"
        const filters = [makeFilter({ diffRegex: "!!", oldRegex: "assertPermit", combinator: "and" })];
        const result = applyFilters(diffSet, filters);

        const vis = result.files[0].filtered_hunks[0].line_visibility;
        // First pair: old matches "assertPermit" AND stripping "!!" normalizes → hidden
        expect(vis[1].visible).toBe(false);
        expect(vis[2].visible).toBe(false);
        // Second pair: stripping "!!" normalizes, but old doesn't match "assertPermit" → visible
        expect(vis[3].visible).toBe(true);
        expect(vis[4].visible).toBe(true);
      });

      it("OR: any populated check passing is enough", () => {
        const diff = `diff --git a/file.kt b/file.kt
index abc..def 100644
--- a/file.kt
+++ b/file.kt
@@ -1,5 +1,5 @@
 context
-  foo(bar!!.baz)
+  foo(qux.baz)
-  hello(world!!.test)
+  hello(world.test)`;

        const diffSet = parseUnifiedDiff(diff, source);
        // diffRegex "!!" OR oldRegex "foo"
        const filters = [makeFilter({ diffRegex: "!!", oldRegex: "foo", combinator: "or" })];
        const result = applyFilters(diffSet, filters);

        const vis = result.files[0].filtered_hunks[0].line_visibility;
        // First pair: old matches "foo" → OR satisfied → hidden
        // (even though stripping "!!" doesn't normalize: foo(bar.baz) vs foo(qux.baz))
        expect(vis[1].visible).toBe(false);
        expect(vis[2].visible).toBe(false);
        // Second pair: stripping "!!" normalizes → OR satisfied → hidden
        expect(vis[3].visible).toBe(false);
        expect(vis[4].visible).toBe(false);
      });
    });
  });
});
