"use client";

import { useMemo, useCallback, useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useMinesweeper } from "./useMinesweeper";
import { MinesweeperCell } from "./MinesweeperCell";
import { DIFFICULTY_PRESETS, type Difficulty } from "./types";
import { LoginModal } from "@/components/auth/LoginModal";
import { useAuth } from "@/components/auth";

// ── Helpers ───────────────────────────────────────────────────────

/** Format seconds into MM:SS */
function formatTime(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
}

// ── Difficulty selector tab data (derived from DIFFICULTY_PRESETS) ─

const DIFFICULTY_KEYS: Difficulty[] = ["beginner", "intermediate", "expert"];

const DIFFICULTIES = DIFFICULTY_KEYS.map((id) => {
  const cfg = DIFFICULTY_PRESETS[id];
  return {
    id,
    label: cfg.label,
    sub: `${cfg.rows}×${cfg.cols} · ${cfg.mines} mines`,
  };
});

// ── Responsive cell sizing ────────────────────────────────────────

function useCellSize(cols: number): number {
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
    isGameInProgress,
  } = useMinesweeper("beginner");

  const { user } = useAuth();
  const scoreSavedRef = useRef(false);
  const [showLogin, setShowLogin] = useState(false);

  const config = DIFFICULTY_PRESETS[difficulty];
  const cellSize = useCellSize(config.cols);
  const gameOver = gameStatus === "won" || gameStatus === "lost";

  // ── Login prompt on game end (if not logged in) ─────────────────
  useEffect(() => {
    if (gameOver && !user) {
      const t = setTimeout(() => setShowLogin(true), 600);
      return () => clearTimeout(t);
    }
  }, [gameOver, user]);

  // ── Save score on WIN ───────────────────────────────────────────
  useEffect(() => {
    if (!user) return;
    if (gameStatus !== "won") return;
    if (scoreSavedRef.current) return;
    scoreSavedRef.current = true;

    fetch(`/api/users/${user.id}/score`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        game: "minesweeper",
        difficulty,
        time: elapsedTime,
      }),
    })
      .then((r) => r.json())
      .then((d) => {
        try {
          const stored = localStorage.getItem("game-portal-user");
          if (stored) {
            const u = JSON.parse(stored);
            if (d.msBestBeginner !== undefined) u.msBestBeginner = d.msBestBeginner;
            if (d.msBestIntermediate !== undefined) u.msBestIntermediate = d.msBestIntermediate;
            if (d.msBestExpert !== undefined) u.msBestExpert = d.msBestExpert;
            localStorage.setItem("game-portal-user", JSON.stringify(u));
          }
        } catch { /* ignore */ }
      })
      .catch((err) => console.error("Failed to save minesweeper score:", err));
  }, [gameStatus, user, difficulty, elapsedTime]);

  // ── Confirmation dialog state ───────────────────────────────────
  const [pendingDifficulty, setPendingDifficulty] = useState<Difficulty | null>(null);

  const handleDifficultyClick = useCallback(
    (d: Difficulty) => {
      if (d === difficulty) return;
      if (isGameInProgress) {
        setPendingDifficulty(d);
      } else {
        changeDifficulty(d);
      }
    },
    [difficulty, isGameInProgress, changeDifficulty]
  );

  const confirmSwitch = useCallback(() => {
    if (pendingDifficulty) {
      changeDifficulty(pendingDifficulty);
      setPendingDifficulty(null);
    }
  }, [pendingDifficulty, changeDifficulty]);

  const cancelSwitch = useCallback(() => {
    setPendingDifficulty(null);
  }, []);

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

  const handleRestart = useCallback(() => {
    scoreSavedRef.current = false;
    setShowLogin(false);
    restart();
  }, [restart]);

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

      {/* ── Unified game card ──────────────────────────────────── */}
      <div className="flex flex-col items-center rounded-2xl border border-border bg-surface shadow-sm overflow-hidden">
        {/* Difficulty tabs (card header) */}
        <div className="flex items-center self-stretch border-b border-border bg-background-secondary/40">
          {DIFFICULTIES.map((d) => (
            <button
              key={d.id}
              onClick={() => handleDifficultyClick(d.id)}
              className={`relative flex-1 px-3 sm:px-5 py-3 text-sm font-medium transition-colors ${
                difficulty === d.id
                  ? "text-accent"
                  : "text-foreground-muted hover:text-foreground-secondary"
              }`}
            >
              {difficulty === d.id && (
                <motion.div
                  layoutId="ms-tab"
                  className="absolute bottom-0 left-0 right-0 h-[2px] bg-accent"
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

        {/* Status bar */}
        <div className="flex items-center justify-center gap-6 sm:gap-8 self-stretch px-4 py-3 border-b border-border/50">
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

        {/* Game Board */}
        <div className="relative p-3 sm:p-4">
          <div
            className="inline-grid gap-[2px] rounded-lg bg-border/40 p-[2px]"
            style={{
              gridTemplateColumns: `repeat(${config.cols}, ${cellSize}px)`,
              gridTemplateRows: `repeat(${config.rows}, ${cellSize}px)`,
            }}
            onContextMenu={(e) => e.preventDefault()}
          >
            {board.map((row) =>
              row.map((cell) => (
                <MinesweeperCell
                  key={`${difficulty}-${cell.row}-${cell.col}`}
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
                  {gameStatus === "won" && user && (
                    <p className="text-xs text-emerald-500 mt-1">✓ Score saved</p>
                  )}
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
      </div>

      {/* ── Confirmation Dialog (switch difficulty mid-game) ──── */}
      <AnimatePresence>
        {pendingDifficulty && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm"
            onClick={cancelSwitch}
          >
            <motion.div
              initial={{ scale: 0.9, y: 10 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.9, y: 10 }}
              transition={{ type: "spring", stiffness: 400, damping: 25 }}
              className="flex flex-col items-center gap-4 p-6 rounded-2xl bg-surface border border-border shadow-xl max-w-sm mx-4"
              onClick={(e) => e.stopPropagation()}
            >
              <span className="text-4xl">⚠️</span>
              <div className="text-center">
                <h3 className="text-lg font-bold text-foreground">
                  Game in progress
                </h3>
                <p className="text-sm text-foreground-secondary mt-1">
                  Switching to{" "}
                  <span className="font-semibold text-foreground">
                    {DIFFICULTY_PRESETS[pendingDifficulty].label}
                  </span>{" "}
                  will end your current game. Continue?
                </p>
              </div>
              <div className="flex gap-3 w-full">
                <button
                  onClick={cancelSwitch}
                  className="flex-1 h-10 rounded-xl border border-border text-sm font-semibold text-foreground transition-colors hover:bg-surface-hover"
                >
                  Keep Playing
                </button>
                <button
                  onClick={confirmSwitch}
                  className="flex-1 h-10 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-600 text-sm font-semibold text-white shadow-lg shadow-emerald-500/25 transition-all hover:shadow-xl"
                >
                  Switch
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── Login Modal ────────────────────────────────────────── */}
      {showLogin && (
        <LoginModal
          onClose={() => setShowLogin(false)}
          onSuccess={() => setShowLogin(false)}
          subtitle="Log in to save your Minesweeper time to the leaderboard!"
        />
      )}

      {/* ── Mobile Hint ──────────────────────────────────────── */}
      <p className="text-xs text-foreground-muted text-center sm:hidden">
        Long-press a cell to place a flag 🚩
      </p>
    </div>
  );
}
