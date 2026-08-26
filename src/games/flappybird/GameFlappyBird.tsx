"use client";

import { useEffect, useRef, useState } from "react";
import { useFlappyBird } from "./useFlappyBird";
import { LoginModal } from "@/components/auth/LoginModal";
import { useAuth } from "@/components/auth";

export function GameFlappyBird() {
  const {
    canvasRef,
    gameState,
    startGame,
    flap,
    config,
  } = useFlappyBird();

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
      const scale = Math.min(1, (containerW - 8) / config.canvasWidth);
      setCanvasScale(scale);
    }
    handleResize();
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, [config.canvasWidth]);

  // ── Login prompt on game over if not logged in ──────────────────
  useEffect(() => {
    if (gameState.isGameOver && !user && gameState.score > 0) {
      const t = setTimeout(() => setShowLogin(true), 650);
      return () => clearTimeout(t);
    }
  }, [gameState.isGameOver, user, gameState.score]);

  // ── Save score and match history on game over ───────────────────
  useEffect(() => {
    if (!gameState.isGameOver) {
      scoreSavedRef.current = false;
      return;
    }
    if (scoreSavedRef.current) return;
    scoreSavedRef.current = true;

    // Record match history
    fetch("/api/matches", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        gameType: "flappybird",
        players: [
          {
            userId: user?.id,
            username: user ? user.username : "Guest",
            score: gameState.score,
            result: gameState.score >= 10 ? "win" : "loss",
          },
        ],
        duration: 0,
        gameData: { score: gameState.score },
      }),
    }).catch((err) => console.error("Failed to save Flappy Bird match:", err));

    if (!user) return;

    fetch(`/api/users/${user.id}/score`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ game: "flappybird", score: gameState.score }),
    })
      .then((r) => r.json())
      .then((d) => {
        if (d.bestScoreFlappy !== undefined) {
          refreshUser({ bestScoreFlappy: d.bestScoreFlappy });
        }
      })
      .catch((err) => console.error("Failed to save Flappy Bird score:", err));
  }, [gameState.isGameOver, gameState.score, user, refreshUser]);

  const displayHighScore = user
    ? Math.max(user.bestScoreFlappy || 0, gameState.highScore)
    : gameState.highScore;

  // Medal for score milestones
  const getMedalBadge = (score: number) => {
    if (score >= 50) return { name: "Platinum Medal", icon: "💎", color: "text-cyan-400 border-cyan-400/40 bg-cyan-500/10" };
    if (score >= 30) return { name: "Gold Medal", icon: "🥇", color: "text-amber-400 border-amber-400/40 bg-amber-500/10" };
    if (score >= 15) return { name: "Silver Medal", icon: "🥈", color: "text-slate-300 border-slate-300/40 bg-slate-500/10" };
    if (score >= 5) return { name: "Bronze Medal", icon: "🥉", color: "text-amber-600 border-amber-600/40 bg-amber-700/10" };
    return null;
  };

  const currentMedal = getMedalBadge(gameState.score);

  return (
    <>
      {showLogin && (
        <LoginModal
          title="Save your score!"
          subtitle={`You scored ${gameState.score}! Enter a username to save it to the global leaderboard.`}
          onSuccess={() => setShowLogin(false)}
          onClose={() => setShowLogin(false)}
        />
      )}

      <div className="flex flex-col items-center gap-6">
        {/* ── Header ──────────────────────────────────────────────── */}
        <div className="w-full flex flex-col sm:flex-row items-center justify-between gap-4">
          <div>
            <h1 className="text-3xl sm:text-4xl font-extrabold text-foreground tracking-tight">
              Flappy Bird
            </h1>
            <p className="text-sm text-foreground-secondary mt-0.5">
              Weave through pipes, master your rhythm, and chase your high score.
            </p>
          </div>

          {/* Scoreboard */}
          <div className="flex items-center gap-3">
            <div className="flex flex-col items-center rounded-xl border border-border bg-surface px-4 py-2 min-w-[80px] shadow-sm">
              <span className="text-[10px] uppercase tracking-wider text-foreground-muted font-semibold">
                Score
              </span>
              <span className="text-lg font-bold text-foreground tabular-nums">
                {gameState.score}
              </span>
            </div>
            <div className="flex flex-col items-center rounded-xl border border-border bg-surface px-4 py-2 min-w-[80px] shadow-sm">
              <span className="text-[10px] uppercase tracking-wider text-foreground-muted font-semibold">
                Best
              </span>
              <span className="text-lg font-bold text-accent tabular-nums">
                {displayHighScore}
              </span>
            </div>
          </div>
        </div>

        {/* ── Controls Bar ────────────────────────────────────────── */}
        <div className="w-full flex items-center justify-between">
          <div className="flex items-center gap-2 text-xs text-foreground-muted">
            <kbd className="px-1.5 py-0.5 rounded border border-border bg-surface text-foreground-secondary font-mono text-[10px]">
              Space
            </kbd>
            <span>/</span>
            <kbd className="px-1.5 py-0.5 rounded border border-border bg-surface text-foreground-secondary font-mono text-[10px]">
              ↑
            </kbd>
            <span>/</span>
            <kbd className="px-1.5 py-0.5 rounded border border-border bg-surface text-foreground-secondary font-mono text-[10px]">
              W
            </kbd>
            <span>flap</span>
            <span className="mx-1 text-border">|</span>
            <span>touch to fly</span>
          </div>

          <button
            type="button"
            onClick={startGame}
            className="flex items-center gap-2 px-4 py-2 rounded-lg border border-border bg-surface text-sm font-medium text-foreground-secondary hover:bg-surface-hover hover:text-foreground transition-all hover:-translate-y-0.5"
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
        <div ref={containerRef} className="w-full flex justify-center">
          <div
            className="relative rounded-2xl border border-border bg-slate-950 overflow-hidden shadow-xl"
            style={{
              width: config.canvasWidth * canvasScale,
              height: config.canvasHeight * canvasScale,
            }}
          >
            <canvas
              ref={canvasRef}
              width={config.canvasWidth}
              height={config.canvasHeight}
              onPointerDown={(event) => {
                event.preventDefault();
                flap();
              }}
              className="block cursor-pointer touch-none select-none"
              style={{
                width: config.canvasWidth * canvasScale,
                height: config.canvasHeight * canvasScale,
              }}
              aria-label="Flappy Bird game arena"
            />

            {/* Pre-game Overlay */}
            {!gameState.isPlaying && !gameState.isGameOver && (
              <div className="pointer-events-none absolute inset-0 flex items-center justify-center bg-slate-950/20 backdrop-blur-[2px] p-6">
                <div className="pointer-events-auto w-full max-w-[300px] rounded-3xl border border-white/20 bg-slate-950/85 p-6 text-center text-white shadow-2xl backdrop-blur-md">
                  <div className="text-5xl animate-bounce" aria-hidden="true">
                    🐤
                  </div>
                  <h2 className="mt-2 text-2xl font-black tracking-tight">Ready to Fly?</h2>
                  <p className="mt-1.5 text-xs leading-relaxed text-slate-300">
                    Press Space, ↑, or tap anywhere to flap upwards through the pipes.
                  </p>
                  <button
                    type="button"
                    onClick={startGame}
                    className="mt-5 flex w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-amber-400 to-orange-500 px-5 py-3 text-sm font-black text-amber-950 shadow-lg shadow-orange-500/25 transition-all hover:scale-[1.02] hover:from-amber-300 hover:to-orange-400 active:scale-[0.98]"
                  >
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
                      <polygon points="5 3 19 12 5 21 5 3" />
                    </svg>
                    Start Game
                  </button>
                </div>
              </div>
            )}

            {/* Game Over Overlay */}
            {gameState.isGameOver && (
              <div className="pointer-events-none absolute inset-0 flex items-center justify-center bg-slate-950/40 backdrop-blur-[3px] p-6">
                <div className="pointer-events-auto w-full max-w-[310px] rounded-3xl border border-white/20 bg-slate-950/90 p-6 text-center text-white shadow-2xl backdrop-blur-md animate-in fade-in zoom-in-95 duration-200">
                  <div className="text-xs font-bold uppercase tracking-[0.24em] text-rose-400">
                    Game Over
                  </div>

                  {gameState.isNewHighScore && (
                    <div className="mt-2 inline-flex items-center gap-1.5 rounded-full border border-amber-400/40 bg-amber-400/15 px-3 py-1 text-xs font-black text-amber-300 animate-pulse">
                      <span>✨</span> New High Score! <span>✨</span>
                    </div>
                  )}

                  <div className="mt-3 text-5xl font-black tracking-tight tabular-nums text-white">
                    {gameState.score}
                  </div>

                  {currentMedal && (
                    <div className={`mt-2 inline-flex items-center gap-1.5 rounded-lg border px-2.5 py-1 text-xs font-bold ${currentMedal.color}`}>
                      <span>{currentMedal.icon}</span>
                      <span>{currentMedal.name}</span>
                    </div>
                  )}

                  <p className="mt-2 text-xs font-medium text-slate-300">
                    Best: <span className="font-bold text-amber-400 tabular-nums">{displayHighScore}</span>
                  </p>

                  <button
                    type="button"
                    onClick={startGame}
                    className="mt-5 flex w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-amber-400 to-orange-500 px-5 py-3 text-sm font-black text-amber-950 shadow-lg shadow-orange-500/25 transition-all hover:scale-[1.02] hover:from-amber-300 hover:to-orange-400 active:scale-[0.98]"
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
              </div>
            )}
          </div>
        </div>

        {/* ── Mobile hint ─────────────────────────────────────────── */}
        <p className="sm:hidden text-xs text-foreground-muted text-center">
          Tap anywhere on screen to flap
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

        {/* ── Strategy Guide Tips ──────────────────────────────────── */}
        <div className="grid w-full max-w-[680px] gap-3 sm:grid-cols-3">
          {[
            [
              "01",
              "Timing is Everything",
              "Don't spam taps — let the bird dip slightly to maintain smooth vertical rhythm.",
            ],
            [
              "02",
              "Look Ahead",
              "Focus your eyes on the next pipe opening rather than just staring at the bird.",
            ],
            [
              "03",
              "Dynamic Challenge",
              "Speed accelerates and pipe gaps narrow gradually as your score climbs.",
            ],
          ].map(([number, title, copy]) => (
            <div
              key={number}
              className="rounded-2xl border border-border bg-surface p-4 shadow-sm"
            >
              <div className="font-mono text-xs font-black text-sky-500">
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
    </>
  );
}
