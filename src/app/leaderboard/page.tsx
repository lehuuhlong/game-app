"use client";

import { useState, useEffect, useRef, useCallback, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import Link from "next/link";
import { HeadToHeadExplorer } from "@/components/leaderboard/HeadToHeadExplorer";
import { LiveMatchFeed } from "@/components/leaderboard/LiveMatchFeed";
import { PlayerProfileModal } from "@/components/leaderboard/PlayerProfileModal";
import { ChampionsPodium } from "@/components/leaderboard/ChampionsPodium";
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

type WordleLevel = "overall" | "1" | "2" | "3" | "4" | "5" | "6";

interface EntryWordle {
  rank: number;
  username: string;
  avatarUrl: string | null;
  wins: number;
  total?: number;
  winRate?: number;
  count?: number;
  share?: number;
  guesses1?: number;
  guesses2?: number;
  guesses3?: number;
  guesses4?: number;
  guesses5?: number;
  guesses6?: number;
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
      <circle cx="12" cy="7.5" />
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
const WORDLE_INDEX: Record<WordleLevel, number> = {
  overall: 0,
  "1": 1,
  "2": 2,
  "3": 3,
  "4": 4,
  "5": 5,
  "6": 6,
};

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

const WORDLE_LEVELS: { id: WordleLevel; label: string }[] = [
  { id: "overall", label: "Overall" },
  { id: "1", label: "1st Try ⚡" },
  { id: "2", label: "2nd Try" },
  { id: "3", label: "3rd Try" },
  { id: "4", label: "4th Try" },
  { id: "5", label: "5th Try" },
  { id: "6", label: "6th Try" },
];

const slideVariants = {
  enter: (dir: number) => ({
    x: dir > 0 ? 40 : -40,
    opacity: 0,
  }),
  center: {
    x: 0,
    opacity: 1,
  },
  exit: (dir: number) => ({
    x: dir > 0 ? -40 : 40,
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
  const [wordleLevel, setWordleLevel] = useState<WordleLevel>("overall");

  // Username search filter on the table
  const [playerSearchQuery, setPlayerSearchQuery] = useState("");

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
    setPlayerSearchQuery("");
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

  const handleWordleLevelChange = (lv: WordleLevel) => {
    if (lv === wordleLevel) return;
    slideDirRef.current = WORDLE_INDEX[lv] > WORDLE_INDEX[wordleLevel] ? 1 : -1;
    setWordleLevel(lv);
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
        } else if (activeGame === "wordle") {
          url += `&level=${wordleLevel}`;
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
  }, [mode, activeGame, msLevel, sudokuLevel, wordleLevel]);

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

  // Compute Top 3 Champions Podium Data
  const podiumData = useMemo(() => {
    if (activeGame === "2048") {
      if (data2048.length === 0) return null;
      return {
        first: data2048[0] ? { rank: 1 as const, username: data2048[0].username, avatarUrl: data2048[0].avatarUrl, primaryStat: `${data2048[0].score.toLocaleString()} pts`, secondaryStat: `Tile ${data2048[0].highestTile}` } : null,
        second: data2048[1] ? { rank: 2 as const, username: data2048[1].username, avatarUrl: data2048[1].avatarUrl, primaryStat: `${data2048[1].score.toLocaleString()} pts`, secondaryStat: `Tile ${data2048[1].highestTile}` } : null,
        third: data2048[2] ? { rank: 3 as const, username: data2048[2].username, avatarUrl: data2048[2].avatarUrl, primaryStat: `${data2048[2].score.toLocaleString()} pts`, secondaryStat: `Tile ${data2048[2].highestTile}` } : null,
        metricLabel: "Score",
      };
    }
    if (activeGame === "caro") {
      if (dataCaro.length === 0) return null;
      return {
        first: dataCaro[0] ? { rank: 1 as const, username: dataCaro[0].username, avatarUrl: dataCaro[0].avatarUrl, primaryStat: `${dataCaro[0].winRate}% Win Rate`, secondaryStat: `${dataCaro[0].wins}W / ${dataCaro[0].total}G` } : null,
        second: dataCaro[1] ? { rank: 2 as const, username: dataCaro[1].username, avatarUrl: dataCaro[1].avatarUrl, primaryStat: `${dataCaro[1].winRate}% Win Rate`, secondaryStat: `${dataCaro[1].wins}W / ${dataCaro[1].total}G` } : null,
        third: dataCaro[2] ? { rank: 3 as const, username: dataCaro[2].username, avatarUrl: dataCaro[2].avatarUrl, primaryStat: `${dataCaro[2].winRate}% Win Rate`, secondaryStat: `${dataCaro[2].wins}W / ${dataCaro[2].total}G` } : null,
        metricLabel: "Win Rate",
      };
    }
    if (activeGame === "chess") {
      if (dataChess.length === 0) return null;
      return {
        first: dataChess[0] ? { rank: 1 as const, username: dataChess[0].username, avatarUrl: dataChess[0].avatarUrl, primaryStat: `${dataChess[0].winRate}% Win Rate`, secondaryStat: `${dataChess[0].wins} Wins` } : null,
        second: dataChess[1] ? { rank: 2 as const, username: dataChess[1].username, avatarUrl: dataChess[1].avatarUrl, primaryStat: `${dataChess[1].winRate}% Win Rate`, secondaryStat: `${dataChess[1].wins} Wins` } : null,
        third: dataChess[2] ? { rank: 3 as const, username: dataChess[2].username, avatarUrl: dataChess[2].avatarUrl, primaryStat: `${dataChess[2].winRate}% Win Rate`, secondaryStat: `${dataChess[2].wins} Wins` } : null,
        metricLabel: "Win Rate",
      };
    }
    if (activeGame === "battleship") {
      if (dataBattleship.length === 0) return null;
      return {
        first: dataBattleship[0] ? { rank: 1 as const, username: dataBattleship[0].username, avatarUrl: dataBattleship[0].avatarUrl, primaryStat: `${dataBattleship[0].winRate}% Win Rate`, secondaryStat: `${dataBattleship[0].wins} Wins` } : null,
        second: dataBattleship[1] ? { rank: 2 as const, username: dataBattleship[1].username, avatarUrl: dataBattleship[1].avatarUrl, primaryStat: `${dataBattleship[1].winRate}% Win Rate`, secondaryStat: `${dataBattleship[1].wins} Wins` } : null,
        third: dataBattleship[2] ? { rank: 3 as const, username: dataBattleship[2].username, avatarUrl: dataBattleship[2].avatarUrl, primaryStat: `${dataBattleship[2].winRate}% Win Rate`, secondaryStat: `${dataBattleship[2].wins} Wins` } : null,
        metricLabel: "Win Rate",
      };
    }
    if (activeGame === "wordchain") {
      if (dataWordChain.length === 0) return null;
      return {
        first: dataWordChain[0] ? { rank: 1 as const, username: dataWordChain[0].username, avatarUrl: dataWordChain[0].avatarUrl, primaryStat: `${dataWordChain[0].winRate}% Win Rate`, secondaryStat: `${dataWordChain[0].wins} Wins` } : null,
        second: dataWordChain[1] ? { rank: 2 as const, username: dataWordChain[1].username, avatarUrl: dataWordChain[1].avatarUrl, primaryStat: `${dataWordChain[1].winRate}% Win Rate`, secondaryStat: `${dataWordChain[1].wins} Wins` } : null,
        third: dataWordChain[2] ? { rank: 3 as const, username: dataWordChain[2].username, avatarUrl: dataWordChain[2].avatarUrl, primaryStat: `${dataWordChain[2].winRate}% Win Rate`, secondaryStat: `${dataWordChain[2].wins} Wins` } : null,
        metricLabel: "Win Rate",
      };
    }
    if (activeGame === "monopoly") {
      if (dataMonopoly.length === 0) return null;
      return {
        first: dataMonopoly[0] ? { rank: 1 as const, username: dataMonopoly[0].username, avatarUrl: dataMonopoly[0].avatarUrl, primaryStat: `${dataMonopoly[0].winRate}% Win Rate`, secondaryStat: `${dataMonopoly[0].wins} Wins` } : null,
        second: dataMonopoly[1] ? { rank: 2 as const, username: dataMonopoly[1].username, avatarUrl: dataMonopoly[1].avatarUrl, primaryStat: `${dataMonopoly[1].winRate}% Win Rate`, secondaryStat: `${dataMonopoly[1].wins} Wins` } : null,
        third: dataMonopoly[2] ? { rank: 3 as const, username: dataMonopoly[2].username, avatarUrl: dataMonopoly[2].avatarUrl, primaryStat: `${dataMonopoly[2].winRate}% Win Rate`, secondaryStat: `${dataMonopoly[2].wins} Wins` } : null,
        metricLabel: "Win Rate",
      };
    }
    if (activeGame === "aimtrainer") {
      if (dataAimTrainer.length === 0) return null;
      return {
        first: dataAimTrainer[0] ? { rank: 1 as const, username: dataAimTrainer[0].username, avatarUrl: dataAimTrainer[0].avatarUrl, primaryStat: `${dataAimTrainer[0].score} pts`, secondaryStat: `${dataAimTrainer[0].accuracy}% Acc` } : null,
        second: dataAimTrainer[1] ? { rank: 2 as const, username: dataAimTrainer[1].username, avatarUrl: dataAimTrainer[1].avatarUrl, primaryStat: `${dataAimTrainer[1].score} pts`, secondaryStat: `${dataAimTrainer[1].accuracy}% Acc` } : null,
        third: dataAimTrainer[2] ? { rank: 3 as const, username: dataAimTrainer[2].username, avatarUrl: dataAimTrainer[2].avatarUrl, primaryStat: `${dataAimTrainer[2].score} pts`, secondaryStat: `${dataAimTrainer[2].accuracy}% Acc` } : null,
        metricLabel: "Score",
      };
    }
    if (activeGame === "minesweeper") {
      if (dataMs.length === 0) return null;
      return {
        first: dataMs[0] ? { rank: 1 as const, username: dataMs[0].username, avatarUrl: dataMs[0].avatarUrl, primaryStat: formatTime(dataMs[0].time), secondaryStat: "Clear Time" } : null,
        second: dataMs[1] ? { rank: 2 as const, username: dataMs[1].username, avatarUrl: dataMs[1].avatarUrl, primaryStat: formatTime(dataMs[1].time), secondaryStat: "Clear Time" } : null,
        third: dataMs[2] ? { rank: 3 as const, username: dataMs[2].username, avatarUrl: dataMs[2].avatarUrl, primaryStat: formatTime(dataMs[2].time), secondaryStat: "Clear Time" } : null,
        metricLabel: "Time",
      };
    }
    if (activeGame === "sudoku") {
      if (dataSudoku.length === 0) return null;
      return {
        first: dataSudoku[0] ? { rank: 1 as const, username: dataSudoku[0].username, avatarUrl: dataSudoku[0].avatarUrl, primaryStat: formatTime(dataSudoku[0].time), secondaryStat: "Clear Time" } : null,
        second: dataSudoku[1] ? { rank: 2 as const, username: dataSudoku[1].username, avatarUrl: dataSudoku[1].avatarUrl, primaryStat: formatTime(dataSudoku[1].time), secondaryStat: "Clear Time" } : null,
        third: dataSudoku[2] ? { rank: 3 as const, username: dataSudoku[2].username, avatarUrl: dataSudoku[2].avatarUrl, primaryStat: formatTime(dataSudoku[2].time), secondaryStat: "Clear Time" } : null,
        metricLabel: "Time",
      };
    }
    if (activeGame === "trex") {
      if (dataTrex.length === 0) return null;
      return {
        first: dataTrex[0] ? { rank: 1 as const, username: dataTrex[0].username, avatarUrl: dataTrex[0].avatarUrl, primaryStat: `${dataTrex[0].score.toLocaleString()} pts`, secondaryStat: "Distance" } : null,
        second: dataTrex[1] ? { rank: 2 as const, username: dataTrex[1].username, avatarUrl: dataTrex[1].avatarUrl, primaryStat: `${dataTrex[1].score.toLocaleString()} pts`, secondaryStat: "Distance" } : null,
        third: dataTrex[2] ? { rank: 3 as const, username: dataTrex[2].username, avatarUrl: dataTrex[2].avatarUrl, primaryStat: `${dataTrex[2].score.toLocaleString()} pts`, secondaryStat: "Distance" } : null,
        metricLabel: "Score",
      };
    }
    if (activeGame === "wordle") {
      if (dataWordle.length === 0) return null;
      return {
        first: dataWordle[0] ? { rank: 1 as const, username: dataWordle[0].username, avatarUrl: dataWordle[0].avatarUrl, primaryStat: `${dataWordle[0].wins} Wins`, secondaryStat: dataWordle[0].winRate !== undefined ? `${dataWordle[0].winRate}% Win Rate` : undefined } : null,
        second: dataWordle[1] ? { rank: 2 as const, username: dataWordle[1].username, avatarUrl: dataWordle[1].avatarUrl, primaryStat: `${dataWordle[1].wins} Wins`, secondaryStat: dataWordle[1].winRate !== undefined ? `${dataWordle[1].winRate}% Win Rate` : undefined } : null,
        third: dataWordle[2] ? { rank: 3 as const, username: dataWordle[2].username, avatarUrl: dataWordle[2].avatarUrl, primaryStat: `${dataWordle[2].wins} Wins`, secondaryStat: dataWordle[2].winRate !== undefined ? `${dataWordle[2].winRate}% Win Rate` : undefined } : null,
        metricLabel: "Wins",
      };
    }
    return null;
  }, [activeGame, data2048, dataCaro, dataChess, dataBattleship, dataWordChain, dataMonopoly, dataAimTrainer, dataMs, dataSudoku, dataTrex, dataWordle]);

  const currentGameDef = ALL_GAMES.find((g) => g.id === activeGame) || ALL_GAMES[0];
  const gameRoute = `/games/${activeGame}`;

  // Formatted sub-title with current level
  const activeLevelLabel = useMemo(() => {
    if (activeGame === "minesweeper") {
      return ` (${MS_LEVELS.find((l) => l.id === msLevel)?.label || "Beginner"})`;
    }
    if (activeGame === "sudoku") {
      return ` (${SUDOKU_LEVELS.find((l) => l.id === sudokuLevel)?.label || "Easy"})`;
    }
    if (activeGame === "wordle") {
      return ` (${WORDLE_LEVELS.find((l) => l.id === wordleLevel)?.label || "Overall"})`;
    }
    return "";
  }, [activeGame, msLevel, sudokuLevel, wordleLevel]);

  const matchesSearch = (username: string) => {
    if (!playerSearchQuery.trim()) return true;
    return username.toLowerCase().includes(playerSearchQuery.trim().toLowerCase());
  };

  const contentKey =
    activeGame === "minesweeper"
      ? `ms-${msLevel}`
      : activeGame === "sudoku"
      ? `sudoku-${sudokuLevel}`
      : activeGame === "wordle"
      ? `wordle-${wordleLevel}`
      : activeGame;

  return (
    <div className="mx-auto max-w-5xl px-4 py-8 sm:py-12 space-y-7">
      {/* ── Page Header ───────────────────────────────────────── */}
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
        <div>
          <h1 className="text-3xl sm:text-4xl font-extrabold text-foreground tracking-tight">
            Leaderboard
          </h1>
          <p className="text-foreground-secondary text-sm mt-1">
            Global rankings, top champions podium, head-to-head records, and match history.
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
          {/* Category Filter + Game Selector Pill Bar + Sub-Level Selectors */}
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

              <span className="text-xs text-foreground-muted font-mono">
                Showing {filteredGameList.length} games
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

            {/* ── Difficulty / Sub-Level Segmented Controls (Minesweeper / Sudoku / Wordle) ── */}
            {activeGame === "minesweeper" && (
              <div className="flex items-center gap-2 pt-2 border-t border-border/60">
                <span className="text-xs font-bold text-foreground-muted uppercase tracking-wider mr-1">
                  Difficulty:
                </span>
                <div className="flex items-center gap-1.5">
                  {MS_LEVELS.map((lv) => {
                    const isLvActive = msLevel === lv.id;
                    return (
                      <button
                        key={lv.id}
                        onClick={() => handleLevelChange(lv.id)}
                        className={`relative px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors ${
                          isLvActive
                            ? "text-accent dark:text-white font-bold"
                            : "text-foreground-secondary hover:text-foreground hover:bg-surface-hover"
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
            )}

            {activeGame === "sudoku" && (
              <div className="flex items-center gap-2 pt-2 border-t border-border/60">
                <span className="text-xs font-bold text-foreground-muted uppercase tracking-wider mr-1">
                  Difficulty:
                </span>
                <div className="flex items-center gap-1.5">
                  {SUDOKU_LEVELS.map((lv) => {
                    const isLvActive = sudokuLevel === lv.id;
                    return (
                      <button
                        key={lv.id}
                        onClick={() => handleSudokuLevelChange(lv.id)}
                        className={`relative px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors ${
                          isLvActive
                            ? "text-accent dark:text-white font-bold"
                            : "text-foreground-secondary hover:text-foreground hover:bg-surface-hover"
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
            )}

            {activeGame === "wordle" && (
              <div className="flex items-center gap-2 pt-2 border-t border-border/60 overflow-x-auto no-scrollbar">
                <span className="text-xs font-bold text-foreground-muted uppercase tracking-wider mr-1 whitespace-nowrap">
                  Filter:
                </span>
                <div className="flex items-center gap-1.5">
                  {WORDLE_LEVELS.map((lv) => {
                    const isLvActive = wordleLevel === lv.id;
                    return (
                      <button
                        key={lv.id}
                        onClick={() => handleWordleLevelChange(lv.id)}
                        className={`relative px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition-colors ${
                          isLvActive
                            ? "text-accent dark:text-white font-bold"
                            : "text-foreground-secondary hover:text-foreground hover:bg-surface-hover"
                        }`}
                      >
                        {isLvActive && (
                          <motion.div
                            layoutId="wordle-level-pill"
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
            )}
          </div>

          {/* ── Champions Podium Hero Stage ────────────────────────── */}
          <ChampionsPodium
            first={podiumData?.first}
            second={podiumData?.second}
            third={podiumData?.third}
            metricLabel={podiumData?.metricLabel || "Score"}
            onSelectPlayer={(uname) => setSelectedPlayer(uname)}
          />

          {/* ── Main Rankings Card ─────────────────────────────────── */}
          <div className="rounded-2xl border border-border bg-surface shadow-sm overflow-hidden">
            {/* Game Header Banner with Launch CTA and Search Filter */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-5 border-b border-border/60 bg-background-secondary/20">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-accent/10 border border-accent/20 text-accent">
                  {GAME_ICONS[activeGame]}
                </div>
                <div>
                  <h2 className="text-lg font-bold text-foreground flex items-center gap-2">
                    <span>
                      {currentGameDef.label}
                      {activeLevelLabel} Standings
                    </span>
                  </h2>
                  <p className="text-xs text-foreground-secondary">
                    Global verified competition rankings
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-3">
                {/* Search player input */}
                <div className="relative flex-1 sm:w-56">
                  <input
                    type="text"
                    value={playerSearchQuery}
                    onChange={(e) => setPlayerSearchQuery(e.target.value)}
                    placeholder="Search player..."
                    className="w-full pl-8 pr-3 py-1.5 rounded-xl border border-border bg-background text-xs text-foreground placeholder:text-foreground-muted focus:border-accent focus:outline-none"
                  />
                  <svg
                    className="absolute left-2.5 top-1/2 -translate-y-1/2 text-foreground-muted"
                    width="13"
                    height="13"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                  >
                    <circle cx="11" cy="11" r="8" />
                    <line x1="21" y1="21" x2="16.65" y2="16.65" />
                  </svg>
                </div>

                {/* Direct Play CTA Link */}
                <Link
                  href={gameRoute}
                  className="inline-flex items-center gap-1.5 px-4 py-1.5 rounded-xl bg-accent text-xs font-bold text-white shadow-sm hover:opacity-90 transition-opacity whitespace-nowrap"
                >
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor">
                    <polygon points="5 3 19 12 5 21 5 3" />
                  </svg>
                  <span>Play {currentGameDef.label}</span>
                </Link>
              </div>
            </div>

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
                          {data2048.filter((e) => matchesSearch(e.username)).length === 0 ? (
                            <Empty text={playerSearchQuery ? `No players found matching "${playerSearchQuery}"` : "No 2048 scores recorded yet. Be the first to reach 2048!"} />
                          ) : (
                            data2048
                              .filter((e) => matchesSearch(e.username))
                              .map((e, i) => (
                                <TableRow
                                  key={e.username}
                                  index={i}
                                  isLast={i === data2048.length - 1}
                                  cols="grid-cols-[56px_1fr_110px_110px]"
                                  onClick={() => setSelectedPlayer(e.username)}
                                >
                                  <RankBadge rank={e.rank} />
                                  <PlayerCell avatarUrl={e.avatarUrl} username={e.username} isCurrent={user?.username === e.username} />
                                  <span className="text-sm font-bold text-amber-500 text-right font-mono">
                                    {e.highestTile > 0 ? e.highestTile : "-"}
                                  </span>
                                  <span className="text-sm font-bold text-foreground text-right font-mono">
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
                          {dataCaro.filter((e) => matchesSearch(e.username)).length === 0 ? (
                            <Empty text={playerSearchQuery ? `No players found matching "${playerSearchQuery}"` : "No Caro matches recorded yet. Jump in and play a match!"} />
                          ) : (
                            dataCaro
                              .filter((e) => matchesSearch(e.username))
                              .map((e, i) => (
                                <TableRow
                                  key={e.username}
                                  index={i}
                                  isLast={i === dataCaro.length - 1}
                                  cols="grid-cols-[56px_1fr_100px_100px_100px]"
                                  onClick={() => setSelectedPlayer(e.username)}
                                >
                                  <RankBadge rank={e.rank} />
                                  <PlayerCell avatarUrl={e.avatarUrl} username={e.username} isCurrent={user?.username === e.username} />
                                  <span className="text-sm font-bold text-foreground text-right font-mono">{e.wins}</span>
                                  <span className="text-sm text-foreground-secondary text-right font-mono">{e.total}</span>
                                  <span className="text-sm text-right font-mono">
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
                          {dataChess.filter((e) => matchesSearch(e.username)).length === 0 ? (
                            <Empty text={playerSearchQuery ? `No players found matching "${playerSearchQuery}"` : "No chess matches recorded yet. Play a game to rank up!"} />
                          ) : (
                            dataChess
                              .filter((e) => matchesSearch(e.username))
                              .map((e, i) => (
                                <TableRow
                                  key={e.username}
                                  index={i}
                                  isLast={i === dataChess.length - 1}
                                  cols="grid-cols-[56px_1fr_100px_100px_100px]"
                                  onClick={() => setSelectedPlayer(e.username)}
                                >
                                  <RankBadge rank={e.rank} />
                                  <PlayerCell avatarUrl={e.avatarUrl} username={e.username} isCurrent={user?.username === e.username} />
                                  <span className="text-sm font-bold text-foreground text-right font-mono flex items-center justify-end gap-1">
                                    <span className="text-amber-500">♔</span>
                                    {e.wins}
                                  </span>
                                  <span className="text-sm text-foreground-secondary text-right font-mono">{e.total}</span>
                                  <span className="text-sm font-semibold text-accent text-right font-mono">{e.winRate}%</span>
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
                          {dataBattleship.filter((e) => matchesSearch(e.username)).length === 0 ? (
                            <Empty text={playerSearchQuery ? `No players found matching "${playerSearchQuery}"` : "No Battleship matches recorded yet. Sink opponent fleets to rank up!"} />
                          ) : (
                            dataBattleship
                              .filter((e) => matchesSearch(e.username))
                              .map((e, i) => (
                                <TableRow
                                  key={e.username}
                                  index={i}
                                  isLast={i === dataBattleship.length - 1}
                                  cols="grid-cols-[56px_1fr_100px_100px_100px]"
                                  onClick={() => setSelectedPlayer(e.username)}
                                >
                                  <RankBadge rank={e.rank} />
                                  <PlayerCell avatarUrl={e.avatarUrl} username={e.username} isCurrent={user?.username === e.username} />
                                  <span className="text-sm font-bold text-foreground text-right font-mono">{e.wins}</span>
                                  <span className="text-sm text-foreground-secondary text-right font-mono">{e.total}</span>
                                  <span className="text-sm font-semibold text-accent text-right font-mono">{e.winRate}%</span>
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
                          {dataWordChain.filter((e) => matchesSearch(e.username)).length === 0 ? (
                            <Empty text={playerSearchQuery ? `No players found matching "${playerSearchQuery}"` : "No players yet. Be the first to win a Word Chain match!"} />
                          ) : (
                            dataWordChain
                              .filter((e) => matchesSearch(e.username))
                              .map((e, i) => (
                                <TableRow
                                  key={e.username}
                                  index={i}
                                  isLast={i === dataWordChain.length - 1}
                                  cols="grid-cols-[56px_1fr_100px_100px_100px]"
                                  onClick={() => setSelectedPlayer(e.username)}
                                >
                                  <RankBadge rank={e.rank} />
                                  <PlayerCell avatarUrl={e.avatarUrl} username={e.username} isCurrent={user?.username === e.username} />
                                  <span className="text-sm font-bold text-foreground text-right font-mono">{e.wins}</span>
                                  <span className="text-sm text-foreground-secondary text-right font-mono">{e.total}</span>
                                  <span className="text-sm font-semibold text-accent text-right font-mono">{e.winRate}%</span>
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
                          {dataMonopoly.filter((e) => matchesSearch(e.username)).length === 0 ? (
                            <Empty text={playerSearchQuery ? `No players found matching "${playerSearchQuery}"` : "No Monopoly matches recorded yet. Dominate the board to rank up!"} />
                          ) : (
                            dataMonopoly
                              .filter((e) => matchesSearch(e.username))
                              .map((e, i) => (
                                <TableRow
                                  key={e.username}
                                  index={i}
                                  isLast={i === dataMonopoly.length - 1}
                                  cols="grid-cols-[56px_1fr_100px_100px_100px]"
                                  onClick={() => setSelectedPlayer(e.username)}
                                >
                                  <RankBadge rank={e.rank} />
                                  <PlayerCell avatarUrl={e.avatarUrl} username={e.username} isCurrent={user?.username === e.username} />
                                  <span className="text-sm font-bold text-foreground text-right font-mono">{e.wins}</span>
                                  <span className="text-sm text-foreground-secondary text-right font-mono">{e.total}</span>
                                  <span className="text-sm font-semibold text-accent text-right font-mono">{e.winRate}%</span>
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
                          {dataAimTrainer.filter((e) => matchesSearch(e.username)).length === 0 ? (
                            <Empty text={playerSearchQuery ? `No players found matching "${playerSearchQuery}"` : "No Aim Trainer records yet. Practice your mouse precision!"} />
                          ) : (
                            dataAimTrainer
                              .filter((e) => matchesSearch(e.username))
                              .map((e, i) => (
                                <TableRow
                                  key={e.username}
                                  index={i}
                                  isLast={i === dataAimTrainer.length - 1}
                                  cols="grid-cols-[56px_1fr_110px_110px]"
                                  onClick={() => setSelectedPlayer(e.username)}
                                >
                                  <RankBadge rank={e.rank} />
                                  <PlayerCell avatarUrl={e.avatarUrl} username={e.username} isCurrent={user?.username === e.username} />
                                  <span className="text-sm font-semibold text-emerald-500 text-right font-mono">
                                    {e.accuracy > 0 ? `${e.accuracy}%` : "-"}
                                  </span>
                                  <span className="text-sm font-bold text-foreground text-right font-mono">
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
                          {dataMs.filter((e) => matchesSearch(e.username)).length === 0 ? (
                            <Empty text={playerSearchQuery ? `No players found matching "${playerSearchQuery}"` : `No records yet for ${msLevel}. Be the first to sweep the board!`} />
                          ) : (
                            dataMs
                              .filter((e) => matchesSearch(e.username))
                              .map((e, i) => (
                                <TableRow
                                  key={e.username}
                                  index={i}
                                  isLast={i === dataMs.length - 1}
                                  cols="grid-cols-[56px_1fr_120px]"
                                  onClick={() => setSelectedPlayer(e.username)}
                                >
                                  <RankBadge rank={e.rank} />
                                  <PlayerCell avatarUrl={e.avatarUrl} username={e.username} isCurrent={user?.username === e.username} />
                                  <span className="text-sm font-bold text-foreground text-right font-mono flex items-center justify-end gap-1.5">
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
                          {dataSudoku.filter((e) => matchesSearch(e.username)).length === 0 ? (
                            <Empty text={playerSearchQuery ? `No players found matching "${playerSearchQuery}"` : `No records yet for ${sudokuLevel}. Be the first to solve a Sudoku!`} />
                          ) : (
                            dataSudoku
                              .filter((e) => matchesSearch(e.username))
                              .map((e, i) => (
                                <TableRow
                                  key={e.username}
                                  index={i}
                                  isLast={i === dataSudoku.length - 1}
                                  cols="grid-cols-[56px_1fr_120px]"
                                  onClick={() => setSelectedPlayer(e.username)}
                                >
                                  <RankBadge rank={e.rank} />
                                  <PlayerCell avatarUrl={e.avatarUrl} username={e.username} isCurrent={user?.username === e.username} />
                                  <span className="text-sm font-bold text-foreground text-right font-mono flex items-center justify-end gap-1.5">
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
                          {dataTrex.filter((e) => matchesSearch(e.username)).length === 0 ? (
                            <Empty text={playerSearchQuery ? `No players found matching "${playerSearchQuery}"` : "No runner scores recorded yet. Run as far as you can!"} />
                          ) : (
                            dataTrex
                              .filter((e) => matchesSearch(e.username))
                              .map((e, i) => (
                                <TableRow
                                  key={e.username}
                                  index={i}
                                  isLast={i === dataTrex.length - 1}
                                  cols="grid-cols-[56px_1fr_120px]"
                                  onClick={() => setSelectedPlayer(e.username)}
                                >
                                  <RankBadge rank={e.rank} />
                                  <PlayerCell avatarUrl={e.avatarUrl} username={e.username} isCurrent={user?.username === e.username} />
                                  <span className="text-sm font-bold text-foreground text-right font-mono flex items-center justify-end gap-1.5">
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
                          {wordleLevel === "overall" ? (
                            <>
                              <TableHeader cols="grid-cols-[56px_1fr_100px_100px_100px]">
                                <span>Rank</span>
                                <span>Player</span>
                                <span className="text-right">Wins</span>
                                <span className="text-right">Games</span>
                                <span className="text-right">Win %</span>
                              </TableHeader>
                              {dataWordle.filter((e) => matchesSearch(e.username)).length === 0 ? (
                                <Empty text={playerSearchQuery ? `No players found matching "${playerSearchQuery}"` : "No Wordle games recorded yet. Guess the secret word!"} />
                              ) : (
                                dataWordle
                                  .filter((e) => matchesSearch(e.username))
                                  .map((e, i) => (
                                    <TableRow
                                      key={e.username}
                                      index={i}
                                      isLast={i === dataWordle.length - 1}
                                      cols="grid-cols-[56px_1fr_100px_100px_100px]"
                                      onClick={() => setSelectedPlayer(e.username)}
                                    >
                                      <RankBadge rank={e.rank} />
                                      <PlayerCell avatarUrl={e.avatarUrl} username={e.username} isCurrent={user?.username === e.username} />
                                      <span className="text-sm font-bold text-emerald-500 text-right font-mono">
                                        {e.wins}
                                      </span>
                                      <span className="text-sm text-foreground-secondary text-right font-mono">
                                        {e.total ?? e.wins}
                                      </span>
                                      <span className="text-sm text-right font-mono">
                                        <span className={`font-semibold ${(e.winRate ?? 0) >= 60 ? "text-emerald-500" : (e.winRate ?? 0) >= 40 ? "text-amber-500" : "text-foreground-muted"}`}>
                                          {e.winRate ?? 0}%
                                        </span>
                                      </span>
                                    </TableRow>
                                  ))
                              )}
                            </>
                          ) : (
                            <>
                              <TableHeader cols="grid-cols-[56px_1fr_110px_110px_100px]">
                                <span>Rank</span>
                                <span>Player</span>
                                <span className="text-right">{wordleLevel === "1" ? "1st Try Wins" : `${wordleLevel}${wordleLevel === "2" ? "nd" : wordleLevel === "3" ? "rd" : "th"} Try`}</span>
                                <span className="text-right">Total Wins</span>
                                <span className="text-right">Win %</span>
                              </TableHeader>
                              {dataWordle.filter((e) => matchesSearch(e.username)).length === 0 ? (
                                <Empty text={playerSearchQuery ? `No players found matching "${playerSearchQuery}"` : `No players have solved Wordle on Try ${wordleLevel} yet!`} />
                              ) : (
                                dataWordle
                                  .filter((e) => matchesSearch(e.username))
                                  .map((e, i) => (
                                    <TableRow
                                      key={e.username}
                                      index={i}
                                      isLast={i === dataWordle.length - 1}
                                      cols="grid-cols-[56px_1fr_110px_110px_100px]"
                                      onClick={() => setSelectedPlayer(e.username)}
                                    >
                                      <RankBadge rank={e.rank} />
                                      <PlayerCell avatarUrl={e.avatarUrl} username={e.username} isCurrent={user?.username === e.username} />
                                      <span className="text-sm font-bold text-amber-500 text-right font-mono flex items-center justify-end gap-1">
                                        {wordleLevel === "1" && <span>⚡</span>}
                                        {e.count}
                                      </span>
                                      <span className="text-sm text-foreground-secondary text-right font-mono">
                                        {e.wins}
                                      </span>
                                      <span className="text-sm font-semibold text-emerald-500 text-right font-mono">
                                        {e.share}%
                                      </span>
                                    </TableRow>
                                  ))
                              )}
                            </>
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
          <span className="px-1.5 py-0.5 rounded bg-accent-light text-accent text-xs font-bold uppercase">
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
        } font-mono text-xs font-bold text-white shadow-sm`}
      >
        {rank}
      </div>
    );
  }
  return <span className="text-sm font-mono font-semibold text-foreground-muted pl-2">{rank}</span>;
}

function Avatar({ avatarUrl, username }: { avatarUrl: string | null; username: string }) {
  if (avatarUrl) {
    return (
      // eslint-disable-next-line @next/next/no-img-element
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
