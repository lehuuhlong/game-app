'use client';

import React, { useState, useRef, useEffect } from 'react';
import Link from 'next/link';
import { motion, AnimatePresence } from 'framer-motion';
import { useAuth } from '@/components/auth';
import { usePikachuLogic } from './usePikachuLogic';
import { PikachuTile } from './PikachuTile';
import { ElectricPathOverlay } from './ElectricPathOverlay';
import { useGameSession } from '@/hooks/useGameSession';

export function GamePikachu() {
  const { user, refreshUser } = useAuth();
  const boardRef = useRef<HTMLDivElement>(null);

  const {
    levelConfig,
    levelIdx,
    board,
    activePath,
    score,
    pairsLeft,
    timeLeft,
    combo,
    hintsLeft,
    isMuted,
    status,
    message,
    selectCell,
    useHint,
    togglePause,
    toggleMute,
    nextLevel,
    restartGame,
  } = usePikachuLogic();

  // ── Sync High Score & Persistence ──────────────────────────────────
  const { startSession, getSessionToken, ensureSessionToken, getElapsedDuration } = useGameSession('pikachu');
  const [localBestScore, setLocalBestScore] = useState(0);
  const scoreSavedRef = useRef(false);
  const wasGameOverRef = useRef(false);

  useEffect(() => {
    startSession(user?.id, user?.username);
  }, [startSession, user?.id, user?.username]);

  // ── Auto-renew session ONLY when game restarts after game over ─────
  useEffect(() => {
    const isGameOver = status === 'game_over' || status === 'victory';
    if (!isGameOver && wasGameOverRef.current) {
      // Starting a fresh run after previous game over: force new session token & reset start time
      startSession(user?.id, user?.username, true);
      scoreSavedRef.current = false;
    }
    wasGameOverRef.current = isGameOver;
  }, [status, startSession, user?.id, user?.username]);

  // Load local best score on mount
  useEffect(() => {
    try {
      const saved = Number(localStorage.getItem('pikachu_best_score') || '0');
      if (saved > 0) setLocalBestScore(saved);
    } catch (e) {}
  }, []);

  // Update local best score when current score exceeds it
  useEffect(() => {
    if (score > localBestScore) {
      setLocalBestScore(score);
      try {
        localStorage.setItem('pikachu_best_score', String(score));
      } catch (e) {}
    }
  }, [score, localBestScore]);

  // Sync to database when a level is cleared or the game ends (victory / game_over)
  useEffect(() => {
    if (status === 'playing') {
      scoreSavedRef.current = false;
      return;
    }

    const isLevelCleared = status === 'level_cleared';
    const isGameOver = status === 'game_over' || status === 'victory';
    if ((!isLevelCleared && !isGameOver) || score <= 0) return;
    if (scoreSavedRef.current) return;
    scoreSavedRef.current = true;

    (async () => {
      const sessionToken = await ensureSessionToken(user?.id, user?.username);
      const elapsed = getElapsedDuration();

      // Save match session to /api/matches on game completion
      if (isGameOver) {
        fetch('/api/matches', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            gameType: 'pikachu',
            sessionToken,
            players: [
              {
                userId: user?.id,
                username: user ? user.username : 'Guest',
                score,
                result: status === 'victory' ? 'win' : 'loss',
              },
            ],
            duration: elapsed,
            gameData: { level: levelIdx + 1, score },
          }),
        }).catch((e) => console.error('Failed to post match:', e));
      }

      // Save user record if score or level exceeds previous best
      if (user && user.id && (score > (user.pikachuBestScore || 0) || (levelIdx + 1) > (user.pikachuHighestLevel || 0))) {
        fetch(`/api/users/${user.id}/score`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            game: 'pikachu',
            score,
            level: levelIdx + 1,
            sessionToken,
            duration: elapsed,
            isFinal: isGameOver,
          }),
        })
          .then((r) => r.json())
          .then((d) => {
            if (d && d.pikachuBestScore !== undefined) {
              refreshUser({
                pikachuBestScore: d.pikachuBestScore,
                pikachuHighestLevel: d.pikachuHighestLevel,
              });
              if (typeof window !== 'undefined') {
                window.dispatchEvent(new CustomEvent('userProfileUpdated'));
              }
            }
          })
          .catch((e) => console.error('Failed to save pikachu score:', e));
      }
    })();
  }, [status, score, user, levelIdx, refreshUser, ensureSessionToken, getElapsedDuration]);

  const handleNextLevel = () => {
    scoreSavedRef.current = false;
    nextLevel();
  };

  const handleRestart = () => {
    scoreSavedRef.current = false;
    startSession(user?.id, user?.username, true);
    restartGame();
  };

  const bestScore = Math.max(user?.pikachuBestScore || 0, localBestScore, score);
  const timePercent = Math.max(0, Math.min(100, (timeLeft / levelConfig.timeLimit) * 100));

  return (
    <div className="flex flex-col items-center gap-3.5 sm:gap-4.5 w-full max-w-[800px] mx-auto select-none">
      {/* ── 1. Header Matching Portal Style ───────────────────────────── */}
      <div className="w-full flex flex-col sm:flex-row items-center justify-between gap-3 sm:gap-4">
        <div>
          <div className="flex items-center gap-2.5">
            <h1 className="text-2xl sm:text-3xl font-extrabold text-foreground tracking-tight">
              Pikachu
            </h1>
            <span className="text-xs font-semibold px-2.5 py-0.5 rounded-full bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20">
              Level {levelConfig.level}
            </span>
          </div>
          <p className="text-xs sm:text-sm text-foreground-secondary mt-0.5">
            {levelConfig.name} • {levelConfig.description}
          </p>
        </div>

        {/* Scoreboard & Audio */}
        <div className="flex items-center gap-2 sm:gap-2.5">
          {/* Score */}
          <div className="flex flex-col items-center rounded-xl border border-border bg-surface px-3.5 py-1.5 min-w-[70px] shadow-xs">
            <span className="text-[10px] uppercase tracking-wider text-foreground-muted font-semibold">
              Score
            </span>
            <span className="text-sm sm:text-base font-bold text-foreground tabular-nums">
              {score.toLocaleString()}
            </span>
          </div>

          {/* Best Score */}
          <div className="flex flex-col items-center rounded-xl border border-border bg-surface px-3.5 py-1.5 min-w-[70px] shadow-xs">
            <span className="text-[10px] uppercase tracking-wider text-foreground-muted font-semibold">
              Best
            </span>
            <span className="text-sm sm:text-base font-bold text-accent tabular-nums" suppressHydrationWarning>
              {bestScore.toLocaleString()}
            </span>
          </div>

          {/* Audio Toggle */}
          <button
            type="button"
            onClick={toggleMute}
            className={`p-2 rounded-xl border transition-colors shadow-xs ${
              isMuted
                ? 'bg-red-500/10 text-red-500 border-red-500/30'
                : 'bg-surface text-foreground-secondary border-border hover:text-foreground hover:bg-surface-hover'
            }`}
            title={isMuted ? 'Unmute sound' : 'Mute sound'}
          >
            {isMuted ? (
              <svg className="w-4.5 h-4.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5.586 15H4a1 1 0 01-1-1v-4a1 1 0 011-1h1.586l4.707-4.707C10.923 3.663 12 4.109 12 5v14c0 .891-1.077 1.337-1.707.707L5.586 15z" />
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2" />
              </svg>
            ) : (
              <svg className="w-4.5 h-4.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.536 8.464a5 5 0 010 7.072m2.828-9.9a9 9 0 010 12.728M5.586 15H4a1 1 0 01-1-1v-4a1 1 0 011-1h1.586l4.707-4.707C10.923 3.663 12 4.109 12 5v14c0 .891-1.077 1.337-1.707.707L5.586 15z" />
              </svg>
            )}
          </button>
        </div>
      </div>

      {/* ── 2. Timer Bar & Combo Streak ──────────────────────────────── */}
      <div className="w-full flex items-center gap-3 h-7">
        {/* Time bar */}
        <div className="relative flex-1 h-2 sm:h-2.5 bg-surface-hover/80 rounded-full overflow-hidden border border-border shadow-xs">
          <motion.div
            className={`h-full rounded-full transition-all duration-300 ${
              timePercent > 40
                ? 'bg-emerald-500'
                : timePercent > 15
                  ? 'bg-amber-500'
                  : 'bg-rose-500 animate-pulse'
            }`}
            style={{ width: `${timePercent}%` }}
          />
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <span className="text-xs sm:text-sm font-mono font-bold text-foreground-secondary tabular-nums min-w-[55px] text-right">
            ⏱️ {timeLeft}s
          </span>

          {/* Reserved slot for Combo Multiplier - zero layout shift */}
          <div className="w-[62px] h-6 flex items-center justify-center shrink-0">
            <span
              className={`inline-flex items-center justify-center gap-1 px-2 py-0.5 rounded-full bg-amber-500/10 border border-amber-500/30 text-amber-600 dark:text-amber-400 text-xs font-bold font-mono transition-all duration-150 ${
                combo > 1 ? 'opacity-100 scale-100' : 'opacity-0 scale-95 pointer-events-none'
              }`}
            >
              🔥 x{combo > 1 ? combo : 2}
            </span>
          </div>
        </div>
      </div>

      {/* ── 3. Main Playing Board ────────────────────────────────────── */}
      <div className="relative w-full flex items-center justify-center p-1.5 sm:p-2.5 rounded-xl sm:rounded-2xl bg-[#1a2744] border border-[#2a3f6e] shadow-lg overflow-hidden">
        {/* Board container */}
        <div
          ref={boardRef}
          className="relative w-full grid gap-[1px] sm:gap-[2px] md:gap-1 z-10"
          style={{
            gridTemplateColumns: `repeat(${levelConfig.cols}, minmax(0, 1fr))`,
            gridTemplateRows: `repeat(${levelConfig.rows}, minmax(0, 1fr))`,
          }}
        >
          {/* Subtle background empty slot placeholders */}
          {board.map((row) =>
            row.map((cell) => (
              <div
                key={`slot_${cell.r}_${cell.c}`}
                className="aspect-[4/5] w-full rounded-none bg-[#0f1b33]/40 border border-[#1e2f52]/30 pointer-events-none"
                style={{
                  gridRowStart: cell.r + 1,
                  gridColumnStart: cell.c + 1,
                }}
              />
            )),
          )}

          {/* Active tiles with smooth layout sliding */}
          {board.flatMap((row) =>
            row.filter((cell) => cell.tile !== null).map((cell) => <PikachuTile key={cell.tile!.id} cell={cell} onSelect={selectCell} />),
          )}

          {/* Electric Path Overlay */}
          <ElectricPathOverlay path={activePath} rows={levelConfig.rows} cols={levelConfig.cols} boardRef={boardRef} />
        </div>

        {/* Pause Overlay */}
        <AnimatePresence>
          {status === 'paused' && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="absolute inset-0 z-40 bg-background/80 backdrop-blur-xs flex flex-col items-center justify-center p-6 text-center"
            >
              <h2 className="text-2xl sm:text-3xl font-extrabold text-foreground mb-4">GAME PAUSED</h2>
              <button
                type="button"
                onClick={togglePause}
                className="px-6 py-2.5 rounded-xl font-bold bg-primary text-primary-foreground shadow-sm hover:opacity-90 transition-opacity"
              >
                Resume Game
              </button>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* ── 4. Control Action Bar ────────────────────────────────────── */}
      <div className="w-full flex items-center justify-between gap-3 flex-wrap">
        {/* Status: Pairs left */}
        <div className="flex items-center gap-2 text-xs sm:text-sm text-foreground-secondary">
          <span>Pairs Left:</span>
          <span className="font-mono font-bold text-foreground">{pairsLeft} pairs</span>
          <span className="mx-1 text-border hidden sm:inline">|</span>
          <span className="hidden sm:inline text-xs text-foreground-muted">
            Connect 2 identical tiles with at most 2 turns
          </span>
        </div>

        <div className="flex items-center gap-2">
          {/* Hint Button */}
          <button
            type="button"
            onClick={useHint}
            disabled={hintsLeft <= 0 || status !== 'playing'}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-border bg-surface text-xs sm:text-sm font-medium text-foreground-secondary hover:bg-surface-hover hover:text-foreground transition-colors disabled:opacity-40 disabled:pointer-events-none shadow-xs"
            title="Hint (Max 3 for the run)"
          >
            <span>💡 Hint</span>
            <span className="px-1.5 py-0.2 rounded-full bg-accent/10 text-accent font-mono text-[11px] font-bold">
              {hintsLeft} / 3
            </span>
          </button>

          {/* Restart Button */}
          <button
            type="button"
            onClick={restartGame}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-border bg-surface text-xs sm:text-sm font-medium text-foreground-secondary hover:bg-surface-hover hover:text-foreground transition-colors shadow-xs"
          >
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
              <polyline points="1 4 1 10 7 10" />
              <path d="M3.51 15a9 9 0 1 0 2.13-9.36L1 10" />
            </svg>
            <span>Restart</span>
          </button>
        </div>
      </div>

      {/* ── 5. Toast Notification ────────────────────────────────────── */}
      <AnimatePresence>
        {message && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="fixed bottom-6 z-50 px-5 py-2.5 rounded-full bg-surface border border-accent text-accent font-semibold text-sm shadow-xl backdrop-blur-sm"
          >
            {message}
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── 6. Level Cleared Modal ───────────────────────────────────── */}
      <AnimatePresence>
        {status === 'level_cleared' && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4"
          >
            <motion.div
              initial={{ scale: 0.95, y: 15 }}
              animate={{ scale: 1, y: 0 }}
              className="w-full max-w-md p-6 sm:p-8 rounded-2xl bg-surface border border-border shadow-xl text-center text-foreground"
            >
              <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center text-3xl">
                {levelConfig.level >= 6 ? '👑' : '✨'}
              </div>
              <h2 className="text-2xl sm:text-3xl font-extrabold text-foreground mb-2">LEVEL {levelConfig.level} CLEARED!</h2>
              <p className="text-sm text-foreground-secondary mb-6">
                {levelConfig.level === 6
                  ? 'Congratulations! You conquered the main campaign! Ready for Endless Mode?'
                  : levelConfig.level > 6
                    ? `Endless Loop Master! You completed ${levelConfig.name}.`
                    : `You have successfully conquered ${levelConfig.name}.`}
              </p>

              <div className="grid grid-cols-2 gap-3 mb-6">
                <div className="p-3.5 rounded-xl bg-surface-hover/60 border border-border">
                  <span className="text-xs text-foreground-muted block mb-1 font-medium">Time Bonus</span>
                  <span className="text-lg font-mono font-bold text-accent">+{timeLeft * 10} pts</span>
                </div>
                <div className="p-3.5 rounded-xl bg-surface-hover/60 border border-border">
                  <span className="text-xs text-foreground-muted block mb-1 font-medium">Total Score</span>
                  <span className="text-lg font-mono font-bold text-foreground">{score.toLocaleString()}</span>
                </div>
              </div>

              <button
                type="button"
                onClick={handleNextLevel}
                className="w-full py-3 rounded-xl font-bold bg-primary text-primary-foreground hover:opacity-90 shadow-sm transition-opacity text-sm sm:text-base"
              >
                {levelConfig.level === 6 ? 'Enter Endless Mode (Level 7) ➔' : `Next Level (Level ${levelConfig.level + 1}) ➔`}
              </button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── 7. Game Over Modal ───────────────────────────────────────── */}
      <AnimatePresence>
        {status === 'game_over' && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4"
          >
            <motion.div
              initial={{ scale: 0.95, y: 15 }}
              animate={{ scale: 1, y: 0 }}
              className="w-full max-w-md p-6 sm:p-8 rounded-2xl bg-surface border border-border shadow-xl text-center text-foreground"
            >
              <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-red-500/10 border border-red-500/30 flex items-center justify-center text-3xl">
                ⌛
              </div>
              <h2 className="text-2xl sm:text-3xl font-extrabold text-foreground mb-2">TIME&apos;S UP!</h2>
              <p className="text-sm text-foreground-secondary mb-6">
                You reached Level {levelConfig.level} ({levelConfig.name}).
              </p>

              <div className="p-4 rounded-xl bg-surface-hover/60 border border-border mb-6">
                <span className="text-xs text-foreground-muted block mb-1 font-medium">Final Score</span>
                <span className="text-2xl font-mono font-bold text-foreground">{score.toLocaleString()}</span>
              </div>

              <div className="flex flex-col gap-3">
                <button
                  type="button"
                  onClick={handleRestart}
                  className="w-full py-3 rounded-xl font-bold bg-primary text-primary-foreground hover:opacity-90 shadow-sm transition-opacity text-sm sm:text-base"
                >
                  🔄 Play Again
                </button>
                <Link
                  href="/leaderboard?game=pikachu"
                  className="w-full py-2.5 rounded-xl font-semibold bg-surface border border-border hover:bg-surface-hover text-foreground-secondary hover:text-foreground text-sm transition-colors text-center shadow-xs"
                >
                  🏆 View Leaderboard
                </Link>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── 8. Victory Modal (Passed All Levels) ──────────────────────── */}
      <AnimatePresence>
        {status === 'victory' && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4"
          >
            <motion.div
              initial={{ scale: 0.95, y: 15 }}
              animate={{ scale: 1, y: 0 }}
              className="w-full max-w-md p-6 sm:p-8 rounded-2xl bg-surface border border-border shadow-xl text-center text-foreground"
            >
              <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-amber-500/10 border border-amber-500/30 flex items-center justify-center text-3xl">
                👑
              </div>
              <h2 className="text-2xl sm:text-3xl font-extrabold text-foreground mb-2">
                ONET MASTER!
              </h2>
              <p className="text-sm text-foreground-secondary mb-6">Incredible! You have conquered all 6 stages of Pikachu!</p>

              <div className="p-4 rounded-xl bg-surface-hover/60 border border-border mb-6">
                <span className="text-xs text-foreground-muted block mb-1 font-medium">Final High Score</span>
                <span className="text-3xl font-mono font-black text-foreground">{score.toLocaleString()}</span>
              </div>

              <div className="flex flex-col gap-3">
                <button
                  type="button"
                  onClick={handleNextLevel}
                  className="w-full py-3 rounded-xl font-bold bg-primary text-primary-foreground hover:opacity-90 shadow-sm transition-opacity text-sm sm:text-base"
                >
                  Enter Endless Mode (Level 7) ➔
                </button>
                <button
                  type="button"
                  onClick={handleRestart}
                  className="w-full py-2.5 rounded-xl font-semibold bg-surface border border-border hover:bg-surface-hover text-foreground-secondary hover:text-foreground text-sm transition-colors text-center shadow-xs"
                >
                  Play Again from Level 1
                </button>
                <Link
                  href="/leaderboard?game=pikachu"
                  className="w-full py-2.5 rounded-xl font-semibold bg-surface border border-border hover:bg-surface-hover text-foreground-secondary hover:text-foreground text-sm transition-colors text-center shadow-xs"
                >
                  🏆 View Leaderboard
                </Link>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
