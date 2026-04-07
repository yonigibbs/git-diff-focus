import type { DiffFile, DiffHunk } from "./diff";

export interface FilterPattern {
  id: string;
  name: string;
  oldRegex: string;          // Regex for deletion lines ("" = not set)
  newRegex: string;          // Regex for addition lines ("" = not set)
  diffRegex: string;         // Regex for the diff itself: strip matches from both sides, hide if identical ("" = not set)
  flags: string;             // e.g. "i" for case-insensitive
  combinator: "and" | "or";  // How to combine populated checks
  enabled: boolean;
}

export interface FilteredDiffSet {
  files: FilteredDiffFile[];
  filter_stats: FilterStats;
}

export interface FilteredDiffFile {
  file: DiffFile;
  filtered_hunks: FilteredDiffHunk[];
  visible_change_count: number;
  visible_additions: number;
  visible_deletions: number;
  hidden_change_count: number;
}

export interface FilteredDiffHunk {
  hunk: DiffHunk;
  line_visibility: LineVisibility[];
  fully_hidden: boolean;
  hidden_change_count: number;
}

export interface LineVisibility {
  visible: boolean;
  hidden_by_filter_id: string | null;
}

export interface FilterStats {
  total_changes: number;
  visible_changes: number;
  hidden_changes: number;
  hidden_by_filter: Record<string, number>;
}
