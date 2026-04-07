import { useEffect } from "react";
import { useDiffStore } from "../../stores/diffStore";
import { useNavigationStore } from "../../stores/navigationStore";
import { useCommentStore } from "../../stores/commentStore";
import { useFilteredDiff } from "../../hooks/useFilteredDiff";
import { DiffFileHeader } from "./DiffFileHeader";
import { DiffHunkComponent } from "./DiffHunk";
import { SideBySideHunkComponent } from "./SideBySideHunk";
import { DiffNavToolbar } from "./DiffNavToolbar";

export function DiffView() {
  const loading = useDiffStore((s) => s.loading);
  const diffSet = useDiffStore((s) => s.diffSet);
  const filtered = useFilteredDiff();
  const viewMode = useNavigationStore((s) => s.viewMode);
  const comments = useCommentStore((s) => s.comments);
  const loadComments = useCommentStore((s) => s.loadComments);

  // Load comments when diff is loaded
  useEffect(() => {
    if (diffSet) {
      loadComments(diffSet.source);
    }
  }, [diffSet, loadComments]);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full text-gray-500">
        Loading diff...
      </div>
    );
  }

  if (!filtered) {
    return (
      <div className="flex items-center justify-center h-full text-gray-500">
        Load a PR to see its diff
      </div>
    );
  }

  // Filter out files with no visible changes
  const visibleFiles = filtered.files
    .map((f, i) => ({ filteredFile: f, fileIndex: i }))
    .filter(({ filteredFile }) => filteredFile.visible_change_count > 0);

  if (visibleFiles.length === 0) {
    return (
      <div className="flex items-center justify-center h-full text-gray-500">
        {filtered.files.length === 0
          ? "No files changed"
          : "All changes hidden by filters"}
      </div>
    );
  }

  return (
    <div>
      <DiffNavToolbar />
      {visibleFiles.map(({ filteredFile, fileIndex }) => {
        const filePath = filteredFile.file.new_path ?? filteredFile.file.old_path ?? "";
        const fileComments = comments.filter((c) => c.file_path === filePath);

        return (
          <div key={fileIndex} className="mb-4" data-file-index={fileIndex}>
            <DiffFileHeader
              file={filteredFile.file}
              fileIndex={fileIndex}
              isActive={false}
              visibleAdditions={filteredFile.visible_additions}
              visibleDeletions={filteredFile.visible_deletions}
            />

            {filteredFile.file.is_binary ? (
              <div className="px-4 py-3 text-sm text-gray-500 italic">
                Binary file changed
              </div>
            ) : (
              filteredFile.filtered_hunks.map((filteredHunk) => (
                <div key={filteredHunk.hunk.id} {...(filteredHunk.fully_hidden ? {} : { "data-hunk-id": filteredHunk.hunk.id })}>
                  {viewMode === "side-by-side" ? (
                    <SideBySideHunkComponent filteredHunk={filteredHunk} />
                  ) : (
                    <DiffHunkComponent
                      filteredHunk={filteredHunk}
                      highlightedLineId={null}
                      comments={fileComments}
                      filePath={filePath}
                      source={diffSet?.source ?? null}
                    />
                  )}
                </div>
              ))
            )}

            {filteredFile.hidden_change_count > 0 && (
              <div className="px-4 py-1 text-xs text-yellow-500/60">
                {filteredFile.hidden_change_count} change{filteredFile.hidden_change_count !== 1 ? "s" : ""} hidden in this file
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
