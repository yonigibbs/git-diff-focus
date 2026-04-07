import { create } from "zustand";
import type { DiffComment } from "../types/comment";
import type { DiffSource } from "../types/diff";
import { GitHubDiffProvider } from "../providers/github";
import { useAuthStore } from "./authStore";

interface CommentState {
  comments: DiffComment[];
  loading: boolean;
  error: string | null;
  postingLineId: string | null;

  loadComments: (source: DiffSource) => Promise<void>;
  postComment: (
    source: DiffSource,
    filePath: string,
    line: number,
    side: "LEFT" | "RIGHT",
    body: string,
    lineId: string,
  ) => Promise<void>;
  clearComments: () => void;
}

export const useCommentStore = create<CommentState>((set, get) => ({
  comments: [],
  loading: false,
  error: null,
  postingLineId: null,

  loadComments: async (source) => {
    set({ loading: true, error: null });
    try {
      const auth = useAuthStore.getState().authProvider;
      const provider = new GitHubDiffProvider(auth);
      const comments = await provider.fetchComments(source);
      set({ comments, loading: false });
    } catch (e) {
      set({ error: e instanceof Error ? e.message : String(e), loading: false });
    }
  },

  postComment: async (source, filePath, line, side, body, lineId) => {
    set({ postingLineId: lineId, error: null });
    try {
      const auth = useAuthStore.getState().authProvider;
      const provider = new GitHubDiffProvider(auth);
      const newComment = await provider.postComment(source, {
        file_path: filePath,
        line,
        side,
        body,
      });
      newComment.line_id = lineId;
      set({ comments: [...get().comments, newComment], postingLineId: null });
    } catch (e) {
      set({ error: e instanceof Error ? e.message : String(e), postingLineId: null });
    }
  },

  clearComments: () => set({ comments: [], error: null }),
}));
