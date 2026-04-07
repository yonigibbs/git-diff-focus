export interface PRInfo {
  number: number;
  title: string;
  state: "open" | "closed" | "merged";
  author: string;
  base_ref: string;
  head_ref: string;
  head_sha: string;
  created_at: string;
  updated_at: string;
}
