import type { DiffSet, DiffHunk } from "../types/diff";
import type {
  FilterPattern,
  FilteredDiffSet,
  FilteredDiffFile,
  FilteredDiffHunk,
  LineVisibility,
} from "../types/filter";

interface CompiledFilter {
  filter: FilterPattern;
  oldCompiled: RegExp | null;
  newCompiled: RegExp | null;
  diffCompiled: RegExp | null;
}

function compileFilters(filters: FilterPattern[]): CompiledFilter[] {
  const result: CompiledFilter[] = [];
  for (const f of filters) {
    if (!f.enabled) continue;
    if (!f.oldRegex && !f.newRegex && !f.diffRegex) continue;

    let oldCompiled: RegExp | null = null;
    let newCompiled: RegExp | null = null;
    let diffCompiled: RegExp | null = null;

    try {
      if (f.oldRegex) oldCompiled = new RegExp(f.oldRegex, f.flags);
    } catch {
      continue;
    }

    try {
      if (f.newRegex) newCompiled = new RegExp(f.newRegex, f.flags);
    } catch {
      continue;
    }

    try {
      if (f.diffRegex) diffCompiled = new RegExp(f.diffRegex, f.flags + (f.flags.includes("g") ? "" : "g"));
    } catch {
      continue;
    }

    result.push({ filter: f, oldCompiled, newCompiled, diffCompiled });
  }
  return result;
}

function testRegex(re: RegExp, text: string): boolean {
  re.lastIndex = 0;
  return re.test(text);
}

/**
 * Strip all matches of a regex from a string.
 */
function stripMatches(re: RegExp, text: string): string {
  re.lastIndex = 0;
  return text.replace(re, "");
}

/**
 * Check if stripping the diffRegex from both sides makes them identical.
 */
function diffRegexMatches(diffCompiled: RegExp, delContent: string, addContent: string): boolean {
  const normalizedOld = stripMatches(diffCompiled, delContent);
  const normalizedNew = stripMatches(diffCompiled, addContent);
  return normalizedOld === normalizedNew;
}

/**
 * Count how many populated checks this filter has (old, new, diff).
 */
function checkCount(cf: CompiledFilter): number {
  return (cf.oldCompiled ? 1 : 0) + (cf.newCompiled ? 1 : 0) + (cf.diffCompiled ? 1 : 0);
}

/**
 * Does this filter match a deletion+addition pair?
 *
 * Each populated regex is a check. The combinator (AND/OR) controls how
 * multiple checks combine:
 * - AND: all populated checks must pass
 * - OR: at least one populated check must pass
 */
function matchesPair(
  cf: CompiledFilter,
  delContent: string,
  addContent: string,
): boolean {
  const { oldCompiled, newCompiled, diffCompiled, filter } = cf;

  const results: boolean[] = [];
  if (oldCompiled) results.push(testRegex(oldCompiled, delContent));
  if (newCompiled) results.push(testRegex(newCompiled, addContent));
  if (diffCompiled) results.push(diffRegexMatches(diffCompiled, delContent, addContent));

  if (results.length === 0) return false;

  return filter.combinator === "and"
    ? results.every(Boolean)
    : results.some(Boolean);
}

/**
 * Does this filter match an unpaired line (deletion with no addition, or vice versa)?
 *
 * diffRegex requires both sides, so it can't match unpaired lines.
 * AND mode with multiple checks can't be satisfied if diffRegex or the other-side regex is needed.
 */
function matchesUnpaired(
  cf: CompiledFilter,
  kind: "deletion" | "addition",
  content: string,
): boolean {
  const { oldCompiled, newCompiled, diffCompiled, filter } = cf;

  if (filter.combinator === "and") {
    // AND requires ALL checks to pass. Checks that need the missing side (newRegex
    // for unpaired deletions, oldRegex for unpaired additions, diffRegex always)
    // can't pass, so AND fails if any such check exists.
    if (diffCompiled) return false;
    if (kind === "deletion" && newCompiled) return false;
    if (kind === "addition" && oldCompiled) return false;
    // Only the applicable-side check remains
    if (kind === "deletion" && oldCompiled) return testRegex(oldCompiled, content);
    if (kind === "addition" && newCompiled) return testRegex(newCompiled, content);
    return false;
  }

  // OR mode: any single applicable check passing is enough.
  // Checks that need the missing side simply can't contribute, but others can.
  if (kind === "deletion" && oldCompiled && testRegex(oldCompiled, content)) return true;
  if (kind === "addition" && newCompiled && testRegex(newCompiled, content)) return true;
  return false;
}

/**
 * Walk a hunk's lines and compute which lines are hidden by the given filters.
 * Returns a map of line index → filter ID that caused hiding.
 *
 * The key behaviour: when a filter matches, BOTH sides of the diff are hidden
 * (the deletion and its paired addition), not just one side.
 */
function computeHunkVisibility(
  hunk: DiffHunk,
  compiled: CompiledFilter[],
): Map<number, string> {
  const hidden = new Map<number, string>();
  const lines = hunk.lines;
  let i = 0;

  while (i < lines.length) {
    if (lines[i].kind === "context") {
      i++;
      continue;
    }

    const deletions: number[] = [];
    while (i < lines.length && lines[i].kind === "deletion") {
      deletions.push(i);
      i++;
    }

    const additions: number[] = [];
    while (i < lines.length && lines[i].kind === "addition") {
      additions.push(i);
      i++;
    }

    const pairCount = Math.min(deletions.length, additions.length);

    for (let p = 0; p < pairCount; p++) {
      const delIdx = deletions[p];
      const addIdx = additions[p];

      for (const cf of compiled) {
        if (matchesPair(cf, lines[delIdx].content, lines[addIdx].content)) {
          hidden.set(delIdx, cf.filter.id);
          hidden.set(addIdx, cf.filter.id);
          break;
        }
      }
    }

    for (let p = pairCount; p < deletions.length; p++) {
      const idx = deletions[p];
      for (const cf of compiled) {
        if (matchesUnpaired(cf, "deletion", lines[idx].content)) {
          hidden.set(idx, cf.filter.id);
          break;
        }
      }
    }

    for (let p = pairCount; p < additions.length; p++) {
      const idx = additions[p];
      for (const cf of compiled) {
        if (matchesUnpaired(cf, "addition", lines[idx].content)) {
          hidden.set(idx, cf.filter.id);
          break;
        }
      }
    }
  }

  return hidden;
}

export function applyFilters(diffSet: DiffSet, filters: FilterPattern[]): FilteredDiffSet {
  const compiled = compileFilters(filters);

  if (compiled.length === 0) {
    const files: FilteredDiffFile[] = diffSet.files.map((file) => ({
      file,
      filtered_hunks: file.hunks.map((hunk) => ({
        hunk,
        line_visibility: hunk.lines.map(() => ({ visible: true, hidden_by_filter_id: null })),
        fully_hidden: false,
        hidden_change_count: 0,
      })),
      visible_change_count: file.stats.additions + file.stats.deletions,
      visible_additions: file.stats.additions,
      visible_deletions: file.stats.deletions,
      hidden_change_count: 0,
    }));

    const totalChanges = diffSet.stats.total_additions + diffSet.stats.total_deletions;
    return {
      files,
      filter_stats: {
        total_changes: totalChanges,
        visible_changes: totalChanges,
        hidden_changes: 0,
        hidden_by_filter: {},
      },
    };
  }

  const hiddenByFilter: Record<string, number> = {};
  let totalChanges = 0;
  let hiddenChanges = 0;

  const files: FilteredDiffFile[] = diffSet.files.map((file) => {
    let fileVisible = 0;
    let fileVisibleAdditions = 0;
    let fileVisibleDeletions = 0;
    let fileHidden = 0;

    const filtered_hunks: FilteredDiffHunk[] = file.hunks.map((hunk) => {
      const hiddenMap = computeHunkVisibility(hunk, compiled);
      let hunkHidden = 0;

      const line_visibility: LineVisibility[] = hunk.lines.map((line, idx) => {
        if (line.kind === "context") {
          return { visible: true, hidden_by_filter_id: null };
        }

        totalChanges++;

        const filterId = hiddenMap.get(idx);
        if (filterId) {
          hiddenChanges++;
          hunkHidden++;
          fileHidden++;
          hiddenByFilter[filterId] = (hiddenByFilter[filterId] ?? 0) + 1;
          return { visible: false, hidden_by_filter_id: filterId };
        }

        fileVisible++;
        if (line.kind === "addition") fileVisibleAdditions++;
        else if (line.kind === "deletion") fileVisibleDeletions++;
        return { visible: true, hidden_by_filter_id: null };
      });

      const changedLines = hunk.lines.filter((l) => l.kind !== "context");
      const fully_hidden = changedLines.length > 0 && hunkHidden === changedLines.length;

      return { hunk, line_visibility, fully_hidden, hidden_change_count: hunkHidden };
    });

    return {
      file,
      filtered_hunks,
      visible_change_count: fileVisible,
      visible_additions: fileVisibleAdditions,
      visible_deletions: fileVisibleDeletions,
      hidden_change_count: fileHidden,
    };
  });

  return {
    files,
    filter_stats: {
      total_changes: totalChanges,
      visible_changes: totalChanges - hiddenChanges,
      hidden_changes: hiddenChanges,
      hidden_by_filter: hiddenByFilter,
    },
  };
}
