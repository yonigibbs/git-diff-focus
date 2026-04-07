export interface AuthProvider {
  getToken(): string | null;
  setToken(token: string): void;
  clearToken(): void;
  isAuthenticated(): boolean;
}

export type StorageMode = "localStorage" | "memory";

export class PatAuthProvider implements AuthProvider {
  private memoryToken: string | null = null;
  private storageMode: StorageMode;
  private static STORAGE_KEY = "git-diff-focus:github-token";

  constructor(storageMode: StorageMode) {
    this.storageMode = storageMode;
  }

  getToken(): string | null {
    if (this.storageMode === "localStorage") {
      return localStorage.getItem(PatAuthProvider.STORAGE_KEY);
    }
    return this.memoryToken;
  }

  setToken(token: string): void {
    if (this.storageMode === "localStorage") {
      localStorage.setItem(PatAuthProvider.STORAGE_KEY, token);
    }
    this.memoryToken = token;
  }

  clearToken(): void {
    localStorage.removeItem(PatAuthProvider.STORAGE_KEY);
    this.memoryToken = null;
  }

  isAuthenticated(): boolean {
    return this.getToken() !== null;
  }

  getStorageMode(): StorageMode {
    return this.storageMode;
  }

  setStorageMode(mode: StorageMode): void {
    const currentToken = this.getToken();
    // Clear from old storage
    if (this.storageMode === "localStorage") {
      localStorage.removeItem(PatAuthProvider.STORAGE_KEY);
    }
    this.storageMode = mode;
    // Move token to new storage
    if (currentToken) {
      this.setToken(currentToken);
    }
  }
}

/**
 * Detect if a token was previously stored in localStorage
 * (to pre-select the storage mode on app load).
 */
export function hasStoredToken(): boolean {
  return localStorage.getItem("git-diff-focus:github-token") !== null;
}
