"use client";

import { useMemo, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useMinesweeper } from "./useMinesweeper";
import { MinesweeperCell } from "./MinesweeperCell";
import { DIFFICULTY_PRESETS, type Difficulty } from "./types";

// ── Helpers ───────────────────────────────────────────────────────

/** Format seconds into MM:SS */
function formatTime(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
}

// ── Difficulty selector tab data ──────────────────────────────────

const DIFFICULTIES: { id: Difficulty; label: string; sub: string }[] = [
  { id: "beginner", label: "Easy", sub: "9×9 · 10 mines" },
  { id: "intermediate", label: "Medium", sub: "16×16 · 40 mines" },
  { id: "expert", label: "Hard", sub: "16×30 · 99 mines" },
];

// ── Responsive cell sizing ────────────────────────────────────────

function useCellSize(cols: number): number {
  // Provide reasonable defaults; the grid uses CSS to stay responsive
  if (cols <= 9) return 36;
  if (cols <= 16) return 30;
  return 26;
}

// ── Component ─────────────────────────────────────────────────────

export function GameMinesweeper() {
  const {
    board,
    gameStatus,
    difficulty,
    remainingMines,
    elapsedTime,
    revealCell,
    toggleFlag,
    chordReveal,
    restart,
    changeDifficulty,
  } = useMinesweeper("beginner");

  const config = DIFFICULTY_PRESETS[difficulty];
  const cellSize = useCellSize(config.cols);
  const gameOver = gameStatus === "won" || gameStatus === "lost";

  // ── Smiley face status indicator ────────────────────────────────

  const statusEmoji = useMemo(() => {
    switch (gameStatus) {
      case "won":
        return "😎";
      case "lost":
        return "💀";
      default:
        return "🙂";
    }
  }, [gameStatus]);

  const handleRestart = useCallback(() => restart(), [restart]);

  return (
    <div className="flex flex-col items-center gap-6">
      {/* ── Title ─────────────────────────────────────────────── */}
      <div className="text-center">
        <h1 className="text-3xl sm:text-4xl font-extrabold text-foreground">
          Mine<span className="text-gradient">sweeper</span>
        </h1>
        <p className="text-foreground-secondary text-sm mt-1">
          Left-click to reveal · Right-click to flag · Click number to chord
        </p>
      </div>

      {/* ── Difficulty Tabs ───────────────────────────────────── */}
      <div className="flex items-center gap-1 p-1 rounded-xl bg-surface border border-border">
        {DIFFICULTIES.map((d) => (
          <button
            key={d.id}
            onClick={() => changeDifficulty(d.id)}
            className={`relative px-3 sm:px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
              difficulty === d.id
                ? "text-foreground"
                : "text-foreground-muted hover:text-foreground-secondary"
            }`}
          >
            {difficulty === d.id && (
              <motion.div
                layoutId="ms-tab"
                className="absolute inset-0 bg-accent-light rounded-lg"
                transition={{ type: "spring", stiffness: 400, damping: 30 }}
              />
            )}
            <span className="relative z-10 flex flex-col items-center gap-0.5">
              <span>{d.label}</span>
              <span className="text-[10px] opacity-60 hidden sm:block">{d.sub}</span>
            </span>
          </button>
        ))}
      </div>

      {/* ── Status Bar ────────────────────────────────────────── */}
      <div className="flex items-center gap-4 sm:gap-6 rounded-xl bg-surface border border-border px-4 sm:px-6 py-3 shadow-sm">
        {/* Mine counter */}
        <div className="flex items-center gap-2">
          <span className="text-lg">💣</span>
          <span className="font-mono text-xl font-bold text-foreground tabular-nums min-w-[2ch] text-right">
            {remainingMines}
          </span>
        </div>

        {/* Smiley restart button */}
        <button
          onClick={handleRestart}
          className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-emerald-100 to-teal-100 dark:from-emerald-900/40 dark:to-teal-900/40 border border-emerald-300 dark:border-emerald-700/60 text-xl transition-transform hover:scale-110 active:scale-95 shadow-sm"
          aria-label="Restart game"
        >
          {statusEmoji}
        </button>

        {/* Timer */}
        <div className="flex items-center gap-2">
          <span className="text-lg">⏱</span>
          <span className="font-mono text-xl font-bold text-foreground tabular-nums min-w-[5ch]">
            {formatTime(elapsedTime)}
          </span>
        </div>
      </div>

      {/* ── Game Board ────────────────────────────────────────── */}
      <div className="relative">
        <div
          className="inline-grid gap-[2px] p-2 rounded-xl bg-surface border border-border shadow-md"
          style={{
            gridTemplateColumns: `repeat(${config.cols}, ${cellSize}px)`,
            gridTemplateRows: `repeat(${config.rows}, ${cellSize}px)`,
          }}
          onContextMenu={(e) => e.preventDefault()}
        >
          {board.map((row) =>
            row.map((cell) => (
              <MinesweeperCell
                key={`${cell.row}-${cell.col}`}
                cell={cell}
                gameOver={gameOver}
                onReveal={revealCell}
                onFlag={toggleFlag}
                onChord={chordReveal}
                cellSize={cellSize}
              />
            ))
          )}
        </div>

        {/* ── Win / Lose Overlay ───────────────────────────────── */}
        <AnimatePresence>
          {gameOver && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.3, delay: 0.4 }}
              className="absolute inset-0 z-10 flex flex-col items-center justify-center rounded-xl bg-black/50 backdrop-blur-sm"
            >
              <motion.div
                initial={{ scale: 0.8, y: 10 }}
                animate={{ scale: 1, y: 0 }}
                transition={{ type: "spring", stiffness: 300, damping: 20, delay: 0.5 }}
                className="flex flex-col items-center gap-4 p-6 rounded-2xl bg-surface border border-border shadow-xl max-w-xs mx-4"
              >
                <span className="text-5xl">{gameStatus === "won" ? "🏆" : "💥"}</span>
                <div className="text-center">
                  <h2 className="text-xl font-bold text-foreground">
                    {gameStatus === "won" ? "You Win!" : "Game Over!"}
                  </h2>
                  <p className="text-sm text-foreground-secondary mt-1">
                    {gameStatus === "won"
                      ? `Cleared in ${formatTime(elapsedTime)}`
                      : "You hit a mine!"}
                  </p>
                </div>
                <button
                  onClick={handleRestart}
                  className="inline-flex h-10 items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-600 px-6 text-sm font-semibold text-white shadow-lg shadow-emerald-500/25 transition-all duration-200 hover:shadow-xl hover:-translate-y-0.5"
                >
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
                    <polyline points="23 4 23 10 17 10" />
                    <path d="M20.49 15a9 9 0 1 1-2.12-9.36L23 10" />
                  </svg>
                  Play Again
                </button>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* ── Mobile Hint ──────────────────────────────────────── */}
      <p className="text-xs text-foreground-muted text-center sm:hidden">
        Long-press a cell to place a flag 🚩
      </p>
    </div>
  );
}
