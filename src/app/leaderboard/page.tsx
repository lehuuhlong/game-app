"use client";

import { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";

type GameTab = "2048" | "caro" | "minesweeper" | "wordle" | "trex" | "wordchain";
type MsLevel = "beginner" | "intermediate" | "expert";

interface Entry2048 {
  rank: number;
  username: string;
  avatarUrl: string | null;
  score: number;
  highestTile: number;
}

interface EntryCaro {
  rank: number;
  username: string;
  avatarUrl: string | null;
  wins: number;
  total: number;
  winRate: number;
}

interface EntryMinesweeper {
  rank: number;
  username: string;
  avatarUrl: string | null;
  time: number;
}

interface EntryWordle {
  rank: number;
  username: string;
  avatarUrl: string | null;
  wins: number;
}

interface EntryTrex {
  rank: number;
  username: string;
  avatarUrl: string | null;
  score: number;
}

interface EntryWordChain {
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
  {
    id: "minesweeper",
    label: "Minesweeper",
    icon: (
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
        <circle cx="12" cy="12" r="9" />
        <line x1="12" y1="8" x2="12" y2="12" />
        <line x1="12" y1="12" x2="15" y2="15" />
      </svg>
    ),
  },
  {
    id: "wordle",
    label: "Wordle",
    icon: (
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <rect x="3" y="3" width="18" height="18" rx="2" />
        <path d="M9 9h.01M15 9h.01M9 15h.01M15 15h.01" />
      </svg>
    ),
  },
  {
    id: "trex",
    label: "T-Rex",
    icon: (
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M12 2v2M16 2v2M20 2v2M4 14l4-4M16 10l-4 4" />
        <rect x="2" y="10" width="20" height="4" rx="2" />
        <path d="M6 14v6a2 2 0 0 0 2 2h8a2 2 0 0 0 2-2v-6" />
      </svg>
    ),
  },
  {
    id: "wordchain",
    label: "Word Chain",
    icon: (
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71" />
        <path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71" />
      </svg>
    ),
  },
];

const MS_LEVELS: { id: MsLevel; label: string }[] = [
  { id: "beginner", label: "Beginner" },
  { id: "intermediate", label: "Intermediate" },
  { id: "expert", label: "Expert" },
];

const MEDAL_COLORS = [
  "from-amber-400 to-yellow-500",
  "from-slate-300 to-slate-400",
  "from-amber-600 to-orange-700",
];

const TAB_INDEX: Record<string, number> = { "2048": 0, caro: 1, minesweeper: 2, wordle: 3, trex: 4, wordchain: 5 };
const MS_INDEX: Record<string, number> = { beginner: 0, intermediate: 1, expert: 2 };

function formatTime(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
}

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

// ── Slide animation config ─────────────────────────────────────────

const slideVariants = {
  enter: (dir: number) => ({
    x: dir > 0 ? 80 : -80,
    opacity: 0,
  }),
  center: {
    x: 0,
    opacity: 1,
  },
  exit: (dir: number) => ({
    x: dir > 0 ? -80 : 80,
    opacity: 0,
  }),
};

const slideTransition = {
  type: "spring" as const,
  stiffness: 300,
  damping: 30,
  mass: 0.8,
};

// ── Main component ─────────────────────────────────────────────────

export default function LeaderboardPage() {
  const [activeTab, setActiveTab] = useState<GameTab>("2048");
  const [msLevel, setMsLevel] = useState<MsLevel>("beginner");
  const [data2048, setData2048] = useState<Entry2048[]>([]);
  const [dataCaro, setDataCaro] = useState<EntryCaro[]>([]);
  const [dataMs, setDataMs] = useState<EntryMinesweeper[]>([]);
  const [dataWordle, setDataWordle] = useState<EntryWordle[]>([]);
  const [dataTrex, setDataTrex] = useState<EntryTrex[]>([]);
  const [dataWordChain, setDataWordChain] = useState<EntryWordChain[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Direction for slide: 1 = forward (right), -1 = backward (left)
  const slideDirRef = useRef(1);

  const handleTabChange = (tab: GameTab) => {
    if (tab === activeTab) return;
    slideDirRef.current = TAB_INDEX[tab] > TAB_INDEX[activeTab] ? 1 : -1;
    setActiveTab(tab);
  };

  const handleLevelChange = (lv: MsLevel) => {
    if (lv === msLevel) return;
    slideDirRef.current = MS_INDEX[lv] > MS_INDEX[msLevel] ? 1 : -1;
    setMsLevel(lv);
  };

  useEffect(() => {
    async function fetchLeaderboard() {
      setIsLoading(true);
      try {
        let url = `/api/leaderboard?game=${activeTab}`;
        if (activeTab === "minesweeper") {
          url += `&level=${msLevel}`;
        }
        const res = await fetch(url);
        if (!res.ok) throw new Error("Failed to fetch");
        const json = await res.json();

        if (activeTab === "2048") setData2048(json.leaderboard);
        else if (activeTab === "caro") setDataCaro(json.leaderboard);
        else if (activeTab === "minesweeper") setDataMs(json.leaderboard);
        else if (activeTab === "wordle") setDataWordle(json.leaderboard);
        else if (activeTab === "trex") setDataTrex(json.leaderboard);
        else if (activeTab === "wordchain") setDataWordChain(json.leaderboard);
      } catch (error) {
        console.error("Error fetching leaderboard:", error);
        if (activeTab === "2048") setData2048([]);
        else if (activeTab === "caro") setDataCaro([]);
        else if (activeTab === "minesweeper") setDataMs([]);
        else if (activeTab === "wordle") setDataWordle([]);
        else if (activeTab === "trex") setDataTrex([]);
        else if (activeTab === "wordchain") setDataWordChain([]);
      } finally {
        setIsLoading(false);
      }
    }
    fetchLeaderboard();
  }, [activeTab, msLevel]);

  // Unique key that changes on every tab/level switch
  const contentKey = activeTab === "minesweeper" ? `ms-${msLevel}` : activeTab;

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

      {/* ── Single unified card ───────────────────────────────── */}
      <div className="rounded-2xl border border-border bg-surface shadow-sm overflow-hidden">
        {/* ── Tab navigation (inside card header) ────────────── */}
        <div className="flex flex-wrap items-center gap-0 border-b border-border bg-background-secondary/50">
          {TABS.map((tab) => (
            <button
              key={tab.id}
              onClick={() => handleTabChange(tab.id)}
              className={`relative flex items-center gap-2 px-4 sm:px-5 py-3.5 text-sm font-medium transition-colors ${
                activeTab === tab.id
                  ? "text-accent"
                  : "text-foreground-muted hover:text-foreground-secondary"
              }`}
            >
              {activeTab === tab.id && (
                <motion.div
                  layoutId="leaderboard-tab-indicator"
                  className="absolute bottom-0 left-0 right-0 h-[2px] bg-accent"
                  transition={{ type: "spring", stiffness: 400, damping: 30 }}
                />
              )}
              <span className="relative z-10 flex items-center gap-2">
                {tab.icon}
                <span className="hidden sm:inline">{tab.label}</span>
              </span>
            </button>
          ))}
        </div>

        {/* ── Minesweeper sub-tabs ─────────────────────────────── */}
        <AnimatePresence initial={false}>
          {activeTab === "minesweeper" && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: "auto", opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              transition={{ duration: 0.2 }}
              className="overflow-hidden border-b border-border/60 bg-background-secondary/30"
            >
              <div className="flex items-center gap-1 px-4 py-2">
                {MS_LEVELS.map((lv) => (
                  <button
                    key={lv.id}
                    onClick={() => handleLevelChange(lv.id)}
                    className={`relative px-3 py-1.5 rounded-md text-xs font-medium transition-colors ${
                      msLevel === lv.id
                        ? "text-foreground"
                        : "text-foreground-muted hover:text-foreground-secondary"
                    }`}
                  >
                    {msLevel === lv.id && (
                      <motion.div
                        layoutId="ms-level-pill"
                        className="absolute inset-0 rounded-md bg-accent-light"
                        transition={{ type: "spring", stiffness: 400, damping: 30 }}
                      />
                    )}
                    <span className="relative z-10">{lv.label}</span>
                  </button>
                ))}
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* ── Content area with horizontal slide ────────────────── */}
        <div className="min-h-[400px] overflow-hidden">
          <AnimatePresence mode="wait" custom={slideDirRef.current} initial={false}>
            <motion.div
              key={contentKey}
              custom={slideDirRef.current}
              variants={slideVariants}
              initial="enter"
              animate="center"
              exit="exit"
              transition={slideTransition}
            >
              {/* ── 2048 ── */}
              {activeTab === "2048" && (
                <>
                  <TableHeader cols="grid-cols-[56px_1fr_100px_120px]">
                    <span>Rank</span>
                    <span>Player</span>
                    <span className="text-right">Highest Tile</span>
                    <span className="text-right">Best Score</span>
                  </TableHeader>
                  {isLoading ? (
                    <Spinner />
                  ) : data2048.length === 0 ? (
                    <Empty text="No scores yet. Be the first to play 2048!" />
                  ) : (
                    <div>
                      {data2048.map((entry, i) => (
                        <TableRow key={entry.username} index={i} cols="grid-cols-[56px_1fr_100px_120px]" isLast={i === data2048.length - 1}>
                          <RankBadge rank={entry.rank} />
                          <PlayerCell avatarUrl={entry.avatarUrl} username={entry.username} />
                          <span className="text-sm font-bold text-amber-500 text-right tabular-nums">
                            {entry.highestTile > 0 ? entry.highestTile : "-"}
                          </span>
                          <span className="text-sm font-bold text-foreground text-right tabular-nums">
                            {entry.score.toLocaleString()}
                          </span>
                        </TableRow>
                      ))}
                    </div>
                  )}
                </>
              )}

              {/* ── Caro ── */}
              {activeTab === "caro" && (
                <>
                  <TableHeader cols="grid-cols-[56px_1fr_80px_80px_80px]">
                    <span>Rank</span>
                    <span>Player</span>
                    <span className="text-right">Wins</span>
                    <span className="text-right">Games</span>
                    <span className="text-right">Win %</span>
                  </TableHeader>
                  {isLoading ? (
                    <Spinner />
                  ) : dataCaro.length === 0 ? (
                    <Empty text="No players yet. Be the first to win a Caro match!" />
                  ) : (
                    <div>
                      {dataCaro.map((entry, i) => (
                        <TableRow key={entry.username} index={i} cols="grid-cols-[56px_1fr_80px_80px_80px]" isLast={i === dataCaro.length - 1}>
                          <RankBadge rank={entry.rank} />
                          <PlayerCell avatarUrl={entry.avatarUrl} username={entry.username} />
                          <span className="text-sm font-bold text-foreground text-right tabular-nums">{entry.wins}</span>
                          <span className="text-sm text-foreground-secondary text-right tabular-nums">{entry.total}</span>
                          <span className="text-sm text-right tabular-nums">
                            <span className={`font-semibold ${entry.winRate >= 60 ? "text-emerald-500" : entry.winRate >= 40 ? "text-amber-500" : "text-foreground-muted"}`}>
                              {entry.winRate}%
                            </span>
                          </span>
                        </TableRow>
                      ))}
                    </div>
                  )}
                </>
              )}

              {/* ── Minesweeper ── */}
              {activeTab === "minesweeper" && (
                <>
                  <TableHeader cols="grid-cols-[56px_1fr_120px]">
                    <span>Rank</span>
                    <span>Player</span>
                    <span className="text-right">Best Time</span>
                  </TableHeader>
                  {isLoading ? (
                    <Spinner />
                  ) : dataMs.length === 0 ? (
                    <Empty text={`No records yet for ${msLevel}. Be the first to clear the board!`} />
                  ) : (
                    <div>
                      {dataMs.map((entry, i) => (
                        <TableRow key={entry.username} index={i} cols="grid-cols-[56px_1fr_120px]" isLast={i === dataMs.length - 1}>
                          <RankBadge rank={entry.rank} />
                          <PlayerCell avatarUrl={entry.avatarUrl} username={entry.username} />
                          <span className="text-sm font-bold text-foreground text-right tabular-nums flex items-center justify-end gap-1.5">
                            <span className="text-foreground-muted">⏱</span>
                            {formatTime(entry.time)}
                          </span>
                        </TableRow>
                      ))}
                    </div>
                  )}
                </>
              )}

              {/* ── Wordle ── */}
              {activeTab === "wordle" && (
                <>
                  <TableHeader cols="grid-cols-[56px_1fr_120px]">
                    <span>Rank</span>
                    <span>Player</span>
                    <span className="text-right">Wins</span>
                  </TableHeader>
                  {isLoading ? (
                    <Spinner />
                  ) : dataWordle.length === 0 ? (
                    <Empty text="No winners yet. Be the first to solve a Wordle!" />
                  ) : (
                    <div>
                      {dataWordle.map((entry, i) => (
                        <TableRow key={entry.username} index={i} cols="grid-cols-[56px_1fr_120px]" isLast={i === dataWordle.length - 1}>
                          <RankBadge rank={entry.rank} />
                          <PlayerCell avatarUrl={entry.avatarUrl} username={entry.username} />
                          <span className="text-sm font-bold text-foreground text-right tabular-nums flex items-center justify-end gap-1.5">
                            <span className="text-emerald-500">🏆</span>
                            {entry.wins}
                          </span>
                        </TableRow>
                      ))}
                    </div>
                  )}
                </>
              )}

              {/* ── T-Rex ── */}
              {activeTab === "trex" && (
                <>
                  <TableHeader cols="grid-cols-[56px_1fr_120px]">
                    <span>Rank</span>
                    <span>Player</span>
                    <span className="text-right">Best Score</span>
                  </TableHeader>
                  {isLoading ? (
                    <Spinner />
                  ) : dataTrex.length === 0 ? (
                    <Empty text="No high scores yet. Start running!" />
                  ) : (
                    <div>
                      {dataTrex.map((entry, i) => (
                        <TableRow key={entry.username} index={i} cols="grid-cols-[56px_1fr_120px]" isLast={i === dataTrex.length - 1}>
                          <RankBadge rank={entry.rank} />
                          <PlayerCell avatarUrl={entry.avatarUrl} username={entry.username} />
                          <span className="text-sm font-bold text-foreground text-right tabular-nums flex items-center justify-end gap-1.5">
                            <span className="text-amber-500">⭐</span>
                            {entry.score.toLocaleString()}
                          </span>
                        </TableRow>
                      ))}
                    </div>
                  )}
                </>
              )}

              {/* ── Word Chain ── */}
              {activeTab === "wordchain" && (
                <>
                  <TableHeader cols="grid-cols-[56px_1fr_80px_80px_80px]">
                    <span>Rank</span>
                    <span>Player</span>
                    <span className="text-right">Wins</span>
                    <span className="text-right">Games</span>
                    <span className="text-right">Win %</span>
                  </TableHeader>
                  {isLoading ? (
                    <Spinner />
                  ) : dataWordChain.length === 0 ? (
                    <Empty text="No players yet. Be the first to win a Word Chain match!" />
                  ) : (
                    <div>
                      {dataWordChain.map((entry, i) => (
                        <TableRow key={entry.username} index={i} cols="grid-cols-[56px_1fr_80px_80px_80px]" isLast={i === dataWordChain.length - 1}>
                          <RankBadge rank={entry.rank} />
                          <PlayerCell avatarUrl={entry.avatarUrl} username={entry.username} />
                          <span className="text-sm font-bold text-foreground text-right tabular-nums">{entry.wins}</span>
                          <span className="text-sm text-foreground-secondary text-right tabular-nums">{entry.total}</span>
                          <span className="text-sm text-right tabular-nums">
                            <span className={`font-semibold ${entry.winRate >= 60 ? "text-emerald-500" : entry.winRate >= 40 ? "text-amber-500" : "text-foreground-muted"}`}>
                              {entry.winRate}%
                            </span>
                          </span>
                        </TableRow>
                      ))}
                    </div>
                  )}
                </>
              )}
            </motion.div>
          </AnimatePresence>
        </div>
      </div>
    </div>
  );
}

// ── Shared sub-components ──────────────────────────────────────────

function TableHeader({ cols, children }: { cols: string; children: React.ReactNode }) {
  return (
    <div className={`grid ${cols} gap-2 px-4 py-3 border-b border-border/60 text-xs font-bold text-foreground-muted uppercase tracking-wider`}>
      {children}
    </div>
  );
}

function TableRow({ cols, index, isLast, children }: { cols: string; index: number; isLast: boolean; children: React.ReactNode }) {
  return (
    <motion.div
      initial={{ opacity: 0, x: -10 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ delay: index * 0.04 }}
      className={`grid ${cols} gap-2 px-4 py-3 items-center hover:bg-surface-hover transition-colors ${!isLast ? "border-b border-border/30" : ""}`}
    >
      {children}
    </motion.div>
  );
}

function PlayerCell({ avatarUrl, username }: { avatarUrl: string | null; username: string }) {
  return (
    <div className="flex items-center gap-3 min-w-0">
      <Avatar avatarUrl={avatarUrl} username={username} />
      <span className="text-sm font-semibold text-foreground truncate">{username}</span>
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
    <div className="flex items-center justify-center h-[300px]">
      <div className="h-6 w-6 rounded-full border-2 border-accent border-t-transparent animate-spin" />
    </div>
  );
}

function Empty({ text }: { text: string }) {
  return (
    <div className="flex flex-col items-center justify-center h-[300px] gap-2 text-foreground-muted">
      <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" opacity={0.4}>
        <path d="M8.21 13.89L7 23l5-3 5 3-1.21-9.12" />
        <path d="M12 2l3.09 6.26L22 9.27l-5 4.87L18.18 21 12 17.27 5.82 21 7 14.14l-5-4.87 6.91-1.01L12 2z" />
      </svg>
      <p className="text-sm">{text}</p>
    </div>
  );
}
