import { create } from "zustand";
import type { DiffSet, DiffSource } from "../types/diff";
import type { PRInfo } from "../types/github";
import { GitHubDiffProvider } from "../providers/github";
import { useAuthStore } from "./authStore";

interface DiffState {
  diffSet: DiffSet | null;
  prInfo: PRInfo | null;
  loading: boolean;
  error: string | null;
  loadPRDiff: (owner: string, repo: string, prNumber: number) => Promise<void>;
  clear: () => void;
}

export const useDiffStore = create<DiffState>((set) => ({
  diffSet: null,
  prInfo: null,
  loading: false,
  error: null,

  loadPRDiff: async (owner: string, repo: string, prNumber: number) => {
    set({ loading: true, error: null });
    try {
      const auth = useAuthStore.getState().authProvider;
      const provider = new GitHubDiffProvider(auth);
      const source: DiffSource = { type: "github", owner, repo, pr_number: prNumber };

      const [diffSet, prInfo] = await Promise.all([
        provider.fetchDiff(source),
        provider.fetchPRInfo(source),
      ]);

      set({ diffSet, prInfo, loading: false });
    } catch (e) {
      set({ error: e instanceof Error ? e.message : String(e), loading: false });
    }
  },

  clear: () => {
    set({ diffSet: null, prInfo: null, error: null });
  },
}));
