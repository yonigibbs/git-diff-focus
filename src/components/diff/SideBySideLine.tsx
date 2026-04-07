import type { DiffLine } from "../../types/diff";

interface SideBySideLineCellProps {
  line: DiffLine | null;
  visible: boolean;
}

const kindStyles: Record<string, string> = {
  addition: "bg-green-900/30 text-green-200",
  deletion: "bg-red-900/30 text-red-200",
  context: "text-gray-400",
};

const gutterStyles: Record<string, string> = {
  addition: "text-green-600 bg-green-900/20",
  deletion: "text-red-600 bg-red-900/20",
  context: "text-gray-600",
};

export function SideBySideLineCell({ line, visible }: SideBySideLineCellProps) {
  if (!line) {
    return <div className="flex-1 bg-gray-800/50" />;
  }

  const lineNum = line.kind === "deletion" ? line.old_line_number : line.new_line_number ?? line.old_line_number;

  return (
    <div
      className={`flex-1 flex font-mono text-sm leading-6 min-w-0 ${kindStyles[line.kind]} ${
        !visible ? "opacity-40" : ""
      }`}
      data-line-id={line.id}
    >
      <div
        className={`w-10 flex-shrink-0 text-right px-1.5 select-none ${gutterStyles[line.kind]} border-r border-gray-700/50`}
      >
        {lineNum ?? ""}
      </div>
      <div className="flex-1 px-2 whitespace-pre overflow-x-auto">
        {line.content}
      </div>
    </div>
  );
}
