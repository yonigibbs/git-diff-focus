import type { DiffComment } from "../../types/comment";

interface CommentThreadProps {
  comments: DiffComment[];
}

export function CommentThread({ comments }: CommentThreadProps) {
  if (comments.length === 0) return null;

  return (
    <div className="bg-gray-800 border-l-2 border-blue-500 mx-4 my-1 rounded-r">
      {comments.map((comment) => (
        <div key={comment.id} className="px-3 py-2 border-b border-gray-700/50 last:border-b-0">
          <div className="flex items-center gap-2 mb-1">
            <span className="text-sm font-medium text-gray-300">{comment.author}</span>
            <span className="text-xs text-gray-500">
              {new Date(comment.created_at).toLocaleDateString()}
            </span>
          </div>
          <div className="text-sm text-gray-400 whitespace-pre-wrap">{comment.body}</div>
        </div>
      ))}
    </div>
  );
}
