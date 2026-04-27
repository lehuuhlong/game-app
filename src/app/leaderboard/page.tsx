"use client";

import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";

type GameTab = "overall" | "2048" | "caro";

interface LeaderboardEntry {
  rank: number;
  username: string;
  score: number;
  games: number;
}

const TABS: { id: GameTab; label: string; icon: React.ReactNode }[] = [
  {
    id: "overall",
    label: "Overall",
    icon: (
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <path d="M8.21 13.89L7 23l5-3 5 3-1.21-9.12" />
        <path d="M12 2l3.09 6.26L22 9.27l-5 4.87L18.18 21 12 17.27 5.82 21 7 14.14l-5-4.87 6.91-1.01L12 2z" />
      </svg>
    ),
  },
  {
    id: "2048",
    label: "2048",
    icon: (
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <rect x="3" y="3" width="8" height="8" rx="1" />
        <rect x="13" y="3" width="8" height="8" rx="1" />
        <rect x="3" y="13" width="8" height="8" rx="1" />
        <rect x="13" y="13" width="8" height="8" rx="1" />
      </svg>
    ),
  },
  {
    id: "caro",
    label: "Caro",
    icon: (
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
        <line x1="6" y1="6" x2="10" y2="10" />
        <line x1="10" y1="6" x2="6" y2="10" />
        <circle cx="16" cy="16" r="3" />
      </svg>
    ),
  },
];

const MEDAL_COLORS = [
  "from-amber-400 to-yellow-500",      // Gold
  "from-slate-300 to-slate-400",        // Silver
  "from-amber-600 to-orange-700",       // Bronze
];

export default function LeaderboardPage() {
  const [activeTab, setActiveTab] = useState<GameTab>("overall");
  const [data, setData] = useState<LeaderboardEntry[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    async function fetchLeaderboard() {
      setIsLoading(true);
      try {
        const query = activeTab === "overall" ? "" : `?game=${activeTab}`;
        const res = await fetch(`/api/leaderboard${query}`);
        if (!res.ok) throw new Error("Failed to fetch");
        
        const json = await res.json();
        
        // Map API response to UI format
        const formattedData: LeaderboardEntry[] = json.leaderboard.map((user: any, index: number) => {
          let score = 0;
          let games = 0;

          if (activeTab === "overall") {
            score = user.stats?.totalScore || 0;
            games = user.stats?.gamesPlayed || 0;
          } else if (activeTab === "2048") {
            score = user.bestScores?.["2048"] || 0;
            games = user.stats?.gamesPlayed || 0; // Note: if you track game-specific plays, use that instead
          } else if (activeTab === "caro") {
            score = user.bestScores?.caro || 0;
            games = user.stats?.gamesPlayed || 0;
          }

          return {
            rank: index + 1,
            username: user.nickname || user.username || "Unknown",
            score,
            games,
          };
        });

        setData(formattedData);
      } catch (error) {
        console.error("Error fetching leaderboard:", error);
        setData([]);
      } finally {
        setIsLoading(false);
      }
    }

    fetchLeaderboard();
  }, [activeTab]);

  const scoreLabel = activeTab === "caro" ? "Wins" : "Score";

  return (
    <div className="mx-auto max-w-4xl px-4 py-8 sm:py-12">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-3xl sm:text-4xl font-extrabold text-foreground">
          Leader<span className="text-gradient">board</span>
        </h1>
        <p className="text-foreground-secondary mt-1">
          Top players across all games. Data is fetched live from MongoDB.
        </p>
      </div>

      {/* Tabs */}
      <div className="flex items-center gap-1 p-1 rounded-xl bg-surface border border-border mb-8 w-fit">
        {TABS.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`relative flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
              activeTab === tab.id
                ? "text-foreground"
                : "text-foreground-muted hover:text-foreground-secondary"
            }`}
          >
            {activeTab === tab.id && (
              <motion.div
                layoutId="leaderboard-tab"
                className="absolute inset-0 bg-accent-light rounded-lg"
                transition={{ type: "spring", stiffness: 400, damping: 30 }}
              />
            )}
            <span className="relative z-10 flex items-center gap-2">
              {tab.icon}
              {tab.label}
            </span>
          </button>
        ))}
      </div>

      {/* Table */}
      <div className="rounded-xl border border-border bg-surface overflow-hidden min-h-[400px]">
        {/* Header row */}
        <div className="grid grid-cols-[60px_1fr_100px_80px] sm:grid-cols-[60px_1fr_120px_100px] gap-2 px-4 py-3 bg-background-secondary border-b border-border text-xs font-bold text-foreground-muted uppercase tracking-wider">
          <span>Rank</span>
          <span>Player</span>
          <span className="text-right">{scoreLabel}</span>
          <span className="text-right">Games</span>
        </div>

        {/* Data rows */}
        <AnimatePresence mode="wait">
          {isLoading ? (
            <motion.div
              key="loading"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="flex items-center justify-center h-[300px]"
            >
              <div className="h-6 w-6 rounded-full border-2 border-accent border-t-transparent animate-spin" />
            </motion.div>
          ) : data.length === 0 ? (
            <motion.div
              key="empty"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="flex flex-col items-center justify-center h-[300px] text-foreground-muted"
            >
              <p>No players found yet.</p>
            </motion.div>
          ) : (
            <motion.div
              key={activeTab}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.2 }}
            >
              {data.map((entry, i) => (
                <motion.div
                  key={entry.username}
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: i * 0.05 }}
                  className={`grid grid-cols-[60px_1fr_100px_80px] sm:grid-cols-[60px_1fr_120px_100px] gap-2 px-4 py-3 items-center transition-colors hover:bg-surface-hover ${
                    i < data.length - 1 ? "border-b border-border/50" : ""
                  }`}
                >
                  {/* Rank */}
                  <div>
                    {entry.rank <= 3 ? (
                      <div
                        className={`flex h-7 w-7 items-center justify-center rounded-full bg-gradient-to-br ${MEDAL_COLORS[entry.rank - 1]} text-xs font-bold text-white shadow-sm`}
                      >
                        {entry.rank}
                      </div>
                    ) : (
                      <span className="text-sm font-semibold text-foreground-muted pl-2">
                        {entry.rank}
                      </span>
                    )}
                  </div>

                  {/* Player */}
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-indigo-400 to-purple-500 text-xs font-bold text-white">
                      {entry.username[0].toUpperCase()}
                    </div>
                    <span className="text-sm font-semibold text-foreground truncate">
                      {entry.username}
                    </span>
                  </div>

                  {/* Score */}
                  <span className="text-sm font-bold text-foreground text-right tabular-nums">
                    {entry.score.toLocaleString()}
                  </span>

                  {/* Games */}
                  <span className="text-sm text-foreground-secondary text-right tabular-nums">
                    {entry.games}
                  </span>
                </motion.div>
              ))}
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
