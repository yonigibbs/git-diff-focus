import { useState } from "react";

interface CommentEditorProps {
  onSubmit: (body: string) => void;
  onCancel: () => void;
  posting: boolean;
}

export function CommentEditor({ onSubmit, onCancel, posting }: CommentEditorProps) {
  const [body, setBody] = useState("");

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (body.trim()) {
      onSubmit(body.trim());
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) {
      e.preventDefault();
      if (body.trim()) {
        onSubmit(body.trim());
      }
    }
    if (e.key === "Escape") {
      onCancel();
    }
  };

  return (
    <form onSubmit={handleSubmit} className="bg-gray-800 border-l-2 border-green-500 mx-4 my-1 rounded-r p-3">
      <textarea
        value={body}
        onChange={(e) => setBody(e.target.value)}
        onKeyDown={handleKeyDown}
        placeholder="Write a comment... (Cmd+Enter to submit, Esc to cancel)"
        className="w-full bg-gray-900 border border-gray-700 rounded px-3 py-2 text-sm text-gray-200 placeholder-gray-500 focus:outline-none focus:border-blue-500 resize-y min-h-[60px]"
        autoFocus
        rows={3}
      />
      <div className="flex justify-end gap-2 mt-2">
        <button
          type="button"
          onClick={onCancel}
          className="px-3 py-1 text-sm text-gray-400 hover:text-gray-200"
        >
          Cancel
        </button>
        <button
          type="submit"
          disabled={!body.trim() || posting}
          className="px-3 py-1 bg-green-600 text-white text-sm rounded hover:bg-green-500 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {posting ? "Posting..." : "Comment"}
        </button>
      </div>
    </form>
  );
}
