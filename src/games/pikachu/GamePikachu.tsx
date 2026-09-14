'use client';

import React, { useRef, useEffect } from 'react';
import Link from 'next/link';
import { motion, AnimatePresence } from 'framer-motion';
import { useAuth } from '@/components/auth';
import { usePikachuLogic } from './usePikachuLogic';
import { PikachuTile } from './PikachuTile';
import { ElectricPathOverlay } from './ElectricPathOverlay';

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
    shufflesLeft,
    isMuted,
    status,
    message,
    selectCell,
    useHint,
    useShuffle,
    togglePause,
    toggleMute,
    nextLevel,
    restartGame,
  } = usePikachuLogic();

  // ── Sync High Score to Database ─────────────────────────────────────
  const scoreSavedRef = useRef(false);

  useEffect(() => {
    if (status === 'game_over' || status === 'victory') {
      if (scoreSavedRef.current) return;
      scoreSavedRef.current = true;

      // Save match to /api/matches
      fetch('/api/matches', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          gameType: 'pikachu',
          players: [
            {
              username: user ? user.username : 'Guest',
              score,
              result: status === 'victory' ? 'win' : 'loss',
            },
          ],
          duration: levelConfig.timeLimit - timeLeft,
          gameData: { level: levelIdx + 1, score },
        }),
      }).catch((e) => console.error('Failed to post match:', e));

      // Save user record if logged in
      if (user && user.id) {
        fetch(`/api/users/${user.id}/score`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            game: 'pikachu',
            score,
            level: levelIdx + 1,
          }),
        })
          .then((r) => r.json())
          .then((d) => {
            if (d.pikachuBestScore !== undefined) {
              refreshUser({
                pikachuBestScore: d.pikachuBestScore,
                pikachuHighestLevel: d.pikachuHighestLevel,
              });
            }
          })
          .catch((e) => console.error('Failed to save pikachu score:', e));
      }
    } else {
      scoreSavedRef.current = false;
    }
  }, [status, score, user, levelIdx, levelConfig.timeLimit, timeLeft, refreshUser]);

  const bestScore = Math.max(user?.pikachuBestScore || 0, score);
  const timePercent = Math.max(0, Math.min(100, (timeLeft / levelConfig.timeLimit) * 100));

  return (
    <div className="relative min-h-screen bg-background text-foreground flex flex-col items-center justify-start px-2 sm:px-4 py-4 sm:py-8 select-none">
      {/* ── 1. Sticky / Floating Header HUD ───────────────────────────── */}
      <div className="w-full max-w-5xl mb-4 sm:mb-6">
        <div className="flex items-center justify-between gap-2 p-3 sm:p-4 rounded-2xl bg-surface/70 border border-border/80 backdrop-blur-xl shadow-lg">
          {/* Back link & Title */}
          <div className="flex items-center gap-2 sm:gap-3">
            <Link
              href="/games"
              className="p-2 rounded-xl bg-surface-hover/80 text-foreground-secondary hover:text-foreground border border-border/60 transition-colors"
              title="Back to games catalog"
            >
              <svg className="w-4 h-4 sm:w-5 sm:h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
            </Link>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-sm sm:text-base md:text-lg font-bold tracking-tight bg-gradient-to-r from-amber-400 via-sky-400 to-primary bg-clip-text text-transparent">
                  Pikachu Connect
                </h1>
                <span className="hidden xs:inline-block text-[10px] sm:text-xs font-semibold px-2 py-0.5 rounded-full bg-amber-500/10 text-amber-400 border border-amber-500/20">
                  Level {levelConfig.level}
                </span>
              </div>
              <p className="text-[11px] sm:text-xs text-foreground-secondary hidden sm:block truncate max-w-xs">
                {levelConfig.name} • {levelConfig.description}
              </p>
            </div>
          </div>

          {/* Stats Badges */}
          <div className="flex items-center gap-2 sm:gap-4">
            {/* Score */}
            <div className="text-right">
              <span className="text-[10px] sm:text-xs text-foreground-muted font-medium block leading-none mb-1">
                SCORE
              </span>
              <span className="text-base sm:text-xl font-bold font-mono text-amber-400 leading-none">
                {score.toLocaleString()}
              </span>
            </div>

            {/* Best Score */}
            <div className="text-right hidden sm:block">
              <span className="text-[10px] sm:text-xs text-foreground-muted font-medium block leading-none mb-1">
                BEST
              </span>
              <span className="text-base sm:text-xl font-bold font-mono text-sky-400 leading-none">
                {bestScore.toLocaleString()}
              </span>
            </div>

            {/* Audio Toggle */}
            <button
              type="button"
              onClick={toggleMute}
              className={`p-2 rounded-xl border transition-colors ${
                isMuted
                  ? 'bg-red-500/10 text-red-400 border-red-500/30'
                  : 'bg-surface-hover/80 text-foreground-secondary border-border/60 hover:text-foreground'
              }`}
              title={isMuted ? 'Unmute sound' : 'Mute sound'}
            >
              {isMuted ? (
                <svg className="w-4 h-4 sm:w-5 sm:h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5.586 15H4a1 1 0 01-1-1v-4a1 1 0 011-1h1.586l4.707-4.707C10.923 3.663 12 4.109 12 5v14c0 .891-1.077 1.337-1.707.707L5.586 15z" />
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2" />
                </svg>
              ) : (
                <svg className="w-4 h-4 sm:w-5 sm:h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.536 8.464a5 5 0 010 7.072m2.828-9.9a9 9 0 010 12.728M5.586 15H4a1 1 0 01-1-1v-4a1 1 0 011-1h1.586l4.707-4.707C10.923 3.663 12 4.109 12 5v14c0 .891-1.077 1.337-1.707.707L5.586 15z" />
                </svg>
              )}
            </button>

            {/* Pause Button */}
            <button
              type="button"
              onClick={togglePause}
              className="p-2 rounded-xl bg-surface-hover/80 text-foreground-secondary border border-border/60 hover:text-foreground transition-colors"
              title={status === 'paused' ? 'Resume game' : 'Pause game'}
            >
              {status === 'paused' ? (
                <svg className="w-4 h-4 sm:w-5 sm:h-5 text-emerald-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z" />
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              ) : (
                <svg className="w-4 h-4 sm:w-5 sm:h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 9v6m4-6v6m7-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              )}
            </button>
          </div>
        </div>

        {/* ── 2. Timer Bar & Combo Streak ──────────────────────────────── */}
        <div className="mt-2 sm:mt-3 flex items-center gap-3">
          {/* Time bar */}
          <div className="relative flex-1 h-3 sm:h-3.5 bg-surface rounded-full overflow-hidden border border-border/80 shadow-inner">
            <motion.div
              className={`h-full rounded-full transition-all duration-300 ${
                timePercent > 40
                  ? 'bg-gradient-to-r from-emerald-500 to-sky-400'
                  : timePercent > 15
                  ? 'bg-gradient-to-r from-amber-500 to-yellow-400'
                  : 'bg-gradient-to-r from-red-600 to-rose-500 animate-pulse'
              }`}
              style={{ width: `${timePercent}%` }}
            />
          </div>

          <div className="flex items-center gap-2 min-w-[75px] justify-end">
            <span className="text-xs sm:text-sm font-mono font-bold text-foreground-secondary">
              ⏱️ {timeLeft}s
            </span>
          </div>

          {/* Combo Multiplier indicator */}
          <AnimatePresence>
            {combo > 1 && (
              <motion.div
                initial={{ scale: 0, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                exit={{ scale: 0, opacity: 0 }}
                className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-amber-500/20 border border-amber-500/40 text-amber-300 text-xs font-bold font-mono shadow-[0_0_12px_rgba(251,191,36,0.3)] animate-bounce"
              >
                🔥 x{combo}
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>

      {/* ── 3. Main Playing Board ────────────────────────────────────── */}
      <div className="relative w-full max-w-5xl flex items-center justify-center p-2 sm:p-4 rounded-3xl bg-surface/50 border border-border/80 backdrop-blur-xl shadow-2xl overflow-hidden">
        {/* Subtle Ambient Grid Background */}
        <div className="absolute inset-0 pointer-events-none opacity-20 bg-[radial-gradient(#38bdf8_1px,transparent_1px)] [background-size:16px_16px]" />

        {/* Board container */}
        <div
          ref={boardRef}
          className="relative w-full grid gap-1 sm:gap-1.5 md:gap-2 z-10"
          style={{
            gridTemplateColumns: `repeat(${levelConfig.cols}, minmax(0, 1fr))`,
          }}
        >
          {board.map((row) =>
            row.map((cell) => (
              <PikachuTile
                key={`cell_${cell.r}_${cell.c}`}
                cell={cell}
                onSelect={selectCell}
              />
            ))
          )}

          {/* Electric Neon SVG Path Overlay */}
          <ElectricPathOverlay
            path={activePath}
            rows={levelConfig.rows}
            cols={levelConfig.cols}
            boardRef={boardRef}
          />
        </div>

        {/* Pause Overlay */}
        <AnimatePresence>
          {status === 'paused' && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="absolute inset-0 z-40 bg-black/75 backdrop-blur-md flex flex-col items-center justify-center p-6 text-center"
            >
              <h2 className="text-2xl sm:text-3xl font-extrabold text-foreground mb-4">
                GAME PAUSED
              </h2>
              <button
                type="button"
                onClick={togglePause}
                className="px-6 py-2.5 rounded-xl font-bold bg-gradient-to-r from-sky-400 to-primary text-white shadow-lg hover:shadow-primary/40 hover:-translate-y-0.5 transition-all"
              >
                Resume Game
              </button>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* ── 4. Control Action Bar ────────────────────────────────────── */}
      <div className="w-full max-w-5xl mt-4 sm:mt-6 flex flex-wrap items-center justify-between gap-3 p-3 sm:p-4 rounded-2xl bg-surface/70 border border-border/80 backdrop-blur-xl">
        {/* Status: Pairs left */}
        <div className="flex items-center gap-2 text-xs sm:text-sm text-foreground-secondary">
          <span>Pairs Left:</span>
          <span className="font-mono font-bold text-foreground">{pairsLeft} pairs</span>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center gap-2 sm:gap-3">
          {/* Hint Button */}
          <button
            type="button"
            onClick={useHint}
            disabled={hintsLeft <= 0 || status !== 'playing'}
            className="flex items-center gap-1.5 px-3 sm:px-4 py-2 rounded-xl bg-surface border border-border hover:border-sky-400/60 hover:bg-surface-hover text-xs sm:text-sm font-semibold transition-all disabled:opacity-40 disabled:pointer-events-none"
          >
            <span>💡 Hint</span>
            <span className="px-1.5 py-0.2 rounded-full bg-sky-500/20 text-sky-400 font-mono text-[10px] font-bold">
              {hintsLeft}
            </span>
          </button>

          {/* Shuffle Button */}
          <button
            type="button"
            onClick={useShuffle}
            disabled={shufflesLeft <= 0 || status !== 'playing'}
            className="flex items-center gap-1.5 px-3 sm:px-4 py-2 rounded-xl bg-surface border border-border hover:border-amber-400/60 hover:bg-surface-hover text-xs sm:text-sm font-semibold transition-all disabled:opacity-40 disabled:pointer-events-none"
          >
            <span>🔀 Shuffle</span>
            <span className="px-1.5 py-0.2 rounded-full bg-amber-500/20 text-amber-400 font-mono text-[10px] font-bold">
              {shufflesLeft}
            </span>
          </button>

          {/* Reset Button */}
          <button
            type="button"
            onClick={restartGame}
            className="px-3 sm:px-4 py-2 rounded-xl bg-surface border border-border hover:border-red-400/60 hover:bg-surface-hover text-xs sm:text-sm font-semibold text-foreground-secondary hover:text-red-400 transition-all"
            title="Restart from Level 1"
          >
            🔄 Restart
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
            className="fixed bottom-6 z-50 px-5 py-2.5 rounded-full bg-surface border border-accent text-accent font-semibold text-sm shadow-2xl backdrop-blur-xl"
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
            className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-center justify-center p-4"
          >
            <motion.div
              initial={{ scale: 0.9, y: 20 }}
              animate={{ scale: 1, y: 0 }}
              className="w-full max-w-md p-6 sm:p-8 rounded-3xl bg-surface border border-emerald-500/40 shadow-[0_0_50px_rgba(16,185,129,0.3)] text-center"
            >
              <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-emerald-500/20 border border-emerald-500/40 flex items-center justify-center text-3xl">
                ✨
              </div>
              <h2 className="text-2xl sm:text-3xl font-extrabold text-emerald-400 mb-2">
                LEVEL {levelConfig.level} CLEARED!
              </h2>
              <p className="text-sm text-foreground-secondary mb-6">
                You have successfully conquered {levelConfig.name}.
              </p>

              <div className="grid grid-cols-2 gap-3 mb-6">
                <div className="p-3 rounded-2xl bg-surface-hover/60 border border-border">
                  <span className="text-xs text-foreground-muted block mb-1">Time Bonus</span>
                  <span className="text-lg font-mono font-bold text-sky-400">+{timeLeft * 10} pts</span>
                </div>
                <div className="p-3 rounded-2xl bg-surface-hover/60 border border-border">
                  <span className="text-xs text-foreground-muted block mb-1">Total Score</span>
                  <span className="text-lg font-mono font-bold text-amber-400">{score.toLocaleString()}</span>
                </div>
              </div>

              <button
                type="button"
                onClick={nextLevel}
                className="w-full py-3.5 rounded-xl font-bold bg-gradient-to-r from-emerald-500 to-sky-500 text-white shadow-lg hover:shadow-emerald-500/30 hover:-translate-y-0.5 transition-all text-sm sm:text-base"
              >
                Next Level ➔
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
            className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-center justify-center p-4"
          >
            <motion.div
              initial={{ scale: 0.9, y: 20 }}
              animate={{ scale: 1, y: 0 }}
              className="w-full max-w-md p-6 sm:p-8 rounded-3xl bg-surface border border-red-500/40 shadow-[0_0_50px_rgba(239,68,68,0.3)] text-center"
            >
              <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-red-500/20 border border-red-500/40 flex items-center justify-center text-3xl">
                ⌛
              </div>
              <h2 className="text-2xl sm:text-3xl font-extrabold text-red-400 mb-2">
                TIME&apos;S UP!
              </h2>
              <p className="text-sm text-foreground-secondary mb-6">
                You reached Level {levelConfig.level} ({levelConfig.name}).
              </p>

              <div className="p-4 rounded-2xl bg-surface-hover/60 border border-border mb-6">
                <span className="text-xs text-foreground-muted block mb-1">Final Score</span>
                <span className="text-2xl font-mono font-bold text-amber-400">{score.toLocaleString()}</span>
              </div>

              <div className="flex flex-col gap-3">
                <button
                  type="button"
                  onClick={restartGame}
                  className="w-full py-3.5 rounded-xl font-bold bg-gradient-to-r from-amber-500 to-orange-600 text-white shadow-lg hover:shadow-amber-500/30 hover:-translate-y-0.5 transition-all text-sm sm:text-base"
                >
                  🔄 Play Again
                </button>
                <Link
                  href="/leaderboard?game=pikachu"
                  className="w-full py-3 rounded-xl font-semibold bg-surface border border-border hover:bg-surface-hover text-foreground-secondary hover:text-foreground text-sm transition-colors text-center"
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
            className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-center justify-center p-4"
          >
            <motion.div
              initial={{ scale: 0.9, y: 20 }}
              animate={{ scale: 1, y: 0 }}
              className="w-full max-w-md p-6 sm:p-8 rounded-3xl bg-surface border border-amber-400/60 shadow-[0_0_60px_rgba(251,191,36,0.4)] text-center"
            >
              <div className="w-20 h-20 mx-auto mb-4 rounded-full bg-amber-400/20 border border-amber-400/40 flex items-center justify-center text-4xl animate-bounce">
                👑
              </div>
              <h2 className="text-2xl sm:text-3xl font-extrabold bg-gradient-to-r from-amber-300 via-yellow-400 to-amber-500 bg-clip-text text-transparent mb-2">
                ONET MASTER!
              </h2>
              <p className="text-sm text-foreground-secondary mb-6">
                Incredible! You have conquered all 6 stages of Pikachu Connect!
              </p>

              <div className="p-4 rounded-2xl bg-surface-hover/60 border border-border mb-6">
                <span className="text-xs text-foreground-muted block mb-1">Final High Score</span>
                <span className="text-3xl font-mono font-black text-amber-400">{score.toLocaleString()}</span>
              </div>

              <div className="flex flex-col gap-3">
                <button
                  type="button"
                  onClick={restartGame}
                  className="w-full py-3.5 rounded-xl font-bold bg-gradient-to-r from-amber-400 via-yellow-500 to-amber-600 text-white shadow-lg hover:shadow-amber-500/40 hover:-translate-y-0.5 transition-all text-sm sm:text-base"
                >
                  Play Again to Break Record
                </button>
                <Link
                  href="/leaderboard?game=pikachu"
                  className="w-full py-3 rounded-xl font-semibold bg-surface border border-border hover:bg-surface-hover text-foreground-secondary hover:text-foreground text-sm transition-colors text-center"
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
