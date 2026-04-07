import type { DiffFile } from "../../types/diff";

interface DiffFileHeaderProps {
  file: DiffFile;
  fileIndex: number;
  isActive: boolean;
  visibleAdditions: number;
  visibleDeletions: number;
}

export function DiffFileHeader({ file, isActive, visibleAdditions, visibleDeletions }: DiffFileHeaderProps) {
  const path = file.new_path ?? file.old_path ?? "unknown";
  const renamedFrom = file.status.type === "renamed" && file.old_path ? file.old_path : null;

  return (
    <div
      className={`sticky top-0 z-10 bg-gray-800 border-b border-gray-700 px-4 py-2 flex items-center gap-3 ${
        isActive ? "border-l-2 border-l-blue-500" : ""
      }`}
    >
      <span className="font-mono text-sm text-gray-200 truncate">
        {renamedFrom && (
          <span className="text-gray-500">{renamedFrom} &rarr; </span>
        )}
        {path}
      </span>
      <span className="ml-auto text-xs text-gray-500 flex-shrink-0">
        <span className="text-green-400">+{visibleAdditions}</span>{" "}
        <span className="text-red-400">-{visibleDeletions}</span>
      </span>
    </div>
  );
}
