import { useState, useCallback } from "react";
import type { FilteredDiffHunk } from "../../types/filter";
import type { DiffComment } from "../../types/comment";
import type { DiffLine } from "../../types/diff";
import type { LineVisibility } from "../../types/filter";
import type { DiffSource } from "../../types/diff";
import { DiffLineComponent } from "./DiffLine";
import { FilteredBanner } from "./FilteredBanner";
import { CommentThread } from "../comments/CommentThread";
import { CommentEditor } from "../comments/CommentEditor";
import { DiffContextMenu, type ContextMenuState } from "./DiffContextMenu";
import { useCommentStore } from "../../stores/commentStore";

interface DiffHunkProps {
  filteredHunk: FilteredDiffHunk;
  highlightedLineId: string | null;
  comments: DiffComment[];
  filePath: string;
  source: DiffSource | null;
}

/**
 * Build a map from line ID to its paired line (deletion↔addition).
 * Pairs are determined by adjacent deletion/addition runs, matched positionally.
 */
function buildPairMap(lines: DiffLine[]): Map<string, DiffLine> {
  const pairs = new Map<string, DiffLine>();
  let i = 0;
  while (i < lines.length) {
    if (lines[i].kind === "context") { i++; continue; }

    const deletions: DiffLine[] = [];
    while (i < lines.length && lines[i].kind === "deletion") {
      deletions.push(lines[i]);
      i++;
    }
    const additions: DiffLine[] = [];
    while (i < lines.length && lines[i].kind === "addition") {
      additions.push(lines[i]);
      i++;
    }

    const pairCount = Math.min(deletions.length, additions.length);
    for (let p = 0; p < pairCount; p++) {
      pairs.set(deletions[p].id, additions[p]);
      pairs.set(additions[p].id, deletions[p]);
    }
  }
  return pairs;
}

export function DiffHunkComponent({ filteredHunk, highlightedLineId, comments, filePath, source }: DiffHunkProps) {
  const { hunk, line_visibility, fully_hidden } = filteredHunk;
  const [editingLineId, setEditingLineId] = useState<string | null>(null);
  const [contextMenu, setContextMenu] = useState<ContextMenuState | null>(null);
  const postComment = useCommentStore((s) => s.postComment);
  const postingLineId = useCommentStore((s) => s.postingLineId);

  const pairMap = buildPairMap(hunk.lines);

  const handleContextMenu = useCallback((e: React.MouseEvent, line: DiffLine) => {
    if (line.kind === "context") return;
    e.preventDefault();
    const paired = pairMap.get(line.id) ?? null;
    setContextMenu({ x: e.clientX, y: e.clientY, line, pairedLine: paired });
  }, [pairMap]);

  const handlePostComment = async (lineId: string, body: string) => {
    if (!source) return;
    const line = hunk.lines.find((l) => l.id === lineId);
    if (!line) return;

    const ghSide = line.kind === "deletion" ? "LEFT" as const : "RIGHT" as const;
    const ghLine = (line.kind === "deletion" ? line.old_line_number : line.new_line_number) ?? 0;

    await postComment(source, filePath, ghLine, ghSide, body, lineId);
    setEditingLineId(null);
  };

  if (fully_hidden) {
    const hiddenLines = hunk.lines
      .map((line, i) => ({ line, visibility: line_visibility[i] }))
      .filter(({ line }) => line.kind !== "context");
    return (
      <div>
        <div data-hunk-header className="bg-blue-900/20 text-blue-300 font-mono text-sm px-4 py-1 border-y border-gray-700/50 select-none">
          {hunk.header}
        </div>
        <FilteredBanner hiddenLines={hiddenLines} />
      </div>
    );
  }

  // Group consecutive hidden lines for inline banners
  const elements: React.ReactNode[] = [];
  let hiddenGroup: { line: DiffLine; visibility: LineVisibility }[] = [];

  const flushHidden = () => {
    if (hiddenGroup.length > 0) {
      elements.push(
        <FilteredBanner key={`hidden-${hiddenGroup[0].line.id}`} hiddenLines={[...hiddenGroup]} />
      );
      hiddenGroup = [];
    }
  };

  for (let i = 0; i < hunk.lines.length; i++) {
    const line = hunk.lines[i];
    const vis = line_visibility[i];

    if (!vis.visible && line.kind !== "context") {
      hiddenGroup.push({ line, visibility: vis });
    } else {
      flushHidden();

      const lineComments = comments.filter((c) => c.line_id === line.id);
      const hasComments = lineComments.length > 0;

      elements.push(
        <DiffLineComponent
          key={line.id}
          line={line}
          isHighlighted={line.id === highlightedLineId}
          hasComments={hasComments}
          onCommentClick={() => setEditingLineId(editingLineId === line.id ? null : line.id)}
          onContextMenu={line.kind !== "context" ? (e) => handleContextMenu(e, line) : undefined}
        />
      );

      // Show existing comments
      if (lineComments.length > 0) {
        elements.push(
          <CommentThread key={`thread-${line.id}`} comments={lineComments} />
        );
      }

      // Show editor
      if (editingLineId === line.id) {
        elements.push(
          <CommentEditor
            key={`editor-${line.id}`}
            onSubmit={(body) => handlePostComment(line.id, body)}
            onCancel={() => setEditingLineId(null)}
            posting={postingLineId === line.id}
          />
        );
      }
    }
  }
  flushHidden();

  return (
    <div>
      <div data-hunk-header className="bg-blue-900/20 text-blue-300 font-mono text-sm px-4 py-1 border-y border-gray-700/50 select-none">
        {hunk.header}
      </div>
      {elements}
      {contextMenu && (
        <DiffContextMenu state={contextMenu} onClose={() => setContextMenu(null)} />
      )}
    </div>
  );
}
