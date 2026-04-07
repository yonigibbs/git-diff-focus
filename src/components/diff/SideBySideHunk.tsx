import type { FilteredDiffHunk } from "../../types/filter";
import { pairLinesForSideBySide } from "../../lib/sideBySide";
import { SideBySideLineCell } from "./SideBySideLine";
import { FilteredBanner } from "./FilteredBanner";

interface SideBySideHunkProps {
  filteredHunk: FilteredDiffHunk;
}

export function SideBySideHunkComponent({ filteredHunk }: SideBySideHunkProps) {
  const { hunk, line_visibility, fully_hidden } = filteredHunk;

  if (fully_hidden) {
    const hiddenLines = hunk.lines
      .map((line, i) => ({ line, visibility: line_visibility[i] }))
      .filter(({ line }) => line.kind !== "context");
    return (
      <div>
        <div className="bg-blue-900/20 text-blue-300 font-mono text-sm px-4 py-1 border-y border-gray-700/50 select-none">
          {hunk.header}
        </div>
        <FilteredBanner hiddenLines={hiddenLines} />
      </div>
    );
  }

  const rows = pairLinesForSideBySide(hunk.lines, line_visibility);

  return (
    <div>
      <div className="bg-blue-900/20 text-blue-300 font-mono text-sm px-4 py-1 border-y border-gray-700/50 select-none">
        {hunk.header}
      </div>
      {rows.map((row, i) => {
        const leftHidden = row.left && !row.left.visibility.visible && row.left.line.kind !== "context";
        const rightHidden = row.right && !row.right.visibility.visible && row.right.line.kind !== "context";

        if (leftHidden && rightHidden) {
          // Both sides hidden — skip (will be aggregated into a banner)
          return null;
        }

        const leftKind = row.left?.line.kind ?? "context";
        const rightKind = row.right?.line.kind ?? "context";
        const isChanged = leftKind !== "context" || rightKind !== "context";
        const rowKind = leftKind !== "context" ? leftKind : rightKind;

        return (
          <div
            key={i}
            className="flex border-b border-gray-800/30"
            {...(isChanged && rowKind ? { "data-line-kind": rowKind } : {})}
          >
            <SideBySideLineCell
              line={row.left?.line ?? null}
              visible={!leftHidden}
            />
            <div className="w-px bg-gray-700/50 flex-shrink-0" />
            <SideBySideLineCell
              line={row.right?.line ?? null}
              visible={!rightHidden}
            />
          </div>
        );
      })}
    </div>
  );
}
