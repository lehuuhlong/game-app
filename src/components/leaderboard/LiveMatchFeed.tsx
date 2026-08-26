"use client";

import { useEffect, useState } from "react";
import { motion } from "framer-motion";

interface LiveMatchFeedProps {
  onInspectH2H?: (p1: string, p2: string) => void;
  onOpenPlayer?: (username: string) => void;
}

const GAME_ICONS: Record<string, React.ReactNode> = {
  caro: (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round">
      <line x1="4" y1="4" x2="10" y2="10" />
      <line x1="10" y1="4" x2="4" y2="10" />
      <circle cx="17" cy="17" r="4" />
    </svg>
  ),
  chess: (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M12 2a3 3 0 0 0-3 3c0 1.3.8 2.4 2 2.8V10l-3 3v2h8v-2l-3-3V7.8c1.2-.4 2-1.5 2-2.8a3 3 0 0 0-3-3z" />
      <path d="M6 21h12a2 2 0 0 0 2-2H4a2 2 0 0 0 2 2z" />
    </svg>
  ),
  battleship: (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="5" r="2.5" />
      <line x1="12" y1="22" x2="12" y2="7.5" />
      <path d="M5 12H2a10 10 0 0 0 20 0h-3" />
    </svg>
  ),
  wordchain: (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71" />
      <path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71" />
    </svg>
  ),
  monopoly: (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
      <rect x="3" y="3" width="18" height="18" rx="3" />
      <circle cx="8.5" cy="8.5" r="1.2" fill="currentColor" />
      <circle cx="15.5" cy="15.5" r="1.2" fill="currentColor" />
      <circle cx="12" cy="12" r="1.2" fill="currentColor" />
    </svg>
  ),
  "2048": (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2">
      <rect x="3" y="3" width="8" height="8" rx="1.5" />
      <rect x="13" y="3" width="8" height="8" rx="1.5" />
      <rect x="3" y="13" width="8" height="8" rx="1.5" />
      <rect x="13" y="13" width="8" height="8" rx="1.5" />
    </svg>
  ),
  aimtrainer: (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round">
      <circle cx="12" cy="12" r="9" />
      <circle cx="12" cy="12" r="4.5" />
      <circle cx="12" cy="12" r="1.5" fill="currentColor" />
    </svg>
  ),
  minesweeper: (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round">
      <circle cx="12" cy="12" r="7.5" />
      <line x1="12" y1="2" x2="12" y2="4.5" />
      <line x1="12" y1="19.5" x2="12" y2="22" />
      <line x1="2" y1="12" x2="4.5" y2="12" />
      <line x1="19.5" y1="12" x2="22" y2="12" />
    </svg>
  ),
  sudoku: (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2">
      <rect x="3" y="3" width="18" height="18" rx="2" />
      <line x1="9" y1="3" x2="9" y2="21" />
      <line x1="15" y1="3" x2="15" y2="21" />
      <line x1="3" y1="9" x2="21" y2="9" />
      <line x1="3" y1="15" x2="21" y2="15" />
    </svg>
  ),
  trex: (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
      <rect x="2" y="10" width="20" height="4" rx="1.5" />
      <path d="M6 14v5a1 1 0 0 0 1 1h2" />
      <path d="M14 14v5a1 1 0 0 0 1 1h2" />
      <path d="M14 10V5a1 1 0 0 1 1-1h4" />
    </svg>
  ),
  flappybird: (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="7" />
      <circle cx="15" cy="10" r="1.5" fill="currentColor" />
      <path d="M17 12l4 1.5-4 1.5" />
      <path d="M8 13c-1.5 0-3-1-3-2.5s1.5-2.5 3-1.5" />
    </svg>
  ),
  wordle: (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
      <rect x="3" y="3" width="18" height="18" rx="2" />
      <path d="M7 8h10M12 8v8" />
    </svg>
  ),
};

function formatTime(seconds: number): string {
  if (!seconds || seconds <= 0) return "--:--";
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
}

function capitalize(str: string): string {
  if (!str) return "";
  return str.charAt(0).toUpperCase() + str.slice(1);
}

const PAGE_SIZE = 10;

export function LiveMatchFeed({ onInspectH2H, onOpenPlayer }: LiveMatchFeedProps) {
  const [matches, setMatches] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [filterGame, setFilterGame] = useState<string>("all");
  const [currentPage, setCurrentPage] = useState(1);

  useEffect(() => {
    let active = true;
    setLoading(true);

    async function fetchMatches() {
      try {
        let url = `/api/matches?limit=50`;
        if (filterGame !== "all") url += `&gameType=${filterGame}`;
        const res = await fetch(url);
        if (!res.ok) throw new Error("Failed to fetch matches");
        const json = await res.json();
        if (active) {
          setMatches(json.matches || []);
          setCurrentPage(1);
        }
      } catch (err) {
        console.error("Error fetching match feed:", err);
      } finally {
        if (active) setLoading(false);
      }
    }

    fetchMatches();
    return () => {
      active = false;
    };
  }, [filterGame]);

  const totalPages = Math.max(1, Math.ceil(matches.length / PAGE_SIZE));
  const startIndex = (currentPage - 1) * PAGE_SIZE;
  const paginatedMatches = matches.slice(startIndex, startIndex + PAGE_SIZE);

  /** Helper to render clean, consistent outcome details for each game */
  const renderSinglePlayerOutcome = (m: any, p: any) => {
    const isWin = p.result === "win";
    const isLoss = p.result === "loss";
    const gameType = m.gameType;
    const gameData = m.gameData || {};

    // 1. Minesweeper & Sudoku
    if (gameType === "minesweeper" || gameType === "sudoku") {
      const difficulty = capitalize(gameData.difficulty || "Normal");
      if (isWin) {
        const timeVal = gameData.time || m.duration || p.score || 0;
        return (
          <span className="px-2 py-0.5 rounded-md text-[10px] font-bold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
            Won ({difficulty}) • {formatTime(timeVal)}
          </span>
        );
      }
      return (
        <span className="px-2 py-0.5 rounded-md text-[10px] font-bold bg-rose-500/10 text-rose-400 border border-rose-500/20">
          Lost ({difficulty})
        </span>
      );
    }

    // 2. Wordle
    if (gameType === "wordle") {
      const solution = gameData.solution ? `"${gameData.solution.toUpperCase()}"` : "";
      if (isWin) {
        const tries = gameData.guessesCount ? ` (${gameData.guessesCount}/6)` : "";
        return (
          <span className="px-2 py-0.5 rounded-md text-[10px] font-bold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
            Won • {solution}{tries}
          </span>
        );
      }
      return (
        <span className="px-2 py-0.5 rounded-md text-[10px] font-bold bg-rose-500/10 text-rose-400 border border-rose-500/20">
          Lost • Word: {solution}
        </span>
      );
    }

    // 3. Score-based games: 2048, Trex, Aim Trainer
    if (gameType === "2048") {
      const score = (p.score ?? gameData.score ?? 0).toLocaleString();
      const tile = gameData.highestTile ? ` • Tile ${gameData.highestTile}` : "";
      return (
        <span className="px-2 py-0.5 rounded-md text-[10px] font-bold bg-surface-hover text-foreground-secondary border border-border">
          {score} pts{tile}
        </span>
      );
    }

    if (gameType === "trex" || gameType === "flappybird") {
      const score = (p.score ?? gameData.score ?? 0).toLocaleString();
      return (
        <span className="px-2 py-0.5 rounded-md text-[10px] font-bold bg-surface-hover text-foreground-secondary border border-border">
          {score} pts
        </span>
      );
    }

    if (gameType === "aimtrainer") {
      const score = (p.score ?? 0).toLocaleString();
      const acc = gameData.accuracy !== undefined ? ` • ${gameData.accuracy}% acc` : "";
      return (
        <span className="px-2 py-0.5 rounded-md text-[10px] font-bold bg-surface-hover text-foreground-secondary border border-border">
          {score} pts{acc}
        </span>
      );
    }

    // Default fallback
    if (isWin) {
      return (
        <span className="px-2 py-0.5 rounded-md text-[10px] font-bold uppercase bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
          WIN
        </span>
      );
    }
    if (isLoss) {
      return (
        <span className="px-2 py-0.5 rounded-md text-[10px] font-bold uppercase bg-rose-500/10 text-rose-400 border border-rose-500/20">
          LOSS
        </span>
      );
    }
    return (
      <span className="px-2 py-0.5 rounded-md text-[10px] font-bold bg-surface-hover text-foreground-secondary border border-border">
        {p.score !== undefined ? `${p.score} pts` : "Played"}
      </span>
    );
  };

  return (
    <div className="space-y-4">
      {/* Top Filter Bar */}
      <div className="flex flex-wrap items-center justify-between gap-3 p-4 rounded-2xl bg-surface border border-border">
        <div className="flex items-center gap-2">
          <span className="text-xs font-bold text-foreground-muted uppercase tracking-wider">
            Filter Activity:
          </span>
          <select
            value={filterGame}
            onChange={(e) => setFilterGame(e.target.value)}
            className="rounded-xl border border-border/70 bg-surface-hover/60 hover:bg-surface-hover hover:border-accent/40 px-3 py-1.5 text-xs font-semibold text-foreground focus:border-accent focus:outline-none focus:ring-1 focus:ring-accent/20 transition-all cursor-pointer"
          >
            <option value="all">All Games</option>
            <option value="caro">Caro (1v1)</option>
            <option value="chess">Chess (1v1)</option>
            <option value="battleship">Battleship (1v1)</option>
            <option value="wordchain">Word Chain (1v1)</option>
            <option value="monopoly">Monopoly (2-4p)</option>
            <option value="2048">2048</option>
            <option value="aimtrainer">Aim Trainer</option>
            <option value="minesweeper">Minesweeper</option>
            <option value="sudoku">Sudoku</option>
            <option value="trex">T-Rex</option>
            <option value="flappybird">Flappy Bird</option>
            <option value="wordle">Wordle</option>
          </select>
        </div>

        <div className="text-xs text-foreground-secondary">
          Showing latest <strong className="text-foreground">{matches.length}</strong> recorded sessions (Page {currentPage} of {totalPages})
        </div>
      </div>

      {loading ? (
        <div className="py-24 flex flex-col items-center justify-center gap-3">
          <div className="h-8 w-8 rounded-full border-2 border-accent border-t-transparent animate-spin" />
          <p className="text-xs text-foreground-muted">Loading live activity feed...</p>
        </div>
      ) : matches.length === 0 ? (
        <div className="p-12 text-center rounded-2xl border border-dashed border-border bg-surface/50 text-foreground-muted space-y-2">
          <p className="text-sm font-semibold">No recent matches found for this filter.</p>
          <p className="text-xs">Play a match with your friends to see it live here!</p>
        </div>
      ) : (
        <div className="space-y-3">
          {paginatedMatches.map((m: any, i: number) => {
            const is1v1 = m.players && m.players.length === 2;
            const p1 = m.players?.[0];
            const p2 = m.players?.[1];

            return (
              <motion.div
                key={m._id}
                initial={{ opacity: 0, y: 6 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.02 }}
                className="p-4 rounded-2xl bg-surface border border-border shadow-sm hover:border-accent/40 transition-all flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4"
              >
                {/* Game & Timestamp */}
                <div className="flex items-center gap-3 min-w-[140px]">
                  <div className="h-10 w-10 rounded-xl bg-background border border-border flex items-center justify-center text-foreground-secondary shrink-0 shadow-inner">
                    {GAME_ICONS[m.gameType] || "🎮"}
                  </div>
                  <div>
                    <h4 className="text-sm font-bold text-foreground capitalize tracking-tight">
                      {m.gameType}
                    </h4>
                    <p className="text-[11px] text-foreground-muted">
                      {new Date(m.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} • {new Date(m.createdAt).toLocaleDateString()}
                    </p>
                  </div>
                </div>

                {/* Players Outcome Area */}
                <div className="flex-1 flex flex-wrap items-center gap-3">
                  {is1v1 ? (
                    <div className="flex items-center gap-2 text-xs">
                      {/* P1 */}
                      <button
                        type="button"
                        onClick={() => onOpenPlayer?.(p1.username)}
                        className="font-bold text-foreground hover:text-accent transition-colors flex items-center gap-1.5"
                      >
                        <Avatar avatarUrl={p1.avatarUrl} username={p1.username} />
                        <span>{p1.username}</span>
                        <span
                          className={`px-2 py-0.5 rounded-md text-[10px] uppercase font-bold ${
                            p1.result === "win"
                              ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20"
                              : p1.result === "draw"
                              ? "bg-amber-500/10 text-amber-400 border border-amber-500/20"
                              : "bg-rose-500/10 text-rose-400 border border-rose-500/20"
                          }`}
                        >
                          {p1.result}
                        </span>
                      </button>

                      <span className="text-foreground-muted font-bold text-xs">vs</span>

                      {/* P2 */}
                      <button
                        type="button"
                        onClick={() => onOpenPlayer?.(p2.username)}
                        className="font-bold text-foreground hover:text-accent transition-colors flex items-center gap-1.5"
                      >
                        <Avatar avatarUrl={p2.avatarUrl} username={p2.username} />
                        <span>{p2.username}</span>
                        <span
                          className={`px-2 py-0.5 rounded-md text-[10px] uppercase font-bold ${
                            p2.result === "win"
                              ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20"
                              : p2.result === "draw"
                              ? "bg-amber-500/10 text-amber-400 border border-amber-500/20"
                              : "bg-rose-500/10 text-rose-400 border border-rose-500/20"
                          }`}
                        >
                          {p2.result}
                        </span>
                      </button>
                    </div>
                  ) : (
                    <div className="flex flex-wrap items-center gap-2.5 text-xs">
                      {m.players?.map((p: any, idx: number) => (
                        <div key={idx} className="flex items-center gap-2">
                          <button
                            type="button"
                            onClick={() => onOpenPlayer?.(p.username)}
                            className="font-bold text-foreground hover:text-accent transition-colors flex items-center gap-1.5"
                          >
                            <Avatar avatarUrl={p.avatarUrl} username={p.username} />
                            <span>{p.username}</span>
                          </button>
                          {renderSinglePlayerOutcome(m, p)}
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {/* Inspect H2H Action for 1v1 */}
                {is1v1 && onInspectH2H && (
                  <button
                    type="button"
                    onClick={() => onInspectH2H(p1.username, p2.username)}
                    className="shrink-0 inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-border bg-background hover:bg-surface-hover hover:border-accent/50 text-xs font-semibold text-foreground-secondary hover:text-foreground transition-all shadow-sm"
                  >
                    <span>View Rivalry</span>
                  </button>
                )}
              </motion.div>
            );
          })}
        </div>
      )}

      {/* Pagination Controls (5 pages max, 10 per page) */}
      {!loading && totalPages > 1 && (
        <div className="flex items-center justify-between pt-2 px-1">
          <span className="text-xs text-foreground-muted font-medium">
            Showing {startIndex + 1}–{Math.min(startIndex + PAGE_SIZE, matches.length)} of {matches.length} matches
          </span>
          <div className="flex items-center gap-1">
            <button
              type="button"
              disabled={currentPage === 1}
              onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
              className="px-3 py-1.5 rounded-lg border border-border text-xs font-semibold text-foreground-secondary hover:text-foreground hover:bg-surface disabled:opacity-30 disabled:pointer-events-none transition-colors"
            >
              Previous
            </button>
            {Array.from({ length: totalPages }, (_, idx) => idx + 1).map((pageNum) => (
              <button
                key={pageNum}
                type="button"
                onClick={() => setCurrentPage(pageNum)}
                className={`w-8 h-8 rounded-lg text-xs font-bold transition-all ${
                  currentPage === pageNum
                    ? "bg-accent text-white shadow-xs"
                    : "border border-border bg-surface text-foreground-secondary hover:text-foreground hover:bg-surface-hover"
                }`}
              >
                {pageNum}
              </button>
            ))}
            <button
              type="button"
              disabled={currentPage === totalPages}
              onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
              className="px-3 py-1.5 rounded-lg border border-border text-xs font-semibold text-foreground-secondary hover:text-foreground hover:bg-surface disabled:opacity-30 disabled:pointer-events-none transition-colors"
            >
              Next
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

function Avatar({ avatarUrl, username }: { avatarUrl?: string | null; username: string }) {
  if (avatarUrl) {
    return (
      <img
        src={avatarUrl}
        alt={username}
        className="h-5 w-5 rounded-full object-cover ring-1 ring-accent/20"
      />
    );
  }
  return (
    <div className="flex h-5 w-5 items-center justify-center rounded-full bg-accent text-[9px] font-bold text-white">
      {username[0]?.toUpperCase()}
    </div>
  );
}
