"use client";

import { motion, AnimatePresence } from "framer-motion";
import type { Player } from "./types";

interface GameInfoPanelProps {
  currentPlayer: Player;
  winner: Player | "draw" | null;
  moveCount: number;
  gameStatus: "playing" | "finished";
  onRestart: () => void;
  onUndo: () => void;
  canUndo: boolean;
}

export function GameInfoPanel({
  currentPlayer,
  winner,
  moveCount,
  gameStatus,
  onRestart,
  onUndo,
  canUndo,
}: GameInfoPanelProps) {
  return (
    <div className="flex flex-col gap-4">
      {/* Status */}
      <div className="rounded-xl border border-border bg-surface p-4">
        <AnimatePresence mode="wait">
          {gameStatus === "finished" ? (
            <motion.div
              key="result"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="text-center"
            >
              {winner === "draw" ? (
                <>
                  <div className="text-3xl mb-2">🤝</div>
                  <h3 className="text-lg font-bold text-foreground">
                    It&apos;s a Draw!
                  </h3>
                  <p className="text-sm text-foreground-secondary mt-1">
                    The board is full with no winner
                  </p>
                </>
              ) : (
                <>
                  <div className="text-3xl mb-2">🏆</div>
                  <h3 className="text-lg font-bold text-foreground">
                    Player{" "}
                    <span
                      className={
                        winner === "X"
                          ? "text-rose-500"
                          : "text-blue-500"
                      }
                    >
                      {winner}
                    </span>{" "}
                    Wins!
                  </h3>
                  <p className="text-sm text-foreground-secondary mt-1">
                    5 in a row in {moveCount} moves
                  </p>
                </>
              )}
            </motion.div>
          ) : (
            <motion.div
              key="playing"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="flex items-center gap-3"
            >
              <div
                className={`flex h-10 w-10 items-center justify-center rounded-lg ${
                  currentPlayer === "X"
                    ? "bg-rose-100 dark:bg-rose-900/30"
                    : "bg-blue-100 dark:bg-blue-900/30"
                }`}
              >
                {currentPlayer === "X" ? (
                  <svg
                    viewBox="0 0 24 24"
                    className="w-5 h-5 text-rose-500"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="3"
                    strokeLinecap="round"
                  >
                    <line x1="6" y1="6" x2="18" y2="18" />
                    <line x1="18" y1="6" x2="6" y2="18" />
                  </svg>
                ) : (
                  <svg
                    viewBox="0 0 24 24"
                    className="w-5 h-5 text-blue-500"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="3"
                  >
                    <circle cx="12" cy="12" r="7" />
                  </svg>
                )}
              </div>
              <div>
                <p className="text-sm font-semibold text-foreground">
                  Player {currentPlayer}&apos;s Turn
                </p>
                <p className="text-xs text-foreground-muted">
                  Move #{moveCount + 1}
                </p>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 gap-3">
        <div className="rounded-lg border border-border bg-surface p-3 text-center">
          <p className="text-2xl font-bold text-foreground">{moveCount}</p>
          <p className="text-[10px] font-medium text-foreground-muted uppercase tracking-wider">
            Moves
          </p>
        </div>
        <div className="rounded-lg border border-border bg-surface p-3 text-center">
          <p className="text-2xl font-bold text-foreground">
            15×15
          </p>
          <p className="text-[10px] font-medium text-foreground-muted uppercase tracking-wider">
            Grid
          </p>
        </div>
      </div>

      {/* Actions */}
      <div className="flex flex-col gap-2">
        <button
          onClick={onRestart}
          className="flex items-center justify-center gap-2 w-full px-4 py-2.5 rounded-lg bg-gradient-to-r from-sky-500 to-blue-600 text-white text-sm font-semibold shadow-lg shadow-sky-500/25 hover:shadow-xl hover:shadow-sky-500/30 transition-all hover:-translate-y-0.5"
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
            <polyline points="1 4 1 10 7 10" />
            <path d="M3.51 15a9 9 0 1 0 2.13-9.36L1 10" />
          </svg>
          New Game
        </button>
        <button
          onClick={onUndo}
          disabled={!canUndo}
          className="flex items-center justify-center gap-2 w-full px-4 py-2.5 rounded-lg border border-border text-sm font-medium text-foreground-secondary hover:bg-surface-hover hover:text-foreground transition-all disabled:opacity-40 disabled:cursor-not-allowed disabled:hover:bg-transparent"
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
            <polyline points="1 4 1 10 7 10" />
            <path d="M3.51 15a9 9 0 1 0 2.13-9.36L1 10" />
          </svg>
          Undo Move
        </button>
      </div>

      {/* Rules */}
      <div className="rounded-lg border border-border bg-surface p-4">
        <h4 className="text-xs font-bold text-foreground-muted uppercase tracking-wider mb-2">
          Rules
        </h4>
        <ul className="space-y-1.5 text-xs text-foreground-secondary">
          <li className="flex items-start gap-2">
            <span className="text-rose-500 mt-0.5">✕</span>
            Player X goes first (Red)
          </li>
          <li className="flex items-start gap-2">
            <span className="text-blue-500 mt-0.5">○</span>
            Player O goes second (Blue)
          </li>
          <li className="flex items-start gap-2">
            <span className="text-emerald-500 mt-0.5">★</span>
            Get 5 in a row to win
          </li>
          <li className="flex items-start gap-2">
            <span className="text-amber-500 mt-0.5">⚡</span>
            Blocked on both ends doesn&apos;t count
          </li>
        </ul>
      </div>
    </div>
  );
}
