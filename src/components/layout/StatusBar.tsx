import { useNavigationStore } from "../../stores/navigationStore";
import { useFilteredDiff } from "../../hooks/useFilteredDiff";

export function StatusBar() {
  const viewMode = useNavigationStore((s) => s.viewMode);
  const filtered = useFilteredDiff();

  return (
    <div className="border-t border-gray-700 px-4 py-1.5 flex items-center justify-between text-xs text-gray-500">
      <div className="flex items-center gap-4">
        <span>View: {viewMode}</span>
        {filtered && filtered.filter_stats.hidden_changes > 0 && (
          <span className="text-yellow-500/70">
            {filtered.filter_stats.hidden_changes} change{filtered.filter_stats.hidden_changes !== 1 ? "s" : ""} hidden
          </span>
        )}
      </div>
      <div className="flex items-center gap-3">
        <span><kbd className="bg-gray-800 px-1 rounded">&#8679;&#8593;</kbd>/<kbd className="bg-gray-800 px-1 rounded">&#8679;&#8595;</kbd> changes</span>
        <span><kbd className="bg-gray-800 px-1 rounded">&#8984;&#8679;&#8593;</kbd>/<kbd className="bg-gray-800 px-1 rounded">&#8984;&#8679;&#8595;</kbd> files</span>
        <span><kbd className="bg-gray-800 px-1 rounded">t</kbd> toggle view</span>
      </div>
    </div>
  );
}
