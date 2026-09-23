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
  highest2048Tile: number;
  caroWins: number;
  caroTotal: number;
  msBestBeginner?: number;
  msBestIntermediate?: number;
  msBestExpert?: number;
  wordleWins?: number;
  wordleTotal?: number;
  wordleGuesses1?: number;
  wordleGuesses2?: number;
  wordleGuesses3?: number;
  wordleGuesses4?: number;
  wordleGuesses5?: number;
  wordleGuesses6?: number;
  bestScoreTrex: number;
  bestScoreFlappy?: number;
  wordchainWins: number;
  wordchainTotal: number;
  sudokuBestEasy?: number;
  sudokuBestMedium?: number;
  sudokuBestHard?: number;
  chessWins?: number;
  chessTotal?: number;
  aimTrainerBestScore?: number;
  aimTrainerBestAccuracy?: number;
  battleshipWins?: number;
  battleshipTotal?: number;
  monopolyWins?: number;
  monopolyTotal?: number;
  pikachuBestScore?: number;
  pikachuHighestLevel?: number;
  bestScoreLine98?: number;
  bestScoreNeonSnake?: number;
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
    let initialUser: AuthUser | null = null;
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) {
        initialUser = JSON.parse(stored);
        setUser(initialUser);
      }
    } catch { /* ignore */ }
    finally { setIsLoading(false); }

    const syncWithServer = (targetUser?: AuthUser | null) => {
      const u = targetUser || (function() {
        try {
          const s = localStorage.getItem(STORAGE_KEY);
          return s ? JSON.parse(s) : null;
        } catch { return null; }
      })();
      if (!u || (!u.id && !u.username)) return;

      const param = u.id ? `id=${encodeURIComponent(u.id)}` : `username=${encodeURIComponent(u.username)}`;
      fetch(`/api/auth/login?${param}`)
        .then((r) => (r.ok ? r.json() : null))
        .then((data) => {
          if (data && data.user) {
            setUser((current) => {
              if (!current || current.id === data.user.id || current.username === data.user.username) {
                try {
                  localStorage.setItem(STORAGE_KEY, JSON.stringify(data.user));
                } catch {}
                return data.user;
              }
              return current;
            });
          }
        })
        .catch(() => {});
    };

    if (initialUser) {
      syncWithServer(initialUser);
    }

    const handleFocus = () => {
      syncWithServer();
    };

    const handleStorage = (e: StorageEvent) => {
      if (e.key === STORAGE_KEY) {
        if (e.newValue) {
          try {
            setUser(JSON.parse(e.newValue));
          } catch {}
        } else {
          setUser(null);
        }
      }
    };

    const handleProfileUpdated = () => {
      try {
        const stored = localStorage.getItem(STORAGE_KEY);
        if (stored) setUser(JSON.parse(stored));
      } catch {}
      syncWithServer();
    };

    window.addEventListener("focus", handleFocus);
    window.addEventListener("storage", handleStorage);
    window.addEventListener("userProfileUpdated", handleProfileUpdated);
    return () => {
      window.removeEventListener("focus", handleFocus);
      window.removeEventListener("storage", handleStorage);
      window.removeEventListener("userProfileUpdated", handleProfileUpdated);
    };
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
      if (typeof window !== "undefined") {
        window.dispatchEvent(new CustomEvent("userProfileUpdated"));
      }
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
      if (typeof window !== "undefined") {
        window.dispatchEvent(new CustomEvent("userProfileUpdated"));
      }
      return {};
    } catch {
      return { error: "Network error. Please try again." };
    }
  }, [user, persistUser]);

  const refreshUser = useCallback((updates: Partial<AuthUser>) => {
    setUser((prev) => {
      if (!prev) return prev;
      const next = { ...prev, ...updates };
      try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
      } catch {}
      return next;
    });
    if (typeof window !== "undefined") {
      window.dispatchEvent(new CustomEvent("userProfileUpdated"));
    }
  }, []);

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
