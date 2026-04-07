export interface DiffSet {
  source: DiffSource;
  files: DiffFile[];
  stats: DiffStats;
}

export type DiffSource = {
  type: "github";
  owner: string;
  repo: string;
  pr_number: number;
};

export interface DiffStats {
  files_changed: number;
  total_additions: number;
  total_deletions: number;
}

export interface DiffFile {
  old_path: string | null;
  new_path: string | null;
  status: FileStatus;
  hunks: DiffHunk[];
  is_binary: boolean;
  stats: FileStats;
}

export type FileStatus =
  | { type: "added" }
  | { type: "deleted" }
  | { type: "modified" }
  | { type: "renamed"; similarity: number };

export interface FileStats {
  additions: number;
  deletions: number;
}

export interface DiffHunk {
  id: string;
  header: string;
  old_start: number;
  old_count: number;
  new_start: number;
  new_count: number;
  section_header: string | null;
  lines: DiffLine[];
}

export interface DiffLine {
  id: string;
  kind: DiffLineKind;
  content: string;
  old_line_number: number | null;
  new_line_number: number | null;
}

export type DiffLineKind = "context" | "addition" | "deletion";
