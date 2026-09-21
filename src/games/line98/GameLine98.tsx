"use client";

/**
 * GameLine98 — Main UI Component for Classic Line 98 (Color Lines)
 *
 * Renders:
 * - Premium header with score display and controls
 * - 9×9 interactive grid with 3D CSS balls
 * - "Next 3 balls" preview panel
 * - Floating score popups for combos
 * - Game Over overlay
 * - Path animation, removal animation, spawn animation
 */

import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { motion } from "framer-motion";
import { useLine98, GamePhase, ScoreEvent, PreviewBall } from "./useLine98";
import { BallColor, BOARD_SIZE, Coord, Cell } from "./types";
import { LoginModal } from "@/components/auth/LoginModal";
import { useAuth } from "@/components/auth";

// ─── Ball Color Config ───────────────────────────────────────────────

interface BallStyle {
  /** Radial gradient for the 3D sphere effect. */
  gradient: string;
  /** Shadow / glow color. */
  shadow: string;
  /** Ring border color (selection). */
  ring: string;
}

const BALL_STYLES: Record<BallColor, BallStyle> = {
  red: {
    gradient:
      "radial-gradient(circle at 35% 30%, #ff9a9e 0%, #ef4444 40%, #b91c1c 80%, #7f1d1d 100%)",
    shadow: "rgba(239, 68, 68, 0.6)",
    ring: "#fca5a5",
  },
  blue: {
    gradient:
      "radial-gradient(circle at 35% 30%, #93c5fd 0%, #3b82f6 40%, #1d4ed8 80%, #1e3a5f 100%)",
    shadow: "rgba(59, 130, 246, 0.6)",
    ring: "#93c5fd",
  },
  green: {
    gradient:
      "radial-gradient(circle at 35% 30%, #86efac 0%, #22c55e 40%, #15803d 80%, #14532d 100%)",
    shadow: "rgba(34, 197, 94, 0.6)",
    ring: "#86efac",
  },
  yellow: {
    gradient:
      "radial-gradient(circle at 35% 30%, #fef08a 0%, #eab308 40%, #a16207 80%, #713f12 100%)",
    shadow: "rgba(234, 179, 8, 0.6)",
    ring: "#fef08a",
  },
  purple: {
    gradient:
      "radial-gradient(circle at 35% 30%, #d8b4fe 0%, #a855f7 40%, #7e22ce 80%, #581c87 100%)",
    shadow: "rgba(168, 85, 247, 0.6)",
    ring: "#d8b4fe",
  },
  cyan: {
    gradient:
      "radial-gradient(circle at 35% 30%, #a5f3fc 0%, #06b6d4 40%, #0e7490 80%, #164e63 100%)",
    shadow: "rgba(6, 182, 212, 0.6)",
    ring: "#a5f3fc",
  },
  orange: {
    gradient:
      "radial-gradient(circle at 35% 30%, #fed7aa 0%, #f97316 40%, #c2410c 80%, #7c2d12 100%)",
    shadow: "rgba(249, 115, 22, 0.6)",
    ring: "#fed7aa",
  },
};

// ─── Ball Component ──────────────────────────────────────────────────

function Ball({
  color,
  isSelected,
  isRemoving,
  isSpawning,
}: {
  color: BallColor;
  isSelected: boolean;
  isRemoving: boolean;
  isSpawning: boolean;
}) {
  const style = BALL_STYLES[color];

  return (
    <div
      className={`
        absolute inset-[12%] rounded-full transition-transform duration-200
        ${isSelected ? "scale-90 animate-bounce-gentle" : "scale-100"}
        ${isRemoving ? "animate-ball-pop" : ""}
        ${isSpawning ? "animate-ball-spawn" : ""}
      `}
      style={{
        background: style.gradient,
        boxShadow: isSelected
          ? `0 0 12px 4px ${style.shadow}, 0 0 20px 8px ${style.shadow}, inset 0 -3px 6px rgba(0,0,0,0.3)`
          : `0 4px 8px rgba(0,0,0,0.3), 0 0 6px 1px ${style.shadow}, inset 0 -3px 6px rgba(0,0,0,0.25)`,
        border: isSelected ? `2px solid ${style.ring}` : "none",
      }}
    >
      {/* Specular highlight */}
      <div
        className="absolute rounded-full"
        style={{
          top: "15%",
          left: "22%",
          width: "30%",
          height: "20%",
          background:
            "radial-gradient(ellipse, rgba(255,255,255,0.7) 0%, rgba(255,255,255,0) 100%)",
        }}
      />
    </div>
  );
}

// ─── ScoreBoard (matching 2048 & Flappy Bird style) ──────────────────

function ScoreBoard({
  score,
  bestScore,
  moveCount,
}: {
  score: number;
  bestScore: number;
  moveCount: number;
}) {
  return (
    <div className="flex items-center gap-2 sm:gap-3">
      <div className="flex flex-col items-center rounded-xl bg-gradient-to-br from-violet-600 to-indigo-600 text-white px-3 sm:px-4 py-2 min-w-[74px] sm:min-w-[84px] shadow-lg shadow-violet-500/25">
        <span className="text-[10px] font-bold tracking-widest uppercase opacity-80">
          SCORE
        </span>
        <motion.span
          key={score}
          initial={{ scale: 1.25, opacity: 0.7 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ type: "spring", stiffness: 300, damping: 20 }}
          className="text-lg sm:text-xl font-extrabold tabular-nums"
        >
          {score.toLocaleString()}
        </motion.span>
      </div>

      <div className="flex flex-col items-center rounded-xl border border-border bg-surface px-3 sm:px-4 py-2 min-w-[74px] sm:min-w-[84px] shadow-sm">
        <span className="text-[10px] font-bold tracking-widest uppercase text-foreground-muted">
          BEST
        </span>
        <motion.span
          key={bestScore}
          initial={{ scale: 1.2, opacity: 0.7 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ type: "spring", stiffness: 300, damping: 20 }}
          className="text-lg sm:text-xl font-extrabold text-amber-500 dark:text-amber-400 tabular-nums"
        >
          {bestScore.toLocaleString()}
        </motion.span>
      </div>

      <div className="flex flex-col items-center rounded-xl border border-border bg-surface px-3 sm:px-4 py-2 min-w-[74px] sm:min-w-[84px] shadow-sm">
        <span className="text-[10px] font-bold tracking-widest uppercase text-foreground-muted">
          MOVES
        </span>
        <motion.span
          key={moveCount}
          initial={{ scale: 1.15, opacity: 0.7 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ type: "spring", stiffness: 300, damping: 20 }}
          className="text-lg sm:text-xl font-extrabold text-foreground tabular-nums"
        >
          {moveCount}
        </motion.span>
      </div>
    </div>
  );
}

// ─── Preview Ball Dot (tiny ghost ball on the grid) ──────────────────

function PreviewBallDot({ color }: { color: BallColor }) {
  const style = BALL_STYLES[color];
  return (
    <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
      <div
        className="w-[34%] h-[34%] rounded-full animate-preview-pulse pointer-events-none"
        style={{
          background: style.gradient,
          boxShadow: `0 0 6px 1px ${style.shadow}`,
          opacity: 0.85,
        }}
      />
    </div>
  );
}

// ─── Floating Score Popup ────────────────────────────────────────────

function FloatingScore({
  event,
  onDone,
}: {
  event: ScoreEvent;
  onDone: () => void;
}) {
  useEffect(() => {
    const timer = setTimeout(onDone, 1500);
    return () => clearTimeout(timer);
  }, [onDone]);

  return (
    <div
      className="absolute pointer-events-none z-30 animate-score-float"
      style={{
        left: `${(event.position.col / BOARD_SIZE) * 100 + 100 / BOARD_SIZE / 2}%`,
        top: `${(event.position.row / BOARD_SIZE) * 100}%`,
        transform: "translateX(-50%)",
      }}
    >
      <span
        className={`
          text-lg sm:text-xl font-extrabold drop-shadow-lg whitespace-nowrap
          ${event.isCombo ? "text-amber-300" : "text-emerald-300"}
        `}
      >
        +{event.score}
        {event.isCombo && " COMBO!"}
      </span>
    </div>
  );
}

// ─── Game Over Overlay ───────────────────────────────────────────────

function GameOverOverlay({
  score,
  highScore,
  moveCount,
  onRestart,
}: {
  score: number;
  highScore: number;
  moveCount: number;
  onRestart: () => void;
}) {
  const isNewHigh = score > 0 && score >= highScore;

  return (
    <div className="pointer-events-none absolute inset-0 z-40 flex items-center justify-center bg-slate-950/60 backdrop-blur-sm p-4 sm:p-6 animate-fade-in">
      <div className="pointer-events-auto w-full max-w-[320px] rounded-3xl border border-white/20 bg-slate-950/95 p-6 text-center text-white shadow-2xl backdrop-blur-md">
        <div className="text-xs font-bold uppercase tracking-[0.24em] text-rose-400">
          Game Over
        </div>

        {isNewHigh && (
          <div className="mt-2 inline-flex items-center gap-1.5 rounded-full border border-amber-400/40 bg-amber-400/15 px-3 py-1 text-xs font-black text-amber-300 animate-pulse">
            <span>✨</span> New High Score! <span>✨</span>
          </div>
        )}

        <div className="mt-3 text-4xl sm:text-5xl font-black tracking-tight tabular-nums text-white">
          {score.toLocaleString()}
        </div>

        <p className="mt-2 text-xs font-medium text-slate-300">
          Best:{" "}
          <span className="font-bold text-amber-400 tabular-nums">
            {highScore.toLocaleString()}
          </span>{" "}
          <span className="mx-1 text-slate-600">•</span>
          Moves:{" "}
          <span className="font-semibold text-slate-200 tabular-nums">
            {moveCount}
          </span>
        </p>

        <button
          type="button"
          onClick={onRestart}
          className="mt-5 flex w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-violet-600 to-indigo-600 px-5 py-3 text-sm font-bold text-white shadow-lg shadow-violet-500/25 transition-all hover:scale-[1.02] hover:from-violet-500 hover:to-indigo-500 active:scale-[0.98]"
        >
          <svg
            width="16"
            height="16"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2.5"
            strokeLinecap="round"
          >
            <polyline points="1 4 1 10 7 10" />
            <path d="M3.51 15a9 9 0 1 0 2.13-9.36L1 10" />
          </svg>
          Play Again
        </button>

        <Link
          href="/leaderboard?game=line98"
          className="w-full mt-2.5 py-2.5 rounded-xl border border-white/20 bg-white/5 text-white/80 hover:text-white hover:bg-white/10 font-semibold text-xs transition-all flex items-center justify-center gap-1.5"
        >
          🏆 View Leaderboard
        </Link>
      </div>
    </div>
  );
}

// ─── Main Game Component ─────────────────────────────────────────────

export function GameLine98() {
  const game = useLine98();
  const {
    board,
    phase,
    selectedCell,
    score,
    highScore,
    previewBalls,
    animatingPath,
    removingCells,
    spawningCells,
    scoreEvents,
    moveCount,
    isGameOver,
    handleCellClick,
    resetGame,
    onAnimationComplete,
    onRemovalComplete,
    onSpawnComplete,
    dismissScoreEvent,
  } = game;

  const { user, refreshUser } = useAuth();
  const matchSavedRef = useRef(false);
  const userScoreSavedRef = useRef(false);
  const [showLogin, setShowLogin] = useState(false);

  const displayHighScore = Math.max(user?.bestScoreLine98 || 0, highScore);

  // ── Auto-advance animations with timers ────────────────────────────
  // Path animation: advance after a short delay
  useEffect(() => {
    if (phase === "animating" && animatingPath) {
      const duration = Math.min(animatingPath.length * 60, 500);
      const timer = setTimeout(onAnimationComplete, duration);
      return () => clearTimeout(timer);
    }
  }, [phase, animatingPath, onAnimationComplete]);

  // Removal animation: advance after pop effect
  useEffect(() => {
    if (phase === "removing" && removingCells) {
      const timer = setTimeout(onRemovalComplete, 400);
      return () => clearTimeout(timer);
    }
  }, [phase, removingCells, onRemovalComplete]);

  // Spawn animation: advance after entrance effect
  useEffect(() => {
    if (phase === "spawning" && spawningCells) {
      const timer = setTimeout(onSpawnComplete, 350);
      return () => clearTimeout(timer);
    }
  }, [phase, spawningCells, onSpawnComplete]);

  // ── Login prompt & score save on game over ─────────────────────────
  useEffect(() => {
    if (!isGameOver) {
      matchSavedRef.current = false;
      userScoreSavedRef.current = false;
    }
  }, [isGameOver]);

  useEffect(() => {
    if (isGameOver && !user && score > 0) {
      const t = setTimeout(() => setShowLogin(true), 600);
      return () => clearTimeout(t);
    }
  }, [isGameOver, user, score]);

  useEffect(() => {
    if (!isGameOver) return;

    // 1. Save match history once per game over
    if (!matchSavedRef.current && score > 0) {
      matchSavedRef.current = true;
      fetch("/api/matches", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          gameType: "line98",
          players: [
            {
              userId: user?.id || null,
              username: user ? user.username : "Guest",
              score,
              result: score >= 500 ? "win" : "loss",
            },
          ],
          duration: 0,
          gameData: { score, moveCount },
        }),
      }).catch((err) => console.error("Failed to save Line 98 match:", err));
    }

    // 2. Save user score if logged in and exceeds current DB high score
    const userDbBest = user?.bestScoreLine98 || 0;
    if (user && !userScoreSavedRef.current && score > 0) {
      userScoreSavedRef.current = true;
      if (score > userDbBest) {
        fetch(`/api/users/${user.id}/score`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ game: "line98", score }),
        })
          .then((r) => r.json())
          .then((d) => {
            if (d.bestScoreLine98 !== undefined) {
              refreshUser({ bestScoreLine98: d.bestScoreLine98 });
            }
          })
          .catch((err) => console.error("Failed to save score:", err));
      }
    }
  }, [isGameOver, score, moveCount, user, refreshUser]);

  const handleRestart = useCallback(() => {
    matchSavedRef.current = false;
    userScoreSavedRef.current = false;
    setShowLogin(false);
    resetGame();
  }, [resetGame]);

  // ── Helper: Check if a cell is in the removing set ─────────────────
  const isCellRemoving = useCallback(
    (r: number, c: number): boolean => {
      return removingCells ? removingCells.has(`${r},${c}`) : false;
    },
    [removingCells]
  );

  // ── Helper: Check if a cell is a freshly spawned cell ──────────────
  const isCellSpawning = useCallback(
    (r: number, c: number): boolean => {
      if (!spawningCells) return false;
      return spawningCells.some((s) => s.row === r && s.col === c);
    },
    [spawningCells]
  );

  // ── Helper: Check if a cell is selected ────────────────────────────
  const isCellSelected = useCallback(
    (r: number, c: number): boolean => {
      return selectedCell ? selectedCell.row === r && selectedCell.col === c : false;
    },
    [selectedCell]
  );

  // ── Helper: Check if a cell is on the animation path ───────────────
  const isCellOnPath = useCallback(
    (r: number, c: number): boolean => {
      if (!animatingPath) return false;
      return animatingPath.some((p) => p.row === r && p.col === c);
    },
    [animatingPath]
  );

  // ── Helper: Get preview ball color for a cell (or null) ────────────
  const getPreviewColor = useCallback(
    (r: number, c: number): BallColor | null => {
      const preview = previewBalls.find((p) => p.row === r && p.col === c);
      return preview ? preview.color : null;
    },
    [previewBalls]
  );

  return (
    <>
      {showLogin && (
        <LoginModal
          title="Save your score!"
          subtitle={`You scored ${score.toLocaleString()}! Enter a username to save it to the leaderboard.`}
          onSuccess={() => setShowLogin(false)}
          onClose={() => setShowLogin(false)}
        />
      )}

      <div className="flex flex-col items-center gap-6">
        {/* ── Header (2048 & Flappy Bird style) ── */}
        <div className="w-full flex flex-col sm:flex-row items-center justify-between gap-4">
          <div>
            <h1 className="text-3xl sm:text-4xl font-extrabold text-foreground tracking-tight">
              Line 98
            </h1>
            <p className="text-sm text-foreground-secondary mt-0.5">
              Align{" "}
              <span className="font-bold text-violet-500 dark:text-violet-400">
                5+ same-color balls
              </span>{" "}
              horizontally (↔), vertically (↕), or diagonally (⤢ ⤡) to score!
            </p>
          </div>

          <ScoreBoard
            score={score}
            bestScore={displayHighScore}
            moveCount={moveCount}
          />
        </div>

        {/* ── Controls Bar ── */}
        <div className="w-full flex items-center justify-between">
          <div className="flex items-center gap-2 text-xs text-foreground-muted">
            <kbd className="px-1.5 py-0.5 rounded border border-border bg-surface text-foreground-secondary font-mono text-[10px]">
              Click
            </kbd>
            <span>ball</span>
            <span>→</span>
            <kbd className="px-1.5 py-0.5 rounded border border-border bg-surface text-foreground-secondary font-mono text-[10px]">
              Click
            </kbd>
            <span>empty cell</span>
            <span className="mx-1 text-border hidden sm:inline">|</span>
            <span className="hidden sm:inline-flex items-center gap-1.5 text-foreground-secondary font-medium">
              <span className="text-violet-400">↔ ↕ ⤢ ⤡</span>
              <span>5+ in line</span>
            </span>
          </div>

          <button
            type="button"
            onClick={handleRestart}
            className="flex items-center gap-2 px-4 py-2 rounded-lg border border-border bg-surface text-sm font-medium text-foreground-secondary hover:bg-surface-hover hover:text-foreground transition-all hover:-translate-y-0.5 shadow-sm"
          >
            <svg
              width="14"
              height="14"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2.5"
              strokeLinecap="round"
            >
              <polyline points="1 4 1 10 7 10" />
              <path d="M3.51 15a9 9 0 1 0 2.13-9.36L1 10" />
            </svg>
            New Game
          </button>
        </div>

        {/* ── Game Board ── */}
        <div className="relative select-none w-full max-w-lg mx-auto">
          {/* Board grid */}
          <div
            className="relative w-full rounded-2xl overflow-hidden border border-border/80 shadow-2xl p-1.5 sm:p-2.5"
            style={{
              background:
                "linear-gradient(145deg, #090d16 0%, #111827 50%, #090d16 100%)",
            }}
          >
            {/* Subtle grid pattern overlay */}
            <div
              className="absolute inset-0 opacity-[0.03] pointer-events-none"
              style={{
                backgroundImage:
                  "linear-gradient(rgba(255,255,255,0.1) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.1) 1px, transparent 1px)",
                backgroundSize: `${100 / BOARD_SIZE}% ${100 / BOARD_SIZE}%`,
              }}
            />

            {/* Aspect ratio container (1:1 grid) */}
            <div style={{ paddingBottom: "100%" }} className="relative">
              <div className="absolute inset-0">
                <div className="grid grid-cols-9 grid-rows-9 gap-[2px] sm:gap-[3px] w-full h-full">
                  {Array.from({ length: BOARD_SIZE * BOARD_SIZE }).map(
                    (_, idx) => {
                      const r = Math.floor(idx / BOARD_SIZE);
                      const c = idx % BOARD_SIZE;
                      const cellValue = board[r][c];
                      const selected = isCellSelected(r, c);
                      const removing = isCellRemoving(r, c);
                      const spawning = isCellSpawning(r, c);
                      const onPath = isCellOnPath(r, c);
                      const previewColor = getPreviewColor(r, c);

                      return (
                        <button
                          key={`${r}-${c}`}
                          id={`line98-cell-${r}-${c}`}
                          onClick={() => handleCellClick(r, c)}
                          className={`
                            relative rounded-md sm:rounded-lg aspect-square transition-colors duration-150
                            ${
                              cellValue
                                ? "cursor-pointer hover:bg-white/10"
                                : phase === "selected"
                                  ? "cursor-pointer hover:bg-white/8"
                                  : "cursor-default"
                            }
                            ${selected ? "bg-white/20 ring-2 ring-violet-400" : "bg-white/[0.04]"}
                            ${onPath ? "bg-violet-500/25" : ""}
                          `}
                        >
                          {/* Cell dot indicator for empty cells (no preview) */}
                          {!cellValue && !onPath && !previewColor && (
                            <div className="absolute inset-0 flex items-center justify-center">
                              <div className="w-1.5 h-1.5 rounded-full bg-white/[0.06]" />
                            </div>
                          )}

                          {/* Preview ball (tiny ghost ball — international rule) */}
                          {!cellValue && previewColor && (
                            <PreviewBallDot color={previewColor} />
                          )}

                          {/* Ball */}
                          {cellValue && (
                            <Ball
                              color={cellValue}
                              isSelected={selected}
                              isRemoving={removing}
                              isSpawning={spawning}
                            />
                          )}
                        </button>
                      );
                    }
                  )}
                </div>
              </div>
            </div>

            {/* Floating score popups */}
            <div className="absolute inset-0 pointer-events-none p-1 sm:p-1.5">
              {scoreEvents.map((event) => (
                <FloatingScore
                  key={event.id}
                  event={event}
                  onDone={() => dismissScoreEvent(event.id)}
                />
              ))}
            </div>

            {/* Game Over overlay */}
            {isGameOver && (
              <GameOverOverlay
                score={score}
                highScore={displayHighScore}
                moveCount={moveCount}
                onRestart={handleRestart}
              />
            )}
          </div>
        </div>

        {/* ── Mobile hint ── */}
        <p className="sm:hidden text-xs text-foreground-muted text-center">
          Tap a ball, then tap an empty cell to move
        </p>

        {/* ── Strategy Guide Tips (matching Flappy Bird & 2048) ── */}
        <div className="grid w-full max-w-lg gap-3 sm:grid-cols-3">
          {[
            [
              "01",
              "Straight & Diagonal",
              "Align 5+ same-color balls horizontally (↔), vertically (↕), or diagonally (⤢ ⤡) to clear lines.",
            ],
            [
              "02",
              "Ghost Balls",
              "Tiny glowing dots preview upcoming spawns. Move a ball onto a dot to relocate it!",
            ],
            [
              "03",
              "Combos & Bonuses",
              "Clearing intersecting lines (e.g. cross or X) multiplies your score and grants free moves.",
            ],
          ].map(([number, title, copy]) => (
            <div
              key={number}
              className="rounded-2xl border border-border bg-surface p-4 shadow-sm"
            >
              <div className="font-mono text-xs font-black text-violet-500">
                {number}
              </div>
              <h3 className="mt-1 text-sm font-bold text-foreground">{title}</h3>
              <p className="mt-1 text-xs leading-relaxed text-foreground-muted">
                {copy}
              </p>
            </div>
          ))}
        </div>
      </div>

      {/* ── CSS Animations ── */}
      <style jsx global>{`
        @keyframes bounce-gentle {
          0%, 100% { transform: scale(0.9) translateY(0); }
          50% { transform: scale(0.85) translateY(-8%); }
        }
        .animate-bounce-gentle {
          animation: bounce-gentle 0.8s ease-in-out infinite;
        }

        @keyframes ball-pop {
          0% { transform: scale(1); opacity: 1; }
          40% { transform: scale(1.3); opacity: 0.8; }
          100% { transform: scale(0); opacity: 0; }
        }
        .animate-ball-pop {
          animation: ball-pop 0.35s ease-out forwards;
        }

        @keyframes ball-spawn {
          0% { transform: scale(0); opacity: 0; }
          60% { transform: scale(1.15); opacity: 1; }
          100% { transform: scale(1); opacity: 1; }
        }
        .animate-ball-spawn {
          animation: ball-spawn 0.3s cubic-bezier(0.34, 1.56, 0.64, 1) forwards;
        }

        @keyframes score-float {
          0% { opacity: 1; transform: translateX(-50%) translateY(0); }
          70% { opacity: 1; }
          100% { opacity: 0; transform: translateX(-50%) translateY(-200%); }
        }
        .animate-score-float {
          animation: score-float 1.4s ease-out forwards;
        }

        @keyframes fade-in {
          from { opacity: 0; }
          to { opacity: 1; }
        }
        .animate-fade-in {
          animation: fade-in 0.3s ease-out forwards;
        }

        @keyframes preview-pulse {
          0%, 100% { transform: scale(1); opacity: 0.55; }
          50% { transform: scale(1.25); opacity: 0.8; }
        }
        .animate-preview-pulse {
          animation: preview-pulse 1.6s ease-in-out infinite;
        }
      `}</style>
    </>
  );
}
