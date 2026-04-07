export interface DiffComment {
  id: string;
  file_path: string;
  line_id: string;
  side: "old" | "new";
  body: string;
  created_at: string;
  author: string;
  github_comment_id?: number;
}
