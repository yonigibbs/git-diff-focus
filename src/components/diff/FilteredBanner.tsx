import { useState } from "react";
import type { DiffLine } from "../../types/diff";
import type { LineVisibility } from "../../types/filter";
import { useFilterStore } from "../../stores/filterStore";
import { DiffLineComponent } from "./DiffLine";

interface FilteredBannerProps {
  hiddenLines: { line: DiffLine; visibility: LineVisibility }[];
}

export function FilteredBanner({ hiddenLines }: FilteredBannerProps) {
  const [expanded, setExpanded] = useState(false);
  const filters = useFilterStore((s) => s.filters);

  if (hiddenLines.length === 0) return null;

  // Find which filters are responsible
  const filterIds = new Set(hiddenLines.map((l) => l.visibility.hidden_by_filter_id).filter(Boolean));
  const filterNames = [...filterIds]
    .map((id) => filters.find((f) => f.id === id)?.name ?? "Unknown filter")
    .join(", ");

  return (
    <div>
      <button
        onClick={() => setExpanded(!expanded)}
        className="w-full text-left px-4 py-1 text-xs text-yellow-500/80 bg-yellow-900/10 hover:bg-yellow-900/20 border-y border-yellow-900/20 flex items-center gap-2"
      >
        <span className="flex-shrink-0">{expanded ? "▼" : "▶"}</span>
        <span>
          {hiddenLines.length} change{hiddenLines.length !== 1 ? "s" : ""} hidden by{" "}
          <span className="font-medium">{filterNames}</span>
        </span>
      </button>
      {expanded && (
        <div className="opacity-50">
          {hiddenLines.map(({ line }) => (
            <DiffLineComponent key={line.id} line={line} isHighlighted={false} hasComments={false} onCommentClick={() => {}} />
          ))}
        </div>
      )}
    </div>
  );
}
