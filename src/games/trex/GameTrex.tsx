"use client";

import { useEffect, useRef, useState } from "react";
import { useTrexEngine } from "./useTrexEngine";
import { LoginModal } from "@/components/auth/LoginModal";
import { useAuth } from "@/components/auth";

export function GameTrex() {
  const { canvasRef, gameState, startGame, handleTouch, config } =
    useTrexEngine();
  const { user, refreshUser } = useAuth();

  const scoreSavedRef = useRef(false);
  const [showLogin, setShowLogin] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  // ── Responsive canvas sizing ────────────────────────────────────
  const [canvasScale, setCanvasScale] = useState(1);

  useEffect(() => {
    function handleResize() {
      if (!containerRef.current) return;
      const containerW = containerRef.current.clientWidth;
      const scale = Math.min(1, containerW / config.canvasWidth);
      setCanvasScale(scale);
    }
    handleResize();
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, [config.canvasWidth]);

  // ── Login prompt on game over if not logged in ──────────────────
  useEffect(() => {
    if (gameState.isGameOver && !user) {
      const t = setTimeout(() => setShowLogin(true), 600);
      return () => clearTimeout(t);
    }
  }, [gameState.isGameOver, user]);

  // ── Save score to DB on game over ──────────────────────────────
  useEffect(() => {
    if (!gameState.isGameOver) {
      scoreSavedRef.current = false;
      return;
    }
    if (!user || scoreSavedRef.current) return;
    scoreSavedRef.current = true;

    fetch(`/api/users/${user.id}/score`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ game: "trex", score: gameState.score }),
    })
      .then((r) => r.json())
      .then((d) => {
        if (d.bestScoreTrex !== undefined) {
          refreshUser({ bestScoreTrex: d.bestScoreTrex });
        }
      })
      .catch((err) => console.error("Failed to save T-Rex score:", err));
  }, [gameState.isGameOver, gameState.score, user, refreshUser]);

  const displayHighScore = user
    ? Math.max(user.bestScoreTrex || 0, gameState.highScore)
    : gameState.highScore;

  return (
    <>
      {showLogin && (
        <LoginModal
          title="Save your score!"
          subtitle={`You scored ${gameState.score}! Enter a username to save it to the leaderboard.`}
          onSuccess={() => setShowLogin(false)}
          onClose={() => setShowLogin(false)}
        />
      )}

      <div className="flex flex-col items-center gap-6">
        {/* ── Header ──────────────────────────────────────────────── */}
        <div className="w-full flex flex-col sm:flex-row items-center justify-between gap-4">
          <div>
            <h1 className="text-3xl sm:text-4xl font-extrabold text-foreground">
              T-Rex Runner
            </h1>
            <p className="text-sm text-foreground-secondary mt-0.5">
              Chrome&apos;s classic{" "}
              <span className="font-bold text-foreground">
                offline dinosaur game
              </span>
              , reimagined.
            </p>
          </div>

          {/* Scoreboard */}
          <div className="flex items-center gap-3">
            <div className="flex flex-col items-center rounded-xl border border-border bg-surface px-4 py-2 min-w-[80px]">
              <span className="text-[10px] uppercase tracking-wider text-foreground-muted font-semibold">
                Score
              </span>
              <span className="text-lg font-bold text-foreground tabular-nums">
                {gameState.score}
              </span>
            </div>
            <div className="flex flex-col items-center rounded-xl border border-border bg-surface px-4 py-2 min-w-[80px]">
              <span className="text-[10px] uppercase tracking-wider text-foreground-muted font-semibold">
                Best
              </span>
              <span className="text-lg font-bold text-accent tabular-nums">
                {displayHighScore}
              </span>
            </div>
          </div>
        </div>

        {/* ── Controls hint ───────────────────────────────────────── */}
        <div className="w-full flex items-center justify-between">
          <div className="flex items-center gap-2 text-xs text-foreground-muted">
            <kbd className="px-1.5 py-0.5 rounded border border-border bg-surface text-foreground-secondary font-mono text-[10px]">
              Space
            </kbd>
            <span>/</span>
            <kbd className="px-1.5 py-0.5 rounded border border-border bg-surface text-foreground-secondary font-mono text-[10px]">
              ↑
            </kbd>
            <span>jump</span>
            <span className="mx-1 text-border">|</span>
            <kbd className="px-1.5 py-0.5 rounded border border-border bg-surface text-foreground-secondary font-mono text-[10px]">
              ↓
            </kbd>
            <span>duck</span>
          </div>
          <button
            onClick={startGame}
            className="flex items-center gap-2 px-4 py-2 rounded-lg border border-border text-sm font-medium text-foreground-secondary hover:bg-surface-hover hover:text-foreground transition-all hover:-translate-y-0.5"
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
            Restart
          </button>
        </div>

        {/* ── Canvas Container ────────────────────────────────────── */}
        <div
          ref={containerRef}
          className="w-full flex justify-center"
        >
          <div
            className="relative rounded-2xl border border-border bg-white dark:bg-[#f7f7f7] overflow-hidden shadow-md"
            style={{
              width: config.canvasWidth * canvasScale,
              height: config.canvasHeight * canvasScale,
            }}
          >
            <canvas
              ref={canvasRef}
              width={config.canvasWidth}
              height={config.canvasHeight}
              onClick={handleTouch}
              onTouchStart={(e) => {
                e.preventDefault();
                handleTouch();
              }}
              className="block cursor-pointer"
              style={{
                width: config.canvasWidth * canvasScale,
                height: config.canvasHeight * canvasScale,
              }}
            />

            {/* Game-over overlay */}
            {gameState.isGameOver && (
              <div className="absolute inset-0 flex flex-col items-center justify-center bg-black/10 backdrop-blur-[2px] rounded-2xl">
                <button
                  onClick={startGame}
                  className="mt-12 flex items-center gap-2 rounded-xl bg-accent px-5 py-2.5 text-sm font-semibold text-white shadow-lg shadow-accent/25 transition-all hover:bg-accent-hover hover:shadow-xl hover:-translate-y-0.5"
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
              </div>
            )}

            {/* Pre-game overlay */}
            {!gameState.isPlaying && !gameState.isGameOver && (
              <div className="absolute inset-0 flex flex-col items-center justify-center rounded-2xl">
                <button
                  onClick={startGame}
                  className="flex items-center gap-2 rounded-xl bg-accent px-6 py-3 text-sm font-semibold text-white shadow-lg shadow-accent/25 transition-all hover:bg-accent-hover hover:shadow-xl hover:-translate-y-0.5 animate-pulse"
                >
                  <svg
                    width="18"
                    height="18"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2.5"
                    strokeLinecap="round"
                  >
                    <polygon points="5 3 19 12 5 21 5 3" />
                  </svg>
                  Start Game
                </button>
              </div>
            )}
          </div>
        </div>

        {/* ── Mobile hint ─────────────────────────────────────────── */}
        <p className="sm:hidden text-xs text-foreground-muted text-center">
          Tap to jump
        </p>

        {/* ── Speed indicator ─────────────────────────────────────── */}
        {gameState.isPlaying && (
          <div className="flex items-center gap-2 text-xs text-foreground-muted">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2" />
            </svg>
            <span>Speed increases as you progress</span>
          </div>
        )}
      </div>
    </>
  );
}
