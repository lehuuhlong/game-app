"use client";

import { useEffect, useState, useRef, useCallback } from "react";
import { useEggEngine } from "./useEggEngine";
import { useAuth } from "@/components/auth";
import { LoginModal } from "@/components/auth/LoginModal";
import { useGameSession } from "@/hooks/useGameSession";
import Link from "next/link";

const STORAGE_KEY = "dino-egg-pop-high-score";

function loadLocalHighScore(): number {
  if (typeof window === "undefined") return 0;
  try {
    const val = localStorage.getItem(STORAGE_KEY);
    return val ? parseInt(val, 10) || 0 : 0;
  } catch {
    return 0;
  }
}

function saveLocalHighScore(score: number): void {
  try {
    localStorage.setItem(STORAGE_KEY, String(score));
  } catch {
    /* noop */
  }
}

// Icons
function ArrowLeftIcon({ size = 16 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <line x1="19" y1="12" x2="5" y2="12" />
      <polyline points="12 19 5 12 12 5" />
    </svg>
  );
}

function PauseIcon({ size = 16 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor">
      <rect x="6" y="4" width="4" height="16" rx="1" />
      <rect x="14" y="4" width="4" height="16" rx="1" />
    </svg>
  );
}

function PlayIcon({ size = 16 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor">
      <polygon points="5 3 19 12 5 21 5 3" />
    </svg>
  );
}

function RotateCcwIcon({ size = 16 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8" />
      <path d="M3 3v5h5" />
    </svg>
  );
}

function Volume2Icon({ size = 16 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5" />
      <path d="M15.54 8.46a5 5 0 0 1 0 7.07" />
      <path d="M19.07 4.93a10 10 0 0 1 0 14.14" />
    </svg>
  );
}

function VolumeXIcon({ size = 16 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5" />
      <line x1="23" y1="9" x2="17" y2="15" />
      <line x1="17" y1="9" x2="23" y2="15" />
    </svg>
  );
}

function TrophyIcon({ size = 16 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M6 9H4.5a2.5 2.5 0 0 1 0-5H6" />
      <path d="M18 9h1.5a2.5 2.5 0 0 0 0-5H18" />
      <path d="M4 22h16" />
      <path d="M10 14.66V17c0 .55-.47.98-.97 1.21C7.85 18.75 7 20.24 7 22" />
      <path d="M14 14.66V17c0 .55.47.98.97 1.21C16.15 18.75 17 20.24 17 22" />
      <path d="M18 2H6v7a6 6 0 0 0 12 0V2Z" />
    </svg>
  );
}

export function GameEggPop() {
  const { user, refreshUser } = useAuth();
  const { startSession, ensureSessionToken, getElapsedDuration } =
    useGameSession("eggpop");

  const {
    canvasRef,
    state,
    startGame,
    togglePause,
    toggleMute,
    canvasWidth,
    canvasHeight,
  } = useEggEngine();

  const [localHighScore, setLocalHighScore] = useState(0);
  const [showLogin, setShowLogin] = useState(false);
  const userScoreSavedRef = useRef(false);
  const matchSavedRef = useRef(false);
  const wasPlayingRef = useRef(false);

  // Initialize high score from local storage or user profile
  useEffect(() => {
    const saved = loadLocalHighScore();
    const profileBest = user?.bestScoreEggPop || 0;
    const initialBest = Math.max(saved, profileBest);
    setLocalHighScore(initialBest);
  }, [user]);

  // Update high score locally when current score surpasses it
  useEffect(() => {
    if (state.stats.score > localHighScore) {
      setLocalHighScore(state.stats.score);
      saveLocalHighScore(state.stats.score);
    }
  }, [state.stats.score, localHighScore]);

  const displayHighScore = Math.max(user?.bestScoreEggPop || 0, localHighScore);

  // Session start on mount
  useEffect(() => {
    startSession(user?.id, user?.username);
  }, [startSession, user?.id, user?.username]);

  // Restart session when starting a new game after game over / victory
  useEffect(() => {
    const isFinished = state.phase === "gameover" || state.phase === "victory";
    if (!isFinished && wasPlayingRef.current) {
      userScoreSavedRef.current = false;
      matchSavedRef.current = false;
      startSession(user?.id, user?.username, true);
    }
    wasPlayingRef.current = !isFinished;
  }, [state.phase, startSession, user?.id, user?.username]);

  // Submit high score to backend API upon game over or victory
  const submitUserScore = useCallback(
    async (targetUserId: string, targetScore: number) => {
      if (userScoreSavedRef.current || !targetUserId || targetScore <= 0) return;
      try {
        const sessionToken = await ensureSessionToken(targetUserId, user?.username);
        const elapsed = getElapsedDuration();

        const res = await fetch(`/api/users/${targetUserId}/score`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            game: "eggpop",
            score: targetScore,
            sessionToken,
            duration: elapsed,
            shotsFired: state.stats.shotsFired,
          }),
        });
        const data = await res.json();
        if (data.bestScoreEggPop !== undefined) {
          userScoreSavedRef.current = true;
          setLocalHighScore((prev) => Math.max(prev, data.bestScoreEggPop));
          refreshUser({ bestScoreEggPop: data.bestScoreEggPop });
          try {
            const stored = localStorage.getItem("game-portal-user");
            if (stored) {
              const u = JSON.parse(stored);
              u.bestScoreEggPop = data.bestScoreEggPop;
              localStorage.setItem("game-portal-user", JSON.stringify(u));
            }
            if (typeof window !== "undefined") {
              window.dispatchEvent(new CustomEvent("userProfileUpdated"));
            }
          } catch {}
        }
      } catch (err) {
        console.error("Failed to update Dino Egg Pop score:", err);
      }
    },
    [ensureSessionToken, getElapsedDuration, refreshUser, user?.username, state.stats.shotsFired],
  );

  // Save match history and submit user score upon game over or victory
  useEffect(() => {
    const isFinished = state.phase === "gameover" || state.phase === "victory";
    if (!isFinished) return;

    const currentScore = state.stats.score;

    // 1. Record Match History in MongoDB once per completed game
    if (!matchSavedRef.current && currentScore > 0) {
      matchSavedRef.current = true;
      (async () => {
        try {
          const sessionToken = await ensureSessionToken(user?.id, user?.username);
          const elapsed = getElapsedDuration();

          fetch("/api/matches", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              gameType: "eggpop",
              sessionToken,
              players: [
                {
                  userId: user?.id || null,
                  username: user ? user.username : "Guest",
                  score: currentScore,
                  result: state.phase === "victory" || currentScore >= 500 ? "win" : "loss",
                },
              ],
              duration: elapsed,
              gameData: {
                score: currentScore,
                level: state.stats.level,
                levelName: state.stats.levelName,
                eggsPopped: state.stats.eggsPopped,
                clustersDropped: state.stats.clustersDropped,
                maxCombo: state.stats.maxCombo,
                shotsFired: state.stats.shotsFired,
              },
            }),
          }).catch((err) => console.error("Failed to save Dino Egg Pop match:", err));
        } catch (err) {
          console.error("Match session save error:", err);
        }
      })();
    }

    // 2. Submit high score to user profile & leaderboard if user is logged in
    if (user?.id && !userScoreSavedRef.current && currentScore > 0) {
      submitUserScore(user.id, currentScore);
    }
  }, [
    state.phase,
    state.stats,
    user,
    ensureSessionToken,
    getElapsedDuration,
    submitUserScore,
  ]);

  // Prompt guest with login modal on Game Over / Victory if score > 0
  useEffect(() => {
    const isFinished = state.phase === "gameover" || state.phase === "victory";
    if (isFinished && !user && state.stats.score > 0) {
      const t = setTimeout(() => setShowLogin(true), 600);
      return () => clearTimeout(t);
    }
  }, [state.phase, user, state.stats.score]);

  // If a guest logs in during game over / victory, immediately save their score
  useEffect(() => {
    const isFinished = state.phase === "gameover" || state.phase === "victory";
    if (isFinished && user?.id && !userScoreSavedRef.current && state.stats.score > 0) {
      submitUserScore(user.id, state.stats.score);
    }
  }, [state.phase, user?.id, state.stats.score, submitUserScore]);

  // Auto-start on mount
  useEffect(() => {
    startGame();
  }, [startGame]);

  return (
    <>
      {showLogin && (
        <LoginModal
          title="Save your score!"
          subtitle={`You scored ${state.stats.score.toLocaleString()} points in Dino Egg Pop! Choose a username to save your score to the leaderboard.`}
          onSuccess={() => setShowLogin(false)}
          onClose={() => setShowLogin(false)}
        />
      )}

      <div className="flex flex-col items-center gap-4">
        {/* Top Header Bar */}
        <div className="flex w-full items-center justify-between">
          <Link
            href="/games"
            className="flex items-center gap-1.5 rounded-lg border border-white/10 bg-white/5 px-3 py-1.5 text-xs font-medium text-gray-300 transition-colors hover:bg-white/10 hover:text-white"
          >
            <ArrowLeftIcon size={14} />
            Back to Games
          </Link>

          <div className="flex items-center gap-2">
            <span className="text-xl">🦕</span>
            <h1 className="bg-gradient-to-r from-emerald-400 via-teal-300 to-cyan-400 bg-clip-text text-xl font-extrabold text-transparent sm:text-2xl">
              Dino Egg Pop
            </h1>
          </div>

          {/* Quick controls & Leaderboard */}
          <div className="flex items-center gap-2">
            <Link
              href="/leaderboard?game=eggpop"
              className="flex items-center gap-1.5 rounded-lg border border-amber-500/30 bg-amber-500/10 px-3 py-1.5 text-xs font-semibold text-amber-300 transition-colors hover:bg-amber-500/20 hover:text-amber-200"
              title="View Leaderboard"
            >
              <TrophyIcon size={13} />
              <span className="hidden sm:inline">Leaderboard</span>
            </Link>

            <button
              onClick={toggleMute}
              title={state.stats.isMuted ? "Unmute Sound (M)" : "Mute Sound (M)"}
              className="flex h-8 w-8 items-center justify-center rounded-lg border border-white/10 bg-white/5 text-gray-300 transition hover:bg-white/10 hover:text-white"
            >
              {state.stats.isMuted ? <VolumeXIcon size={15} /> : <Volume2Icon size={15} />}
            </button>
            <button
              onClick={togglePause}
              title={state.stats.isPaused ? "Resume (P)" : "Pause (P)"}
              className="flex h-8 w-8 items-center justify-center rounded-lg border border-white/10 bg-white/5 text-gray-300 transition hover:bg-white/10 hover:text-white"
            >
              {state.stats.isPaused ? <PlayIcon size={14} /> : <PauseIcon size={14} />}
            </button>
            <button
              onClick={startGame}
              title="Restart Game (R)"
              className="flex h-8 w-8 items-center justify-center rounded-lg border border-white/10 bg-white/5 text-gray-300 transition hover:bg-white/10 hover:text-white"
            >
              <RotateCcwIcon size={14} />
            </button>
          </div>
        </div>

        {/* Main Game Layout */}
        <div className="relative flex flex-col items-center gap-4 lg:flex-row lg:items-start lg:gap-6">
          {/* Left Side: Stats Panel */}
          <div className="grid w-full grid-cols-2 gap-2.5 sm:grid-cols-3 lg:w-44 lg:grid-cols-1">
            {/* Level Badge */}
            <div className="rounded-xl border border-white/10 bg-gradient-to-b from-white/10 to-white/5 p-3 text-center shadow-lg backdrop-blur">
              <div className="flex items-center justify-center gap-1.5 text-[10px] font-bold uppercase tracking-widest text-emerald-400">
                <span>🦖</span> Level {state.stats.level}
              </div>
              <div className="mt-1 truncate text-xs font-semibold text-gray-200">
                {state.stats.levelName}
              </div>
            </div>

            {/* Current Score */}
            <div className="rounded-xl border border-white/10 bg-gradient-to-b from-white/10 to-white/5 p-3 text-center shadow-lg backdrop-blur">
              <div className="text-[10px] font-bold uppercase tracking-widest text-cyan-400">
                Score
              </div>
              <div className="mt-1 text-2xl font-black tabular-nums text-white">
                {state.stats.score.toLocaleString()}
              </div>
            </div>

            {/* High Score */}
            <div className="rounded-xl border border-white/10 bg-white/5 p-3 text-center shadow-lg backdrop-blur">
              <div className="flex items-center justify-center gap-1 text-[10px] font-bold uppercase tracking-widest text-amber-400">
                <TrophyIcon size={12} />
                Best
              </div>
              <div className="mt-1 text-xl font-bold tabular-nums text-amber-300">
                {displayHighScore.toLocaleString()}
              </div>
            </div>

            {/* Descent Timer & Fouls */}
            <div
              className={`col-span-2 rounded-xl border p-3 text-center shadow-lg backdrop-blur transition-all sm:col-span-1 lg:col-span-1 ${
                state.stats.descentTimeLeft <= 3.5 || state.phase === "descending"
                  ? "animate-pulse border-red-500/50 bg-red-950/40 shadow-[0_0_15px_rgba(239,68,68,0.35)]"
                  : "border-white/10 bg-white/5"
              }`}
            >
              <div className="flex items-center justify-between text-[10px] font-bold uppercase tracking-widest">
                <span
                  className={
                    state.stats.descentTimeLeft <= 3.5
                      ? "text-red-400"
                      : "text-orange-400"
                  }
                >
                  ⏱️ Drop In
                </span>
                <span className="text-[9px] font-medium text-emerald-400">
                  +Time on pop
                </span>
              </div>

              <div className="mt-1 flex items-baseline justify-center gap-1">
                <span
                  className={`text-2xl font-black tabular-nums ${
                    state.stats.descentTimeLeft <= 3.5
                      ? "text-red-400"
                      : "text-white"
                  }`}
                >
                  {state.stats.descentTimeLeft.toFixed(1)}
                </span>
                <span className="text-xs text-gray-400">s</span>
              </div>

              {/* Tension Progress Bar */}
              <div className="mt-2 h-1.5 w-full overflow-hidden rounded-full bg-slate-800">
                <div
                  className={`h-full transition-all duration-100 ${
                    state.stats.descentTimeLeft <= 3.5
                      ? "bg-red-500"
                      : state.stats.descentTimeLeft <= 6.5
                      ? "bg-amber-400"
                      : "bg-gradient-to-r from-emerald-400 to-cyan-400"
                  }`}
                  style={{
                    width: `${Math.min(
                      100,
                      Math.max(
                        0,
                        (state.stats.descentTimeLeft /
                          state.stats.maxDescentTime) *
                          100,
                      ),
                    )}%`,
                  }}
                />
              </div>

              {/* Fouls indicators */}
              <div className="mt-2 flex items-center justify-between border-t border-white/5 pt-2 text-[10px]">
                <span className="text-gray-400">Miss Tolerance</span>
                <div className="flex items-center gap-1">
                  {[...Array(state.stats.maxFouls)].map((_, i) => (
                    <span
                      key={i}
                      className={`h-2 w-2 rounded-full transition-all ${
                        i < state.stats.foulsLeft
                          ? "bg-amber-400 shadow-[0_0_6px_rgba(251,191,36,0.5)]"
                          : "bg-white/10"
                      }`}
                    />
                  ))}
                </div>
              </div>
            </div>

            {/* Combo Multiplier */}
            <div className="rounded-xl border border-white/10 bg-white/5 p-3 text-center shadow-lg backdrop-blur">
              <div className="text-[10px] font-bold uppercase tracking-widest text-purple-400">
                Combo
              </div>
              <div className="mt-1 text-xl font-black text-purple-300">
                {state.stats.combo > 1 ? `${state.stats.combo}x 🔥` : "—"}
              </div>
            </div>
          </div>

          {/* Center: Canvas Arena */}
          <div
            className="relative overflow-hidden rounded-2xl border-2 border-cyan-500/30 bg-slate-950 shadow-[0_0_50px_rgba(6,182,212,0.18)]"
            style={{ width: canvasWidth, maxWidth: "100%" }}
          >
            <canvas
              ref={canvasRef}
              width={canvasWidth}
              height={canvasHeight}
              className="block cursor-crosshair touch-none select-none"
              style={{
                width: canvasWidth,
                height: canvasHeight,
                maxWidth: "100%",
                aspectRatio: `${canvasWidth} / ${canvasHeight}`,
              }}
            />

            {/* Start Screen Overlay */}
            {state.phase === "ready" && (
              <div className="absolute inset-0 z-30 flex flex-col items-center justify-center bg-black/75 p-6 backdrop-blur-md">
                <div className="mb-2 text-5xl">🦕</div>
                <h2 className="mb-2 bg-gradient-to-r from-emerald-400 via-teal-300 to-cyan-400 bg-clip-text text-3xl font-black text-transparent">
                  Dino Egg Pop
                </h2>
                <p className="mb-6 max-w-xs text-center text-xs text-gray-300">
                  Aim with your mouse, bounce off walls, and match 3 or more eggs of the same color!
                </p>
                <button
                  onClick={startGame}
                  className="cursor-pointer rounded-xl bg-gradient-to-r from-teal-500 via-cyan-500 to-blue-600 px-8 py-3 text-base font-bold text-white shadow-lg transition-transform hover:scale-105 active:scale-95"
                >
                  Play Now
                </button>
              </div>
            )}

            {/* Pause Overlay */}
            {state.stats.isPaused && state.phase !== "gameover" && state.phase !== "victory" && (
              <div className="absolute inset-0 z-30 flex flex-col items-center justify-center bg-black/60 backdrop-blur-sm">
                <h2 className="mb-2 text-2xl font-bold text-white">Game Paused</h2>
                <p className="mb-5 text-xs text-gray-400">Press P or click below to resume</p>
                <button
                  onClick={togglePause}
                  className="flex cursor-pointer items-center gap-2 rounded-xl bg-cyan-500 px-6 py-2.5 text-sm font-bold text-white shadow-lg transition hover:bg-cyan-400 active:scale-95"
                >
                  <PlayIcon size={14} />
                  Resume
                </button>
              </div>
            )}

            {/* Game Over / Victory Overlay */}
            {(state.phase === "gameover" || state.phase === "victory") && (
              <div className="absolute inset-0 z-30 flex flex-col items-center justify-center bg-slate-950/90 p-5 text-center backdrop-blur-md animate-in fade-in zoom-in-95 duration-200">
                <div
                  className={`mb-3 flex h-14 w-14 items-center justify-center rounded-2xl border text-3xl shadow-xl ${
                    state.phase === "victory"
                      ? "border-emerald-500/40 bg-emerald-500/20 text-emerald-400 shadow-emerald-500/20"
                      : "border-red-500/40 bg-red-500/20 text-red-400 shadow-red-500/20"
                  }`}
                >
                  {state.phase === "victory" ? "🏆" : "🦕"}
                </div>

                <h2 className="mb-1 text-2xl font-black tracking-tight text-white sm:text-3xl">
                  {state.phase === "victory" ? "Victory! All Cleared" : "Game Over"}
                </h2>

                <p className="mb-4 text-xs text-gray-400">
                  {state.phase === "victory"
                    ? "Outstanding shooting! You cleared all eggs on the board."
                    : `Level ${state.stats.level} (${state.stats.levelName}) reached!`}
                </p>

                {/* Stats Grid */}
                <div className="mb-4 grid w-full max-w-xs grid-cols-3 gap-2">
                  <div className="rounded-xl border border-white/10 bg-white/5 p-2.5">
                    <div className="text-[10px] font-bold uppercase tracking-wider text-cyan-400">
                      Score
                    </div>
                    <div className="text-base font-black tabular-nums text-white">
                      {state.stats.score.toLocaleString()}
                    </div>
                  </div>

                  <div className="rounded-xl border border-white/10 bg-white/5 p-2.5">
                    <div className="text-[10px] font-bold uppercase tracking-wider text-amber-400">
                      Best
                    </div>
                    <div className="text-base font-black tabular-nums text-amber-300">
                      {displayHighScore.toLocaleString()}
                    </div>
                  </div>

                  <div className="rounded-xl border border-white/10 bg-white/5 p-2.5">
                    <div className="text-[10px] font-bold uppercase tracking-wider text-purple-400">
                      Max Combo
                    </div>
                    <div className="text-base font-black tabular-nums text-purple-300">
                      {state.stats.combo > 1 ? `${state.stats.combo}x` : "1x"}
                    </div>
                  </div>
                </div>

                {/* Secondary Details */}
                <div className="mb-4 flex items-center justify-center gap-3 text-[11px] text-gray-300">
                  <span>💥 Popped: <strong className="text-emerald-400">{state.stats.eggsPopped}</strong></span>
                  <span>•</span>
                  <span>🪂 Dropped: <strong className="text-cyan-400">{state.stats.clustersDropped}</strong></span>
                </div>

                {/* Leaderboard / Auth Status */}
                {!user ? (
                  <button
                    onClick={() => setShowLogin(true)}
                    className="mb-4 flex cursor-pointer items-center gap-1.5 rounded-xl border border-amber-500/40 bg-amber-500/20 px-5 py-2 text-xs font-bold text-amber-300 transition-all hover:bg-amber-500/30 active:scale-95"
                  >
                    <span>⚡</span> Sign in to save high score
                  </button>
                ) : (
                  <div className="mb-4 flex items-center gap-1.5 rounded-full border border-emerald-500/30 bg-emerald-500/10 px-4 py-1 text-[11px] font-semibold text-emerald-400">
                    <span>✓</span> Score saved to Leaderboard
                  </div>
                )}

                {/* Action Buttons */}
                <div className="flex items-center gap-2.5">
                  <button
                    onClick={startGame}
                    className="cursor-pointer rounded-xl bg-gradient-to-r from-teal-500 via-cyan-500 to-blue-600 px-6 py-2.5 text-xs font-black uppercase tracking-wider text-white shadow-lg shadow-cyan-500/25 transition-transform hover:scale-105 active:scale-95"
                  >
                    Play Again
                  </button>
                  <Link
                    href="/leaderboard?game=eggpop"
                    className="flex items-center gap-1 rounded-xl border border-white/20 bg-white/10 px-4 py-2.5 text-xs font-bold text-gray-200 transition-colors hover:bg-white/15 hover:text-white"
                  >
                    <TrophyIcon size={13} />
                    Leaderboard
                  </Link>
                </div>
              </div>
            )}
          </div>

          {/* Right Side: How to Play & Hotkeys */}
          <div className="hidden w-48 flex-col gap-3 lg:flex">
            <div className="rounded-xl border border-white/10 bg-white/5 p-4 text-xs text-gray-400 backdrop-blur">
              <h3 className="mb-2.5 flex items-center gap-1.5 font-bold text-gray-200">
                <span>🎯</span> How to Play
              </h3>
              <ul className="space-y-2">
                <li className="flex items-start gap-1.5">
                  <span className="text-cyan-400">•</span>
                  <span><strong className="text-gray-200">No Guide Line</strong>: Classic arcade aiming by eye &amp; intuition. Rotate the cannon barrel!</span>
                </li>
                <li className="flex items-start gap-1.5">
                  <span className="text-amber-400">•</span>
                  <span><strong className="text-gray-200">Drop Timer</strong>: Ceiling slides down when the timer reaches 0 or fouls deplete!</span>
                </li>
                <li className="flex items-start gap-1.5">
                  <span className="text-emerald-400">•</span>
                  <span><strong className="text-emerald-300">+Time Bonus</strong>: Popping Match-3 clusters rewards +2s to +4s extra time!</span>
                </li>
                <li className="flex items-start gap-1.5">
                  <span className="text-purple-400">•</span>
                  <span><strong className="text-gray-200">Level Scaling</strong>: Higher scores unlock purple &amp; orange eggs with faster drop timers!</span>
                </li>
                <li className="flex items-start gap-1.5">
                  <span className="text-red-400">•</span>
                  <span><strong className="text-red-300">Danger Zone</strong>: Don&apos;t let eggs cross the red deadline line at the bottom!</span>
                </li>
              </ul>
            </div>

            <div className="rounded-xl border border-white/10 bg-white/5 p-3 text-[11px] text-gray-400 backdrop-blur">
              <div className="font-semibold text-gray-300">Keyboard Shortcuts</div>
              <div className="mt-1.5 flex justify-between">
                <span>Pause / Resume</span>
                <kbd className="rounded bg-white/10 px-1.5 py-0.5 text-[10px] text-gray-300">P</kbd>
              </div>
              <div className="mt-1 flex justify-between">
                <span>Toggle Mute</span>
                <kbd className="rounded bg-white/10 px-1.5 py-0.5 text-[10px] text-gray-300">M</kbd>
              </div>
              <div className="mt-1 flex justify-between">
                <span>Restart</span>
                <kbd className="rounded bg-white/10 px-1.5 py-0.5 text-[10px] text-gray-300">R</kbd>
              </div>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
