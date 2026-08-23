"use client";

import { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useAuth } from "@/components/auth";

interface Rival {
  username: string;
  avatarUrl: string | null;
  totalMatches: number;
  wins: number;
  losses: number;
  draws: number;
  winRate: number;
  lastPlayed: string;
  games: string[];
}

interface H2HMatchData {
  player1: {
    username: string;
    avatarUrl: string | null;
    wins: number;
    winRate: number;
  };
  player2: {
    username: string;
    avatarUrl: string | null;
    wins: number;
    winRate: number;
  };
  totalMatches: number;
  draws: number;
  byGame: Record<
    string,
    {
      total: number;
      p1Wins: number;
      p2Wins: number;
      draws: number;
      p1WinRate: number;
    }
  >;
  recentMatches: Array<{
    id: string;
    gameType: string;
    outcome: "p1" | "p2" | "draw";
    p1Result: string;
    p2Result: string;
    duration: number;
    gameData: Record<string, any>;
    createdAt: string;
  }>;
}

interface HeadToHeadExplorerProps {
  initialPlayer1?: string;
  initialPlayer2?: string;
  onOpenPlayerProfile?: (username: string) => void;
}

const GAME_ICONS: Record<string, React.ReactNode> = {
  caro: (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round">
      <line x1="4" y1="4" x2="10" y2="10" />
      <line x1="10" y1="4" x2="4" y2="10" />
      <circle cx="17" cy="17" r="4" />
    </svg>
  ),
  chess: (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M12 2a3 3 0 0 0-3 3c0 1.3.8 2.4 2 2.8V10l-3 3v2h8v-2l-3-3V7.8c1.2-.4 2-1.5 2-2.8a3 3 0 0 0-3-3z" />
      <path d="M6 21h12a2 2 0 0 0 2-2H4a2 2 0 0 0 2 2z" />
    </svg>
  ),
  battleship: (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="5" r="2.5" />
      <line x1="12" y1="22" x2="12" y2="7.5" />
      <path d="M5 12H2a10 10 0 0 0 20 0h-3" />
    </svg>
  ),
  wordchain: (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71" />
      <path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71" />
    </svg>
  ),
  monopoly: (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
      <rect x="3" y="3" width="18" height="18" rx="3" />
      <circle cx="8.5" cy="8.5" r="1.2" fill="currentColor" />
      <circle cx="15.5" cy="15.5" r="1.2" fill="currentColor" />
      <circle cx="12" cy="12" r="1.2" fill="currentColor" />
    </svg>
  ),
};

export function HeadToHeadExplorer({
  initialPlayer1,
  initialPlayer2,
  onOpenPlayerProfile,
}: HeadToHeadExplorerProps) {
  const { user } = useAuth();
  const [p1Input, setP1Input] = useState(initialPlayer1 || user?.username || "");
  const [p2Input, setP2Input] = useState(initialPlayer2 || "");
  const [selectedGame, setSelectedGame] = useState<string>("all");

  const [h2hData, setH2HData] = useState<H2HMatchData | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Top rivals list for logged-in user
  const [myRivals, setMyRivals] = useState<Rival[]>([]);
  const [loadingRivals, setLoadingRivals] = useState(false);

  // Sync if initial props change
  useEffect(() => {
    if (initialPlayer1) setP1Input(initialPlayer1);
    if (initialPlayer2) setP2Input(initialPlayer2);
  }, [initialPlayer1, initialPlayer2]);

  // Fetch top rivals for current user
  useEffect(() => {
    const targetUser = user?.username;
    if (!targetUser) return;

    let active = true;
    setLoadingRivals(true);

    async function fetchRivals() {
      try {
        const res = await fetch(`/api/matches/rivals?username=${encodeURIComponent(targetUser!)}`);
        if (!res.ok) throw new Error("Failed to fetch rivals");
        const json = await res.json();
        if (active) {
          setMyRivals(json.rivals || []);
          // If no p2Input is selected yet and user has rivals, auto select top rival
          if (!p2Input && json.rivals?.length > 0) {
            setP2Input(json.rivals[0].username);
          }
        }
      } catch (err) {
        console.error("Error loading rivals:", err);
      } finally {
        if (active) setLoadingRivals(false);
      }
    }

    fetchRivals();
    return () => {
      active = false;
    };
  }, [user?.username]);

  // Fetch H2H stats when p1Input, p2Input, or selectedGame changes
  useEffect(() => {
    const p1 = p1Input.trim();
    const p2 = p2Input.trim();

    if (!p1 || !p2 || p1.toLowerCase() === p2.toLowerCase()) {
      setH2HData(null);
      setError(null);
      return;
    }

    let active = true;
    setLoading(true);
    setError(null);

    async function fetchH2H() {
      try {
        let url = `/api/matches/h2h?player1=${encodeURIComponent(p1)}&player2=${encodeURIComponent(p2)}`;
        if (selectedGame !== "all") {
          url += `&gameType=${encodeURIComponent(selectedGame)}`;
        }
        const res = await fetch(url);
        const json = await res.json();
        if (!res.ok) throw new Error(json.error || "Failed to fetch H2H data");
        if (active) setH2HData(json);
      } catch (err: any) {
        if (active) setError(err.message);
      } finally {
        if (active) setLoading(false);
      }
    }

    const timer = setTimeout(fetchH2H, 300);
    return () => {
      active = false;
      clearTimeout(timer);
    };
  }, [p1Input, p2Input, selectedGame]);

  const handleSwapPlayers = () => {
    setP1Input(p2Input);
    setP2Input(p1Input);
  };

  return (
    <div className="space-y-6">
      {/* ── Selection Control Card ────────────────────────────── */}
      <div className="rounded-3xl border border-border bg-surface shadow-sm p-6 sm:p-8 space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <h2 className="text-xl sm:text-2xl font-extrabold text-foreground tracking-tight">
              Head-to-Head <span className="text-gradient">Rivalry Explorer</span>
            </h2>
            <p className="text-xs sm:text-sm text-foreground-secondary mt-0.5">
              Compare direct battle histories, win rates, and rival breakdown between any two players.
            </p>
          </div>

          {/* Game filter dropdown */}
          <div className="flex items-center gap-2 shrink-0">
            <span className="text-xs font-bold text-foreground-muted uppercase">Game:</span>
            <select
              value={selectedGame}
              onChange={(e) => setSelectedGame(e.target.value)}
              className="rounded-xl border border-border/70 bg-surface-hover/60 hover:bg-surface-hover hover:border-accent/40 px-3 py-1.5 text-xs font-semibold text-foreground focus:border-accent focus:outline-none focus:ring-1 focus:ring-accent/20 transition-all cursor-pointer"
            >
              <option value="all">All 1v1 Games</option>
              <option value="caro">Caro (5-in-a-row)</option>
              <option value="chess">Chess</option>
              <option value="battleship">Battleship</option>
              <option value="wordchain">Word Chain</option>
              <option value="monopoly">Monopoly</option>
            </select>
          </div>
        </div>

        {/* Player Search Inputs with Debounced Autocomplete */}
        <div className="flex flex-col md:flex-row items-center gap-3">
          {/* Player 1 */}
          <UserSearchInput
            label="Player 1"
            value={p1Input}
            onChange={(val) => setP1Input(val)}
            onSelect={(val) => setP1Input(val)}
            placeholder="Type player 1 username..."
            excludeUsername={p2Input}
          />

          {/* Swap Button */}
          <button
            type="button"
            onClick={handleSwapPlayers}
            className="self-center md:self-end mb-1 p-3 rounded-2xl border border-border bg-background hover:bg-surface-hover text-foreground-secondary hover:text-accent hover:border-accent transition-all shadow-sm active:scale-95 shrink-0"
            title="Swap players"
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="17 1 21 5 17 9" />
              <path d="M3 11V9a4 4 0 0 1 4-4h14" />
              <polyline points="7 23 3 19 7 15" />
              <path d="M21 13v2a4 4 0 0 1-4 4H3" />
            </svg>
          </button>

          {/* Player 2 */}
          <UserSearchInput
            label="Player 2 (Opponent)"
            value={p2Input}
            onChange={(val) => setP2Input(val)}
            onSelect={(val) => setP2Input(val)}
            placeholder="Type player 2 username..."
            excludeUsername={p1Input}
          />
        </div>

        {/* Quick select your top rivals */}
        {myRivals.length > 0 && (
          <div className="space-y-2 pt-2 border-t border-border/60">
            <span className="text-xs font-bold uppercase tracking-wider text-foreground-muted">
              Quick Pick: Your Top Rivals ({myRivals.length})
            </span>
            <div className="flex flex-wrap items-center gap-2">
              {myRivals.map((r) => {
                const isSelected = p2Input.toLowerCase() === r.username.toLowerCase();
                return (
                  <button
                    key={r.username}
                    type="button"
                    onClick={() => {
                      if (user?.username) setP1Input(user.username);
                      setP2Input(r.username);
                    }}
                    className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-xl text-xs font-semibold transition-all ${
                      isSelected
                        ? "bg-accent text-white shadow-md shadow-accent/25 scale-105"
                        : "bg-background border border-border text-foreground-secondary hover:text-foreground hover:border-accent/50"
                    }`}
                  >
                    <Avatar avatarUrl={r.avatarUrl} username={r.username} />
                    <span>{r.username}</span>
                    <span className="opacity-70 font-mono text-xs">
                      ({r.wins}W-{r.losses}L)
                    </span>
                  </button>
                );
              })}
            </div>
          </div>
        )}
      </div>

      {/* ── Results Area ──────────────────────────────────────── */}
      {loading ? (
        <div className="py-24 flex flex-col items-center justify-center gap-3">
          <div className="h-8 w-8 rounded-full border-2 border-accent border-t-transparent animate-spin" />
          <p className="text-xs text-foreground-muted">Calculating head-to-head records...</p>
        </div>
      ) : error ? (
        <div className="p-10 text-center rounded-3xl border border-border bg-surface text-red-400 space-y-2">
          <p className="font-semibold text-sm">{error}</p>
        </div>
      ) : !p1Input || !p2Input ? (
        <div className="p-16 text-center rounded-3xl border border-dashed border-border bg-surface/50 text-foreground-muted space-y-3">
          <div className="text-4xl">⚔️</div>
          <h3 className="text-base font-bold text-foreground">Select Two Players to Compare</h3>
          <p className="text-xs max-w-sm mx-auto">
            Type two usernames above or click on one of your rivals to see their complete match history.
          </p>
        </div>
      ) : !h2hData || h2hData.totalMatches === 0 ? (
        <div className="p-16 text-center rounded-3xl border border-border bg-surface text-foreground-muted space-y-3 shadow-sm">
          <div className="text-4xl">🆕</div>
          <h3 className="text-lg font-bold text-foreground">No Recorded Battles Yet</h3>
          <p className="text-xs text-foreground-secondary max-w-md mx-auto">
            <strong className="text-foreground">{p1Input}</strong> and{" "}
            <strong className="text-foreground">{p2Input}</strong> have not played against each other yet in{" "}
            {selectedGame === "all" ? "any 1v1 game" : selectedGame}.
          </p>
        </div>
      ) : (
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          className="space-y-6"
        >
          {/* Main Rivalry Scoreboard Card */}
          <div className="rounded-3xl border border-border bg-surface shadow-sm p-6 sm:p-8 space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-3 items-center gap-6 text-center">
              {/* Player 1 Card */}
              <div className="p-5 rounded-2xl bg-background border border-border/80 space-y-2">
                <div className="flex items-center justify-center gap-3">
                  <Avatar avatarUrl={h2hData.player1.avatarUrl} username={h2hData.player1.username} size="lg" />
                  <div className="text-left">
                    <button
                      type="button"
                      onClick={() => onOpenPlayerProfile?.(h2hData.player1.username)}
                      className="font-extrabold text-lg text-foreground hover:text-accent transition-colors truncate block max-w-[150px]"
                    >
                      {h2hData.player1.username}
                    </button>
                    <p className="text-xs text-foreground-muted">Player 1</p>
                  </div>
                </div>

                <div className="pt-2">
                  <span className="text-4xl font-black text-sky-400 tabular-nums">
                    {h2hData.player1.wins}
                  </span>
                  <span className="text-xs font-bold text-foreground-muted ml-1 uppercase">Wins</span>
                  <p className="text-xs font-bold text-emerald-400 mt-1">
                    {h2hData.player1.winRate}% Win Rate
                  </p>
                </div>
              </div>

              {/* Match Totals in Center */}
              <div className="space-y-2">
                <span className="text-xs font-black uppercase tracking-widest text-foreground-muted">
                  Total Encounters
                </span>
                <p className="text-5xl font-black text-foreground tracking-tight">
                  {h2hData.totalMatches}
                </p>
                <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-background border border-border text-xs font-semibold text-foreground-secondary">
                  <span>{h2hData.draws} Draws</span>
                </div>
              </div>

              {/* Player 2 Card */}
              <div className="p-5 rounded-2xl bg-background border border-border/80 space-y-2">
                <div className="flex items-center justify-center gap-3">
                  <Avatar avatarUrl={h2hData.player2.avatarUrl} username={h2hData.player2.username} size="lg" />
                  <div className="text-left">
                    <button
                      type="button"
                      onClick={() => onOpenPlayerProfile?.(h2hData.player2.username)}
                      className="font-extrabold text-lg text-foreground hover:text-accent transition-colors truncate block max-w-[150px]"
                    >
                      {h2hData.player2.username}
                    </button>
                    <p className="text-xs text-foreground-muted">Player 2</p>
                  </div>
                </div>

                <div className="pt-2">
                  <span className="text-4xl font-black text-rose-400 tabular-nums">
                    {h2hData.player2.wins}
                  </span>
                  <span className="text-xs font-bold text-foreground-muted ml-1 uppercase">Wins</span>
                  <p className="text-xs font-bold text-rose-400 mt-1">
                    {h2hData.player2.winRate}% Win Rate
                  </p>
                </div>
              </div>
            </div>

            {/* Visual Win Rate Progress Bar */}
            <div className="space-y-2">
              <div className="h-4 w-full rounded-full bg-border overflow-hidden flex shadow-inner">
                <div
                  className="h-full bg-sky-500 transition-all duration-700 flex items-center justify-center text-xs font-bold text-white"
                  style={{ width: `${(h2hData.player1.wins / h2hData.totalMatches) * 100}%` }}
                >
                  {h2hData.player1.wins > 0 && `${Math.round((h2hData.player1.wins / h2hData.totalMatches) * 100)}%`}
                </div>
                {h2hData.draws > 0 && (
                  <div
                    className="h-full bg-amber-500 transition-all duration-700 flex items-center justify-center text-xs font-bold text-white"
                    style={{ width: `${(h2hData.draws / h2hData.totalMatches) * 100}%` }}
                  >
                    {`${Math.round((h2hData.draws / h2hData.totalMatches) * 100)}%`}
                  </div>
                )}
                <div
                  className="h-full bg-rose-500 transition-all duration-700 flex items-center justify-center text-xs font-bold text-white"
                  style={{ width: `${(h2hData.player2.wins / h2hData.totalMatches) * 100}%` }}
                >
                  {h2hData.player2.wins > 0 && `${Math.round((h2hData.player2.wins / h2hData.totalMatches) * 100)}%`}
                </div>
              </div>

              <div className="flex justify-between text-xs font-semibold text-foreground-muted px-1">
                <span>{h2hData.player1.username} Wins</span>
                {h2hData.draws > 0 && <span>Draws</span>}
                <span>{h2hData.player2.username} Wins</span>
              </div>
            </div>
          </div>

          {/* Per Game Breakdown Cards */}
          {h2hData.byGame && Object.keys(h2hData.byGame).length > 0 && (
            <div className="space-y-3">
              <h3 className="text-sm font-bold text-foreground uppercase tracking-wider">
                Rivalry Breakdown by Game
              </h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                {Object.entries(h2hData.byGame).map(([gt, stats]) => (
                  <div
                    key={gt}
                    className="p-4 rounded-2xl bg-surface border border-border shadow-sm space-y-3"
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span className="text-xl">{GAME_ICONS[gt] || "🎮"}</span>
                        <h4 className="font-bold text-foreground capitalize text-sm">{gt}</h4>
                      </div>
                      <span className="text-xs text-foreground-muted font-semibold">
                        {stats.total} {stats.total === 1 ? "match" : "matches"}
                      </span>
                    </div>

                    <div className="flex items-center justify-between text-xs font-mono">
                      <span className="text-sky-400 font-bold">{stats.p1Wins}W</span>
                      <span className="text-foreground-muted">-</span>
                      <span className="text-rose-400 font-bold">{stats.p2Wins}W</span>
                      {stats.draws > 0 && (
                        <>
                          <span className="text-foreground-muted">-</span>
                          <span className="text-amber-400">{stats.draws}D</span>
                        </>
                      )}
                    </div>

                    <div className="h-2 w-full rounded-full bg-border overflow-hidden flex">
                      <div
                        className="h-full bg-sky-500"
                        style={{ width: `${(stats.p1Wins / stats.total) * 100}%` }}
                      />
                      {stats.draws > 0 && (
                        <div
                          className="h-full bg-amber-500"
                          style={{ width: `${(stats.draws / stats.total) * 100}%` }}
                        />
                      )}
                      <div
                        className="h-full bg-rose-500"
                        style={{ width: `${(stats.p2Wins / stats.total) * 100}%` }}
                      />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Recent Match Timeline */}
          {h2hData.recentMatches && h2hData.recentMatches.length > 0 && (
            <div className="space-y-3">
              <h3 className="text-sm font-bold text-foreground uppercase tracking-wider">
                Direct Encounter History ({h2hData.recentMatches.length})
              </h3>
              <div className="space-y-2">
                {h2hData.recentMatches.map((m) => {
                  const isP1Win = m.outcome === "p1";
                  const isP2Win = m.outcome === "p2";

                  return (
                    <div
                      key={m.id}
                      className="p-3.5 rounded-2xl bg-surface border border-border flex items-center justify-between gap-4 text-xs hover:border-accent/40 transition-colors"
                    >
                      <div className="flex items-center gap-3">
                        <span className="text-xl">{GAME_ICONS[m.gameType] || "🎮"}</span>
                        <div>
                          <span className="font-bold text-foreground capitalize text-sm">{m.gameType}</span>
                          <p className="text-xs text-foreground-muted">
                            {new Date(m.createdAt).toLocaleDateString()} • {new Date(m.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                          </p>
                        </div>
                      </div>

                      <div className="flex items-center gap-2">
                        <span
                          className={`px-2.5 py-1 rounded-xl font-bold uppercase text-xs ${
                            isP1Win
                              ? "bg-sky-500/10 text-sky-400 border border-sky-500/20"
                              : isP2Win
                              ? "bg-rose-500/10 text-rose-400 border border-rose-500/20"
                              : "bg-amber-500/10 text-amber-400 border border-amber-500/20"
                          }`}
                        >
                          {isP1Win
                            ? `${h2hData.player1.username} Won`
                            : isP2Win
                            ? `${h2hData.player2.username} Won`
                            : "Draw"}
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </motion.div>
      )}
    </div>
  );
}

function Avatar({
  avatarUrl,
  username,
  size = "md",
}: {
  avatarUrl?: string | null;
  username: string;
  size?: "sm" | "md" | "lg";
}) {
  const sizeClasses =
    size === "lg" ? "h-12 w-12 text-base" : size === "sm" ? "h-5 w-5 text-xs" : "h-7 w-7 text-xs";

  if (avatarUrl) {
    return (
      <img
        src={avatarUrl}
        alt={username}
        className={`${sizeClasses} rounded-full object-cover ring-2 ring-accent/20`}
      />
    );
  }
  return (
    <div
      className={`flex ${sizeClasses} items-center justify-center rounded-full bg-gradient-to-br from-sky-400 to-blue-600 font-black text-white shrink-0`}
    >
      {username[0]?.toUpperCase()}
    </div>
  );
}

interface UserSearchInputProps {
  label: string;
  value: string;
  onChange: (val: string) => void;
  onSelect: (val: string) => void;
  placeholder: string;
  excludeUsername?: string;
}

function UserSearchInput({
  label,
  value,
  onChange,
  onSelect,
  placeholder,
  excludeUsername,
}: UserSearchInputProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [suggestions, setSuggestions] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [selectedIndex, setSelectedIndex] = useState(-1);
  const [isFocused, setIsFocused] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const justSelectedRef = useRef(false);

  // Debounced search — ONLY runs when user is actively focused and typing
  useEffect(() => {
    if (justSelectedRef.current) {
      justSelectedRef.current = false;
      setLoading(false);
      return;
    }

    if (!isFocused) {
      setLoading(false);
      return;
    }

    const q = value.trim();
    if (q.length === 0) {
      setSuggestions([]);
      setLoading(false);
      return;
    }

    let active = true;
    setLoading(true);

    const timer = setTimeout(async () => {
      try {
        const res = await fetch(`/api/users?q=${encodeURIComponent(q)}&limit=8`);
        if (!res.ok) throw new Error("Search failed");
        const data = await res.json();
        if (active) {
          setSuggestions(data.users || []);
          setSelectedIndex(-1);
        }
      } catch {
        if (active) setSuggestions([]);
      } finally {
        if (active) setLoading(false);
      }
    }, 200);

    return () => {
      active = false;
      clearTimeout(timer);
    };
  }, [value, isFocused]);

  // Filter out the other player from suggestions in memory (does NOT trigger refetch)
  const visibleSuggestions = suggestions.filter(
    (u: any) =>
      !excludeUsername || u.username.toLowerCase() !== excludeUsername.toLowerCase()
  );

  // Click outside to close
  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false);
        setIsFocused(false);
        setLoading(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handleSelect = (username: string) => {
    justSelectedRef.current = true;
    setIsOpen(false);
    setIsFocused(false);
    setLoading(false);
    setSuggestions([]);
    onSelect(username);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (!isOpen || visibleSuggestions.length === 0) return;
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setSelectedIndex((prev) => (prev + 1) % visibleSuggestions.length);
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setSelectedIndex((prev) => (prev - 1 + visibleSuggestions.length) % visibleSuggestions.length);
    } else if (e.key === "Enter") {
      if (selectedIndex >= 0 && visibleSuggestions[selectedIndex]) {
        e.preventDefault();
        handleSelect(visibleSuggestions[selectedIndex].username);
      }
    } else if (e.key === "Escape") {
      setIsOpen(false);
    }
  };

  return (
    <div ref={containerRef} className="flex-1 w-full relative">
      <label className="block text-xs font-bold text-foreground-muted uppercase tracking-wider mb-1.5">
        {label}
      </label>
      <div className="relative">
        <input
          type="text"
          value={value}
          onChange={(e) => {
            justSelectedRef.current = false;
            setIsFocused(true);
            onChange(e.target.value);
            setIsOpen(true);
          }}
          onFocus={() => {
            setIsFocused(true);
            if (value.trim().length > 0) setIsOpen(true);
          }}
          onKeyDown={handleKeyDown}
          placeholder={placeholder}
          className="w-full pl-4 pr-10 py-3 rounded-2xl border border-border bg-background text-sm font-semibold text-foreground placeholder:text-foreground-muted focus:border-accent focus:outline-none focus:ring-2 focus:ring-accent/20 transition-all shadow-sm"
        />

        {/* Right loading or clear icon */}
        <div className="absolute inset-y-0 right-0 pr-3 flex items-center gap-1.5 pointer-events-auto">
          {loading && isFocused ? (
            <div className="h-4 w-4 rounded-full border-2 border-accent border-t-transparent animate-spin" />
          ) : value ? (
            <button
              type="button"
              onClick={() => {
                justSelectedRef.current = true;
                onChange("");
                setSuggestions([]);
                setIsOpen(false);
                setIsFocused(false);
                setLoading(false);
              }}
              className="text-foreground-muted hover:text-foreground p-0.5 text-xs rounded-md"
              title="Clear input"
            >
              ✕
            </button>
          ) : null}
        </div>
      </div>

      {/* Autocomplete Dropdown */}
      <AnimatePresence>
        {isOpen && isFocused && value.trim().length > 0 && (
          <motion.div
            initial={{ opacity: 0, y: -6 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -6 }}
            transition={{ duration: 0.15 }}
            className="absolute left-0 right-0 top-full mt-2 z-50 rounded-2xl border border-border bg-surface shadow-2xl overflow-hidden backdrop-blur-md"
          >
            {loading && visibleSuggestions.length === 0 ? (
              <div className="p-4 text-center text-xs text-foreground-muted flex items-center justify-center gap-2">
                <div className="h-3.5 w-3.5 rounded-full border-2 border-accent border-t-transparent animate-spin" />
                <span>Searching players...</span>
              </div>
            ) : visibleSuggestions.length === 0 ? (
              <div className="p-4 text-center text-xs text-foreground-muted">
                No matching players found for &quot;{value}&quot;
              </div>
            ) : (
              <div className="py-1.5 max-h-60 overflow-y-auto">
                <div className="px-3.5 py-1 text-xs font-bold uppercase tracking-wider text-foreground-muted">
                  Matching Players ({visibleSuggestions.length})
                </div>
                {visibleSuggestions.map((u, idx) => {
                  const isSelected = idx === selectedIndex;
                  return (
                    <button
                      key={u._id || u.username}
                      type="button"
                      onClick={() => handleSelect(u.username)}
                      onMouseEnter={() => setSelectedIndex(idx)}
                      className={`w-full flex items-center justify-between px-3.5 py-2.5 text-left text-xs transition-colors ${
                        isSelected
                          ? "bg-accent/15 text-accent font-bold"
                          : "text-foreground hover:bg-surface-hover"
                      }`}
                    >
                      <div className="flex items-center gap-2.5 min-w-0">
                        <Avatar avatarUrl={u.avatarUrl} username={u.username} size="sm" />
                        <span className="font-bold truncate">{u.username}</span>
                      </div>
                      <span className="text-xs text-foreground-muted font-normal">
                        Select ↵
                      </span>
                    </button>
                  );
                })}
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

