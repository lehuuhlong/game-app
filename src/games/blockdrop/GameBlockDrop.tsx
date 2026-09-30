"use client";

import { useEffect, useRef, useState, useMemo, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  BOARD_WIDTH,
  BOARD_HEIGHT,
  BLOCKS,
  type BlockType,
} from './constants';
import { useBlockEngine, getGhostY } from './useBlockEngine';
import { useBlockInput } from './useBlockInput';
import { LoginModal } from '@/components/auth/LoginModal';
import { useAuth } from '@/components/auth';
import { useGameSession } from '@/hooks/useGameSession';
import Link from 'next/link';

function ArrowLeftIcon({ size = 16, className = '' }: { size?: number; className?: string }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
      <line x1="19" y1="12" x2="5" y2="12" />
      <polyline points="12 19 5 12 12 5" />
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

function RotateCwIcon({ size = 16 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M21 12a9 9 0 1 1-9-9 9.75 9.75 0 0 1 6.74 2.74L21 8" />
      <path d="M21 3v5h-5" />
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

function PauseIcon({ size = 16 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor">
      <rect x="6" y="4" width="4" height="16" rx="1" />
      <rect x="14" y="4" width="4" height="16" rx="1" />
    </svg>
  );
}

function TrophyIcon({ size = 16, className = '' }: { size?: number; className?: string }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
      <path d="M6 9H4.5a2.5 2.5 0 0 1 0-5H6" />
      <path d="M18 9h1.5a2.5 2.5 0 0 0 0-5H18" />
      <path d="M4 22h16" />
      <path d="M10 14.66V17c0 .55-.47.98-.97 1.21C7.85 18.75 7 20.24 7 22" />
      <path d="M14 14.66V17c0 .55.47.98.97 1.21C16.15 18.75 17 20.24 17 22" />
      <path d="M18 2H6v7a6 6 0 0 0 12 0V2Z" />
    </svg>
  );
}

function ZapIcon({ size = 16, className = '' }: { size?: number; className?: string }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor" className={className}>
      <polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2" />
    </svg>
  );
}

function LayersIcon({ size = 16, className = '' }: { size?: number; className?: string }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
      <polygon points="12 2 2 7 12 12 22 7 12 2" />
      <polyline points="2 17 12 22 22 17" />
      <polyline points="2 12 12 17 22 12" />
    </svg>
  );
}

function ChevronLeftIcon({ size = 16 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="15 18 9 12 15 6" />
    </svg>
  );
}

function ChevronRightIcon({ size = 16 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="9 18 15 12 9 6" />
    </svg>
  );
}

function ChevronDownIcon({ size = 16 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="6 9 12 15 18 9" />
    </svg>
  );
}

function ArrowDownToLineIcon({ size = 16 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M12 17V3" />
      <path d="m6 11 6 6 6-6" />
      <path d="M19 21H5" />
    </svg>
  );
}

const STORAGE_KEY = 'retro-block-drop-high-score';

function loadLocalHighScore(): number {
  if (typeof window === 'undefined') return 0;
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

export function GameBlockDrop() {
  const { user, refreshUser } = useAuth();
  const { startSession, ensureSessionToken, getElapsedDuration } =
    useGameSession('blockdrop');

  const {
    board,
    currentPiece,
    nextPiece,
    score,
    lines,
    level,
    isGameOver,
    isPaused,
    lastClearEffect,
    moveLeft,
    moveRight,
    moveDown,
    softDrop,
    hardDrop,
    rotatePiece,
    resetGame,
    togglePause,
  } = useBlockEngine();

  // Keyboard input controller
  useBlockInput({
    moveLeft,
    moveRight,
    rotatePiece,
    softDrop,
    hardDrop,
    togglePause,
    resetGame,
    isGameOver,
    isPaused,
  });

  const [localHighScore, setLocalHighScore] = useState<number>(0);
  const [showLogin, setShowLogin] = useState(false);
  const matchSavedRef = useRef(false);
  const userScoreSavedRef = useRef(false);
  const wasPlayingRef = useRef(false);

  // Load initial high score
  useEffect(() => {
    setLocalHighScore(loadLocalHighScore());
  }, []);

  // Update high score locally when score surpasses it
  useEffect(() => {
    if (score > localHighScore) {
      setLocalHighScore(score);
      saveLocalHighScore(score);
    }
  }, [score, localHighScore]);

  // Session start on mount
  useEffect(() => {
    startSession(user?.id, user?.username);
  }, [startSession, user?.id, user?.username]);

  // Restart session when resetting after game over
  useEffect(() => {
    if (!isGameOver && wasPlayingRef.current) {
      matchSavedRef.current = false;
      userScoreSavedRef.current = false;
      startSession(user?.id, user?.username, true);
    }
    wasPlayingRef.current = !isGameOver;
  }, [isGameOver, startSession, user?.id, user?.username]);

  // Submit high score to user profile & leaderboard
  const submitUserScore = useCallback(
    async (
      targetUserId: string,
      targetScore: number,
      targetLines: number,
      targetLevel: number
    ) => {
      if (userScoreSavedRef.current || !targetUserId) return;
      try {
        const sessionToken = await ensureSessionToken(targetUserId);
        const elapsed = getElapsedDuration();

        const res = await fetch(`/api/users/${targetUserId}/score`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            game: 'blockdrop',
            score: targetScore,
            lines: targetLines,
            level: targetLevel,
            sessionToken,
            duration: elapsed,
          }),
        });
        const data = await res.json();
        if (data.bestScoreBlockDrop !== undefined) {
          userScoreSavedRef.current = true;
          refreshUser({ bestScoreBlockDrop: data.bestScoreBlockDrop });
        }
      } catch (err) {
        console.error('Failed to update Block Drop score:', err);
      }
    },
    [ensureSessionToken, getElapsedDuration, refreshUser]
  );

  // Show login modal prompt on Game Over if guest
  useEffect(() => {
    if (isGameOver && !user) {
      const t = setTimeout(() => setShowLogin(true), 500);
      return () => clearTimeout(t);
    }
  }, [isGameOver, user]);

  // If a guest logs in during game over, immediately save their score to profile & leaderboard
  useEffect(() => {
    if (isGameOver && user?.id && !userScoreSavedRef.current && score > 0) {
      submitUserScore(user.id, score, lines, level);
    }
  }, [isGameOver, user?.id, score, lines, level, submitUserScore]);

  // Save score & match history on Game Over
  useEffect(() => {
    if (!isGameOver) {
      matchSavedRef.current = false;
      return;
    }
    if (matchSavedRef.current) return;
    matchSavedRef.current = true;

    (async () => {
      try {
        const sessionToken = await ensureSessionToken(user?.id, user?.username);
        const elapsed = getElapsedDuration();

        // 1. Record Match History in MongoDB
        fetch('/api/matches', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            gameType: 'blockdrop',
            sessionToken,
            players: [
              {
                userId: user?.id,
                username: user ? user.username : 'Guest',
                score,
                result: score >= 1000 ? 'win' : 'loss',
              },
            ],
            duration: elapsed,
            gameData: {
              score,
              lines,
              level,
            },
          }),
        }).catch((err) => console.error('Failed to save Block Drop match:', err));

        // 2. Save high score to user profile if logged in
        if (user?.id) {
          submitUserScore(user.id, score, lines, level);
        }
      } catch (err) {
        console.error('Match session save error:', err);
      }
    })();
  }, [
    isGameOver,
    score,
    lines,
    level,
    user?.id,
    user?.username,
    ensureSessionToken,
    getElapsedDuration,
    submitUserScore,
  ]);

  const displayHighScore = user
    ? Math.max(user.bestScoreBlockDrop || 0, localHighScore)
    : localHighScore;

  // Calculate ghost landing position
  const ghostY = useMemo(() => {
    return currentPiece ? getGhostY(board, currentPiece) : 0;
  }, [board, currentPiece]);

  // Next piece preview matrix (normalized to 4x4 box for alignment)
  const nextPieceDef = BLOCKS[nextPiece];

  return (
    <>
      {showLogin && (
        <LoginModal
          title="Lưu điểm kỷ lục!"
          subtitle={`Tuyệt vời! Bạn đã đạt ${score.toLocaleString()} điểm và phá ${lines} hàng gạch! Đăng nhập ngay để lưu điểm lên Bảng xếp hạng toàn cầu.`}
          onSuccess={() => setShowLogin(false)}
          onClose={() => setShowLogin(false)}
        />
      )}

      <div className="flex flex-col items-center gap-6 w-full max-w-4xl mx-auto select-none py-2 px-3 sm:px-4">
        {/* ── Header ────────────────────────────────────────── */}
        <div className="w-full flex items-center justify-between">
          <Link
            href="/games"
            className="inline-flex items-center gap-2 text-xs font-semibold text-foreground-secondary hover:text-foreground transition-colors group px-3 py-1.5 rounded-lg border border-border bg-surface"
          >
            <ArrowLeftIcon
              size={14}
              className="group-hover:-translate-x-0.5 transition-transform"
            />
            <span>All Games</span>
          </Link>

          <div className="flex items-center gap-2">
            <button
              onClick={togglePause}
              disabled={isGameOver}
              aria-label={isPaused ? 'Resume Game' : 'Pause Game'}
              className="p-2 rounded-xl border border-border bg-surface hover:bg-surface-hover text-foreground-secondary hover:text-foreground transition-all active:scale-95 disabled:opacity-40 cursor-pointer shadow-xs"
            >
              {isPaused ? <PlayIcon size={16} /> : <PauseIcon size={16} />}
            </button>
            <button
              onClick={resetGame}
              aria-label="Restart Game"
              className="p-2 rounded-xl border border-border bg-surface hover:bg-surface-hover text-foreground-secondary hover:text-foreground transition-all active:scale-95 cursor-pointer shadow-xs"
            >
              <RotateCcwIcon size={16} />
            </button>
          </div>
        </div>

        {/* ── Main Layout: Side Panel | Game Board | Side Panel ──────────────── */}
        <div className="w-full flex flex-col md:flex-row items-center md:items-start justify-center gap-5 sm:gap-8">
          {/* Left Panel: Score, Level, Lines */}
          <div className="w-full md:w-44 flex flex-row md:flex-col gap-3 justify-center">
            {/* Score Card */}
            <div className="flex-1 md:flex-none flex flex-col items-center md:items-start rounded-2xl border border-border bg-surface/90 backdrop-blur-md p-3.5 shadow-sm">
              <div className="flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wider text-foreground-muted mb-1">
                <TrophyIcon size={13} className="text-amber-500" />
                <span>Score</span>
              </div>
              <span className="text-2xl sm:text-3xl font-black text-foreground tabular-nums tracking-tight">
                {score.toLocaleString()}
              </span>
              <div className="text-[10px] text-foreground-muted mt-1">
                Best:{' '}
                <span className="font-bold text-accent tabular-nums">
                  {displayHighScore.toLocaleString()}
                </span>
              </div>
            </div>

            {/* Level Card */}
            <div className="flex-1 md:flex-none flex flex-col items-center md:items-start rounded-2xl border border-border bg-surface/90 backdrop-blur-md p-3.5 shadow-sm">
              <div className="flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wider text-foreground-muted mb-1">
                <ZapIcon size={13} className="text-cyan-500" />
                <span>Level</span>
              </div>
              <span className="text-2xl sm:text-3xl font-black text-cyan-400 tabular-nums tracking-tight">
                {level}
              </span>
              <div className="text-[10px] text-foreground-muted mt-1">
                Speed: {Math.max(1, Math.min(15, level))}x
              </div>
            </div>

            {/* Lines Card */}
            <div className="flex-1 md:flex-none flex flex-col items-center md:items-start rounded-2xl border border-border bg-surface/90 backdrop-blur-md p-3.5 shadow-sm">
              <div className="flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wider text-foreground-muted mb-1">
                <LayersIcon size={13} className="text-emerald-500" />
                <span>Lines</span>
              </div>
              <span className="text-2xl sm:text-3xl font-black text-emerald-400 tabular-nums tracking-tight">
                {lines}
              </span>
              <div className="text-[10px] text-foreground-muted mt-1">
                To Next: {10 - (lines % 10)}
              </div>
            </div>
          </div>

          {/* Center: The Retro Grid Board */}
          <div className="relative flex flex-col items-center">
            {/* Board Frame */}
            <div
              className="relative p-2 rounded-2xl border-4 border-slate-700/80 dark:border-slate-800 bg-slate-950 shadow-2xl overflow-hidden"
              style={{
                boxShadow:
                  '0 20px 50px -10px rgba(0,0,0,0.7), inset 0 0 20px rgba(0,0,0,0.8)',
              }}
            >
              {/* Line Clear Flash & Reward Toast Effect */}
              <AnimatePresence>
                {lastClearEffect && (
                  <>
                    <motion.div
                      key={`flash-${lastClearEffect.timestamp}`}
                      initial={{ opacity: 0.35 }}
                      animate={{ opacity: 0 }}
                      exit={{ opacity: 0 }}
                      transition={{ duration: 0.35, ease: 'easeOut' }}
                      className="absolute inset-0 rounded-xl bg-gradient-to-b from-cyan-400/20 via-white/30 to-blue-500/20 z-20 pointer-events-none"
                    />
                    <motion.div
                      key={`popup-${lastClearEffect.timestamp}`}
                      initial={{ opacity: 0, scale: 0.8, y: 15 }}
                      animate={{ opacity: 1, scale: 1.05, y: 0 }}
                      exit={{ opacity: 0, scale: 0.9, y: -15 }}
                      transition={{ duration: 0.35, ease: 'easeOut' }}
                      className="absolute top-1/3 left-1/2 -translate-x-1/2 z-25 pointer-events-none whitespace-nowrap"
                    >
                      <span className="px-3 py-1 rounded-full bg-slate-900/90 border border-cyan-400/60 text-cyan-300 font-black text-xs sm:text-sm tracking-wider shadow-lg shadow-cyan-500/25">
                        {lastClearEffect.lines === 4
                          ? '🔥 TETRIS CLEAR! +800'
                          : lastClearEffect.lines === 3
                          ? '✨ TRIPLE CLEAR! +500'
                          : lastClearEffect.lines === 2
                          ? '⚡ DOUBLE CLEAR! +300'
                          : '✓ LINE CLEAR! +100'}
                      </span>
                    </motion.div>
                  </>
                )}
              </AnimatePresence>

              {/* 10x20 CSS Grid */}
              <div
                className="grid grid-cols-10 grid-rows-20 gap-[2px] sm:gap-[3px] bg-slate-900/90 p-1 rounded-xl"
                style={{
                  width: 'min(78vw, 290px)',
                  height: 'min(156vw, 580px)',
                }}
              >
                {board.map((row, r) =>
                  row.map((cell, c) => {
                    let cellType: BlockType | null = null;
                    let isActive = false;
                    let isGhost = false;

                    // 1. Locked board cell
                    if (cell !== 0) {
                      cellType = cell as BlockType;
                    } else if (currentPiece) {
                      // 2. Active falling piece cell
                      const pr = r - currentPiece.y;
                      const pc = c - currentPiece.x;
                      const size = currentPiece.matrix.length;
                      if (
                        pr >= 0 &&
                        pr < size &&
                        pc >= 0 &&
                        pc < size &&
                        currentPiece.matrix[pr][pc] !== 0
                      ) {
                        cellType = currentPiece.type;
                        isActive = true;
                      } else {
                        // 3. Ghost piece cell
                        const gr = r - ghostY;
                        const gc = c - currentPiece.x;
                        if (
                          gr >= 0 &&
                          gr < size &&
                          gc >= 0 &&
                          gc < size &&
                          currentPiece.matrix[gr][gc] !== 0
                        ) {
                          cellType = currentPiece.type;
                          isGhost = true;
                        }
                      }
                    }

                    if (cellType && !isGhost) {
                      const def = BLOCKS[cellType];
                      return (
                        <div
                          key={`${r}-${c}`}
                          className="relative rounded-sm sm:rounded-[3px] transition-transform duration-75 overflow-hidden"
                          style={{
                            background: def.gradient,
                            borderColor: def.borderColor,
                            borderWidth: '1px',
                            borderStyle: 'solid',
                            boxShadow: isActive
                              ? `0 0 8px ${def.glowColor}, inset 1px 1px 1px ${def.lightHighlight}, inset -1px -1px 2px rgba(0,0,0,0.5)`
                              : `inset 1px 1px 1px ${def.lightHighlight}, inset -1px -1px 2px rgba(0,0,0,0.6)`,
                          }}
                        >
                          {/* Inner Gem Highlight */}
                          <div
                            className="absolute top-0.5 left-0.5 w-1.5 h-1.5 rounded-full opacity-70"
                            style={{ backgroundColor: def.lightHighlight }}
                          />
                        </div>
                      );
                    }

                    if (isGhost && cellType) {
                      const def = BLOCKS[cellType];
                      return (
                        <div
                          key={`${r}-${c}`}
                          className="rounded-sm sm:rounded-[3px] border border-dashed opacity-40 transition-all"
                          style={{
                            borderColor: def.borderColor,
                            backgroundColor: `${def.color}25`,
                          }}
                        />
                      );
                    }

                    // Empty grid cell with faint retro grid wireframe
                    return (
                      <div
                        key={`${r}-${c}`}
                        className="rounded-sm sm:rounded-[3px] bg-slate-950/40 border border-slate-800/30 hover:border-slate-700/40 transition-colors"
                      />
                    );
                  })
                )}
              </div>

              {/* ── Overlay: Pause ─────────────────────────────────── */}
              {isPaused && !isGameOver && (
                <div className="absolute inset-0 bg-slate-950/85 backdrop-blur-sm flex flex-col items-center justify-center p-6 text-center z-30">
                  <h2 className="text-2xl font-black text-white tracking-wider uppercase mb-2">
                    Game Paused
                  </h2>
                  <p className="text-xs text-slate-400 mb-6">
                    Take a breath. Press P or button below to resume.
                  </p>
                  <button
                    onClick={togglePause}
                    className="px-6 py-2.5 rounded-xl bg-accent hover:bg-accent-hover text-white font-bold text-sm shadow-lg transition-transform active:scale-95 cursor-pointer"
                  >
                    Resume Game
                  </button>
                </div>
              )}

              {/* ── Overlay: Game Over ──────────────────────────────── */}
              {isGameOver && (
                <div className="absolute inset-0 bg-slate-950/90 backdrop-blur-md flex flex-col items-center justify-center p-6 text-center z-30 animate-in fade-in zoom-in-95 duration-200">
                  <div className="w-12 h-12 rounded-2xl bg-rose-500/20 border border-rose-500/30 flex items-center justify-center text-rose-500 mb-3 shadow-lg">
                    <TrophyIcon size={24} />
                  </div>
                  <h2 className="text-2xl sm:text-3xl font-black text-white tracking-tight mb-1">
                    Game Over
                  </h2>
                  <p className="text-xs text-slate-400 max-w-[200px] mb-5">
                    The stack reached the top!
                  </p>

                  <div className="grid grid-cols-2 gap-2 w-full max-w-[220px] mb-6">
                    <div className="rounded-xl border border-slate-800 bg-slate-900/80 p-2.5">
                      <div className="text-[10px] text-slate-400 font-semibold uppercase">
                        Score
                      </div>
                      <div className="text-lg font-bold text-white tabular-nums">
                        {score}
                      </div>
                    </div>
                    <div className="rounded-xl border border-slate-800 bg-slate-900/80 p-2.5">
                      <div className="text-[10px] text-slate-400 font-semibold uppercase">
                        Lines
                      </div>
                      <div className="text-lg font-bold text-emerald-400 tabular-nums">
                        {lines}
                      </div>
                    </div>
                  </div>

                  {!user ? (
                    <button
                      onClick={() => setShowLogin(true)}
                      className="mb-3 px-5 py-2 rounded-xl bg-amber-500/20 border border-amber-500/40 text-amber-300 font-bold text-xs hover:bg-amber-500/30 transition-all flex items-center gap-1.5 cursor-pointer"
                    >
                      <span>⚡</span> Đăng nhập để lưu điểm kỷ lục
                    </button>
                  ) : (
                    <div className="mb-3 px-3.5 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 font-medium text-[11px] flex items-center gap-1.5">
                      <span>✓</span> Điểm đã lưu vào Bảng xếp hạng
                    </div>
                  )}

                  <div className="flex items-center gap-2.5">
                    <button
                      onClick={resetGame}
                      className="px-6 py-2.5 rounded-xl bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-white font-black text-xs uppercase tracking-wider shadow-lg shadow-cyan-500/25 transition-transform active:scale-95 cursor-pointer"
                    >
                      Chơi lại
                    </button>
                    <Link
                      href="/leaderboard"
                      className="px-4 py-2.5 rounded-xl border border-slate-700 bg-slate-900/80 hover:bg-slate-800 text-slate-300 hover:text-white font-bold text-xs transition-colors"
                    >
                      Bảng xếp hạng
                    </Link>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Right Panel: Next Piece Preview & Hotkeys */}
          <div className="w-full md:w-44 flex flex-row md:flex-col gap-3 justify-center">
            {/* Next Piece Card */}
            <div className="flex-1 md:flex-none flex flex-col items-center rounded-2xl border border-border bg-surface/90 backdrop-blur-md p-3.5 shadow-sm">
              <span className="text-[11px] font-semibold uppercase tracking-wider text-foreground-muted mb-2">
                Next Block
              </span>

              {/* 4x4 Mini Preview Matrix */}
              <div className="w-24 h-24 rounded-xl border border-border/80 bg-slate-950/80 p-2 flex items-center justify-center">
                <div
                  className="grid gap-[2px]"
                  style={{
                    gridTemplateColumns: `repeat(${nextPieceDef.matrix[0].length}, minmax(0, 1fr))`,
                  }}
                >
                  {nextPieceDef.matrix.map((row, r) =>
                    row.map((cell, c) => (
                      <div
                        key={`next-${r}-${c}`}
                        className="w-4 h-4 rounded-xs"
                        style={{
                          background:
                            cell !== 0 ? nextPieceDef.gradient : 'transparent',
                          borderColor:
                            cell !== 0
                              ? nextPieceDef.borderColor
                              : 'transparent',
                          borderWidth: cell !== 0 ? '1px' : '0px',
                          boxShadow:
                            cell !== 0
                              ? `inset 1px 1px 1px ${nextPieceDef.lightHighlight}`
                              : 'none',
                        }}
                      />
                    ))
                  )}
                </div>
              </div>
              <span className="text-[11px] font-medium text-foreground-secondary mt-2">
                {nextPieceDef.name}
              </span>
            </div>

            {/* Quick Keyboard Reference Card */}
            <div className="hidden md:flex flex-col gap-2 rounded-2xl border border-border bg-surface/90 backdrop-blur-md p-3.5 shadow-sm text-xs text-foreground-muted">
              <div className="text-[11px] font-semibold uppercase tracking-wider text-foreground-secondary">
                Controls
              </div>
              <div className="flex items-center justify-between">
                <span>Move</span>
                <span className="font-mono text-[10px] text-foreground">
                  ← → / A D
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span>Rotate</span>
                <span className="font-mono text-[10px] text-foreground">
                  ↑ / W
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span>Soft Drop</span>
                <span className="font-mono text-[10px] text-foreground">
                  ↓ / S
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span>Hard Drop</span>
                <span className="font-mono text-[10px] text-foreground">
                  Space
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span>Pause</span>
                <span className="font-mono text-[10px] text-foreground">P / Esc</span>
              </div>
            </div>
          </div>
        </div>

        {/* ── Mobile Touch Controls ─────────────────────────────────── */}
        <div className="flex md:hidden flex-col items-center gap-2 w-full max-w-sm mt-2">
          {/* Top row: Hard Drop & Rotate */}
          <div className="flex items-center justify-center gap-4 w-full">
            <button
              onClick={rotatePiece}
              aria-label="Rotate Block"
              className="flex-1 py-3 rounded-xl border border-border bg-surface active:bg-surface-hover text-foreground flex items-center justify-center gap-2 font-bold text-xs shadow-xs"
            >
              <RotateCwIcon size={16} />
              <span>Rotate</span>
            </button>
            <button
              onClick={hardDrop}
              aria-label="Hard Drop"
              className="flex-1 py-3 rounded-xl bg-accent hover:bg-accent-hover text-white flex items-center justify-center gap-2 font-bold text-xs shadow-md active:scale-95"
            >
              <ArrowDownToLineIcon size={16} />
              <span>Hard Drop</span>
            </button>
          </div>

          {/* Bottom row: Left, Down (Soft), Right */}
          <div className="flex items-center justify-center gap-3 w-full">
            <button
              onClick={moveLeft}
              aria-label="Move Left"
              className="flex-1 py-3 rounded-xl border border-border bg-surface active:bg-surface-hover text-foreground flex items-center justify-center font-bold shadow-xs"
            >
              <ChevronLeftIcon size={20} />
            </button>
            <button
              onClick={softDrop}
              aria-label="Soft Drop"
              className="flex-1 py-3 rounded-xl border border-border bg-surface active:bg-surface-hover text-foreground flex items-center justify-center font-bold shadow-xs"
            >
              <ChevronDownIcon size={20} />
            </button>
            <button
              onClick={moveRight}
              aria-label="Move Right"
              className="flex-1 py-3 rounded-xl border border-border bg-surface active:bg-surface-hover text-foreground flex items-center justify-center font-bold shadow-xs"
            >
              <ChevronRightIcon size={20} />
            </button>
          </div>
        </div>
      </div>
    </>
  );
}
