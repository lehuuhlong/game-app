"use client";

import { useEffect, useRef, useState } from "react";
import { useMazeEngine } from "./useMazeEngine";
import { LoginModal } from "@/components/auth/LoginModal";
import { useAuth } from "@/components/auth";

export function GameMazeMuncher() {
  const {
    canvasRef,
    gameState,
    config,
    isMuted,
    toggleSound,
    handleDirectionInput,
    restartGame,
  } = useMazeEngine();

  const { user, refreshUser } = useAuth();
  const scoreSavedRef = useRef(false);
  const [showLogin, setShowLogin] = useState(false);

  const containerRef = useRef<HTMLDivElement>(null);
  const [canvasScale, setCanvasScale] = useState(1);

  // ── Responsive canvas scaling to fit Tailwind container ───────────
  useEffect(() => {
    function handleResize() {
      if (!containerRef.current) return;
      const containerW = containerRef.current.clientWidth;
      const scale = Math.min(1, Math.max(0.4, (containerW - 24) / config.canvasWidth));
      setCanvasScale(scale);
    }
    handleResize();
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, [config.canvasWidth]);

  // ── Login prompt on game completion if guest ───────────────────────
  useEffect(() => {
    if ((gameState.isGameOver || gameState.isGameWon) && !user) {
      const t = setTimeout(() => setShowLogin(true), 700);
      return () => clearTimeout(t);
    }
  }, [gameState.isGameOver, gameState.isGameWon, user]);

  // ── Save score and match history on match finish ───────────────────
  useEffect(() => {
    if (!gameState.isGameOver && !gameState.isGameWon) {
      scoreSavedRef.current = false;
      return;
    }
    if (scoreSavedRef.current) return;
    scoreSavedRef.current = true;

    fetch("/api/matches", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        gameType: "mazemuncher",
        players: [
          {
            userId: user?.id,
            username: user ? user.username : "Guest",
            score: gameState.score,
            result: gameState.isGameWon ? "win" : "loss",
          },
        ],
        duration: 0,
        gameData: { score: gameState.score, won: gameState.isGameWon },
      }),
    }).catch((err) => console.error("Failed to save Maze Muncher match:", err));

    if (!user) return;

    fetch(`/api/users/${user.id}/score`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ game: "mazemuncher", score: gameState.score }),
    })
      .then((r) => r.json())
      .then((d) => {
        if (d.bestScoreMazeMuncher !== undefined) {
          refreshUser({ bestScoreMazeMuncher: d.bestScoreMazeMuncher });
        }
      })
      .catch((err) => console.error("Failed to save Maze Muncher score:", err));
  }, [gameState.isGameOver, gameState.isGameWon, gameState.score, user, refreshUser]);

  const displayHighScore = user?.bestScoreMazeMuncher !== undefined
    ? Math.max(user.bestScoreMazeMuncher, gameState.highScore)
    : gameState.highScore;

  return (
    <>
      {showLogin && (
        <LoginModal
          title="Save your high score!"
          subtitle={`You scored ${gameState.score} in Maze Muncher! Sign in to immortalize your name on the leaderboard.`}
          onSuccess={() => setShowLogin(false)}
          onClose={() => setShowLogin(false)}
        />
      )}

      <div className="flex flex-col items-center gap-5 w-full max-w-4xl mx-auto select-none">
        {/* ── Header & Title ────────────────────────────────────────── */}
        <div className="w-full flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="text-center sm:text-left">
            <div className="inline-flex items-center gap-2 px-2.5 py-1 rounded-full text-xs font-semibold bg-amber-500/10 text-amber-500 border border-amber-500/20 mb-1.5">
              <span className="w-1.5 h-1.5 rounded-full bg-amber-500 animate-pulse" />
              Game 15 • Arcade Classic
            </div>
            <h1 className="text-3xl sm:text-4xl font-extrabold text-foreground tracking-tight">
              Maze Muncher
            </h1>
            <p className="text-sm text-foreground-secondary mt-0.5">
              Outsmart the Chasers, devour energy orbs, and conquer the neon labyrinth.
            </p>
          </div>

          {/* ── Scoreboard Badges, Lives & Actions ──────────────────── */}
          <div className="flex items-center gap-2 sm:gap-2.5 flex-wrap justify-center">
            {/* Lives Indicator */}
            <div className="flex flex-col items-center rounded-xl border border-border bg-surface px-3 py-2 min-w-[76px] shadow-sm">
              <span className="text-[10px] uppercase tracking-wider text-foreground-muted font-semibold">
                Lives
              </span>
              <div className="flex items-center gap-1 mt-0.5">
                {[0, 1, 2].map((idx) => (
                  <span
                    key={idx}
                    className={`w-3.5 h-3.5 rounded-full border transition-all ${
                      idx < gameState.lives
                        ? "bg-amber-400 border-amber-500 shadow-sm shadow-amber-400/50 scale-100"
                        : "bg-slate-700/40 border-slate-700/60 scale-75 opacity-40"
                    }`}
                  />
                ))}
              </div>
            </div>

            <div className="flex flex-col items-center rounded-xl border border-border bg-surface px-3.5 py-2 min-w-[80px] shadow-sm">
              <span className="text-[10px] uppercase tracking-wider text-foreground-muted font-semibold">
                Score
              </span>
              <span className="text-lg font-bold text-foreground tabular-nums">
                {gameState.score}
              </span>
            </div>

            <div className="flex flex-col items-center rounded-xl border border-border bg-surface px-3.5 py-2 min-w-[80px] shadow-sm">
              <span className="text-[10px] uppercase tracking-wider text-foreground-muted font-semibold">
                Best
              </span>
              <span className="text-lg font-bold text-accent tabular-nums">
                {displayHighScore}
              </span>
            </div>

            <div className="flex flex-col items-center rounded-xl border border-border bg-surface px-3.5 py-2 min-w-[80px] shadow-sm">
              <span className="text-[10px] uppercase tracking-wider text-foreground-muted font-semibold">
                Pellets
              </span>
              <span className="text-lg font-bold text-amber-400 tabular-nums">
                {gameState.pelletsRemaining}
              </span>
            </div>

            {/* Sound Mute Toggle */}
            <button
              type="button"
              onClick={toggleSound}
              aria-label={isMuted ? "Unmute audio" : "Mute audio"}
              className="p-2.5 rounded-xl border border-border bg-surface hover:bg-surface-hover text-foreground-secondary hover:text-foreground transition-all shadow-sm"
            >
              {isMuted ? (
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <line x1="1" y1="1" x2="23" y2="23" />
                  <path d="M9 9v3a3 3 0 0 0 5.12 2.12M15 9.34V4a3 3 0 0 0-5.94-.6" />
                  <path d="M17 16.95A7 7 0 0 1 5 12v-2m14 0v2a7 7 0 0 1-.11 1.23" />
                  <line x1="12" y1="19" x2="12" y2="23" />
                  <line x1="8" y1="23" x2="16" y2="23" />
                </svg>
              ) : (
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5" />
                  <path d="M15.54 8.46a5 5 0 0 1 0 7.07" />
                  <path d="M19.07 4.93a10 10 0 0 1 0 14.14" />
                </svg>
              )}
            </button>

            {/* Restart Button */}
            <button
              type="button"
              onClick={restartGame}
              className="flex items-center gap-1.5 px-3 py-2 rounded-xl border border-border text-xs font-semibold text-foreground-secondary hover:bg-surface-hover hover:text-foreground transition-all shadow-sm active:scale-95"
            >
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
                <polyline points="1 4 1 10 7 10" />
                <path d="M3.51 15a9 9 0 1 0 2.13-9.36L1 10" />
              </svg>
              Restart
            </button>
          </div>
        </div>

        {/* ── Frightened Mode Banner ────────────────────────────────── */}
        {gameState.isFrightened && (
          <div className="w-full flex items-center justify-between px-4 py-2 rounded-xl bg-blue-500/15 border border-blue-500/40 text-blue-300 text-xs font-semibold animate-pulse shadow-lg shadow-blue-500/10">
            <div className="flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-blue-400 animate-ping" />
              <span>⚡ POWER ORB ACTIVE: Chasers are Frightened & Vulnerable!</span>
            </div>
            <span className="font-mono text-sm font-bold text-blue-200">
              {gameState.frightenedTimeRemaining}s
            </span>
          </div>
        )}

        {/* ── Controls / Status bar ─────────────────────────────────── */}
        <div className="w-full flex items-center justify-between text-xs text-foreground-muted px-1">
          <div className="flex items-center gap-2">
            <span>Controls:</span>
            <div className="inline-flex gap-1">
              <kbd className="px-1.5 py-0.5 rounded border border-border bg-surface text-foreground-secondary font-mono text-[11px]">
                W
              </kbd>
              <kbd className="px-1.5 py-0.5 rounded border border-border bg-surface text-foreground-secondary font-mono text-[11px]">
                A
              </kbd>
              <kbd className="px-1.5 py-0.5 rounded border border-border bg-surface text-foreground-secondary font-mono text-[11px]">
                S
              </kbd>
              <kbd className="px-1.5 py-0.5 rounded border border-border bg-surface text-foreground-secondary font-mono text-[11px]">
                D
              </kbd>
            </div>
            <span>or</span>
            <div className="inline-flex gap-1">
              <kbd className="px-1.5 py-0.5 rounded border border-border bg-surface text-foreground-secondary font-mono text-[11px]">
                ↑
              </kbd>
              <kbd className="px-1.5 py-0.5 rounded border border-border bg-surface text-foreground-secondary font-mono text-[11px]">
                ←
              </kbd>
              <kbd className="px-1.5 py-0.5 rounded border border-border bg-surface text-foreground-secondary font-mono text-[11px]">
                ↓
              </kbd>
              <kbd className="px-1.5 py-0.5 rounded border border-border bg-surface text-foreground-secondary font-mono text-[11px]">
                →
              </kbd>
            </div>
          </div>

          <div className="flex items-center gap-1.5 text-xs text-emerald-400 font-medium">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
            Arcade Ready
          </div>
        </div>

        {/* ── Responsive Canvas Container ───────────────────────────── */}
        <div
          ref={containerRef}
          className="w-full flex flex-col items-center justify-center py-1"
        >
          <div
            className="relative rounded-2xl border border-blue-500/30 bg-[#080b14] overflow-hidden shadow-2xl shadow-blue-500/10 transition-[width,height] duration-150 ease-out"
            style={{
              width: config.canvasWidth * canvasScale,
              height: config.canvasHeight * canvasScale,
            }}
          >
            <canvas
              ref={canvasRef}
              className="block"
              style={{
                width: config.canvasWidth * canvasScale,
                height: config.canvasHeight * canvasScale,
              }}
            />

            {/* Start Hint Overlay */}
            {!gameState.gameStarted && !gameState.isGameOver && !gameState.isGameWon && (
              <div className="absolute inset-x-0 bottom-4 flex justify-center pointer-events-none">
                <div className="bg-black/80 backdrop-blur-md px-4 py-2 rounded-full border border-amber-500/30 text-amber-300 text-xs font-semibold tracking-wide animate-bounce shadow-lg">
                  Press any Arrow Key or WASD to Start
                </div>
              </div>
            )}

            {/* ── Game Over Modal Overlay ────────────────────────────── */}
            {gameState.isGameOver && (
              <div className="absolute inset-0 flex flex-col items-center justify-center bg-black/85 backdrop-blur-md px-6 text-center animate-in fade-in duration-200">
                <div className="w-16 h-16 rounded-2xl bg-red-500/15 border border-red-500/30 flex items-center justify-center text-red-400 mb-3 shadow-lg shadow-red-500/20">
                  <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                    <circle cx="12" cy="12" r="10" />
                    <line x1="15" y1="9" x2="9" y2="15" />
                    <line x1="9" y1="9" x2="15" y2="15" />
                  </svg>
                </div>
                <h2 className="text-2xl font-black text-white tracking-tight">
                  Game Over
                </h2>
                <p className="text-xs text-foreground-secondary mt-1">
                  The Chasers caught up with you!
                </p>

                <div className="my-4 flex items-center gap-4 bg-surface/60 border border-border/80 px-5 py-3 rounded-xl">
                  <div className="flex flex-col items-center">
                    <span className="text-[10px] text-foreground-muted uppercase font-bold">
                      Final Score
                    </span>
                    <span className="text-xl font-extrabold text-foreground tabular-nums">
                      {gameState.score}
                    </span>
                  </div>
                  <div className="w-px h-8 bg-border" />
                  <div className="flex flex-col items-center">
                    <span className="text-[10px] text-foreground-muted uppercase font-bold">
                      Best Score
                    </span>
                    <span className="text-xl font-extrabold text-amber-400 tabular-nums">
                      {displayHighScore}
                    </span>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={restartGame}
                  className="flex items-center gap-2 rounded-xl bg-accent px-6 py-2.5 text-sm font-bold text-white shadow-lg shadow-accent/25 hover:bg-accent-hover hover:scale-105 transition-all"
                >
                  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
                    <polyline points="1 4 1 10 7 10" />
                    <path d="M3.51 15a9 9 0 1 0 2.13-9.36L1 10" />
                  </svg>
                  Play Again
                </button>
              </div>
            )}

            {/* ── Victory Modal Overlay ──────────────────────────────── */}
            {gameState.isGameWon && (
              <div className="absolute inset-0 flex flex-col items-center justify-center bg-black/85 backdrop-blur-md px-6 text-center animate-in fade-in duration-200">
                <div className="w-16 h-16 rounded-2xl bg-amber-500/15 border border-amber-500/30 flex items-center justify-center text-amber-400 mb-3 shadow-lg shadow-amber-500/20 animate-bounce">
                  <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                    <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
                  </svg>
                </div>
                <h2 className="text-2xl font-black text-amber-300 tracking-tight">
                  Maze Cleared!
                </h2>
                <p className="text-xs text-foreground-secondary mt-1">
                  You ate all pellets and outsmarted the Chasers!
                </p>

                <div className="my-4 flex items-center gap-4 bg-surface/60 border border-border/80 px-5 py-3 rounded-xl">
                  <div className="flex flex-col items-center">
                    <span className="text-[10px] text-foreground-muted uppercase font-bold">
                      Victory Score
                    </span>
                    <span className="text-xl font-extrabold text-foreground tabular-nums">
                      {gameState.score}
                    </span>
                  </div>
                  <div className="w-px h-8 bg-border" />
                  <div className="flex flex-col items-center">
                    <span className="text-[10px] text-foreground-muted uppercase font-bold">
                      Record
                    </span>
                    <span className="text-xl font-extrabold text-amber-400 tabular-nums">
                      {displayHighScore}
                    </span>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={restartGame}
                  className="flex items-center gap-2 rounded-xl bg-amber-500 px-6 py-2.5 text-sm font-bold text-black shadow-lg shadow-amber-500/25 hover:bg-amber-400 hover:scale-105 transition-all"
                >
                  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
                    <polyline points="1 4 1 10 7 10" />
                    <path d="M3.51 15a9 9 0 1 0 2.13-9.36L1 10" />
                  </svg>
                  Play Again
                </button>
              </div>
            )}
          </div>

          {/* ── Mobile / Touch On-Screen D-Pad ───────────────────────── */}
          <div className="mt-3 flex flex-col items-center gap-1.5 sm:hidden">
            <button
              type="button"
              onClick={() => handleDirectionInput("UP")}
              aria-label="Move Up"
              className="w-12 h-12 rounded-xl bg-surface border border-border active:bg-surface-hover flex items-center justify-center text-foreground shadow-md transition-transform active:scale-95"
            >
              ▲
            </button>
            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={() => handleDirectionInput("LEFT")}
                aria-label="Move Left"
                className="w-12 h-12 rounded-xl bg-surface border border-border active:bg-surface-hover flex items-center justify-center text-foreground shadow-md transition-transform active:scale-95"
              >
                ◀
              </button>
              <button
                type="button"
                onClick={() => handleDirectionInput("DOWN")}
                aria-label="Move Down"
                className="w-12 h-12 rounded-xl bg-surface border border-border active:bg-surface-hover flex items-center justify-center text-foreground shadow-md transition-transform active:scale-95"
              >
                ▼
              </button>
              <button
                type="button"
                onClick={() => handleDirectionInput("RIGHT")}
                aria-label="Move Right"
                className="w-12 h-12 rounded-xl bg-surface border border-border active:bg-surface-hover flex items-center justify-center text-foreground shadow-md transition-transform active:scale-95"
              >
                ▶
              </button>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
