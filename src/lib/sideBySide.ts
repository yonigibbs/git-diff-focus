import type { DiffLine } from "../types/diff";
import type { LineVisibility } from "../types/filter";

export interface SideBySideRow {
  left: { line: DiffLine; visibility: LineVisibility } | null;
  right: { line: DiffLine; visibility: LineVisibility } | null;
}

/**
 * Pair hunk lines into left/right rows for side-by-side display.
 *
 * - Context lines appear on both sides at the same row.
 * - Consecutive deletions are paired with consecutive additions.
 * - Unpaired deletions or additions get an empty cell on the other side.
 */
export function pairLinesForSideBySide(
  lines: DiffLine[],
  visibility: LineVisibility[],
): SideBySideRow[] {
  const rows: SideBySideRow[] = [];
  let i = 0;

  while (i < lines.length) {
    const line = lines[i];

    if (line.kind === "context") {
      rows.push({
        left: { line, visibility: visibility[i] },
        right: { line, visibility: visibility[i] },
      });
      i++;
      continue;
    }

    // Collect consecutive deletions
    const deletions: number[] = [];
    while (i < lines.length && lines[i].kind === "deletion") {
      deletions.push(i);
      i++;
    }

    // Collect consecutive additions
    const additions: number[] = [];
    while (i < lines.length && lines[i].kind === "addition") {
      additions.push(i);
      i++;
    }

    // Pair them up
    const pairCount = Math.max(deletions.length, additions.length);
    for (let p = 0; p < pairCount; p++) {
      const delIdx = p < deletions.length ? deletions[p] : null;
      const addIdx = p < additions.length ? additions[p] : null;

      rows.push({
        left: delIdx !== null ? { line: lines[delIdx], visibility: visibility[delIdx] } : null,
        right: addIdx !== null ? { line: lines[addIdx], visibility: visibility[addIdx] } : null,
      });
    }
  }

  return rows;
}
