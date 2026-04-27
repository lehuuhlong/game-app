"use client";

import {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
  type ReactNode,
} from "react";

export interface AuthUser {
  id: string;
  username: string;
  avatarUrl: string | null;
  bestScore2048: number;
  caroWins: number;
  caroTotal: number;
}

interface AuthContextValue {
  user: AuthUser | null;
  isLoading: boolean;
  login: (username: string) => Promise<{ error?: string }>;
  logout: () => void;
  changeUsername: (newUsername: string) => Promise<{ error?: string }>;
  updateAvatar: (avatarUrl: string) => Promise<{ error?: string }>;
  refreshUser: (updates: Partial<AuthUser>) => void;
}

const AuthContext = createContext<AuthContextValue | null>(null);
const STORAGE_KEY = "game-portal-user";

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) setUser(JSON.parse(stored));
    } catch { /* ignore */ }
    finally { setIsLoading(false); }
  }, []);

  const persistUser = useCallback((u: AuthUser) => {
    setUser(u);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(u));
  }, []);

  const login = useCallback(async (username: string): Promise<{ error?: string }> => {
    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username }),
      });
      const data = await res.json();
      if (!res.ok) return { error: data.error || "Login failed" };
      persistUser(data.user);
      return {};
    } catch {
      return { error: "Network error. Please try again." };
    }
  }, [persistUser]);

  const changeUsername = useCallback(async (newUsername: string): Promise<{ error?: string }> => {
    if (!user) return { error: "Not logged in" };
    try {
      const res = await fetch("/api/auth/login", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: user.id, newUsername }),
      });
      const data = await res.json();
      if (!res.ok) return { error: data.error || "Failed to change username" };
      persistUser(data.user);
      return {};
    } catch {
      return { error: "Network error. Please try again." };
    }
  }, [user, persistUser]);

  const updateAvatar = useCallback(async (avatarUrl: string): Promise<{ error?: string }> => {
    if (!user) return { error: "Not logged in" };
    try {
      const res = await fetch(`/api/users/${user.id}/avatar`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ avatarUrl }),
      });
      const data = await res.json();
      if (!res.ok) return { error: data.error || "Failed to update avatar" };
      persistUser({ ...user, avatarUrl: data.avatarUrl });
      return {};
    } catch {
      return { error: "Network error. Please try again." };
    }
  }, [user, persistUser]);

  const refreshUser = useCallback((updates: Partial<AuthUser>) => {
    if (!user) return;
    persistUser({ ...user, ...updates });
  }, [user, persistUser]);

  const logout = useCallback(() => {
    setUser(null);
    localStorage.removeItem(STORAGE_KEY);
  }, []);

  return (
    <AuthContext.Provider value={{ user, isLoading, login, logout, changeUsername, updateAvatar, refreshUser }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used inside AuthProvider");
  return ctx;
}
