import { create } from "zustand";

export type ViewMode = "unified" | "side-by-side";

interface NavigationState {
  viewMode: ViewMode;
  setViewMode: (mode: ViewMode) => void;
}

export const useNavigationStore = create<NavigationState>((set) => ({
  viewMode: "unified",
  setViewMode: (mode) => set({ viewMode: mode }),
}));
