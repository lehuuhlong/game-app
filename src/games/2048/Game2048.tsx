"use client";

import { useEffect, useCallback, useRef } from "react";
import { use2048Logic } from "./use2048Logic";
import { Board } from "./Board";
import { ScoreBoard } from "./ScoreBoard";
import { GameOverlay } from "./GameOverlay";
import type { Direction } from "./types";

export function Game2048() {
  const {
    tiles,
    score,
    bestScore,
    gameStatus,
    moveCount,
    gridSize,
    move,
    restart,
    continuePlaying,
  } = use2048Logic();

  const boardRef = useRef<HTMLDivElement>(null);

  // ── Keyboard Controls ──────────────────────────────────────────
  const handleKeyDown = useCallback(
    (e: KeyboardEvent) => {
      const keyMap: Record<string, Direction> = {
        ArrowUp: "up",
        ArrowDown: "down",
        ArrowLeft: "left",
        ArrowRight: "right",
        w: "up",
        s: "down",
        a: "left",
        d: "right",
      };
      const direction = keyMap[e.key];
      if (direction) {
        e.preventDefault();
        move(direction);
      }
    },
    [move]
  );

  useEffect(() => {
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [handleKeyDown]);

  // ── Touch / Swipe Controls ─────────────────────────────────────
  const touchStart = useRef<{ x: number; y: number } | null>(null);

  const handleTouchStart = useCallback((e: React.TouchEvent) => {
    const touch = e.touches[0];
    touchStart.current = { x: touch.clientX, y: touch.clientY };
  }, []);

  const handleTouchEnd = useCallback(
    (e: React.TouchEvent) => {
      if (!touchStart.current) return;
      const touch = e.changedTouches[0];
      const dx = touch.clientX - touchStart.current.x;
      const dy = touch.clientY - touchStart.current.y;
      const absDx = Math.abs(dx);
      const absDy = Math.abs(dy);

      // Minimum swipe distance
      if (Math.max(absDx, absDy) < 30) return;

      if (absDx > absDy) {
        move(dx > 0 ? "right" : "left");
      } else {
        move(dy > 0 ? "down" : "up");
      }
      touchStart.current = null;
    },
    [move]
  );

  return (
    <div className="flex flex-col items-center gap-6">
      {/* Header */}
      <div className="w-full flex flex-col sm:flex-row items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl sm:text-4xl font-extrabold text-foreground">
            2048
          </h1>
          <p className="text-sm text-foreground-secondary mt-0.5">
            Join the tiles, get to{" "}
            <span className="font-bold text-amber-600 dark:text-amber-400">2048!</span>
          </p>
        </div>
        <ScoreBoard score={score} bestScore={bestScore} moveCount={moveCount} />
      </div>

      {/* Controls row */}
      <div className="w-full flex items-center justify-between">
        <div className="flex items-center gap-2 text-xs text-foreground-muted">
          <kbd className="px-1.5 py-0.5 rounded border border-border bg-surface text-foreground-secondary font-mono text-[10px]">
            ←↑↓→
          </kbd>
          <span>or</span>
          <kbd className="px-1.5 py-0.5 rounded border border-border bg-surface text-foreground-secondary font-mono text-[10px]">
            WASD
          </kbd>
          <span>to move</span>
        </div>
        <button
          onClick={restart}
          className="flex items-center gap-2 px-4 py-2 rounded-lg border border-border text-sm font-medium text-foreground-secondary hover:bg-surface-hover hover:text-foreground transition-all hover:-translate-y-0.5"
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
            <polyline points="1 4 1 10 7 10" />
            <path d="M3.51 15a9 9 0 1 0 2.13-9.36L1 10" />
          </svg>
          New Game
        </button>
      </div>

      {/* Board */}
      <div
        ref={boardRef}
        className="relative select-none touch-none"
        onTouchStart={handleTouchStart}
        onTouchEnd={handleTouchEnd}
      >
        <Board tiles={tiles} gridSize={gridSize} />
        <GameOverlay
          status={gameStatus}
          score={score}
          onRestart={restart}
          onContinue={continuePlaying}
        />
      </div>

      {/* Mobile swipe hint */}
      <p className="sm:hidden text-xs text-foreground-muted text-center">
        Swipe to move tiles
      </p>
    </div>
  );
}
