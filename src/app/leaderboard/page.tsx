"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { HeadToHeadExplorer } from "@/components/leaderboard/HeadToHeadExplorer";
import { LiveMatchFeed } from "@/components/leaderboard/LiveMatchFeed";
import { PlayerProfileModal } from "@/components/leaderboard/PlayerProfileModal";
import { useAuth } from "@/components/auth";

type LeaderboardMode = "rankings" | "h2h" | "activity";
type GameCategory = "all" | "multiplayer" | "singleplayer";

type GameTab =
  | "caro"
  | "chess"
  | "battleship"
  | "wordchain"
  | "monopoly"
  | "2048"
  | "aimtrainer"
  | "minesweeper"
  | "sudoku"
  | "trex"
  | "wordle";

type MsLevel = "beginner" | "intermediate" | "expert";
type SudokuLevel = "easy" | "medium" | "hard";

interface Entry2048 {
  rank: number;
  username: string;
  avatarUrl: string | null;
  score: number;
  highestTile: number;
}

interface EntryMultiplayer {
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

interface EntrySudoku {
  rank: number;
  username: string;
  avatarUrl: string | null;
  time: number;
}

interface EntryAimTrainer {
  rank: number;
  username: string;
  avatarUrl: string | null;
  score: number;
  accuracy: number;
}

interface GameDefinition {
  id: GameTab;
  label: string;
  category: "multiplayer" | "singleplayer";
}

const ALL_GAMES: GameDefinition[] = [
  { id: "caro", label: "Caro", category: "multiplayer" },
  { id: "chess", label: "Chess", category: "multiplayer" },
  { id: "battleship", label: "Battleship", category: "multiplayer" },
  { id: "wordchain", label: "Word Chain", category: "multiplayer" },
  { id: "monopoly", label: "Monopoly", category: "multiplayer" },
  { id: "2048", label: "2048", category: "singleplayer" },
  { id: "aimtrainer", label: "Aim Trainer", category: "singleplayer" },
  { id: "minesweeper", label: "Minesweeper", category: "singleplayer" },
  { id: "sudoku", label: "Sudoku", category: "singleplayer" },
  { id: "trex", label: "T-Rex", category: "singleplayer" },
  { id: "wordle", label: "Wordle", category: "singleplayer" },
];

const GAME_ICONS: Record<GameTab, React.ReactNode> = {
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
  "2048": (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2">
      <rect x="3" y="3" width="8" height="8" rx="1.5" />
      <rect x="13" y="3" width="8" height="8" rx="1.5" />
      <rect x="3" y="13" width="8" height="8" rx="1.5" />
      <rect x="13" y="13" width="8" height="8" rx="1.5" />
    </svg>
  ),
  aimtrainer: (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round">
      <circle cx="12" cy="12" r="9" />
      <circle cx="12" cy="12" r="4.5" />
      <circle cx="12" cy="12" r="1.5" fill="currentColor" />
    </svg>
  ),
  minesweeper: (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round">
      <circle cx="12" cy="12" r="7.5" />
      <line x1="12" y1="2" x2="12" y2="4.5" />
      <line x1="12" y1="19.5" x2="12" y2="22" />
      <line x1="2" y1="12" x2="4.5" y2="12" />
      <line x1="19.5" y1="12" x2="22" y2="12" />
    </svg>
  ),
  sudoku: (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2">
      <rect x="3" y="3" width="18" height="18" rx="2" />
      <line x1="9" y1="3" x2="9" y2="21" />
      <line x1="15" y1="3" x2="15" y2="21" />
      <line x1="3" y1="9" x2="21" y2="9" />
      <line x1="3" y1="15" x2="21" y2="15" />
    </svg>
  ),
  trex: (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
      <rect x="2" y="10" width="20" height="4" rx="1.5" />
      <path d="M6 14v5a1 1 0 0 0 1 1h2" />
      <path d="M14 14v5a1 1 0 0 0 1 1h2" />
      <path d="M14 10V5a1 1 0 0 1 1-1h4" />
    </svg>
  ),
  wordle: (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
      <rect x="3" y="3" width="18" height="18" rx="2" />
      <path d="M7 8h10M12 8v8" />
    </svg>
  ),
};

const TAB_INDEX: Record<string, number> = {
  caro: 0,
  chess: 1,
  battleship: 2,
  wordchain: 3,
  monopoly: 4,
  "2048": 5,
  aimtrainer: 6,
  minesweeper: 7,
  sudoku: 8,
  trex: 9,
  wordle: 10,
};

const MS_INDEX: Record<string, number> = { beginner: 0, intermediate: 1, expert: 2 };
const SUDOKU_INDEX: Record<string, number> = { easy: 0, medium: 1, hard: 2 };

const MS_LEVELS: { id: MsLevel; label: string }[] = [
  { id: "beginner", label: "Beginner" },
  { id: "intermediate", label: "Intermediate" },
  { id: "expert", label: "Expert" },
];

const SUDOKU_LEVELS: { id: SudokuLevel; label: string }[] = [
  { id: "easy", label: "Easy" },
  { id: "medium", label: "Medium" },
  { id: "hard", label: "Hard" },
];

const slideVariants = {
  enter: (dir: number) => ({
    x: dir > 0 ? 50 : -50,
    opacity: 0,
  }),
  center: {
    x: 0,
    opacity: 1,
  },
  exit: (dir: number) => ({
    x: dir > 0 ? -50 : 50,
    opacity: 0,
  }),
};

const slideTransition = {
  type: "spring" as const,
  stiffness: 350,
  damping: 32,
  mass: 0.8,
};

function formatTime(seconds: number): string {
  if (!seconds || seconds <= 0) return "--:--";
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
}

export default function LeaderboardPage() {
  const { user } = useAuth();
  const [mode, setMode] = useState<LeaderboardMode>("rankings");
  const [categoryFilter, setCategoryFilter] = useState<GameCategory>("all");
  const [activeGame, setActiveGame] = useState<GameTab>("caro");

  const [msLevel, setMsLevel] = useState<MsLevel>("beginner");
  const [sudokuLevel, setSudokuLevel] = useState<SudokuLevel>("easy");

  // Direction ref for smooth horizontal slide animation between games
  const slideDirRef = useRef(1);

  // Scroll bounds state for game pills bar
  const pillsContainerRef = useRef<HTMLDivElement>(null);
  const [canScrollLeft, setCanScrollLeft] = useState(false);
  const [canScrollRight, setCanScrollRight] = useState(false);

  const updateScrollState = useCallback(() => {
    const el = pillsContainerRef.current;
    if (!el) return;
    const { scrollLeft, scrollWidth, clientWidth } = el;
    setCanScrollLeft(scrollLeft > 6);
    setCanScrollRight(scrollLeft + clientWidth < scrollWidth - 6);
  }, []);

  // Game data state
  const [data2048, setData2048] = useState<Entry2048[]>([]);
  const [dataCaro, setDataCaro] = useState<EntryMultiplayer[]>([]);
  const [dataChess, setDataChess] = useState<EntryMultiplayer[]>([]);
  const [dataBattleship, setDataBattleship] = useState<EntryMultiplayer[]>([]);
  const [dataWordChain, setDataWordChain] = useState<EntryMultiplayer[]>([]);
  const [dataMonopoly, setDataMonopoly] = useState<EntryMultiplayer[]>([]);
  const [dataAimTrainer, setDataAimTrainer] = useState<EntryAimTrainer[]>([]);
  const [dataMs, setDataMs] = useState<EntryMinesweeper[]>([]);
  const [dataWordle, setDataWordle] = useState<EntryWordle[]>([]);
  const [dataTrex, setDataTrex] = useState<EntryTrex[]>([]);
  const [dataSudoku, setDataSudoku] = useState<EntrySudoku[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Selected player profile modal
  const [selectedPlayer, setSelectedPlayer] = useState<string | null>(null);

  // Cross-link params for H2H explorer
  const [h2hP1, setH2HP1] = useState<string>("");
  const [h2hP2, setH2HP2] = useState<string>("");

  const filteredGameList = ALL_GAMES.filter((g) => {
    if (categoryFilter === "all") return true;
    return g.category === categoryFilter;
  });

  // Ensure activeGame is in filtered list when category changes
  useEffect(() => {
    if (filteredGameList.length > 0 && !filteredGameList.some((g) => g.id === activeGame)) {
      setActiveGame(filteredGameList[0].id);
    }
  }, [categoryFilter, filteredGameList, activeGame]);

  const handleGameChange = (tab: GameTab) => {
    if (tab === activeGame) return;
    slideDirRef.current = (TAB_INDEX[tab] ?? 0) > (TAB_INDEX[activeGame] ?? 0) ? 1 : -1;
    setActiveGame(tab);
  };

  const handleLevelChange = (lv: MsLevel) => {
    if (lv === msLevel) return;
    slideDirRef.current = MS_INDEX[lv] > MS_INDEX[msLevel] ? 1 : -1;
    setMsLevel(lv);
  };

  const handleSudokuLevelChange = (lv: SudokuLevel) => {
    if (lv === sudokuLevel) return;
    slideDirRef.current = SUDOKU_INDEX[lv] > SUDOKU_INDEX[sudokuLevel] ? 1 : -1;
    setSudokuLevel(lv);
  };

  // Update scroll bounds on mount, resize, and category filter change
  useEffect(() => {
    const el = pillsContainerRef.current;
    if (!el) return;
    updateScrollState();
    const timer = setTimeout(updateScrollState, 150);
    el.addEventListener("scroll", updateScrollState, { passive: true });
    window.addEventListener("resize", updateScrollState);
    return () => {
      clearTimeout(timer);
      el.removeEventListener("scroll", updateScrollState);
      window.removeEventListener("resize", updateScrollState);
    };
  }, [updateScrollState, categoryFilter, filteredGameList]);

  // Fetch rankings
  useEffect(() => {
    if (mode !== "rankings") return;
    let active = true;
    setIsLoading(true);

    async function fetchLeaderboard() {
      try {
        let url = `/api/leaderboard?game=${activeGame}`;
        if (activeGame === "minesweeper") {
          url += `&level=${msLevel}`;
        } else if (activeGame === "sudoku") {
          url += `&level=${sudokuLevel}`;
        }
        const res = await fetch(url);
        if (!res.ok) throw new Error("Failed to fetch");
        const json = await res.json();

        if (active) {
          if (activeGame === "2048") setData2048(json.leaderboard || []);
          else if (activeGame === "caro") setDataCaro(json.leaderboard || []);
          else if (activeGame === "chess") setDataChess(json.leaderboard || []);
          else if (activeGame === "battleship") setDataBattleship(json.leaderboard || []);
          else if (activeGame === "wordchain") setDataWordChain(json.leaderboard || []);
          else if (activeGame === "monopoly") setDataMonopoly(json.leaderboard || []);
          else if (activeGame === "aimtrainer") setDataAimTrainer(json.leaderboard || []);
          else if (activeGame === "minesweeper") setDataMs(json.leaderboard || []);
          else if (activeGame === "wordle") setDataWordle(json.leaderboard || []);
          else if (activeGame === "trex") setDataTrex(json.leaderboard || []);
          else if (activeGame === "sudoku") setDataSudoku(json.leaderboard || []);
        }
      } catch (error) {
        console.error("Error fetching leaderboard:", error);
      } finally {
        if (active) setIsLoading(false);
      }
    }

    fetchLeaderboard();
    return () => {
      active = false;
    };
  }, [mode, activeGame, msLevel, sudokuLevel]);

  const handleInspectH2H = (p1: string, p2: string) => {
    setH2HP1(p1);
    setH2HP2(p2);
    setMode("h2h");
  };

  const handleCompareWithMe = (targetUsername: string) => {
    if (user?.username) {
      setH2HP1(user.username);
    }
    setH2HP2(targetUsername);
    setMode("h2h");
  };

  const contentKey =
    activeGame === "minesweeper"
      ? `ms-${msLevel}`
      : activeGame === "sudoku"
      ? `sudoku-${sudokuLevel}`
      : activeGame;

  return (
    <div className="mx-auto max-w-5xl px-4 py-8 sm:py-12 space-y-7">
      {/* ── Page Header ───────────────────────────────────────── */}
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
        <div>
          <h1 className="text-3xl sm:text-4xl font-extrabold text-foreground tracking-tight">
            Leader<span className="text-gradient">board</span>
          </h1>
          <p className="text-foreground-secondary text-sm mt-1">
            Global rankings, head-to-head records, and match history.
          </p>
        </div>

        {/* ── Top Level View Switcher with Slide Animation ───── */}
        <div className="flex items-center p-1 rounded-2xl bg-surface border border-border shrink-0 shadow-sm">
          {[
            { id: "rankings", label: "Rankings" },
            { id: "h2h", label: "Head-to-Head" },
            { id: "activity", label: "Match History" },
          ].map((m) => {
            const isModeActive = mode === m.id;
            return (
              <button
                key={m.id}
                onClick={() => setMode(m.id as LeaderboardMode)}
                className={`relative px-4 py-2 rounded-xl text-xs font-bold transition-colors ${
                  isModeActive
                    ? "text-accent dark:text-white"
                    : "text-foreground-secondary hover:text-foreground"
                }`}
              >
                {isModeActive && (
                  <motion.div
                    layoutId="activeModeIndicator"
                    className="absolute inset-0 rounded-xl bg-accent/15 border border-accent/30 dark:bg-accent dark:border-transparent shadow-xs"
                    transition={{ type: "spring", stiffness: 450, damping: 35 }}
                  />
                )}
                <span className="relative z-10">{m.label}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* ── VIEW 1: GLOBAL RANKINGS ───────────────────────────── */}
      {mode === "rankings" && (
        <div className="space-y-6">
          {/* Category Filter + Game Selector Pill Bar */}
          <div className="rounded-2xl border border-border bg-surface shadow-sm p-4 sm:p-5 space-y-4">
            {/* Category Filter Segmented Control with layoutId Slide */}
            <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border/60 pb-3">
              <div className="flex items-center gap-2">
                <span className="text-xs font-bold text-foreground-muted uppercase tracking-wider">
                  Category:
                </span>
                <div className="flex items-center gap-1">
                  {[
                    { id: "all", label: "All Games (11)" },
                    { id: "multiplayer", label: "Multiplayer (5)" },
                    { id: "singleplayer", label: "Singleplayer (6)" },
                  ].map((cat) => {
                    const isCatActive = categoryFilter === cat.id;
                    return (
                      <button
                        key={cat.id}
                        onClick={() => setCategoryFilter(cat.id as GameCategory)}
                        className={`relative px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-colors ${
                          isCatActive
                            ? "text-accent dark:text-white font-bold"
                            : "text-foreground-secondary hover:text-foreground"
                        }`}
                      >
                        {isCatActive && (
                          <motion.div
                            layoutId="activeCategoryIndicator"
                            className="absolute inset-0 rounded-lg bg-accent/15 border border-accent/30 dark:bg-accent dark:border-transparent shadow-xs"
                            transition={{ type: "spring", stiffness: 450, damping: 35 }}
                          />
                        )}
                        <span className="relative z-10">{cat.label}</span>
                      </button>
                    );
                  })}
                </div>
              </div>

              <span className="text-xs text-foreground-muted">
                Showing <strong className="text-foreground">{filteredGameList.length}</strong> games
              </span>
            </div>

            {/* Horizontal Game Selector Bar with layoutId Slide Pill */}
            <div className="relative">
              {/* Left scroll chevron */}
              <AnimatePresence>
                {canScrollLeft && (
                  <motion.button
                    initial={{ opacity: 0, scale: 0.8 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.8 }}
                    transition={{ duration: 0.15 }}
                    type="button"
                    onClick={() => {
                      pillsContainerRef.current?.scrollBy({ left: -220, behavior: "smooth" });
                    }}
                    className="absolute -left-3 top-1/2 -translate-y-1/2 z-20 h-7 w-7 rounded-full bg-surface border border-border shadow-md flex items-center justify-center text-foreground-secondary hover:text-foreground hover:bg-surface-hover transition-colors hidden sm:flex"
                    title="Scroll left"
                  >
                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                      <polyline points="15 18 9 12 15 6" />
                    </svg>
                  </motion.button>
                )}
              </AnimatePresence>

              {/* Scrollable Container with no-scrollbar */}
              <div
                ref={pillsContainerRef}
                id="game-pills-container"
                className="flex items-center gap-1.5 overflow-x-auto py-1 px-1 no-scrollbar scroll-smooth"
              >
                {filteredGameList.map((g) => {
                  const isActive = activeGame === g.id;
                  return (
                    <button
                      key={g.id}
                      onClick={() => handleGameChange(g.id)}
                      className={`relative shrink-0 flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-semibold transition-colors ${
                        isActive
                          ? "text-accent dark:text-white font-bold"
                          : "text-foreground-secondary hover:text-foreground hover:bg-surface-hover/70"
                      }`}
                    >
                      {isActive && (
                        <motion.div
                          layoutId="activeGameIndicator"
                          className="absolute inset-0 rounded-xl bg-accent/15 border border-accent/30 dark:bg-accent dark:border-transparent shadow-xs"
                          transition={{ type: "spring", stiffness: 450, damping: 35 }}
                        />
                      )}
                      <span className="relative z-10 flex items-center gap-2">
                        <span className={isActive ? "text-accent dark:text-white" : "text-foreground-muted"}>
                          {GAME_ICONS[g.id]}
                        </span>
                        <span>{g.label}</span>
                      </span>
                    </button>
                  );
                })}
              </div>

              {/* Right scroll chevron */}
              <AnimatePresence>
                {canScrollRight && (
                  <motion.button
                    initial={{ opacity: 0, scale: 0.8 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.8 }}
                    transition={{ duration: 0.15 }}
                    type="button"
                    onClick={() => {
                      pillsContainerRef.current?.scrollBy({ left: 220, behavior: "smooth" });
                    }}
                    className="absolute -right-3 top-1/2 -translate-y-1/2 z-20 h-7 w-7 rounded-full bg-surface border border-border shadow-md flex items-center justify-center text-foreground-secondary hover:text-foreground hover:bg-surface-hover transition-colors hidden sm:flex"
                    title="Scroll right"
                  >
                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                      <polyline points="9 18 15 12 9 6" />
                    </svg>
                  </motion.button>
                )}
              </AnimatePresence>
            </div>
          </div>

          {/* ── Main Rankings Card with Slide Transitions ──────── */}
          <div className="rounded-2xl border border-border bg-surface shadow-sm overflow-hidden">
            {/* Minesweeper sub-tabs */}
            <AnimatePresence initial={false}>
              {activeGame === "minesweeper" && (
                <motion.div
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: "auto", opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  transition={{ duration: 0.2 }}
                  className="overflow-hidden border-b border-border/60 bg-background-secondary/30"
                >
                  <div className="flex items-center gap-2 px-5 py-2.5">
                    <span className="text-xs font-bold text-foreground-muted uppercase mr-1">Difficulty:</span>
                    <div className="flex items-center gap-1">
                      {MS_LEVELS.map((lv) => {
                        const isLvActive = msLevel === lv.id;
                        return (
                          <button
                            key={lv.id}
                            onClick={() => handleLevelChange(lv.id)}
                            className={`relative px-3 py-1 rounded-lg text-xs font-semibold transition-colors ${
                              isLvActive ? "text-accent dark:text-white font-bold" : "text-foreground-secondary hover:text-foreground"
                            }`}
                          >
                            {isLvActive && (
                              <motion.div
                                layoutId="ms-level-pill"
                                className="absolute inset-0 rounded-lg bg-accent/15 border border-accent/30 dark:bg-accent dark:border-transparent shadow-xs"
                                transition={{ type: "spring", stiffness: 450, damping: 35 }}
                              />
                            )}
                            <span className="relative z-10">{lv.label}</span>
                          </button>
                        );
                      })}
                    </div>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

            {/* Sudoku sub-tabs */}
            <AnimatePresence initial={false}>
              {activeGame === "sudoku" && (
                <motion.div
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: "auto", opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  transition={{ duration: 0.2 }}
                  className="overflow-hidden border-b border-border/60 bg-background-secondary/30"
                >
                  <div className="flex items-center gap-2 px-5 py-2.5">
                    <span className="text-xs font-bold text-foreground-muted uppercase mr-1">Difficulty:</span>
                    <div className="flex items-center gap-1">
                      {SUDOKU_LEVELS.map((lv) => {
                        const isLvActive = sudokuLevel === lv.id;
                        return (
                          <button
                            key={lv.id}
                            onClick={() => handleSudokuLevelChange(lv.id)}
                            className={`relative px-3 py-1 rounded-lg text-xs font-semibold transition-colors ${
                              isLvActive ? "text-accent dark:text-white font-bold" : "text-foreground-secondary hover:text-foreground"
                            }`}
                          >
                            {isLvActive && (
                              <motion.div
                                layoutId="sudoku-level-pill"
                                className="absolute inset-0 rounded-lg bg-accent/15 border border-accent/30 dark:bg-accent dark:border-transparent shadow-xs"
                                transition={{ type: "spring", stiffness: 450, damping: 35 }}
                              />
                            )}
                            <span className="relative z-10">{lv.label}</span>
                          </button>
                        );
                      })}
                    </div>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

            {/* Slide animated leaderboard body */}
            <div className="min-h-[380px] overflow-hidden">
              <AnimatePresence mode="wait" custom={slideDirRef.current}>
                <motion.div
                  key={contentKey}
                  custom={slideDirRef.current}
                  variants={slideVariants}
                  initial="enter"
                  animate="center"
                  exit="exit"
                  transition={slideTransition}
                >
                  {isLoading ? (
                    <Spinner />
                  ) : (
                    <>
                      {/* ── 2048 ── */}
                      {activeGame === "2048" && (
                        <>
                          <TableHeader cols="grid-cols-[56px_1fr_110px_110px]">
                            <span>Rank</span>
                            <span>Player</span>
                            <span className="text-right">Highest Tile</span>
                            <span className="text-right">Score</span>
                          </TableHeader>
                          {data2048.length === 0 ? (
                            <Empty text="No 2048 scores recorded yet. Be the first to reach 2048!" />
                          ) : (
                            data2048.map((e, i) => (
                              <TableRow
                                key={e.username}
                                index={i}
                                isLast={i === data2048.length - 1}
                                cols="grid-cols-[56px_1fr_110px_110px]"
                                onClick={() => setSelectedPlayer(e.username)}
                              >
                                <RankBadge rank={e.rank} />
                                <PlayerCell avatarUrl={e.avatarUrl} username={e.username} isCurrent={user?.username === e.username} />
                                <span className="text-sm font-bold text-amber-500 text-right tabular-nums">
                                  {e.highestTile > 0 ? e.highestTile : "-"}
                                </span>
                                <span className="text-sm font-bold text-foreground text-right tabular-nums">
                                  {e.score.toLocaleString()}
                                </span>
                              </TableRow>
                            ))
                          )}
                        </>
                      )}

                      {/* ── Caro ── */}
                      {activeGame === "caro" && (
                        <>
                          <TableHeader cols="grid-cols-[56px_1fr_100px_100px_100px]">
                            <span>Rank</span>
                            <span>Player</span>
                            <span className="text-right">Wins</span>
                            <span className="text-right">Games</span>
                            <span className="text-right">Win %</span>
                          </TableHeader>
                          {dataCaro.length === 0 ? (
                            <Empty text="No Caro matches recorded yet. Jump in and play a match!" />
                          ) : (
                            dataCaro.map((e, i) => (
                              <TableRow
                                key={e.username}
                                index={i}
                                isLast={i === dataCaro.length - 1}
                                cols="grid-cols-[56px_1fr_100px_100px_100px]"
                                onClick={() => setSelectedPlayer(e.username)}
                              >
                                <RankBadge rank={e.rank} />
                                <PlayerCell avatarUrl={e.avatarUrl} username={e.username} isCurrent={user?.username === e.username} />
                                <span className="text-sm font-bold text-foreground text-right tabular-nums">{e.wins}</span>
                                <span className="text-sm text-foreground-secondary text-right tabular-nums">{e.total}</span>
                                <span className="text-sm text-right tabular-nums">
                                  <span className={`font-semibold ${e.winRate >= 60 ? "text-emerald-500" : e.winRate >= 40 ? "text-amber-500" : "text-foreground-muted"}`}>
                                    {e.winRate}%
                                  </span>
                                </span>
                              </TableRow>
                            ))
                          )}
                        </>
                      )}

                      {/* ── Chess ── */}
                      {activeGame === "chess" && (
                        <>
                          <TableHeader cols="grid-cols-[56px_1fr_100px_100px_100px]">
                            <span>Rank</span>
                            <span>Player</span>
                            <span className="text-right">Wins</span>
                            <span className="text-right">Games</span>
                            <span className="text-right">Win %</span>
                          </TableHeader>
                          {dataChess.length === 0 ? (
                            <Empty text="No chess matches recorded yet. Play a game to rank up!" />
                          ) : (
                            dataChess.map((e, i) => (
                              <TableRow
                                key={e.username}
                                index={i}
                                isLast={i === dataChess.length - 1}
                                cols="grid-cols-[56px_1fr_100px_100px_100px]"
                                onClick={() => setSelectedPlayer(e.username)}
                              >
                                <RankBadge rank={e.rank} />
                                <PlayerCell avatarUrl={e.avatarUrl} username={e.username} isCurrent={user?.username === e.username} />
                                <span className="text-sm font-bold text-foreground text-right tabular-nums flex items-center justify-end gap-1">
                                  <span className="text-amber-500">♔</span>
                                  {e.wins}
                                </span>
                                <span className="text-sm text-foreground-secondary text-right tabular-nums">{e.total}</span>
                                <span className="text-sm font-semibold text-accent text-right tabular-nums">{e.winRate}%</span>
                              </TableRow>
                            ))
                          )}
                        </>
                      )}

                      {/* ── Battleship ── */}
                      {activeGame === "battleship" && (
                        <>
                          <TableHeader cols="grid-cols-[56px_1fr_100px_100px_100px]">
                            <span>Rank</span>
                            <span>Player</span>
                            <span className="text-right">Wins</span>
                            <span className="text-right">Games</span>
                            <span className="text-right">Win %</span>
                          </TableHeader>
                          {dataBattleship.length === 0 ? (
                            <Empty text="No Battleship matches recorded yet. Sink opponent fleets to rank up!" />
                          ) : (
                            dataBattleship.map((e, i) => (
                              <TableRow
                                key={e.username}
                                index={i}
                                isLast={i === dataBattleship.length - 1}
                                cols="grid-cols-[56px_1fr_100px_100px_100px]"
                                onClick={() => setSelectedPlayer(e.username)}
                              >
                                <RankBadge rank={e.rank} />
                                <PlayerCell avatarUrl={e.avatarUrl} username={e.username} isCurrent={user?.username === e.username} />
                                <span className="text-sm font-bold text-foreground text-right tabular-nums">{e.wins}</span>
                                <span className="text-sm text-foreground-secondary text-right tabular-nums">{e.total}</span>
                                <span className="text-sm font-semibold text-accent text-right tabular-nums">{e.winRate}%</span>
                              </TableRow>
                            ))
                          )}
                        </>
                      )}

                      {/* ── Word Chain ── */}
                      {activeGame === "wordchain" && (
                        <>
                          <TableHeader cols="grid-cols-[56px_1fr_100px_100px_100px]">
                            <span>Rank</span>
                            <span>Player</span>
                            <span className="text-right">Wins</span>
                            <span className="text-right">Games</span>
                            <span className="text-right">Win %</span>
                          </TableHeader>
                          {dataWordChain.length === 0 ? (
                            <Empty text="No players yet. Be the first to win a Word Chain match!" />
                          ) : (
                            dataWordChain.map((e, i) => (
                              <TableRow
                                key={e.username}
                                index={i}
                                isLast={i === dataWordChain.length - 1}
                                cols="grid-cols-[56px_1fr_100px_100px_100px]"
                                onClick={() => setSelectedPlayer(e.username)}
                              >
                                <RankBadge rank={e.rank} />
                                <PlayerCell avatarUrl={e.avatarUrl} username={e.username} isCurrent={user?.username === e.username} />
                                <span className="text-sm font-bold text-foreground text-right tabular-nums">{e.wins}</span>
                                <span className="text-sm text-foreground-secondary text-right tabular-nums">{e.total}</span>
                                <span className="text-sm font-semibold text-accent text-right tabular-nums">{e.winRate}%</span>
                              </TableRow>
                            ))
                          )}
                        </>
                      )}

                      {/* ── Monopoly ── */}
                      {activeGame === "monopoly" && (
                        <>
                          <TableHeader cols="grid-cols-[56px_1fr_100px_100px_100px]">
                            <span>Rank</span>
                            <span>Player</span>
                            <span className="text-right">Wins</span>
                            <span className="text-right">Games</span>
                            <span className="text-right">Win %</span>
                          </TableHeader>
                          {dataMonopoly.length === 0 ? (
                            <Empty text="No Monopoly matches recorded yet. Dominate the board to rank up!" />
                          ) : (
                            dataMonopoly.map((e, i) => (
                              <TableRow
                                key={e.username}
                                index={i}
                                isLast={i === dataMonopoly.length - 1}
                                cols="grid-cols-[56px_1fr_100px_100px_100px]"
                                onClick={() => setSelectedPlayer(e.username)}
                              >
                                <RankBadge rank={e.rank} />
                                <PlayerCell avatarUrl={e.avatarUrl} username={e.username} isCurrent={user?.username === e.username} />
                                <span className="text-sm font-bold text-foreground text-right tabular-nums">{e.wins}</span>
                                <span className="text-sm text-foreground-secondary text-right tabular-nums">{e.total}</span>
                                <span className="text-sm font-semibold text-accent text-right tabular-nums">{e.winRate}%</span>
                              </TableRow>
                            ))
                          )}
                        </>
                      )}

                      {/* ── Aim Trainer ── */}
                      {activeGame === "aimtrainer" && (
                        <>
                          <TableHeader cols="grid-cols-[56px_1fr_110px_110px]">
                            <span>Rank</span>
                            <span>Player</span>
                            <span className="text-right">Accuracy</span>
                            <span className="text-right">High Score</span>
                          </TableHeader>
                          {dataAimTrainer.length === 0 ? (
                            <Empty text="No Aim Trainer records yet. Practice your mouse precision!" />
                          ) : (
                            dataAimTrainer.map((e, i) => (
                              <TableRow
                                key={e.username}
                                index={i}
                                isLast={i === dataAimTrainer.length - 1}
                                cols="grid-cols-[56px_1fr_110px_110px]"
                                onClick={() => setSelectedPlayer(e.username)}
                              >
                                <RankBadge rank={e.rank} />
                                <PlayerCell avatarUrl={e.avatarUrl} username={e.username} isCurrent={user?.username === e.username} />
                                <span className="text-sm font-semibold text-emerald-500 text-right tabular-nums">
                                  {e.accuracy > 0 ? `${e.accuracy}%` : "-"}
                                </span>
                                <span className="text-sm font-bold text-foreground text-right tabular-nums">
                                  {e.score} pts
                                </span>
                              </TableRow>
                            ))
                          )}
                        </>
                      )}

                      {/* ── Minesweeper ── */}
                      {activeGame === "minesweeper" && (
                        <>
                          <TableHeader cols="grid-cols-[56px_1fr_120px]">
                            <span>Rank</span>
                            <span>Player</span>
                            <span className="text-right">Best Time</span>
                          </TableHeader>
                          {dataMs.length === 0 ? (
                            <Empty text={`No records yet for ${msLevel}. Be the first to sweep the board!`} />
                          ) : (
                            dataMs.map((e, i) => (
                              <TableRow
                                key={e.username}
                                index={i}
                                isLast={i === dataMs.length - 1}
                                cols="grid-cols-[56px_1fr_120px]"
                                onClick={() => setSelectedPlayer(e.username)}
                              >
                                <RankBadge rank={e.rank} />
                                <PlayerCell avatarUrl={e.avatarUrl} username={e.username} isCurrent={user?.username === e.username} />
                                <span className="text-sm font-bold text-foreground text-right tabular-nums flex items-center justify-end gap-1.5">
                                  <span className="text-foreground-muted">⏱</span>
                                  {formatTime(e.time)}
                                </span>
                              </TableRow>
                            ))
                          )}
                        </>
                      )}

                      {/* ── Sudoku ── */}
                      {activeGame === "sudoku" && (
                        <>
                          <TableHeader cols="grid-cols-[56px_1fr_120px]">
                            <span>Rank</span>
                            <span>Player</span>
                            <span className="text-right">Best Time</span>
                          </TableHeader>
                          {dataSudoku.length === 0 ? (
                            <Empty text={`No records yet for ${sudokuLevel}. Be the first to solve a Sudoku!`} />
                          ) : (
                            dataSudoku.map((e, i) => (
                              <TableRow
                                key={e.username}
                                index={i}
                                isLast={i === dataSudoku.length - 1}
                                cols="grid-cols-[56px_1fr_120px]"
                                onClick={() => setSelectedPlayer(e.username)}
                              >
                                <RankBadge rank={e.rank} />
                                <PlayerCell avatarUrl={e.avatarUrl} username={e.username} isCurrent={user?.username === e.username} />
                                <span className="text-sm font-bold text-foreground text-right tabular-nums flex items-center justify-end gap-1.5">
                                  <span className="text-foreground-muted">⏱</span>
                                  {formatTime(e.time)}
                                </span>
                              </TableRow>
                            ))
                          )}
                        </>
                      )}

                      {/* ── T-Rex ── */}
                      {activeGame === "trex" && (
                        <>
                          <TableHeader cols="grid-cols-[56px_1fr_120px]">
                            <span>Rank</span>
                            <span>Player</span>
                            <span className="text-right">Score</span>
                          </TableHeader>
                          {dataTrex.length === 0 ? (
                            <Empty text="No runner scores recorded yet. Run as far as you can!" />
                          ) : (
                            dataTrex.map((e, i) => (
                              <TableRow
                                key={e.username}
                                index={i}
                                isLast={i === dataTrex.length - 1}
                                cols="grid-cols-[56px_1fr_120px]"
                                onClick={() => setSelectedPlayer(e.username)}
                              >
                                <RankBadge rank={e.rank} />
                                <PlayerCell avatarUrl={e.avatarUrl} username={e.username} isCurrent={user?.username === e.username} />
                                <span className="text-sm font-bold text-foreground text-right tabular-nums flex items-center justify-end gap-1.5">
                                  <span className="text-amber-500">⭐</span>
                                  {e.score.toLocaleString()}
                                </span>
                              </TableRow>
                            ))
                          )}
                        </>
                      )}

                      {/* ── Wordle ── */}
                      {activeGame === "wordle" && (
                        <>
                          <TableHeader cols="grid-cols-[56px_1fr_120px]">
                            <span>Rank</span>
                            <span>Player</span>
                            <span className="text-right">Wins</span>
                          </TableHeader>
                          {dataWordle.length === 0 ? (
                            <Empty text="No Wordle wins recorded yet. Guess the secret word!" />
                          ) : (
                            dataWordle.map((e, i) => (
                              <TableRow
                                key={e.username}
                                index={i}
                                isLast={i === dataWordle.length - 1}
                                cols="grid-cols-[56px_1fr_120px]"
                                onClick={() => setSelectedPlayer(e.username)}
                              >
                                <RankBadge rank={e.rank} />
                                <PlayerCell avatarUrl={e.avatarUrl} username={e.username} isCurrent={user?.username === e.username} />
                                <span className="text-sm font-bold text-emerald-500 text-right tabular-nums">
                                  {e.wins}
                                </span>
                              </TableRow>
                            ))
                          )}
                        </>
                      )}
                    </>
                  )}
                </motion.div>
              </AnimatePresence>
            </div>
          </div>
        </div>
      )}

      {/* ── VIEW 2: HEAD-TO-HEAD RIVALRY EXPLORER ─────────────── */}
      {mode === "h2h" && (
        <HeadToHeadExplorer
          initialPlayer1={h2hP1 || user?.username || ""}
          initialPlayer2={h2hP2}
          onOpenPlayerProfile={(uname) => setSelectedPlayer(uname)}
        />
      )}

      {/* ── VIEW 3: LIVE MATCH ACTIVITY FEED ─────────────────── */}
      {mode === "activity" && (
        <LiveMatchFeed
          onInspectH2H={handleInspectH2H}
          onOpenPlayer={(uname) => setSelectedPlayer(uname)}
        />
      )}

      {/* ── Player Profile Dossier Modal ──────────────────────── */}
      <AnimatePresence>
        {selectedPlayer && (
          <PlayerProfileModal
            username={selectedPlayer}
            onClose={() => setSelectedPlayer(null)}
            onCompareWithMe={handleCompareWithMe}
          />
        )}
      </AnimatePresence>
    </div>
  );
}

// ── Shared Table Sub-components ──────────────────────────────────

function getGridTemplate(cols: string) {
  if (cols.startsWith("grid-cols-[")) {
    return cols.slice("grid-cols-[".length, -1).replace(/_/g, " ");
  }
  return cols;
}

function TableHeader({ cols, children }: { cols: string; children: React.ReactNode }) {
  const template = getGridTemplate(cols);
  return (
    <div
      style={{ gridTemplateColumns: template }}
      className="grid gap-2 px-5 py-3 border-b border-border/60 text-xs font-bold text-foreground-muted uppercase tracking-wider bg-background-secondary/30"
    >
      {children}
    </div>
  );
}

function TableRow({
  cols,
  index,
  isLast,
  onClick,
  children,
}: {
  cols: string;
  index: number;
  isLast?: boolean;
  onClick?: () => void;
  children: React.ReactNode;
}) {
  const template = getGridTemplate(cols);
  return (
    <motion.div
      initial={{ opacity: 0, x: -10 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ delay: index * 0.03 }}
      onClick={onClick}
      style={{ gridTemplateColumns: template }}
      className={`grid gap-2 px-5 py-3 items-center hover:bg-surface-hover transition-colors cursor-pointer ${
        !isLast ? "border-b border-border/30" : ""
      }`}
    >
      {children}
    </motion.div>
  );
}

function PlayerCell({
  avatarUrl,
  username,
  isCurrent,
}: {
  avatarUrl: string | null;
  username: string;
  isCurrent?: boolean;
}) {
  return (
    <div className="flex items-center gap-3 min-w-0">
      <Avatar avatarUrl={avatarUrl} username={username} />
      <div className="flex items-center gap-1.5 truncate">
        <span className="text-sm font-semibold text-foreground truncate hover:text-accent transition-colors">
          {username}
        </span>
        {isCurrent && (
          <span className="px-1.5 py-0.2 rounded bg-accent-light text-accent text-[10px] font-bold uppercase">
            You
          </span>
        )}
      </div>
    </div>
  );
}

function RankBadge({ rank }: { rank: number }) {
  if (rank <= 3) {
    return (
      <div
        className={`flex h-7 w-7 items-center justify-center rounded-full bg-gradient-to-br ${
          rank === 1
            ? "from-amber-400 to-yellow-500"
            : rank === 2
            ? "from-slate-300 to-slate-400"
            : "from-amber-600 to-orange-700"
        } text-xs font-bold text-white shadow-sm`}
      >
        {rank}
      </div>
    );
  }
  return <span className="text-sm font-semibold text-foreground-muted pl-2">{rank}</span>;
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
      <p className="text-sm font-medium">{text}</p>
    </div>
  );
}
