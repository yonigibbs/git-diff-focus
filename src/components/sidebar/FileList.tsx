import { useFilteredDiff } from "../../hooks/useFilteredDiff";
import type { DiffFile, FileStatus } from "../../types/diff";
import type { FilteredDiffFile } from "../../types/filter";

function statusLabel(status: FileStatus): string {
  switch (status.type) {
    case "added": return "A";
    case "deleted": return "D";
    case "modified": return "M";
    case "renamed": return "R";
  }
}

function statusColor(status: FileStatus): string {
  switch (status.type) {
    case "added": return "text-green-400";
    case "deleted": return "text-red-400";
    case "modified": return "text-yellow-400";
    case "renamed": return "text-blue-400";
  }
}

function displayPath(file: DiffFile): string {
  if (file.status.type === "renamed" && file.old_path && file.new_path) {
    return `${file.old_path} → ${file.new_path}`;
  }
  return file.new_path ?? file.old_path ?? "unknown";
}

function scrollToFile(fileIndex: number) {
  const el = document.querySelector(`[data-file-index="${fileIndex}"]`);
  el?.scrollIntoView({ behavior: "smooth", block: "start" });
}

export function FileList() {
  const filtered = useFilteredDiff();

  if (!filtered) return null;

  const visibleFiles: { filteredFile: FilteredDiffFile; originalIndex: number }[] = [];
  for (let i = 0; i < filtered.files.length; i++) {
    if (filtered.files[i].visible_change_count > 0) {
      visibleFiles.push({ filteredFile: filtered.files[i], originalIndex: i });
    }
  }

  return (
    <div className="flex-1 overflow-y-scroll visible-scrollbar">
      <div className="px-3 py-2 text-xs text-gray-500 uppercase tracking-wider">
        Files ({visibleFiles.length}
        {visibleFiles.length < filtered.files.length && (
          <span> of {filtered.files.length}</span>
        )})
      </div>
      <ul>
        {visibleFiles.map(({ filteredFile, originalIndex }) => (
          <li key={originalIndex}>
            <button
              onClick={() => scrollToFile(originalIndex)}
              className="w-full text-left px-3 py-1.5 text-sm flex items-center gap-2 hover:bg-gray-800 border-l-2 border-transparent"
            >
              <span className={`font-mono text-xs w-4 flex-shrink-0 ${statusColor(filteredFile.file.status)}`}>
                {statusLabel(filteredFile.file.status)}
              </span>
              <span className="truncate text-gray-300" title={displayPath(filteredFile.file)}>
                {displayPath(filteredFile.file)}
              </span>
              <span className="ml-auto flex-shrink-0 text-xs text-gray-500">
                <span className="text-green-400/70">+{filteredFile.visible_additions}</span>{" "}
                <span className="text-red-400/70">-{filteredFile.visible_deletions}</span>
              </span>
            </button>
          </li>
        ))}
      </ul>
    </div>
  );
}
