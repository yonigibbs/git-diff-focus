import { create } from "zustand";
import { PatAuthProvider, hasStoredToken } from "../providers/auth";
import type { StorageMode } from "../providers/auth";

interface AuthState {
  token: string | null;
  storageMode: StorageMode;
  authProvider: PatAuthProvider;
  setToken: (token: string) => void;
  clearToken: () => void;
  setStorageMode: (mode: StorageMode) => void;
}

const initialStorageMode: StorageMode = hasStoredToken() ? "localStorage" : "memory";
const authProvider = new PatAuthProvider(initialStorageMode);

export const useAuthStore = create<AuthState>((set) => ({
  token: authProvider.getToken(),
  storageMode: initialStorageMode,
  authProvider,

  setToken: (token: string) => {
    authProvider.setToken(token);
    set({ token });
  },

  clearToken: () => {
    authProvider.clearToken();
    set({ token: null });
  },

  setStorageMode: (mode: StorageMode) => {
    authProvider.setStorageMode(mode);
    set({ storageMode: mode });
  },
}));
