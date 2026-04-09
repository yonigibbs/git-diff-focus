import type { DiffLine as DiffLineType } from "../../types/diff";
import { CommentGutter } from "../comments/CommentGutter";

interface DiffLineProps {
  line: DiffLineType;
  isHighlighted: boolean;
  hasComments: boolean;
  onCommentClick: () => void;
  onContextMenu?: (e: React.MouseEvent) => void;
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

const prefixChars: Record<string, string> = {
  addition: "+",
  deletion: "-",
  context: " ",
};

export function DiffLineComponent({ line, isHighlighted, hasComments, onCommentClick, onContextMenu }: DiffLineProps) {
  return (
    <div
      className={`flex font-mono text-sm leading-6 ${kindStyles[line.kind]} ${
        isHighlighted ? "ring-1 ring-blue-500/50 ring-inset" : ""
      }`}
      data-line-id={line.id}
      data-line-kind={line.kind}
      onContextMenu={onContextMenu}
    >
      {/* Comment gutter */}
      <CommentGutter hasComments={hasComments} onClick={onCommentClick} />

      {/* Old line number gutter */}
      <div
        className={`w-12 flex-shrink-0 text-right px-2 select-none ${gutterStyles[line.kind]} border-r border-gray-700/50`}
      >
        {line.old_line_number ?? ""}
      </div>

      {/* New line number gutter */}
      <div
        className={`w-12 flex-shrink-0 text-right px-2 select-none ${gutterStyles[line.kind]} border-r border-gray-700/50`}
      >
        {line.new_line_number ?? ""}
      </div>

      {/* Prefix (+/-/space) */}
      <div className={`w-5 flex-shrink-0 text-center select-none ${gutterStyles[line.kind]}`}>
        {prefixChars[line.kind]}
      </div>

      {/* Content */}
      <div className="flex-1 px-2 whitespace-pre overflow-x-auto">
        {line.content}
      </div>
    </div>
  );
}
