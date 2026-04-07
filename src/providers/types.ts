import type { DiffSet, DiffSource } from "../types/diff";
import type { DiffComment } from "../types/comment";
import type { PRInfo } from "../types/github";

export interface NewComment {
  file_path: string;
  line: number;
  side: "LEFT" | "RIGHT";
  body: string;
}

export interface DiffProvider {
  type: string;
  fetchDiff(source: DiffSource): Promise<DiffSet>;
  fetchComments(source: DiffSource): Promise<DiffComment[]>;
  postComment(source: DiffSource, comment: NewComment): Promise<DiffComment>;
  fetchPRInfo(source: DiffSource): Promise<PRInfo>;
}
