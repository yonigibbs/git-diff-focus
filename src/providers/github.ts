import type { DiffProvider, NewComment } from "./types";
import type { AuthProvider } from "./auth";
import type { DiffSet, DiffSource } from "../types/diff";
import type { DiffComment } from "../types/comment";
import type { PRInfo } from "../types/github";
import { parseUnifiedDiff } from "../lib/diffParser";

function assertGitHub(source: DiffSource): asserts source is DiffSource & { type: "github" } {
  if (source.type !== "github") {
    throw new Error(`GitHubDiffProvider only supports GitHub sources, got: ${source.type}`);
  }
}

export class GitHubDiffProvider implements DiffProvider {
  type = "github" as const;
  private auth: AuthProvider;
  private baseUrl = "https://api.github.com";

  constructor(auth: AuthProvider) {
    this.auth = auth;
  }

  private headers(accept?: string): Record<string, string> {
    const token = this.auth.getToken();
    if (!token) {
      throw new Error("Not authenticated. Please provide a GitHub token.");
    }
    return {
      Authorization: `Bearer ${token}`,
      Accept: accept ?? "application/vnd.github+json",
      "X-GitHub-Api-Version": "2022-11-28",
    };
  }

  private async fetch(url: string, options?: RequestInit): Promise<Response> {
    const response = await fetch(url, options);
    if (!response.ok) {
      const body = await response.text();
      throw new Error(`GitHub API error (${response.status}): ${body}`);
    }
    return response;
  }

  async fetchDiff(source: DiffSource): Promise<DiffSet> {
    assertGitHub(source);
    const { owner, repo, pr_number } = source;

    const response = await this.fetch(
      `${this.baseUrl}/repos/${owner}/${repo}/pulls/${pr_number}`,
      { headers: this.headers("application/vnd.github.diff") }
    );
    const diffText = await response.text();
    return parseUnifiedDiff(diffText, source);
  }

  async fetchPRInfo(source: DiffSource): Promise<PRInfo> {
    assertGitHub(source);
    const { owner, repo, pr_number } = source;

    const response = await this.fetch(
      `${this.baseUrl}/repos/${owner}/${repo}/pulls/${pr_number}`,
      { headers: this.headers() }
    );
    const data = await response.json();
    return {
      number: data.number,
      title: data.title,
      state: data.merged_at ? "merged" : data.state,
      author: data.user.login,
      base_ref: data.base.ref,
      head_ref: data.head.ref,
      head_sha: data.head.sha,
      created_at: data.created_at,
      updated_at: data.updated_at,
    };
  }

  async fetchComments(source: DiffSource): Promise<DiffComment[]> {
    assertGitHub(source);
    const { owner, repo, pr_number } = source;

    const response = await this.fetch(
      `${this.baseUrl}/repos/${owner}/${repo}/pulls/${pr_number}/comments`,
      { headers: this.headers() }
    );
    const data = await response.json();
    return data.map((c: Record<string, unknown>) => ({
      id: String(c.id),
      file_path: c.path as string,
      line_id: "",  // Will need to be resolved against the parsed diff
      side: c.side === "LEFT" ? "old" as const : "new" as const,
      body: c.body as string,
      created_at: c.created_at as string,
      author: (c.user as Record<string, unknown>).login as string,
      github_comment_id: c.id as number,
    }));
  }

  async postComment(source: DiffSource, comment: NewComment): Promise<DiffComment> {
    assertGitHub(source);
    const { owner, repo, pr_number } = source;

    // Need head SHA to post a comment
    const prInfo = await this.fetchPRInfo(source);

    const response = await this.fetch(
      `${this.baseUrl}/repos/${owner}/${repo}/pulls/${pr_number}/comments`,
      {
        method: "POST",
        headers: this.headers(),
        body: JSON.stringify({
          commit_id: prInfo.head_sha,
          path: comment.file_path,
          line: comment.line,
          side: comment.side,
          body: comment.body,
        }),
      }
    );
    const data = await response.json();
    return {
      id: String(data.id),
      file_path: data.path,
      line_id: "",
      side: data.side === "LEFT" ? "old" : "new",
      body: data.body,
      created_at: data.created_at,
      author: data.user.login,
      github_comment_id: data.id,
    };
  }
}
