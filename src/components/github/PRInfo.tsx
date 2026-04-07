import { useDiffStore } from "../../stores/diffStore";
import { useFilteredDiff } from "../../hooks/useFilteredDiff";

export function PRInfoDisplay() {
  const prInfo = useDiffStore((s) => s.prInfo);
  const filtered = useFilteredDiff();

  if (!prInfo || !filtered) return null;

  const visibleFiles = filtered.files.filter((f) => f.visible_change_count > 0);
  let totalAdditions = 0;
  let totalDeletions = 0;
  for (const f of filtered.files) {
    totalAdditions += f.visible_additions;
    totalDeletions += f.visible_deletions;
  }

  const stateColors = {
    open: "text-green-400",
    closed: "text-red-400",
    merged: "text-purple-400",
  };

  return (
    <div className="px-4 py-2 border-b border-gray-700 text-sm">
      <div className="flex items-center gap-2">
        <span className={stateColors[prInfo.state]}>
          {prInfo.state === "merged" ? "Merged" : prInfo.state === "open" ? "Open" : "Closed"}
        </span>
        <span className="text-gray-200 font-medium truncate">{prInfo.title}</span>
        <span className="text-gray-500">#{prInfo.number}</span>
      </div>
      <div className="flex items-center gap-3 text-gray-500 mt-1">
        <span>{prInfo.author}</span>
        <span>{prInfo.base_ref} &larr; {prInfo.head_ref}</span>
        <span>
          {visibleFiles.length} files,{" "}
          <span className="text-green-400">+{totalAdditions}</span>{" "}
          <span className="text-red-400">-{totalDeletions}</span>
        </span>
      </div>
    </div>
  );
}
