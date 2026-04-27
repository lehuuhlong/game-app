"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";

type GameTab = "overall" | "2048" | "caro";

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

// Mock leaderboard data (will be replaced by API calls when MongoDB is connected)
const MOCK_DATA: Record<GameTab, { rank: number; username: string; score: number; games: number }[]> = {
  overall: [
    { rank: 1, username: "ProGamer99", score: 48200, games: 142 },
    { rank: 2, username: "TileKing", score: 35800, games: 98 },
    { rank: 3, username: "StrategyMaster", score: 28500, games: 76 },
    { rank: 4, username: "QuickFingers", score: 21000, games: 63 },
    { rank: 5, username: "PuzzleWiz", score: 15200, games: 51 },
    { rank: 6, username: "GameNinja", score: 12800, games: 44 },
    { rank: 7, username: "ScoreHunter", score: 9400, games: 38 },
    { rank: 8, username: "BoardMaster", score: 7200, games: 29 },
  ],
  "2048": [
    { rank: 1, username: "TileKing", score: 32768, games: 45 },
    { rank: 2, username: "ProGamer99", score: 28416, games: 67 },
    { rank: 3, username: "PuzzleWiz", score: 16384, games: 33 },
    { rank: 4, username: "QuickFingers", score: 12288, games: 28 },
    { rank: 5, username: "ScoreHunter", score: 8192, games: 19 },
    { rank: 6, username: "GameNinja", score: 6144, games: 15 },
  ],
  caro: [
    { rank: 1, username: "StrategyMaster", score: 42, games: 50 },
    { rank: 2, username: "ProGamer99", score: 38, games: 55 },
    { rank: 3, username: "BoardMaster", score: 31, games: 40 },
    { rank: 4, username: "GameNinja", score: 24, games: 35 },
    { rank: 5, username: "QuickFingers", score: 18, games: 25 },
  ],
};

const MEDAL_COLORS = [
  "from-amber-400 to-yellow-500",      // Gold
  "from-slate-300 to-slate-400",        // Silver
  "from-amber-600 to-orange-700",       // Bronze
];

export default function LeaderboardPage() {
  const [activeTab, setActiveTab] = useState<GameTab>("overall");
  const data = MOCK_DATA[activeTab];
  const scoreLabel = activeTab === "caro" ? "Wins" : "Score";

  return (
    <div className="mx-auto max-w-4xl px-4 py-8 sm:py-12">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-3xl sm:text-4xl font-extrabold text-foreground">
          Leader<span className="text-gradient">board</span>
        </h1>
        <p className="text-foreground-secondary mt-1">
          Top players across all games. Connect MongoDB to see live data.
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
      <div className="rounded-xl border border-border bg-surface overflow-hidden">
        {/* Header row */}
        <div className="grid grid-cols-[60px_1fr_100px_80px] sm:grid-cols-[60px_1fr_120px_100px] gap-2 px-4 py-3 bg-background-secondary border-b border-border text-xs font-bold text-foreground-muted uppercase tracking-wider">
          <span>Rank</span>
          <span>Player</span>
          <span className="text-right">{scoreLabel}</span>
          <span className="text-right">Games</span>
        </div>

        {/* Data rows */}
        <AnimatePresence mode="wait">
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
        </AnimatePresence>
      </div>

      {/* Info banner */}
      <div className="mt-6 rounded-xl border border-border bg-accent-light/50 p-4 flex items-start gap-3">
        <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-accent/10 text-accent mt-0.5">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <circle cx="12" cy="12" r="10" />
            <line x1="12" y1="16" x2="12" y2="12" />
            <line x1="12" y1="8" x2="12.01" y2="8" />
          </svg>
        </div>
        <div>
          <p className="text-sm font-semibold text-foreground">Demo Data</p>
          <p className="text-xs text-foreground-secondary mt-0.5">
            This leaderboard shows mock data. Connect MongoDB ({" "}
            <code className="text-accent font-mono text-[11px]">MONGODB_URI</code> in{" "}
            <code className="text-accent font-mono text-[11px]">.env.local</code>) and
            the API at <code className="text-accent font-mono text-[11px]">/api/leaderboard</code> will
            serve real rankings.
          </p>
        </div>
      </div>
    </div>
  );
}
