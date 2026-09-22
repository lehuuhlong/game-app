"use client";

import { useEffect, useRef, useState } from "react";
import { useSnakeEngine, CANVAS_SIZE } from "./useSnakeEngine";
import { LoginModal } from "@/components/auth/LoginModal";
import { useAuth } from "@/components/auth";
import { useGameSession } from "@/hooks/useGameSession";
import { useTheme } from "@/components/shared/ThemeProvider";

export function GameNeonSnake() {
  const { user, refreshUser } = useAuth();
  const { theme } = useTheme();
  const { startSession, ensureSessionToken, getElapsedDuration } =
    useGameSession("neonsnake");

  const {
    canvasRef,
    gameState,
    startGame,
    changeDirection,
    draw,
  } = useSnakeEngine();

  const [showLogin, setShowLogin] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const [canvasScale, setCanvasScale] = useState(1);
  const scoreSavedRef = useRef(false);
  const wasPlayingRef = useRef(false);

  // Re-render canvas when theme changes between light and dark
  useEffect(() => {
    draw();
  }, [theme, draw]);

  // Initialize game session on mount
  useEffect(() => {
    startSession(user?.id, user?.username);
  }, [startSession, user?.id, user?.username]);

  // Auto-renew session when starting/restarting a run
  useEffect(() => {
    if (gameState.status === "PLAYING" && !wasPlayingRef.current) {
      startSession(user?.id, user?.username, true);
      scoreSavedRef.current = false;
    }
    wasPlayingRef.current = gameState.status === "PLAYING";
  }, [gameState.status, startSession, user?.id, user?.username]);

  // Responsive canvas scale for small screens
  useEffect(() => {
    function handleResize() {
      if (!containerRef.current) return;
      const containerW = containerRef.current.clientWidth;
      const targetSize = CANVAS_SIZE;
      const scale = Math.min(1, Math.max(0.65, (containerW - 16) / targetSize));
      setCanvasScale(scale);
    }
    handleResize();
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  // Show login modal prompt on Game Over if guest
  useEffect(() => {
    if (gameState.status === "GAME_OVER" && !user && gameState.score >= 50) {
      const t = setTimeout(() => setShowLogin(true), 600);
      return () => clearTimeout(t);
    }
  }, [gameState.status, gameState.score, user]);

  // Save score & match history on Game Over
  useEffect(() => {
    if (gameState.status !== "GAME_OVER") {
      scoreSavedRef.current = false;
      return;
    }
    if (scoreSavedRef.current) return;
    scoreSavedRef.current = true;

    (async () => {
      try {
        const sessionToken = await ensureSessionToken(user?.id, user?.username);
        const elapsed = getElapsedDuration();

        // 1. Record Match History
        fetch("/api/matches", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            gameType: "neonsnake",
            sessionToken,
            players: [
              {
                userId: user?.id,
                username: user ? user.username : "Guest",
                score: gameState.score,
                result: gameState.score >= 200 ? "win" : "loss",
              },
            ],
            duration: elapsed,
            gameData: {
              score: gameState.score,
              speed: gameState.speed,
              reason: gameState.gameOverReason,
            },
          }),
        }).catch((err) => console.error("Failed to save Neon Snake match:", err));

        // 2. Save high score to user profile if logged in
        if (!user) return;

        fetch(`/api/users/${user.id}/score`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            game: "neonsnake",
            score: gameState.score,
            sessionToken,
            duration: elapsed,
          }),
        })
          .then((r) => r.json())
          .then((d) => {
            if (d.bestScoreNeonSnake !== undefined) {
              refreshUser({ bestScoreNeonSnake: d.bestScoreNeonSnake });
            }
          })
          .catch((err) => console.error("Failed to update Neon Snake score:", err));
      } catch (err) {
        console.error("Match session save error:", err);
      }
    })();
  }, [
    gameState.status,
    gameState.score,
    gameState.speed,
    gameState.gameOverReason,
    user,
    refreshUser,
    ensureSessionToken,
    getElapsedDuration,
  ]);

  const displayHighScore = user
    ? Math.max(user.bestScoreNeonSnake || 0, gameState.highScore)
    : gameState.highScore;

  return (
    <>
      {showLogin && (
        <LoginModal
          title="Save your score!"
          subtitle={`You scored ${gameState.score} in Neon Snake! Sign in to save your score to the leaderboard.`}
          onSuccess={() => setShowLogin(false)}
          onClose={() => setShowLogin(false)}
        />
      )}

      <div className="flex flex-col items-center gap-6 w-full max-w-xl mx-auto select-none">
        {/* ── Header Matching Portal Style ─────────────────────────────────── */}
        <div className="w-full flex flex-col sm:flex-row items-center justify-between gap-4">
          <div>
            <h1 className="text-3xl sm:text-4xl font-extrabold text-foreground">
              Neon Snake
            </h1>
            <p className="text-sm text-foreground-secondary mt-0.5">
              Classic snake game on a 20×20 grid. Eat food to grow.
            </p>
          </div>

          {/* Scoreboard */}
          <div className="flex items-center gap-3">
            <div className="flex flex-col items-center rounded-xl border border-border bg-surface px-4 py-2 min-w-[80px] shadow-xs">
              <span className="text-[10px] uppercase tracking-wider text-foreground-muted font-semibold">
                Score
              </span>
              <span className="text-lg font-bold text-foreground tabular-nums">
                {gameState.score}
              </span>
            </div>

            <div className="flex flex-col items-center rounded-xl border border-border bg-surface px-4 py-2 min-w-[80px] shadow-xs">
              <span className="text-[10px] uppercase tracking-wider text-foreground-muted font-semibold">
                Best
              </span>
              <span
                className="text-lg font-bold text-accent tabular-nums"
                suppressHydrationWarning
              >
                {displayHighScore}
              </span>
            </div>
          </div>
        </div>

        {/* ── Controls Hint Row ────────────────────────────────────────────── */}
        <div className="w-full flex items-center justify-between text-xs text-foreground-muted">
          <div className="flex items-center gap-2">
            <kbd className="px-1.5 py-0.5 rounded border border-border bg-surface text-foreground-secondary font-mono text-[10px]">
              W A S D
            </kbd>
            <span>/</span>
            <kbd className="px-1.5 py-0.5 rounded border border-border bg-surface text-foreground-secondary font-mono text-[10px]">
              ↑ ↓ ← →
            </kbd>
            <span>to steer</span>
            <span className="mx-1 text-border">|</span>
            <span>Walls and self collide</span>
          </div>
        </div>

        {/* ── Canvas Viewport Container ─────────────────────────────────────── */}
        <div
          ref={containerRef}
          className="w-full flex justify-center items-center relative"
        >
          <div
            className="relative rounded-2xl border border-border bg-surface overflow-hidden shadow-md"
            style={{
              width: CANVAS_SIZE * canvasScale,
              height: CANVAS_SIZE * canvasScale,
            }}
          >
            {/* The 400x400 Hardware Canvas */}
            <canvas
              ref={canvasRef}
              width={CANVAS_SIZE}
              height={CANVAS_SIZE}
              className="block w-full h-full cursor-pointer"
              onClick={() => {
                if (gameState.status === "IDLE" || gameState.status === "GAME_OVER") {
                  startGame();
                }
              }}
            />

            {/* ── Overlay: Start Game (IDLE) ───────────────────────────────── */}
            {gameState.status === "IDLE" && (
              <div className="absolute inset-0 bg-surface/85 dark:bg-surface/90 backdrop-blur-[2px] flex flex-col items-center justify-center p-6 text-center z-10">
                <h2 className="text-2xl font-bold text-foreground tracking-tight mb-1">
                  Ready to Play?
                </h2>
                <p className="text-xs text-foreground-secondary max-w-[240px] mb-5">
                  Guide the snake to consume food and grow without hitting the borders or yourself.
                </p>
                <button
                  type="button"
                  onClick={startGame}
                  className="px-6 py-2.5 rounded-xl bg-accent hover:bg-accent-hover text-white font-bold text-sm tracking-wide shadow-md transition-all active:scale-95 cursor-pointer"
                >
                  Start Game
                </button>
              </div>
            )}

            {/* ── Overlay: Game Over ───────────────────────────────────────── */}
            {gameState.status === "GAME_OVER" && (
              <div className="absolute inset-0 bg-surface/90 dark:bg-surface/95 backdrop-blur-sm flex flex-col items-center justify-center p-6 text-center z-10 animate-in fade-in duration-200">
                <span className="text-xs font-semibold uppercase tracking-wider text-rose-500 mb-1">
                  {gameState.gameOverReason === "WALL_COLLISION"
                    ? "Hit the Wall"
                    : gameState.gameOverReason === "SELF_COLLISION"
                    ? "Self Collision"
                    : gameState.gameOverReason === "VICTORY"
                    ? "You Won!"
                    : "Game Over"}
                </span>

                <h2 className="text-2xl font-black text-foreground mb-3">
                  Game Over
                </h2>

                <div className="grid grid-cols-2 gap-3 w-full max-w-[220px] mb-5">
                  <div className="flex flex-col items-center p-2.5 rounded-xl border border-border bg-background">
                    <span className="text-[10px] uppercase text-foreground-muted font-semibold">
                      Score
                    </span>
                    <span className="text-xl font-bold text-foreground">
                      {gameState.score}
                    </span>
                  </div>
                  <div className="flex flex-col items-center p-2.5 rounded-xl border border-border bg-background">
                    <span className="text-[10px] uppercase text-foreground-muted font-semibold">
                      Best
                    </span>
                    <span className="text-xl font-bold text-accent">
                      {displayHighScore}
                    </span>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={startGame}
                  className="px-6 py-2.5 rounded-xl bg-accent hover:bg-accent-hover text-white font-bold text-sm tracking-wide shadow-md transition-all active:scale-95 flex items-center gap-2 cursor-pointer"
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
                  Play Again
                </button>
              </div>
            )}
          </div>
        </div>

        {/* ── Mobile/Touch D-Pad Controls ──────────────────────────────────── */}
        <div className="w-full flex flex-col items-center sm:hidden mt-2">
          <div className="grid grid-cols-3 gap-2 w-48">
            <div />
            <button
              type="button"
              onClick={() => changeDirection("UP")}
              aria-label="Move Up"
              className="h-11 flex items-center justify-center rounded-xl bg-surface border border-border text-foreground-secondary active:bg-surface-hover hover:border-accent/40 transition-colors shadow-xs"
            >
              <svg
                width="18"
                height="18"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2.5"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <polyline points="18 15 12 9 6 15" />
              </svg>
            </button>
            <div />

            <button
              type="button"
              onClick={() => changeDirection("LEFT")}
              aria-label="Move Left"
              className="h-11 flex items-center justify-center rounded-xl bg-surface border border-border text-foreground-secondary active:bg-surface-hover hover:border-accent/40 transition-colors shadow-xs"
            >
              <svg
                width="18"
                height="18"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2.5"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <polyline points="15 18 9 12 15 6" />
              </svg>
            </button>

            <div />

            <button
              type="button"
              onClick={() => changeDirection("RIGHT")}
              aria-label="Move Right"
              className="h-11 flex items-center justify-center rounded-xl bg-surface border border-border text-foreground-secondary active:bg-surface-hover hover:border-accent/40 transition-colors shadow-xs"
            >
              <svg
                width="18"
                height="18"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2.5"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <polyline points="9 18 15 12 9 6" />
              </svg>
            </button>

            <div />
            <button
              type="button"
              onClick={() => changeDirection("DOWN")}
              aria-label="Move Down"
              className="h-11 flex items-center justify-center rounded-xl bg-surface border border-border text-foreground-secondary active:bg-surface-hover hover:border-accent/40 transition-colors shadow-xs"
            >
              <svg
                width="18"
                height="18"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2.5"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <polyline points="6 9 12 15 18 9" />
              </svg>
            </button>
            <div />
          </div>
        </div>
      </div>
    </>
  );
}
