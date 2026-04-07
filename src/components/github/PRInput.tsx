import { useState } from "react";
import { useDiffStore } from "../../stores/diffStore";
import { useAuthStore } from "../../stores/authStore";

/**
 * Parses a PR reference in various formats:
 * - "owner/repo#123"
 * - "owner/repo/pull/123"
 * - "https://github.com/owner/repo/pull/123"
 */
function parsePRRef(input: string): { owner: string; repo: string; prNumber: number } | null {
  const trimmed = input.trim();

  // Try owner/repo#123
  const hashMatch = trimmed.match(/^([^/\s]+)\/([^#\s]+)#(\d+)$/);
  if (hashMatch) {
    return { owner: hashMatch[1], repo: hashMatch[2], prNumber: parseInt(hashMatch[3]) };
  }

  // Try URL: https://github.com/owner/repo/pull/123
  const urlMatch = trimmed.match(/github\.com\/([^/]+)\/([^/]+)\/pull\/(\d+)/);
  if (urlMatch) {
    return { owner: urlMatch[1], repo: urlMatch[2], prNumber: parseInt(urlMatch[3]) };
  }

  // Try owner/repo/pull/123
  const pathMatch = trimmed.match(/^([^/\s]+)\/([^/\s]+)\/pull\/(\d+)$/);
  if (pathMatch) {
    return { owner: pathMatch[1], repo: pathMatch[2], prNumber: parseInt(pathMatch[3]) };
  }

  return null;
}

export function PRInput() {
  const [inputValue, setInputValue] = useState("");
  const [parseError, setParseError] = useState<string | null>(null);
  const { loading, error: loadError, loadPRDiff } = useDiffStore();
  const token = useAuthStore((s) => s.token);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setParseError(null);

    const parsed = parsePRRef(inputValue);
    if (!parsed) {
      setParseError("Enter a PR as owner/repo#123 or a GitHub PR URL");
      return;
    }

    loadPRDiff(parsed.owner, parsed.repo, parsed.prNumber);
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-2">
      <label htmlFor="pr-input" className="block text-sm text-gray-400">
        Pull Request
      </label>
      <div className="flex gap-2">
        <input
          id="pr-input"
          type="text"
          value={inputValue}
          onChange={(e) => { setInputValue(e.target.value); setParseError(null); }}
          placeholder="owner/repo#123 or GitHub URL"
          disabled={!token}
          className="flex-1 bg-gray-800 border border-gray-700 rounded px-3 py-1.5 text-sm text-gray-200 placeholder-gray-500 focus:outline-none focus:border-blue-500 disabled:opacity-50"
        />
        <button
          type="submit"
          disabled={!token || !inputValue.trim() || loading}
          className="px-3 py-1.5 bg-blue-600 text-white text-sm rounded hover:bg-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {loading ? "Loading..." : "Load"}
        </button>
      </div>
      {parseError && <p className="text-xs text-red-400">{parseError}</p>}
      {loadError && <p className="text-xs text-red-400">{loadError}</p>}
      {!token && <p className="text-xs text-gray-500">Enter a token first</p>}
    </form>
  );
}
