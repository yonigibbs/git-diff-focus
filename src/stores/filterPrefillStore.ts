import { create } from "zustand";

export interface FilterPrefill {
  name: string;
  oldRegex: string;
  newRegex: string;
  diffRegex: string;
}

interface FilterPrefillState {
  prefill: FilterPrefill | null;
  setPrefill: (prefill: FilterPrefill) => void;
  clearPrefill: () => void;
}

export const useFilterPrefillStore = create<FilterPrefillState>((set) => ({
  prefill: null,
  setPrefill: (prefill) => set({ prefill }),
  clearPrefill: () => set({ prefill: null }),
}));
