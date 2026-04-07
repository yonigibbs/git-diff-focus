import { create } from "zustand";
import type { FilterPattern } from "../types/filter";

const STORAGE_KEY = "git-diff-focus:filters";

const DEFAULT_PRESETS: FilterPattern[] = [
  {
    id: "preset-imports-kotlin-java",
    name: "Imports (Kotlin/Java)",
    oldRegex: "^\\s*import\\s",
    newRegex: "^\\s*import\\s",
    diffRegex: "",
    flags: "",
    combinator: "or",
    enabled: false,
  },
  {
    id: "preset-imports-ts-js",
    name: "Imports (TypeScript/JavaScript)",
    oldRegex: "^\\s*(import\\s|require\\()",
    newRegex: "^\\s*(import\\s|require\\()",
    diffRegex: "",
    flags: "",
    combinator: "or",
    enabled: false,
  },
  {
    id: "preset-imports-python",
    name: "Imports (Python)",
    oldRegex: "^\\s*(import\\s|from\\s)",
    newRegex: "^\\s*(import\\s|from\\s)",
    diffRegex: "",
    flags: "",
    combinator: "or",
    enabled: false,
  },
  {
    id: "preset-imports-go",
    name: "Imports (Go)",
    oldRegex: "^\\s*\"",
    newRegex: "^\\s*\"",
    diffRegex: "",
    flags: "",
    combinator: "or",
    enabled: false,
  },
  {
    id: "preset-imports-rust",
    name: "Imports (Rust)",
    oldRegex: "^\\s*use\\s",
    newRegex: "^\\s*use\\s",
    diffRegex: "",
    flags: "",
    combinator: "or",
    enabled: false,
  },
  {
    id: "preset-imports-swift",
    name: "Imports (Swift)",
    oldRegex: "^\\s*import\\s",
    newRegex: "^\\s*import\\s",
    diffRegex: "",
    flags: "",
    combinator: "or",
    enabled: false,
  },
  {
    id: "preset-whitespace",
    name: "Whitespace-only lines",
    oldRegex: "^\\s*$",
    newRegex: "^\\s*$",
    diffRegex: "",
    flags: "",
    combinator: "or",
    enabled: false,
  },
];

function isValidFilter(f: unknown): f is FilterPattern {
  return (
    typeof f === "object" && f !== null &&
    "id" in f && "oldRegex" in f && "newRegex" in f && "diffRegex" in f && "combinator" in f
  );
}

function loadFilters(): FilterPattern[] {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) {
      const parsed = JSON.parse(stored);
      if (Array.isArray(parsed) && parsed.length > 0 && parsed.every(isValidFilter)) {
        // Replace any stored presets with current defaults (in case preset definitions changed)
        const customFilters = parsed.filter((f: FilterPattern) => !f.id.startsWith("preset-"));
        return [...DEFAULT_PRESETS, ...customFilters];
      }
      // Stale schema — discard and reset
      localStorage.removeItem(STORAGE_KEY);
    }
  } catch {
    // Ignore parse errors
  }
  return [...DEFAULT_PRESETS];
}

function saveFilters(filters: FilterPattern[]) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(filters));
  } catch {
    // Ignore storage errors
  }
}

interface FilterState {
  filters: FilterPattern[];
  addFilter: (filter: Omit<FilterPattern, "id">) => void;
  removeFilter: (id: string) => void;
  toggleFilter: (id: string) => void;
  updateFilter: (id: string, updates: Partial<FilterPattern>) => void;
  resetToPresets: () => void;
}

export const useFilterStore = create<FilterState>((set, get) => ({
  filters: loadFilters(),

  addFilter: (filter) => {
    const id = crypto.randomUUID();
    const newFilters = [...get().filters, { ...filter, id }];
    saveFilters(newFilters);
    set({ filters: newFilters });
  },

  removeFilter: (id) => {
    const newFilters = get().filters.filter((f) => f.id !== id);
    saveFilters(newFilters);
    set({ filters: newFilters });
  },

  toggleFilter: (id) => {
    const newFilters = get().filters.map((f) =>
      f.id === id ? { ...f, enabled: !f.enabled } : f
    );
    saveFilters(newFilters);
    set({ filters: newFilters });
  },

  updateFilter: (id, updates) => {
    const newFilters = get().filters.map((f) =>
      f.id === id ? { ...f, ...updates } : f
    );
    saveFilters(newFilters);
    set({ filters: newFilters });
  },

  resetToPresets: () => {
    saveFilters(DEFAULT_PRESETS);
    set({ filters: [...DEFAULT_PRESETS] });
  },
}));
