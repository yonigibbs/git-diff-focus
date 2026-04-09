import { useEffect, useRef } from "react";
import type { DiffLine } from "../../types/diff";
import { useFilterPrefillStore } from "../../stores/filterPrefillStore";
import { escapeRegex, computeCharDiff } from "../../lib/charDiff";

export interface ContextMenuState {
  x: number;
  y: number;
  line: DiffLine;
  pairedLine: DiffLine | null;  // The adjacent deletion/addition if this line has a pair
}

interface DiffContextMenuProps {
  state: ContextMenuState;
  onClose: () => void;
}

export function DiffContextMenu({ state, onClose }: DiffContextMenuProps) {
  const ref = useRef<HTMLDivElement>(null);
  const setPrefill = useFilterPrefillStore((s) => s.setPrefill);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        onClose();
      }
    };
    window.addEventListener("mousedown", handler);
    return () => window.removeEventListener("mousedown", handler);
  }, [onClose]);

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [onClose]);

  const { line, pairedLine } = state;
  const isDeletion = line.kind === "deletion";
  const isAddition = line.kind === "addition";

  const oldLine = isDeletion ? line : pairedLine;
  const newLine = isAddition ? line : pairedLine;

  const handleOldCode = () => {
    if (!oldLine) return;
    setPrefill({
      name: "",
      oldRegex: escapeRegex(oldLine.content.trim()),
      newRegex: "",
      diffRegex: "",
    });
    onClose();
  };

  const handleNewCode = () => {
    if (!newLine) return;
    setPrefill({
      name: "",
      oldRegex: "",
      newRegex: escapeRegex(newLine.content.trim()),
      diffRegex: "",
    });
    onClose();
  };

  const handleDiff = () => {
    if (!oldLine || !newLine) return;
    const diffs = computeCharDiff(oldLine.content, newLine.content);
    const diffRegex = diffs.map(escapeRegex).join("|");
    setPrefill({
      name: "",
      oldRegex: "",
      newRegex: "",
      diffRegex,
    });
    onClose();
  };

  return (
    <div
      ref={ref}
      className="fixed z-50 bg-gray-800 border border-gray-600 rounded shadow-lg py-1 min-w-48"
      style={{ left: state.x, top: state.y }}
    >
      <div className="px-3 py-1 text-xs text-gray-500 uppercase">Create filter from...</div>
      {oldLine && (
        <button
          onClick={handleOldCode}
          className="w-full text-left px-3 py-1.5 text-sm text-gray-300 hover:bg-gray-700 flex items-center gap-2"
        >
          <span className="text-red-400 text-xs">OLD</span>
          <span className="truncate font-mono text-xs">{oldLine.content.trim()}</span>
        </button>
      )}
      {newLine && (
        <button
          onClick={handleNewCode}
          className="w-full text-left px-3 py-1.5 text-sm text-gray-300 hover:bg-gray-700 flex items-center gap-2"
        >
          <span className="text-green-400 text-xs">NEW</span>
          <span className="truncate font-mono text-xs">{newLine.content.trim()}</span>
        </button>
      )}
      {oldLine && newLine && (
        <>
          <div className="border-t border-gray-700 my-1" />
          <button
            onClick={handleDiff}
            className="w-full text-left px-3 py-1.5 text-sm text-gray-300 hover:bg-gray-700 flex items-center gap-2"
          >
            <span className="text-blue-400 text-xs">DIFF</span>
            <span className="truncate font-mono text-xs">
              {(() => {
                const diffs = computeCharDiff(oldLine.content, newLine.content);
                return diffs.length > 0 ? diffs.join(", ") : "(no difference found)";
              })()}
            </span>
          </button>
        </>
      )}
    </div>
  );
}
