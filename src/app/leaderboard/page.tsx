"use client";

import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";

type GameTab = "2048" | "caro";

interface Entry2048 {
  rank: number;
  username: string;
  avatarUrl: string | null;
  score: number;
}

interface EntryCaro {
  rank: number;
  username: string;
  avatarUrl: string | null;
  wins: number;
  total: number;
  winRate: number;
}

const TABS: { id: GameTab; label: string; icon: React.ReactNode }[] = [
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
  "from-amber-400 to-yellow-500",
  "from-slate-300 to-slate-400",
  "from-amber-600 to-orange-700",
];

function Avatar({ avatarUrl, username }: { avatarUrl: string | null; username: string }) {
  if (avatarUrl) {
    return (
      <img
        src={avatarUrl}
        alt={username}
        className="h-8 w-8 shrink-0 rounded-full object-cover ring-2 ring-accent/20"
      />
    );
  }
  return (
    <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-sky-400 to-blue-500 text-xs font-bold text-white">
      {username[0]?.toUpperCase()}
    </div>
  );
}

export default function LeaderboardPage() {
  const [activeTab, setActiveTab] = useState<GameTab>("2048");
  const [data2048, setData2048] = useState<Entry2048[]>([]);
  const [dataCaro, setDataCaro] = useState<EntryCaro[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    async function fetchLeaderboard() {
      setIsLoading(true);
      try {
        const res = await fetch(`/api/leaderboard?game=${activeTab}`);
        if (!res.ok) throw new Error("Failed to fetch");
        const json = await res.json();

        if (activeTab === "2048") {
          setData2048(json.leaderboard);
        } else {
          setDataCaro(json.leaderboard);
        }
      } catch (error) {
        console.error("Error fetching leaderboard:", error);
        if (activeTab === "2048") setData2048([]);
        else setDataCaro([]);
      } finally {
        setIsLoading(false);
      }
    }
    fetchLeaderboard();
  }, [activeTab]);

  return (
    <div className="mx-auto max-w-4xl px-4 py-8 sm:py-12">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-3xl sm:text-4xl font-extrabold text-foreground">
          Leader<span className="text-gradient">board</span>
        </h1>
        <p className="text-foreground-secondary mt-1">
          Top 10 players per game — only players with at least 1 win/score are shown.
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
        {/* ── 2048 Table ── */}
        {activeTab === "2048" && (
          <>
            <div className="grid grid-cols-[56px_1fr_120px] gap-2 px-4 py-3 bg-background-secondary border-b border-border text-xs font-bold text-foreground-muted uppercase tracking-wider">
              <span>Rank</span>
              <span>Player</span>
              <span className="text-right">Best Score</span>
            </div>

            <AnimatePresence mode="wait">
              {isLoading ? (
                <Spinner />
              ) : data2048.length === 0 ? (
                <Empty text="No scores yet. Be the first to play 2048!" />
              ) : (
                <motion.div key="2048" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} transition={{ duration: 0.2 }}>
                  {data2048.map((entry, i) => (
                    <motion.div
                      key={entry.username}
                      initial={{ opacity: 0, x: -10 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: i * 0.04 }}
                      className={`grid grid-cols-[56px_1fr_120px] gap-2 px-4 py-3 items-center hover:bg-surface-hover transition-colors ${i < data2048.length - 1 ? "border-b border-border/50" : ""}`}
                    >
                      <RankBadge rank={entry.rank} />
                      <div className="flex items-center gap-3 min-w-0">
                        <Avatar avatarUrl={entry.avatarUrl} username={entry.username} />
                        <span className="text-sm font-semibold text-foreground truncate">{entry.username}</span>
                      </div>
                      <span className="text-sm font-bold text-foreground text-right tabular-nums">
                        {entry.score.toLocaleString()}
                      </span>
                    </motion.div>
                  ))}
                </motion.div>
              )}
            </AnimatePresence>
          </>
        )}

        {/* ── Caro Table ── */}
        {activeTab === "caro" && (
          <>
            <div className="grid grid-cols-[56px_1fr_80px_80px_80px] gap-2 px-4 py-3 bg-background-secondary border-b border-border text-xs font-bold text-foreground-muted uppercase tracking-wider">
              <span>Rank</span>
              <span>Player</span>
              <span className="text-right">Wins</span>
              <span className="text-right">Games</span>
              <span className="text-right">Win %</span>
            </div>

            <AnimatePresence mode="wait">
              {isLoading ? (
                <Spinner />
              ) : dataCaro.length === 0 ? (
                <Empty text="No players yet. Be the first to win a Caro match!" />
              ) : (
                <motion.div key="caro" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} transition={{ duration: 0.2 }}>
                  {dataCaro.map((entry, i) => (
                    <motion.div
                      key={entry.username}
                      initial={{ opacity: 0, x: -10 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: i * 0.04 }}
                      className={`grid grid-cols-[56px_1fr_80px_80px_80px] gap-2 px-4 py-3 items-center hover:bg-surface-hover transition-colors ${i < dataCaro.length - 1 ? "border-b border-border/50" : ""}`}
                    >
                      <RankBadge rank={entry.rank} />
                      <div className="flex items-center gap-3 min-w-0">
                        <Avatar avatarUrl={entry.avatarUrl} username={entry.username} />
                        <span className="text-sm font-semibold text-foreground truncate">{entry.username}</span>
                      </div>
                      <span className="text-sm font-bold text-foreground text-right tabular-nums">{entry.wins}</span>
                      <span className="text-sm text-foreground-secondary text-right tabular-nums">{entry.total}</span>
                      <span className="text-sm text-right tabular-nums">
                        <span className={`font-semibold ${entry.winRate >= 60 ? "text-emerald-500" : entry.winRate >= 40 ? "text-amber-500" : "text-foreground-muted"}`}>
                          {entry.winRate}%
                        </span>
                      </span>
                    </motion.div>
                  ))}
                </motion.div>
              )}
            </AnimatePresence>
          </>
        )}
      </div>
    </div>
  );
}

function RankBadge({ rank }: { rank: number }) {
  if (rank <= 3) {
    return (
      <div className={`flex h-7 w-7 items-center justify-center rounded-full bg-gradient-to-br ${MEDAL_COLORS[rank - 1]} text-xs font-bold text-white shadow-sm`}>
        {rank}
      </div>
    );
  }
  return <span className="text-sm font-semibold text-foreground-muted pl-2">{rank}</span>;
}

function Spinner() {
  return (
    <motion.div key="loading" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="flex items-center justify-center h-[300px]">
      <div className="h-6 w-6 rounded-full border-2 border-accent border-t-transparent animate-spin" />
    </motion.div>
  );
}

function Empty({ text }: { text: string }) {
  return (
    <motion.div key="empty" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="flex flex-col items-center justify-center h-[300px] gap-2 text-foreground-muted">
      <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" opacity={0.4}>
        <path d="M8.21 13.89L7 23l5-3 5 3-1.21-9.12" />
        <path d="M12 2l3.09 6.26L22 9.27l-5 4.87L18.18 21 12 17.27 5.82 21 7 14.14l-5-4.87 6.91-1.01L12 2z" />
      </svg>
      <p className="text-sm">{text}</p>
    </motion.div>
  );
}
