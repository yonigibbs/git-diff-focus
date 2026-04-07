interface CommentGutterProps {
  hasComments: boolean;
  onClick: () => void;
}

export function CommentGutter({ hasComments, onClick }: CommentGutterProps) {
  return (
    <button
      onClick={onClick}
      className={`w-5 flex-shrink-0 flex items-center justify-center text-xs hover:bg-blue-900/30 ${
        hasComments ? "text-blue-400" : "text-transparent hover:text-blue-400/50"
      }`}
      title="Add comment"
    >
      +
    </button>
  );
}
