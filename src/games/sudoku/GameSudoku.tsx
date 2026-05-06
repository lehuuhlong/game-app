'use client';

import { useEffect, useCallback, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useSudoku } from './useSudoku';
import { SudokuBoard } from './SudokuBoard';
import { Numpad } from './Numpad';
import { Difficulty, MAX_ERRORS, BOARD_SIZE, EMPTY_CELL, formatTime } from './utils';

// ── Icons ─────────────────────────────────────────────────────────────────────

const ClockIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="12" cy="12" r="10"/>
    <polyline points="12 6 12 12 16 14"/>
  </svg>
);

const HeartIcon = ({ filled }: { filled: boolean }) => (
  <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill={filled ? "currentColor" : "none"} stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"/>
  </svg>
);

const TrophyIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M6 9H4.5a2.5 2.5 0 0 1 0-5H6"/><path d="M18 9h1.5a2.5 2.5 0 0 0 0-5H18"/>
    <path d="M4 22h16"/><path d="M10 14.66V17c0 .55-.47.98-.97 1.21C7.85 18.75 7 20.24 7 22"/>
    <path d="M14 14.66V17c0 .55.47.98.97 1.21C16.15 18.75 17 20.24 17 22"/>
    <path d="M18 2H6v7a6 6 0 0 0 12 0V2Z"/>
  </svg>
);

// ── Difficulty config ─────────────────────────────────────────────────────────

const DIFFICULTY_CONFIG: Record<Difficulty, {
  label: string;
  color: string;
  gradient: string;
  textColor: string;
  description: string;
  time: string;
}> = {
  easy: {
    label: "Easy",
    color: "emerald",
    gradient: "from-emerald-500 to-green-600",
    textColor: "text-emerald-400",
    description: "35 cells filled. Perfect for beginners.",
    time: "~10 min",
  },
  medium: {
    label: "Medium",
    color: "amber",
    gradient: "from-amber-500 to-orange-500",
    textColor: "text-amber-400",
    description: "45 cells filled. A satisfying challenge.",
    time: "~20 min",
  },
  hard: {
    label: "Hard",
    color: "rose",
    gradient: "from-rose-500 to-red-600",
    textColor: "text-rose-400",
    description: "55 cells filled. For experienced players.",
    time: "~40 min",
  },
};

// ── Level Select Screen ───────────────────────────────────────────────────────

function LevelSelectScreen({ onStart }: { onStart: (diff: Difficulty) => void }) {
  const [selected, setSelected] = useState<Difficulty>("easy");

  const cfg = DIFFICULTY_CONFIG[selected];

  return (
    <div className="flex flex-col items-center gap-8 max-w-2xl mx-auto py-4">
      {/* Title */}
      <div className="text-center">
        <h1 className="text-4xl sm:text-5xl font-black text-foreground tracking-tight">
          Sud<span className="text-gradient">oku</span>
        </h1>
        <p className="text-foreground-secondary mt-2 text-sm">
          Fill every row, column and 3×3 box with digits 1–9
        </p>
      </div>

      {/* Difficulty selection */}
      <div className="w-full space-y-3">
        <p className="text-xs font-bold uppercase tracking-widest text-foreground-muted text-center">Choose Difficulty</p>
        <div className="grid grid-cols-3 gap-3">
          {(["easy", "medium", "hard"] as Difficulty[]).map((diff) => {
            const c = DIFFICULTY_CONFIG[diff];
            const isActive = selected === diff;
            return (
              <button
                key={diff}
                onClick={() => setSelected(diff)}
                className={`relative flex flex-col items-center gap-2 rounded-2xl border p-4 transition-all duration-200 focus:outline-none ${
                  isActive
                    ? `border-transparent bg-gradient-to-br ${c.gradient} text-white shadow-lg shadow-${c.color}-500/30 scale-[1.03]`
                    : "border-border bg-surface text-foreground-secondary hover:bg-surface-hover hover:border-foreground-muted"
                }`}
              >
                <span className="text-lg font-black">{c.label}</span>
                <span className="text-[11px] opacity-80 text-center leading-tight">{c.description}</span>
                <span className={`text-[11px] font-medium opacity-70`}>⏱ {c.time}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Start button */}
      <button
        onClick={() => onStart(selected)}
        className={`w-full max-w-xs h-12 rounded-2xl bg-gradient-to-r ${cfg.gradient} text-white font-bold text-lg shadow-lg hover:brightness-110 hover:-translate-y-0.5 active:translate-y-0 transition-all focus:outline-none focus:ring-2 focus:ring-white/30`}
      >
        Start Game
      </button>
    </div>
  );
}

// ── Main Component ────────────────────────────────────────────────────────────

export function GameSudoku() {
  const {
    gameState,
    difficulty,
    initialBoard,
    currentBoard,
    notes,
    noteMode,
    selectedCell,
    conflicts,
    errorCount,
    elapsedSeconds,
    startNewGame,
    setSelectedCell,
    setCellValue,
    eraseCell,
    handleNumpadInput,
    handleErase,
    toggleNoteMode,
    goToMenu,
  } = useSudoku();

  const [savedTime, setSavedTime] = useState<number | null>(null);

  // Save result to DB when won
  useEffect(() => {
    if (gameState === 'won') {
      setSavedTime(elapsedSeconds);
      // Save to leaderboard
      const username = localStorage.getItem('username') || 'Anonymous';
      fetch('/api/sudoku/complete', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, difficulty, timeSeconds: elapsedSeconds }),
      }).catch(console.error);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [gameState]);

  // Compute remaining counts for each digit
  const remainingCounts = useCallback(() => {
    const counts = Array(10).fill(9); // indices 1-9
    if (!currentBoard.length) return counts;
    for (let r = 0; r < BOARD_SIZE; r++) {
      for (let c = 0; c < BOARD_SIZE; c++) {
        const v = currentBoard[r][c];
        if (v !== EMPTY_CELL && v >= 1 && v <= 9) {
          counts[v]--;
        }
      }
    }
    return counts;
  }, [currentBoard])();

  // Keyboard support
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (gameState !== 'playing') return;
      if (!selectedCell) return;

      const key = e.key;
      if (/^[1-9]$/.test(key)) {
        setCellValue(selectedCell.row, selectedCell.col, parseInt(key, 10));
      } else if (key === 'Backspace' || key === 'Delete') {
        eraseCell(selectedCell.row, selectedCell.col);
      } else if (key === 'n' || key === 'N') {
        toggleNoteMode();
      } else if (key === 'ArrowUp') {
        e.preventDefault();
        setSelectedCell({ row: Math.max(0, selectedCell.row - 1), col: selectedCell.col });
      } else if (key === 'ArrowDown') {
        e.preventDefault();
        setSelectedCell({ row: Math.min(8, selectedCell.row + 1), col: selectedCell.col });
      } else if (key === 'ArrowLeft') {
        e.preventDefault();
        setSelectedCell({ row: selectedCell.row, col: Math.max(0, selectedCell.col - 1) });
      } else if (key === 'ArrowRight') {
        e.preventDefault();
        setSelectedCell({ row: selectedCell.row, col: Math.min(8, selectedCell.col + 1) });
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [selectedCell, setCellValue, eraseCell, setSelectedCell, toggleNoteMode, gameState]);

  const handleCellClick = useCallback(
    (row: number, col: number) => {
      if (gameState === 'playing') {
        setSelectedCell({ row, col });
      }
    },
    [setSelectedCell, gameState],
  );

  const cfg = DIFFICULTY_CONFIG[difficulty];

  // ── Menu screen ────────────────────────────────────────────────────
  if (gameState === 'menu') {
    return (
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3 }}
      >
        <LevelSelectScreen onStart={startNewGame} />
      </motion.div>
    );
  }

  // ── Error hearts ─────────────────────────────────────────────────
  const hearts = Array.from({ length: MAX_ERRORS }, (_, i) => i < MAX_ERRORS - errorCount);

  return (
    <div className="flex flex-col items-center gap-4 max-w-xl mx-auto">
      {/* Header bar */}
      <div className="w-full flex items-center justify-between gap-4">
        {/* Back button */}
        <button
          onClick={goToMenu}
          className="flex items-center gap-1.5 text-sm text-foreground-secondary hover:text-foreground transition-colors"
        >
          <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M19 12H5M12 19l-7-7 7-7"/>
          </svg>
          <span>Menu</span>
        </button>

        {/* Difficulty badge */}
        <span className={`text-xs font-bold uppercase tracking-widest px-3 py-1 rounded-full bg-gradient-to-r ${cfg.gradient} text-white`}>
          {cfg.label}
        </span>

        {/* New game */}
        <button
          onClick={() => startNewGame()}
          className="flex items-center gap-1.5 text-sm text-foreground-secondary hover:text-foreground transition-colors"
        >
          <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M21 12a9 9 0 1 1-9-9c2.52 0 4.93 1 6.74 2.74L21 8"/>
            <path d="M21 3v5h-5"/>
          </svg>
          <span>New</span>
        </button>
      </div>

      {/* Stats row: timer + errors */}
      <div className="w-full flex items-center justify-between px-1">
        {/* Timer */}
        <div className="flex items-center gap-2 bg-white/[0.05] rounded-xl px-3 py-2 border border-white/10">
          <span className="text-foreground-muted"><ClockIcon /></span>
          <span className="font-mono font-bold text-foreground text-sm tabular-nums">
            {formatTime(elapsedSeconds)}
          </span>
        </div>

        {/* Hearts / errors */}
        <div className="flex items-center gap-1.5">
          {hearts.map((alive, i) => (
            <span
              key={i}
              className={`transition-all duration-300 ${alive ? "text-rose-500" : "text-foreground-muted/30"}`}
            >
              <HeartIcon filled={alive} />
            </span>
          ))}
        </div>
      </div>

      {/* Board */}
      <div className="w-full relative flex flex-col items-center">
        <SudokuBoard
          initialBoard={initialBoard}
          currentBoard={currentBoard}
          selectedCell={selectedCell}
          conflicts={conflicts}
          notes={notes}
          onCellClick={handleCellClick}
        />

        {/* Won overlay */}
        <AnimatePresence>
          {gameState === 'won' && (
            <motion.div
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.9 }}
              className="absolute inset-0 z-10 flex flex-col items-center justify-center rounded-lg bg-background/85 backdrop-blur-md"
            >
              <motion.div
                initial={{ scale: 0.5, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                transition={{ delay: 0.1, type: "spring", stiffness: 200 }}
                className="text-5xl mb-2"
              >
                🎉
              </motion.div>
              <h2 className="text-3xl font-black text-emerald-400 drop-shadow-md mb-1">Solved!</h2>
              <p className="text-foreground-secondary text-sm mb-1">
                Difficulty: <span className={`font-bold ${cfg.textColor}`}>{cfg.label}</span>
              </p>
              {savedTime !== null && (
                <p className="text-foreground font-mono font-bold text-lg mb-5 flex items-center gap-1.5">
                  <span className="text-foreground-muted"><ClockIcon /></span>
                  {formatTime(savedTime)}
                </p>
              )}
              <div className="flex gap-3">
                <button
                  onClick={goToMenu}
                  className="rounded-xl border border-white/20 bg-white/[0.08] px-5 py-2.5 text-sm font-bold text-foreground hover:bg-white/[0.14] transition-all"
                >
                  Menu
                </button>
                <button
                  onClick={() => startNewGame()}
                  className={`rounded-xl bg-gradient-to-r ${cfg.gradient} px-6 py-2.5 text-sm font-bold text-white shadow-lg hover:brightness-110 hover:-translate-y-0.5 transition-all focus:outline-none`}
                >
                  Play Again
                </button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Game over overlay */}
        <AnimatePresence>
          {gameState === 'gameover' && (
            <motion.div
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.9 }}
              className="absolute inset-0 z-10 flex flex-col items-center justify-center rounded-lg bg-background/85 backdrop-blur-md"
            >
              <motion.div
                initial={{ scale: 0.5, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                transition={{ delay: 0.1, type: "spring", stiffness: 200 }}
                className="text-5xl mb-2"
              >
                💀
              </motion.div>
              <h2 className="text-3xl font-black text-rose-500 drop-shadow-md mb-1">Game Over</h2>
              <p className="text-foreground-secondary text-sm mb-6">
                You made {MAX_ERRORS} mistakes. Better luck next time!
              </p>
              <div className="flex gap-3">
                <button
                  onClick={goToMenu}
                  className="rounded-xl border border-white/20 bg-white/[0.08] px-5 py-2.5 text-sm font-bold text-foreground hover:bg-white/[0.14] transition-all"
                >
                  Menu
                </button>
                <button
                  onClick={() => startNewGame()}
                  className={`rounded-xl bg-gradient-to-r ${cfg.gradient} px-6 py-2.5 text-sm font-bold text-white shadow-lg hover:brightness-110 hover:-translate-y-0.5 transition-all focus:outline-none`}
                >
                  Try Again
                </button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Numpad */}
      <Numpad
        onInput={handleNumpadInput}
        onErase={handleErase}
        onToggleNote={toggleNoteMode}
        noteMode={noteMode}
        remainingCounts={remainingCounts}
      />

      {/* Keyboard hint */}
      <p className="text-xs text-foreground-muted/50 mt-1 hidden sm:block">
        Arrow keys to navigate · N to toggle notes · Backspace to erase
      </p>
    </div>
  );
}
