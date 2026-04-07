import { useState } from "react";
import { useAuthStore } from "../../stores/authStore";
import type { StorageMode } from "../../providers/auth";

export function TokenInput() {
  const { token, storageMode, setToken, clearToken, setStorageMode } = useAuthStore();
  const [inputValue, setInputValue] = useState("");
  const [showInput, setShowInput] = useState(!token);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (inputValue.trim()) {
      setToken(inputValue.trim());
      setInputValue("");
      setShowInput(false);
    }
  };

  const handleStorageModeChange = (mode: StorageMode) => {
    setStorageMode(mode);
  };

  if (token && !showInput) {
    return (
      <div className="flex items-center gap-2 text-sm">
        <span className="text-green-400">Authenticated</span>
        <button
          onClick={() => { clearToken(); setShowInput(true); }}
          className="text-gray-400 hover:text-gray-200 underline"
        >
          Change token
        </button>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-3">
      <div>
        <label htmlFor="token-input" className="block text-sm text-gray-400 mb-1">
          GitHub Personal Access Token
        </label>
        <div className="flex gap-2">
          <input
            id="token-input"
            type="password"
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            placeholder="ghp_..."
            className="flex-1 bg-gray-800 border border-gray-700 rounded px-3 py-1.5 text-sm text-gray-200 placeholder-gray-500 focus:outline-none focus:border-blue-500"
          />
          <button
            type="submit"
            disabled={!inputValue.trim()}
            className="px-3 py-1.5 bg-blue-600 text-white text-sm rounded hover:bg-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Save
          </button>
        </div>
      </div>

      <div className="flex items-center gap-3 text-sm">
        <span className="text-gray-400">Store token:</span>
        <label className="flex items-center gap-1.5 cursor-pointer">
          <input
            type="radio"
            name="storageMode"
            checked={storageMode === "memory"}
            onChange={() => handleStorageModeChange("memory")}
            className="accent-blue-500"
          />
          <span className="text-gray-300">Session only</span>
        </label>
        <label className="flex items-center gap-1.5 cursor-pointer">
          <input
            type="radio"
            name="storageMode"
            checked={storageMode === "localStorage"}
            onChange={() => handleStorageModeChange("localStorage")}
            className="accent-blue-500"
          />
          <span className="text-gray-300">Remember</span>
        </label>
      </div>

      {storageMode === "localStorage" && (
        <p className="text-xs text-yellow-500/80">
          Token will be stored in your browser's localStorage. Only use this on trusted devices.
        </p>
      )}

      <p className="text-xs text-gray-500">
        Needs <code className="bg-gray-800 px-1 rounded">repo</code> scope.{" "}
        Create one at GitHub Settings &gt; Developer settings &gt; Personal access tokens.
      </p>
    </form>
  );
}
