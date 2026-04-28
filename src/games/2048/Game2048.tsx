"use client";

import { useEffect, useCallback, useRef, useState } from "react";
import { use2048Logic } from "./use2048Logic";
import { Board } from "./Board";
import { ScoreBoard } from "./ScoreBoard";
import { GameOverlay } from "./GameOverlay";
import { LoginModal } from "@/components/auth/LoginModal";
import { useAuth } from "@/components/auth";
import type { Direction } from "./types";

export function Game2048() {
  const {
    tiles,
    score,
    bestScore,
    gameStatus,
    moveCount,
    gridSize,
    winTile,
    move,
    restart,
    continuePlaying,
  } = use2048Logic();

  const { user, refreshUser } = useAuth();
  const boardRef = useRef<HTMLDivElement>(null);
  const scoreSavedRef = useRef(false);
  const [showLogin, setShowLogin] = useState(false);

  // Show login prompt when game ends and user is not logged in
  useEffect(() => {
    if (gameStatus === "lost" && !user) {
      // Small delay so the game-over overlay renders first
      const t = setTimeout(() => setShowLogin(true), 600);
      return () => clearTimeout(t);
    }
  }, [gameStatus, user]);

  // Save score to DB when game ends
  useEffect(() => {
    if (gameStatus === "playing") {
      scoreSavedRef.current = false;
    }

    if (!user) return;
    if (gameStatus !== "lost" && gameStatus !== "won") return;
    if (scoreSavedRef.current) return;
    scoreSavedRef.current = true;

    fetch(`/api/users/${user.id}/score`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ game: "2048", score }),
    })
      .then((r) => r.json())
      .then((d) => {
        if (d.bestScore2048 !== undefined) {
          refreshUser({ bestScore2048: d.bestScore2048 });
        }
      })
      .catch((err) => console.error("Failed to save score:", err));
  }, [gameStatus, score, user, refreshUser]);

  const displayBestScore = user ? Math.max(user.bestScore2048 || 0, score) : bestScore;

  const handleRestart = useCallback(() => {
    scoreSavedRef.current = false;
    setShowLogin(false);
    restart();
  }, [restart]);

  // ── Keyboard Controls ──────────────────────────────────────────
  const handleKeyDown = useCallback(
    (e: KeyboardEvent) => {
      const keyMap: Record<string, Direction> = {
        ArrowUp: "up", ArrowDown: "down", ArrowLeft: "left", ArrowRight: "right",
        w: "up", s: "down", a: "left", d: "right",
      };
      const direction = keyMap[e.key];
      if (direction) { e.preventDefault(); move(direction); }
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
    touchStart.current = { x: e.touches[0].clientX, y: e.touches[0].clientY };
  }, []);

  const handleTouchEnd = useCallback(
    (e: React.TouchEvent) => {
      if (!touchStart.current) return;
      const dx = e.changedTouches[0].clientX - touchStart.current.x;
      const dy = e.changedTouches[0].clientY - touchStart.current.y;
      if (Math.max(Math.abs(dx), Math.abs(dy)) < 30) return;
      move(Math.abs(dx) > Math.abs(dy) ? (dx > 0 ? "right" : "left") : (dy > 0 ? "down" : "up"));
      touchStart.current = null;
    },
    [move]
  );

  return (
    <>
      {/* Login modal shown after game over when not logged in */}
      {showLogin && (
        <LoginModal
          title="Save your score!"
          subtitle={`You scored ${score.toLocaleString()}! Enter a username to save it to the leaderboard.`}
          onSuccess={() => setShowLogin(false)}
          onClose={() => setShowLogin(false)}
        />
      )}

      <div className="flex flex-col items-center gap-6">
        <div className="w-full flex flex-col sm:flex-row items-center justify-between gap-4">
          <div>
            <h1 className="text-3xl sm:text-4xl font-extrabold text-foreground">2048</h1>
            <p className="text-sm text-foreground-secondary mt-0.5">
              Join the tiles, get to{" "}
              <span className="font-bold text-amber-600 dark:text-amber-400">2048!</span>
            </p>
          </div>
          <ScoreBoard score={score} bestScore={displayBestScore} moveCount={moveCount} />
        </div>

        <div className="w-full flex items-center justify-between">
          <div className="flex items-center gap-2 text-xs text-foreground-muted">
            <kbd className="px-1.5 py-0.5 rounded border border-border bg-surface text-foreground-secondary font-mono text-[10px]">←↑↓→</kbd>
            <span>or</span>
            <kbd className="px-1.5 py-0.5 rounded border border-border bg-surface text-foreground-secondary font-mono text-[10px]">WASD</kbd>
            <span>to move</span>
          </div>
          <button
            onClick={handleRestart}
            className="flex items-center gap-2 px-4 py-2 rounded-lg border border-border text-sm font-medium text-foreground-secondary hover:bg-surface-hover hover:text-foreground transition-all hover:-translate-y-0.5"
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
              <polyline points="1 4 1 10 7 10" />
              <path d="M3.51 15a9 9 0 1 0 2.13-9.36L1 10" />
            </svg>
            New Game
          </button>
        </div>

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
            winTile={winTile}
            onRestart={handleRestart}
            onContinue={continuePlaying}
          />
        </div>

        <p className="sm:hidden text-xs text-foreground-muted text-center">Swipe to move tiles</p>
      </div>
    </>
  );
}
