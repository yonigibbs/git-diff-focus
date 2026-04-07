import { useState } from "react";
import { useFilterStore } from "../../stores/filterStore";
import { useFilteredDiff } from "../../hooks/useFilteredDiff";
import type { FilterPattern } from "../../types/filter";

function isBuiltin(filter: FilterPattern): boolean {
  return filter.id.startsWith("preset-");
}

function buildTooltip(filter: FilterPattern): string {
  const parts: string[] = [];
  if (filter.oldRegex) parts.push(`Old: /${filter.oldRegex}/`);
  if (filter.newRegex) parts.push(`New: /${filter.newRegex}/`);
  if (filter.diffRegex) parts.push(`Diff: /${filter.diffRegex}/`);
  if (parts.length > 1) parts.push(`Combine: ${filter.combinator.toUpperCase()}`);
  if (filter.flags.includes("i")) parts.push("Case insensitive");
  return parts.join("\n");
}

export function FilterPanel() {
  const { filters, addFilter, removeFilter, toggleFilter, updateFilter } = useFilterStore();
  const filtered = useFilteredDiff();
  const [showAddForm, setShowAddForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);

  return (
    <div className="flex flex-col h-full overflow-y-scroll visible-scrollbar">
      <div className="px-3 py-2 flex items-center justify-between flex-shrink-0">
        <span className="text-xs text-gray-500 uppercase tracking-wider">Filters</span>
        <div className="flex items-center gap-2">
          {filtered && filtered.filter_stats.hidden_changes > 0 && (
            <span className="text-xs text-yellow-500/70">
              {filtered.filter_stats.hidden_changes} hidden
            </span>
          )}
          {!showAddForm && !editingId && (
            <button
              onClick={() => setShowAddForm(true)}
              className="text-xs text-blue-400 hover:text-blue-300"
            >
              + Add
            </button>
          )}
        </div>
      </div>

      {/* Add/edit form */}
      {showAddForm && (
        <FilterForm
          onSave={(values) => {
            addFilter(values);
            setShowAddForm(false);
          }}
          onCancel={() => setShowAddForm(false)}
        />
      )}

      {editingId && (() => {
        const filter = filters.find((f) => f.id === editingId);
        if (!filter) return null;
        return (
          <FilterForm
            initial={filter}
            onSave={(values) => {
              updateFilter(filter.id, values);
              setEditingId(null);
            }}
            onCancel={() => setEditingId(null)}
          />
        );
      })()}

      {/* Filter list — fixed height, scrollable */}
      <ul className="px-1">
        {filters.map((filter) => {
          const builtin = isBuiltin(filter);
          if (editingId === filter.id) return null;
          return (
            <li key={filter.id}>
              <FilterListItem
                filter={filter}
                builtin={builtin}
                hitCount={filtered?.filter_stats.hidden_by_filter[filter.id]}
                onToggle={() => toggleFilter(filter.id)}
                onEdit={builtin ? undefined : () => setEditingId(filter.id)}
                onRemove={builtin ? undefined : () => removeFilter(filter.id)}
              />
            </li>
          );
        })}
      </ul>

      {filters.length === 0 && !showAddForm && (
        <div className="px-3 py-2 text-xs text-gray-600">
          No filters. Click "+ Add" to create one.
        </div>
      )}
    </div>
  );
}

function FilterListItem({
  filter,
  builtin,
  hitCount,
  onToggle,
  onEdit,
  onRemove,
}: {
  filter: FilterPattern;
  builtin: boolean;
  hitCount?: number;
  onToggle: () => void;
  onEdit?: () => void;
  onRemove?: () => void;
}) {
  return (
    <div className="flex items-center gap-2 px-2 py-1 group" title={buildTooltip(filter)}>
      <input
        type="checkbox"
        checked={filter.enabled}
        onChange={onToggle}
        className="accent-blue-500 flex-shrink-0"
      />
      <span
        className={`flex-1 text-sm text-gray-300 truncate ${onEdit ? "cursor-pointer hover:text-gray-100" : ""}`}
        onClick={onEdit}
      >
        {filter.name}
        {builtin && <span className="text-xs text-gray-600 ml-1">(built-in)</span>}
      </span>
      <span
        className="text-xs text-yellow-500/60 flex-shrink-0 w-6 text-right"
        title={hitCount ? `${hitCount} line${hitCount !== 1 ? "s" : ""} hidden by this filter` : undefined}
      >
        {hitCount ? hitCount : ""}
      </span>
      <span className="w-4 flex-shrink-0 text-center">
        {onRemove ? (
          <button
            onClick={onRemove}
            className="text-gray-600 hover:text-red-400 opacity-0 group-hover:opacity-100 text-sm"
            title="Remove filter"
          >
            &times;
          </button>
        ) : null}
      </span>
    </div>
  );
}

interface FilterFormValues {
  name: string;
  oldRegex: string;
  newRegex: string;
  diffRegex: string;
  flags: string;
  combinator: "and" | "or";
  enabled: boolean;
}

function FilterForm({
  initial,
  onSave,
  onCancel,
}: {
  initial?: FilterPattern;
  onSave: (values: FilterFormValues) => void;
  onCancel: () => void;
}) {
  const [name, setName] = useState(initial?.name ?? "");
  const [oldRegex, setOldRegex] = useState(initial?.oldRegex ?? "");
  const [newRegex, setNewRegex] = useState(initial?.newRegex ?? "");
  const [diffRegex, setDiffRegex] = useState(initial?.diffRegex ?? "");
  const [caseInsensitive, setCaseInsensitive] = useState(initial?.flags.includes("i") ?? false);
  const [combinator, setCombinator] = useState<"and" | "or">(initial?.combinator ?? "and");
  const [error, setError] = useState<string | null>(null);

  const hasAny = oldRegex.trim() || newRegex.trim() || diffRegex.trim();

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (!hasAny) {
      setError("At least one regex must be provided");
      return;
    }

    const flags = caseInsensitive ? "i" : "";
    try {
      if (oldRegex.trim()) new RegExp(oldRegex, flags);
    } catch (err) {
      setError(`Old regex: ${err instanceof Error ? err.message : "invalid"}`);
      return;
    }
    try {
      if (newRegex.trim()) new RegExp(newRegex, flags);
    } catch (err) {
      setError(`New regex: ${err instanceof Error ? err.message : "invalid"}`);
      return;
    }
    try {
      if (diffRegex.trim()) new RegExp(diffRegex, flags + "g");
    } catch (err) {
      setError(`Diff regex: ${err instanceof Error ? err.message : "invalid"}`);
      return;
    }

    const resolvedName = name.trim() || oldRegex.trim() || newRegex.trim() || diffRegex.trim();

    onSave({
      name: resolvedName,
      oldRegex: oldRegex.trim(),
      newRegex: newRegex.trim(),
      diffRegex: diffRegex.trim(),
      flags,
      combinator,
      enabled: initial?.enabled ?? true,
    });
  };

  return (
    <form onSubmit={handleSubmit} className="px-3 pb-3 space-y-2 border-b border-gray-700/50">
      <div>
        <label className="block text-xs text-gray-400 mb-0.5">Name</label>
        <input
          type="text"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder={oldRegex.trim() || newRegex.trim() || diffRegex.trim() || "Filter name"}
          className="w-full bg-gray-800 border border-gray-700 rounded px-2 py-1 text-sm text-gray-200 placeholder-gray-500 focus:outline-none focus:border-blue-500"
        />
      </div>

      <div>
        <label className="block text-xs text-red-400/70 mb-0.5">Old code (deletions)</label>
        <input
          type="text"
          value={oldRegex}
          onChange={(e) => { setOldRegex(e.target.value); setError(null); }}
          placeholder="Regex for removed lines"
          className="w-full bg-gray-800 border border-gray-700 rounded px-2 py-1 text-sm text-gray-200 font-mono placeholder-gray-500 focus:outline-none focus:border-blue-500"
          autoFocus
        />
      </div>

      <div>
        <label className="block text-xs text-green-400/70 mb-0.5">New code (additions)</label>
        <input
          type="text"
          value={newRegex}
          onChange={(e) => { setNewRegex(e.target.value); setError(null); }}
          placeholder="Regex for added lines"
          className="w-full bg-gray-800 border border-gray-700 rounded px-2 py-1 text-sm text-gray-200 font-mono placeholder-gray-500 focus:outline-none focus:border-blue-500"
        />
      </div>

      <div>
        <label className="block text-xs text-blue-400/70 mb-0.5">Diff (strip from both sides)</label>
        <input
          type="text"
          value={diffRegex}
          onChange={(e) => { setDiffRegex(e.target.value); setError(null); }}
          placeholder="Regex to strip — hide if sides become equal"
          className="w-full bg-gray-800 border border-gray-700 rounded px-2 py-1 text-sm text-gray-200 font-mono placeholder-gray-500 focus:outline-none focus:border-blue-500"
        />
      </div>

      {error && <p className="text-xs text-red-400">{error}</p>}

      <div className="flex items-center gap-3 text-xs text-gray-400">
        <label className="flex items-center gap-1.5">
          <span>Match:</span>
          <select
            value={combinator}
            onChange={(e) => setCombinator(e.target.value as "and" | "or")}
            className="bg-gray-800 border border-gray-700 rounded px-1.5 py-0.5 text-gray-200"
          >
            <option value="and">AND (all must match)</option>
            <option value="or">OR (any can match)</option>
          </select>
        </label>

        <label className="flex items-center gap-1 cursor-pointer">
          <input
            type="checkbox"
            checked={caseInsensitive}
            onChange={(e) => setCaseInsensitive(e.target.checked)}
            className="accent-blue-500"
          />
          <span>Case insensitive</span>
        </label>
      </div>

      <div className="flex gap-2">
        <button
          type="submit"
          disabled={!hasAny}
          className="flex-1 px-2 py-1 bg-blue-600 text-white text-sm rounded hover:bg-blue-500 disabled:opacity-50"
        >
          {initial ? "Save" : "Add Filter"}
        </button>
        <button
          type="button"
          onClick={onCancel}
          className="px-3 py-1 text-sm text-gray-400 hover:text-gray-200"
        >
          Cancel
        </button>
      </div>
    </form>
  );
}
