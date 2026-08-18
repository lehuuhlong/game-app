"use client";

import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";

interface H2HData {
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
  byGame?: Record<string, { total: number; p1Wins: number; p2Wins: number; draws: number; p1WinRate: number }>;
  recentMatches?: Array<{
    id: string;
    gameType: string;
    outcome: "p1" | "p2" | "draw";
    p1Result: string;
    p2Result: string;
    createdAt: string;
  }>;
}

interface HeadToHeadBadgeProps {
  player1: string; // My username
  player2: string; // Opponent username
  gameType?: string;
  compact?: boolean;
}

export function HeadToHeadBadge({
  player1,
  player2,
  gameType,
  compact = false,
}: HeadToHeadBadgeProps) {
  const [data, setData] = useState<H2HData | null>(null);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);

  useEffect(() => {
    if (!player1 || !player2 || player1.toLowerCase() === player2.toLowerCase()) {
      setLoading(false);
      return;
    }

    let active = true;
    setLoading(true);

    async function fetchH2H() {
      try {
        let url = `/api/matches/h2h?player1=${encodeURIComponent(player1)}&player2=${encodeURIComponent(player2)}`;
        if (gameType) url += `&gameType=${encodeURIComponent(gameType)}`;
        const res = await fetch(url);
        if (!res.ok) throw new Error("Failed to fetch");
        const json = await res.json();
        if (active) setData(json);
      } catch (err) {
        console.error("Error fetching H2H stats:", err);
      } finally {
        if (active) setLoading(false);
      }
    }

    fetchH2H();
    return () => {
      active = false;
    };
  }, [player1, player2, gameType]);

  if (!player1 || !player2 || player1.toLowerCase() === player2.toLowerCase()) {
    return null;
  }

  if (loading) {
    return (
      <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-surface border border-border/60 text-xs text-foreground-muted animate-pulse">
        <span className="h-2 w-2 rounded-full bg-accent/50 animate-ping" />
        <span>Loading rival stats...</span>
      </div>
    );
  }

  const isFirstEncounter = !data || data.totalMatches === 0;

  return (
    <>
      <motion.button
        type="button"
        onClick={() => setShowModal(true)}
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        whileHover={{ scale: 1.02 }}
        whileTap={{ scale: 0.98 }}
        className={`group inline-flex items-center gap-2 rounded-full border transition-all text-xs font-semibold ${
          isFirstEncounter
            ? "border-emerald-500/30 bg-emerald-500/10 text-emerald-400 hover:bg-emerald-500/20"
            : "border-accent/40 bg-accent/10 text-foreground hover:bg-accent/20 hover:border-accent shadow-sm"
        } ${compact ? "px-2.5 py-1 text-[11px]" : "px-3.5 py-1.5"}`}
        title="Click to view rivalry history"
      >
        <span className="text-amber-400">⚔️</span>
        {isFirstEncounter ? (
          <span>
            First time vs <strong className="text-foreground font-bold">{player2}</strong>!
          </span>
        ) : (
          <div className="flex items-center gap-1.5">
            <span className="text-foreground-secondary">H2H:</span>
            <span className="font-bold text-sky-400">{data.player1.wins}W</span>
            <span className="text-foreground-muted">-</span>
            <span className="font-bold text-rose-400">{data.player2.wins}L</span>
            {data.draws > 0 && (
              <>
                <span className="text-foreground-muted">-</span>
                <span className="text-foreground-muted">{data.draws}D</span>
              </>
            )}
            <span className="text-foreground-muted">({data.player1.winRate}% WR)</span>
            <span className="text-[10px] text-accent group-hover:translate-x-0.5 transition-transform">
              ℹ️
            </span>
          </div>
        )}
      </motion.button>

      {/* Rivalry Mini Modal */}
      <AnimatePresence>
        {showModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-background/80 backdrop-blur-sm">
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 10 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 10 }}
              className="w-full max-w-md rounded-2xl border border-border bg-surface shadow-2xl p-6 relative overflow-hidden"
            >
              {/* Close Button */}
              <button
                type="button"
                onClick={() => setShowModal(false)}
                className="absolute top-4 right-4 p-1.5 rounded-lg text-foreground-muted hover:text-foreground hover:bg-surface-hover transition-colors"
              >
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <line x1="18" y1="6" x2="6" y2="18" />
                  <line x1="6" y1="6" x2="18" y2="18" />
                </svg>
              </button>

              <div className="text-center mb-6">
                <div className="inline-flex items-center justify-center h-12 w-12 rounded-2xl bg-accent-light text-accent text-2xl mb-2 shadow-sm">
                  ⚔️
                </div>
                <h3 className="text-lg font-bold text-foreground">Rivalry Breakdown</h3>
                <p className="text-xs text-foreground-secondary mt-0.5">
                  Direct match history between <span className="font-semibold text-foreground">{player1}</span> and{" "}
                  <span className="font-semibold text-foreground">{player2}</span>
                </p>
              </div>

              {isFirstEncounter ? (
                <div className="py-8 text-center space-y-2">
                  <p className="text-sm font-medium text-foreground">No matches recorded yet!</p>
                  <p className="text-xs text-foreground-muted">
                    This is your first battle. Win this match to claim the upper hand in your rivalry!
                  </p>
                </div>
              ) : (
                <div className="space-y-4">
                  {/* Scoreboard Card */}
                  <div className="rounded-xl border border-border bg-background p-4">
                    <div className="grid grid-cols-3 items-center text-center">
                      <div className="space-y-1">
                        <p className="text-xs font-semibold text-foreground truncate">{player1}</p>
                        <p className="text-2xl font-black text-sky-400">{data?.player1.wins}</p>
                        <p className="text-[11px] text-foreground-muted font-medium">Wins ({data?.player1.winRate}%)</p>
                      </div>

                      <div className="space-y-1">
                        <span className="text-xs font-bold uppercase tracking-wider text-foreground-muted">
                          {data?.totalMatches} Matches
                        </span>
                        <div className="text-xs text-foreground-secondary">
                          {data?.draws ? `${data.draws} Draws` : "No Draws"}
                        </div>
                      </div>

                      <div className="space-y-1">
                        <p className="text-xs font-semibold text-foreground truncate">{player2}</p>
                        <p className="text-2xl font-black text-rose-400">{data?.player2.wins}</p>
                        <p className="text-[11px] text-foreground-muted font-medium">Wins ({data?.player2.winRate}%)</p>
                      </div>
                    </div>

                    {/* Win Rate Progress Bar */}
                    <div className="mt-4 h-2.5 w-full rounded-full bg-border overflow-hidden flex">
                      <div
                        className="h-full bg-sky-500 transition-all duration-500"
                        style={{ width: `${data ? (data.player1.wins / data.totalMatches) * 100 : 50}%` }}
                        title={`${player1} wins`}
                      />
                      {data && data.draws > 0 && (
                        <div
                          className="h-full bg-amber-500/80 transition-all duration-500"
                          style={{ width: `${(data.draws / data.totalMatches) * 100}%` }}
                          title="Draws"
                        />
                      )}
                      <div
                        className="h-full bg-rose-500 transition-all duration-500"
                        style={{ width: `${data ? (data.player2.wins / data.totalMatches) * 100 : 50}%` }}
                        title={`${player2} wins`}
                      />
                    </div>
                  </div>

                  {/* Per Game breakdown */}
                  {data?.byGame && Object.keys(data.byGame).length > 0 && (
                    <div className="space-y-2">
                      <p className="text-xs font-bold text-foreground-muted uppercase tracking-wider">
                        By Game Breakdown
                      </p>
                      <div className="space-y-1.5 max-h-40 overflow-y-auto pr-1">
                        {Object.entries(data.byGame).map(([gt, stats]) => (
                          <div
                            key={gt}
                            className="flex items-center justify-between px-3 py-2 rounded-lg bg-background-secondary text-xs border border-border/50"
                          >
                            <span className="font-semibold text-foreground capitalize">{gt}</span>
                            <div className="flex items-center gap-3">
                              <span className="font-mono text-sky-400 font-bold">{stats.p1Wins}W</span>
                              <span className="text-foreground-muted font-mono">-</span>
                              <span className="font-mono text-rose-400 font-bold">{stats.p2Wins}L</span>
                              <span className="text-foreground-muted text-[11px]">({stats.total} games)</span>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}

              <button
                type="button"
                onClick={() => setShowModal(false)}
                className="mt-6 w-full py-2.5 rounded-xl bg-surface-hover hover:bg-border text-foreground font-semibold text-xs transition-colors"
              >
                Close
              </button>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </>
  );
}
