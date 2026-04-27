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
  stats: { gamesPlayed: number; gamesWon: number; totalScore: number };
  bestScores: { "2048": number; caro: number };
}

interface AuthContextValue {
  user: AuthUser | null;
  isLoading: boolean;
  login: (username: string) => Promise<{ error?: string }>;
  logout: () => void;
  changeUsername: (newUsername: string) => Promise<{ error?: string }>;
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

  const login = useCallback(async (username: string): Promise<{ error?: string }> => {
    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username }),
      });
      const data = await res.json();
      if (!res.ok) return { error: data.error || "Login failed" };

      setUser(data.user);
      localStorage.setItem(STORAGE_KEY, JSON.stringify(data.user));
      return {};
    } catch {
      return { error: "Network error. Please try again." };
    }
  }, []);

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

      setUser(data.user);
      localStorage.setItem(STORAGE_KEY, JSON.stringify(data.user));
      return {};
    } catch {
      return { error: "Network error. Please try again." };
    }
  }, [user]);

  const logout = useCallback(() => {
    setUser(null);
    localStorage.removeItem(STORAGE_KEY);
  }, []);

  return (
    <AuthContext.Provider value={{ user, isLoading, login, logout, changeUsername }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used inside AuthProvider");
  return ctx;
}
