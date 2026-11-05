'use client';

import { useEffect, useState, useMemo, useRef, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useAuth } from '@/components/auth';
import { useGameSession } from '@/hooks/useGameSession';
import { Difficulty, GameMode, ToolMode, Puzzle } from './types';
import { PUZZLES } from './puzzles';
import { useNonogramEngine } from './useNonogramEngine';
import * as Sounds from './sounds';

export function GameNonogram() {
  const { user } = useAuth();
  const { startSession, ensureSessionToken, getElapsedDuration } = useGameSession('nonogram');

  const [selectedDifficulty, setSelectedDifficulty] = useState<Difficulty>('EASY');
  const [isMuted, setIsMuted] = useState(Sounds.getMuted());
  const [showRules, setShowRules] = useState(false);
  const scoreSavedRef = useRef(false);

  // Filter puzzles by selected difficulty
  const availablePuzzles = useMemo(
    () => PUZZLES.filter((p) => p.difficulty === selectedDifficulty),
    [selectedDifficulty]
  );

  const {
    currentPuzzle,
    clues,
    grid,
    toolMode,
    setToolMode,
    gameMode,
    setGameMode,
    status,
    mistakes,
    hintsUsed,
    timer,
    score,
    stars,
    completedRows,
    completedCols,
    canUndo,
    selectPuzzle,
    handlePointerDown,
    handlePointerEnter,
    handlePointerUp,
    useHint,
    undo,
    restart,
  } = useNonogramEngine(availablePuzzles[0]?.id);

  // Initialize session on mount
  useEffect(() => {
    startSession(user?.id, user?.username);
  }, [startSession, user?.id, user?.username]);

  // Restart session when status moves from READY to PLAYING
  useEffect(() => {
    if (status === 'PLAYING') {
      scoreSavedRef.current = false;
    }
  }, [status]);

  // Global pointerup to end dragging cleanly
  useEffect(() => {
    window.addEventListener('pointerup', handlePointerUp);
    return () => window.removeEventListener('pointerup', handlePointerUp);
  }, [handlePointerUp]);

  // Keyboard controls
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (['INPUT', 'TEXTAREA'].includes((e.target as HTMLElement)?.tagName)) return;

      if (e.key === '1' || e.key.toLowerCase() === 'f') {
        setToolMode('FILL');
      } else if (e.key === '2' || e.key.toLowerCase() === 'x') {
        setToolMode('CROSS');
      } else if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'z') {
        e.preventDefault();
        undo();
      } else if (e.key.toLowerCase() === 'z') {
        undo();
      } else if (e.key.toLowerCase() === 'h') {
        useHint();
      } else if (e.key.toLowerCase() === 'r') {
        restart();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [setToolMode, undo, useHint, restart]);

  // Save score and match history when puzzle is won
  useEffect(() => {
    if (status !== 'WON') return;
    if (scoreSavedRef.current) return;
    scoreSavedRef.current = true;

    (async () => {
      try {
        const sessionToken = await ensureSessionToken(user?.id, user?.username);
        const elapsed = getElapsedDuration();

        await fetch('/api/matches', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            gameType: 'nonogram',
            sessionToken,
            players: [
              {
                userId: user?.id,
                username: user?.username || 'Guest',
                score,
                result: 'win',
              },
            ],
            duration: elapsed || timer,
          }),
        });

        if (user?.id) {
          await fetch(`/api/users/${user.id}/score`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              game: 'nonogram',
              score,
              sessionToken,
            }),
          });
        }
      } catch (err) {
        console.error('Failed to submit Nonogram score:', err);
      }
    })();
  }, [status, score, user, timer, ensureSessionToken, getElapsedDuration]);

  // Toggle audio
  const toggleSound = () => {
    const next = !isMuted;
    setIsMuted(next);
    Sounds.setMuted(next);
  };

  // Next puzzle action
  const handleNextPuzzle = () => {
    const currentIndex = availablePuzzles.findIndex((p) => p.id === currentPuzzle.id);
    if (currentIndex >= 0 && currentIndex < availablePuzzles.length - 1) {
      selectPuzzle(availablePuzzles[currentIndex + 1]);
    } else {
      if (selectedDifficulty === 'EASY') {
        setSelectedDifficulty('MEDIUM');
        const nextSet = PUZZLES.filter((p) => p.difficulty === 'MEDIUM');
        if (nextSet[0]) selectPuzzle(nextSet[0]);
      } else if (selectedDifficulty === 'MEDIUM') {
        setSelectedDifficulty('HARD');
        const nextSet = PUZZLES.filter((p) => p.difficulty === 'HARD');
        if (nextSet[0]) selectPuzzle(nextSet[0]);
      } else {
        selectPuzzle(availablePuzzles[0]);
      }
    }
  };

  // Format timer MM:SS
  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  // Generous cell dimensions maximizing playfield space without overflow
  const cellSizeConfig = useMemo(() => {
    if (currentPuzzle.width === 5) {
      return {
        cellWidth: 'w-14 sm:w-16 md:w-20',
        cellHeight: 'h-14 sm:h-16 md:h-20',
        cell: 'w-14 h-14 sm:w-16 sm:h-16 md:w-20 md:h-20',
        crossSize: 'text-2xl sm:text-3xl',
        colHeaderHeight: 'h-20 sm:h-24 md:h-28',
        rowHeaderWidth: 'w-16 sm:w-20 md:w-24',
        fontSize: 'text-sm sm:text-base',
      };
    }
    if (currentPuzzle.width === 10) {
      return {
        cellWidth: 'w-8 sm:w-10 md:w-12',
        cellHeight: 'h-8 sm:h-10 md:h-12',
        cell: 'w-8 h-8 sm:w-10 sm:h-10 md:w-12 md:h-12',
        crossSize: 'text-base sm:text-xl',
        colHeaderHeight: 'h-24 sm:h-28 md:h-32',
        rowHeaderWidth: 'w-20 sm:w-24 md:w-28',
        fontSize: 'text-xs sm:text-sm',
      };
    }
    return {
      cellWidth: 'w-6 sm:w-7 md:w-8',
      cellHeight: 'h-6 sm:h-7 md:h-8',
      cell: 'w-6 h-6 sm:w-7 sm:h-7 md:w-8 md:h-8',
      crossSize: 'text-xs sm:text-sm',
      colHeaderHeight: 'h-28 sm:h-32 md:h-36',
      rowHeaderWidth: 'w-24 sm:w-28 md:w-32',
      fontSize: 'text-[10px] sm:text-xs',
    };
  }, [currentPuzzle.width]);

  return (
    <div className="flex flex-col items-center select-none w-full max-w-4xl mx-auto px-2">
      {/* ── Compact Unified Control Bar ───────────────────────────────── */}
      <div className="w-full flex flex-col gap-2.5 mb-5 p-3 sm:p-4 rounded-2xl border border-border/80 bg-surface/85 backdrop-blur-md shadow-lg">
        {/* Row 1: Title, Puzzle Dropdown, Mode Pill & Global Actions */}
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2.5">
            <span className="text-2xl">✨</span>
            <div>
              <h1 className="text-lg sm:text-xl font-extrabold tracking-tight text-foreground flex items-center gap-2">
                Neon Nonogram
                <span className="text-xs px-2 py-0.5 rounded-full bg-accent/15 text-accent border border-accent/30 font-bold hidden sm:inline-block">
                  {currentPuzzle.width}×{currentPuzzle.height}
                </span>
              </h1>
            </div>

            {/* Puzzle Selector Dropdown */}
            <select
              value={currentPuzzle.id}
              onChange={(e) => {
                const p = PUZZLES.find((item) => item.id === e.target.value);
                if (p) selectPuzzle(p);
              }}
              className="ml-1 sm:ml-2 text-xs font-bold rounded-xl border border-border bg-surface px-3 py-1.5 text-foreground hover:border-accent focus:outline-none focus:border-accent cursor-pointer shadow-xs transition-colors"
            >
              {availablePuzzles.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.icon} {p.title}
                </option>
              ))}
            </select>
          </div>

          {/* Quick Info & Header Actions */}
          <div className="flex items-center gap-2">
            {/* Mode switch */}
            <button
              onClick={() => setGameMode(gameMode === 'CLASSIC' ? 'ZEN' : 'CLASSIC')}
              className={`px-2.5 py-1 rounded-xl text-xs font-bold border transition-all cursor-pointer flex items-center gap-1 ${
                gameMode === 'CLASSIC'
                  ? 'border-rose-500/40 bg-rose-500/10 text-rose-400 hover:bg-rose-500/20'
                  : 'border-emerald-500/40 bg-emerald-500/10 text-emerald-400 hover:bg-emerald-500/20'
              }`}
              title="Switch mode: 3 Lives (Classic) or Relaxed (Zen)"
            >
              {gameMode === 'CLASSIC' ? '❤️ 3 Lives' : '🧘 Zen'}
            </button>

            {/* Rules */}
            <button
              onClick={() => setShowRules(true)}
              title="How to Play"
              className="p-1.5 sm:p-2 rounded-xl border border-border bg-surface text-foreground-secondary hover:text-foreground hover:border-border-hover transition-colors cursor-pointer"
            >
              ❓
            </button>

            {/* Sound Toggle */}
            <button
              onClick={toggleSound}
              aria-label="Toggle Sound"
              className="p-1.5 sm:p-2 rounded-xl border border-border bg-surface text-foreground-secondary hover:text-foreground hover:border-border-hover transition-colors cursor-pointer"
            >
              {isMuted ? '🔇' : '🔊'}
            </button>

            {/* Reset */}
            <button
              onClick={restart}
              title="Restart Puzzle (R)"
              className="p-1.5 sm:p-2 rounded-xl border border-border bg-surface text-foreground-secondary hover:text-foreground hover:border-border-hover transition-colors cursor-pointer"
            >
              🔄
            </button>
          </div>
        </div>

        {/* Row 2: Difficulty Tabs, Tool Toggle Pill, Timer, Mistakes & Actions */}
        <div className="flex flex-wrap items-center justify-between gap-2.5 pt-2.5 border-t border-border/60">
          {/* Difficulty Segmented Control */}
          <div className="flex items-center bg-background/80 p-0.5 rounded-xl border border-border/80">
            {(['EASY', 'MEDIUM', 'HARD'] as Difficulty[]).map((diff) => (
              <button
                key={diff}
                onClick={() => {
                  setSelectedDifficulty(diff);
                  const firstInDiff = PUZZLES.find((p) => p.difficulty === diff);
                  if (firstInDiff) selectPuzzle(firstInDiff);
                }}
                className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                  selectedDifficulty === diff
                    ? 'bg-accent text-white shadow-xs'
                    : 'text-foreground-secondary hover:text-foreground'
                }`}
              >
                {diff === 'EASY' ? '5×5 Easy' : diff === 'MEDIUM' ? '10×10 Medium' : '15×15 Hard'}
              </button>
            ))}
          </div>

          {/* Central Ergonomic Tool Switcher (Compact Floating Capsule) */}
          <div className="flex items-center bg-background/90 p-1 rounded-xl border border-border/90 shadow-inner gap-1">
            <button
              onClick={() => setToolMode('FILL')}
              className={`py-1.5 px-3 rounded-lg text-xs font-black flex items-center gap-1.5 transition-all cursor-pointer ${
                toolMode === 'FILL'
                  ? 'bg-accent text-white shadow-md shadow-accent/30 scale-[1.02]'
                  : 'text-foreground-secondary hover:text-foreground'
              }`}
            >
              <span>✏️</span>
              <span>Fill (1)</span>
            </button>

            <button
              onClick={() => setToolMode('CROSS')}
              className={`py-1.5 px-3 rounded-lg text-xs font-black flex items-center gap-1.5 transition-all cursor-pointer ${
                toolMode === 'CROSS'
                  ? 'bg-rose-500 text-white shadow-md shadow-rose-500/30 scale-[1.02]'
                  : 'text-foreground-secondary hover:text-foreground'
              }`}
            >
              <span>✕</span>
              <span>Mark X (2)</span>
            </button>
          </div>

          {/* Live HUD (Timer, Mistakes, Undo, Hint) */}
          <div className="flex items-center gap-2">
            {/* Timer */}
            <div className="flex items-center gap-1.5 rounded-xl border border-border/80 bg-background/60 px-2.5 py-1 shadow-xs">
              <span className="text-[11px] text-foreground-muted font-bold">⏱️</span>
              <span className="font-mono font-black text-xs text-foreground tabular-nums">
                {formatTime(timer)}
              </span>
            </div>

            {/* Mistakes / Hearts */}
            {gameMode === 'CLASSIC' && (
              <div className="flex items-center gap-1 rounded-xl border border-border/80 bg-background/60 px-2 py-1 shadow-xs">
                {[0, 1, 2].map((idx) => (
                  <span
                    key={idx}
                    className={`text-xs transition-all ${
                      idx < mistakes ? 'opacity-20 scale-75 grayscale' : 'opacity-100 scale-100'
                    }`}
                  >
                    ❤️
                  </span>
                ))}
              </div>
            )}

            {/* Undo */}
            <button
              onClick={undo}
              disabled={!canUndo || status === 'WON' || status === 'LOST'}
              title="Undo (Z)"
              className="p-1 sm:px-2 sm:py-1 rounded-xl border border-border bg-surface text-foreground-secondary hover:text-foreground disabled:opacity-30 disabled:cursor-not-allowed text-xs font-bold transition-all cursor-pointer flex items-center gap-1"
            >
              <span>↩️</span>
              <span className="hidden sm:inline">Undo</span>
            </button>

            {/* Hint */}
            <button
              onClick={useHint}
              disabled={status === 'WON' || status === 'LOST'}
              title="Reveal hint (H)"
              className="px-2.5 py-1 rounded-xl border border-amber-500/40 bg-amber-500/10 text-amber-400 hover:bg-amber-500/20 disabled:opacity-30 disabled:cursor-not-allowed text-xs font-bold transition-all cursor-pointer flex items-center gap-1"
            >
              <span>💡</span>
              <span>Hint ({hintsUsed})</span>
            </button>
          </div>
        </div>
      </div>

      {/* ── Main Expansive Nonogram Board Container ─────────────────────── */}
      <div className="w-full flex justify-center items-center overflow-x-auto py-2">
        <div className="rounded-3xl border border-border/90 bg-surface/90 backdrop-blur-xl p-4 sm:p-7 shadow-2xl flex flex-col items-center min-w-fit">
          {/* Top Row: Column Clues aligned with Grid */}
          <div className="flex">
            {/* Top-Left Corner Box (Blank) */}
            <div
              className={`${cellSizeConfig.rowHeaderWidth} ${cellSizeConfig.colHeaderHeight} flex items-end justify-end pb-2 pr-2 border-r-2 border-b-2 border-border/80 shrink-0`}
            >
              <span className="text-[10px] sm:text-xs text-foreground-muted font-extrabold uppercase tracking-wider">
                R \ C
              </span>
            </div>

            {/* Column Clues Header */}
            <div className="flex border-b-2 border-border/80">
              {clues.colClues.map((colGroup, cIdx) => {
                const isColCompleted = completedCols.has(cIdx);
                const isGroupBorder = (cIdx + 1) % 5 === 0 && cIdx + 1 < currentPuzzle.width;

                return (
                  <div
                    key={cIdx}
                    className={`flex flex-col items-center justify-end pb-1.5 sm:pb-2 ${cellSizeConfig.cellWidth} ${
                      cellSizeConfig.colHeaderHeight
                    } shrink-0 ${
                      isGroupBorder
                        ? 'border-r-2 border-accent/40'
                        : 'border-r border-border/40'
                    } ${isColCompleted ? 'opacity-35' : 'opacity-100'} transition-opacity`}
                  >
                    {colGroup.map((val, numIdx) => (
                      <span
                        key={numIdx}
                        className={`${cellSizeConfig.fontSize} font-mono font-black leading-tight ${
                          isColCompleted ? 'line-through text-foreground-muted' : 'text-foreground'
                        }`}
                      >
                        {val}
                      </span>
                    ))}
                  </div>
                );
              })}
            </div>
          </div>

          {/* Grid Rows: Row Clues + Cells */}
          {grid.map((rowArr, rIdx) => {
            const rowClueGroup = clues.rowClues[rIdx] || [0];
            const isRowCompleted = completedRows.has(rIdx);
            const isRowGroupBorder = (rIdx + 1) % 5 === 0 && rIdx + 1 < currentPuzzle.height;

            return (
              <div key={rIdx} className="flex">
                {/* Row Clue Header */}
                <div
                  className={`flex items-center justify-end gap-1 sm:gap-1.5 pr-2.5 border-r-2 border-border/80 shrink-0 ${
                    cellSizeConfig.rowHeaderWidth
                  } ${cellSizeConfig.cellHeight} ${
                    isRowGroupBorder
                      ? 'border-b-2 border-accent/40'
                      : 'border-b border-border/40'
                  } ${isRowCompleted ? 'opacity-35' : 'opacity-100'} transition-opacity`}
                >
                  {rowClueGroup.map((val, numIdx) => (
                    <span
                      key={numIdx}
                      className={`${cellSizeConfig.fontSize} font-mono font-black leading-none ${
                        isRowCompleted ? 'line-through text-foreground-muted' : 'text-foreground'
                      }`}
                    >
                      {val}
                    </span>
                  ))}
                </div>

                {/* Cells in Row */}
                <div className="flex">
                  {rowArr.map((cellState, cIdx) => {
                    const isColGroupBorder =
                      (cIdx + 1) % 5 === 0 && cIdx + 1 < currentPuzzle.width;
                    const isFilled = cellState === 1;
                    const isCrossed = cellState === 2;

                    return (
                      <div
                        key={cIdx}
                        onPointerDown={(e) => {
                          e.preventDefault();
                          handlePointerDown(rIdx, cIdx, e.button === 2);
                        }}
                        onPointerEnter={() => handlePointerEnter(rIdx, cIdx)}
                        onContextMenu={(e) => e.preventDefault()}
                        className={`relative flex items-center justify-center cursor-pointer transition-all duration-150 shrink-0 ${
                          cellSizeConfig.cell
                        } ${
                          isColGroupBorder
                            ? 'border-r-2 border-accent/40'
                            : 'border-r border-border/40'
                        } ${
                          isRowGroupBorder
                            ? 'border-b-2 border-accent/40'
                            : 'border-b border-border/40'
                        } ${
                          isFilled
                            ? 'rounded-lg z-10'
                            : 'bg-surface/20 hover:bg-surface-hover/80 active:bg-surface-hover'
                        }`}
                        style={{
                          backgroundColor: isFilled ? currentPuzzle.accentColor : undefined,
                          boxShadow: isFilled
                            ? `0 0 16px ${currentPuzzle.glowColor}, inset 0 0 8px rgba(255,255,255,0.25)`
                            : undefined,
                        }}
                      >
                        {isCrossed && (
                          <span
                            className={`${cellSizeConfig.crossSize} text-rose-400/90 font-black select-none pointer-events-none drop-shadow-sm`}
                          >
                            ✕
                          </span>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* ── Subtitle Hints ────────────────────────────────────────────── */}
      <div className="w-full flex items-center justify-between text-[11px] text-foreground-muted mt-4 px-3">
        <div className="flex items-center gap-2">
          <span>Left Click: <strong className="text-foreground-secondary">Fill / Mark</strong></span>
          <span>•</span>
          <span>Right Click: <strong className="text-foreground-secondary">Toggle Tool</strong></span>
          <span>•</span>
          <span>Click & Drag: <strong className="text-foreground-secondary">Continuous Fill</strong></span>
        </div>
        <div className="flex items-center gap-2">
          <kbd className="px-1.5 py-0.5 rounded border border-border bg-surface font-mono text-[10px]">
            1 / 2
          </kbd>
          <span>Toggle tool</span>
          <kbd className="px-1.5 py-0.5 rounded border border-border bg-surface font-mono text-[10px]">
            Z
          </kbd>
          <span>Undo</span>
        </div>
      </div>

      {/* ── Fullscreen Fixed Victory Modal (No scrollbars, perfectly centered) ────────────────────────── */}
      <AnimatePresence>
        {status === 'WON' && (
          <div className="fixed inset-0 bg-background/80 backdrop-blur-md flex items-center justify-center p-4 z-50">
            <motion.div
              initial={{ opacity: 0, scale: 0.88, y: 15 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.88, y: 15 }}
              transition={{ type: 'spring', damping: 25, stiffness: 300 }}
              className="w-full max-w-md rounded-3xl border border-border/90 bg-surface/95 backdrop-blur-2xl p-7 shadow-2xl flex flex-col items-center text-center"
            >
              {/* Glowing Pixel Art Avatar */}
              <div
                className="w-20 h-20 rounded-3xl flex items-center justify-center text-4xl mb-3 shadow-2xl animate-pulse"
                style={{
                  backgroundColor: currentPuzzle.accentColor,
                  boxShadow: `0 0 35px ${currentPuzzle.glowColor}`,
                }}
              >
                {currentPuzzle.icon}
              </div>

              <h2 className="text-2xl sm:text-3xl font-black text-foreground tracking-tight mb-1">
                {currentPuzzle.title} Solved!
              </h2>
              <p className="text-xs text-foreground-secondary mb-4 max-w-xs">
                You have successfully revealed the hidden Neon Pixel art!
              </p>

              {/* Stars Animation */}
              <div className="flex items-center gap-2 text-3xl mb-5">
                {[1, 2, 3].map((starIdx) => (
                  <span
                    key={starIdx}
                    className={`transition-transform duration-300 ${
                      starIdx <= stars ? 'text-amber-400 scale-110 drop-shadow-md' : 'text-border/60'
                    }`}
                  >
                    ★
                  </span>
                ))}
              </div>

              {/* Stats Card */}
              <div className="w-full grid grid-cols-3 gap-2.5 mb-6">
                <div className="rounded-2xl border border-border/80 bg-surface-hover/70 p-3">
                  <span className="text-[10px] uppercase font-bold text-foreground-muted block mb-1">
                    Time
                  </span>
                  <span className="text-base font-black text-foreground font-mono">
                    {formatTime(timer)}
                  </span>
                </div>

                <div className="rounded-2xl border border-border/80 bg-surface-hover/70 p-3">
                  <span className="text-[10px] uppercase font-bold text-foreground-muted block mb-1">
                    Mistakes
                  </span>
                  <span className="text-base font-black text-foreground font-mono">
                    {mistakes} / 3
                  </span>
                </div>

                <div className="rounded-2xl border border-border/80 bg-surface-hover/70 p-3">
                  <span className="text-[10px] uppercase font-bold text-foreground-muted block mb-1">
                    Score
                  </span>
                  <span className="text-base font-black text-accent tabular-nums">
                    {score}
                  </span>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="w-full flex items-center gap-3">
                <button
                  onClick={restart}
                  className="flex-1 py-3 rounded-2xl border border-border bg-surface hover:bg-surface-hover text-foreground font-bold text-sm transition-all cursor-pointer"
                >
                  Play Again
                </button>
                <button
                  onClick={handleNextPuzzle}
                  className="flex-1 py-3 rounded-2xl bg-gradient-to-r from-sky-400 via-blue-500 to-indigo-600 text-white font-bold text-sm shadow-xl shadow-blue-500/25 hover:opacity-95 active:scale-95 transition-all cursor-pointer"
                >
                  Next Puzzle ➔
                </button>
              </div>
            </motion.div>
          </div>
        )}

        {/* ── Fullscreen Fixed Game Over Modal ──────────────────────────── */}
        {status === 'LOST' && (
          <div className="fixed inset-0 bg-background/85 backdrop-blur-md flex items-center justify-center p-4 z-50">
            <motion.div
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.9 }}
              className="w-full max-w-sm rounded-3xl border border-border/90 bg-surface/95 backdrop-blur-2xl p-7 shadow-2xl flex flex-col items-center text-center"
            >
              <span className="text-5xl mb-3 animate-bounce">💥</span>
              <h3 className="text-2xl font-black text-foreground tracking-tight mb-1">
                Out of Lives!
              </h3>
              <p className="text-xs text-foreground-secondary mb-6">
                You made 3 mistakes in Classic mode. Don&apos;t give up, try again or switch to relaxed Zen mode!
              </p>

              <div className="w-full flex items-center gap-2.5">
                <button
                  onClick={() => {
                    setGameMode('ZEN');
                    restart();
                  }}
                  className="flex-1 py-3 rounded-2xl border border-emerald-500/40 bg-emerald-500/10 text-emerald-400 font-bold text-xs hover:bg-emerald-500/20 transition-all cursor-pointer"
                >
                  Zen Mode
                </button>
                <button
                  onClick={restart}
                  className="flex-1 py-3 rounded-2xl bg-accent text-white font-bold text-xs hover:bg-accent-hover active:scale-95 transition-all cursor-pointer shadow-md"
                >
                  Try Again
                </button>
              </div>
            </motion.div>
          </div>
        )}

        {/* ── Fullscreen Fixed Rules Modal ───────────────────────────────── */}
        {showRules && (
          <div className="fixed inset-0 bg-background/80 backdrop-blur-md flex items-center justify-center p-4 z-50">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="w-full max-w-md rounded-3xl border border-border bg-surface/95 backdrop-blur-xl p-6 sm:p-7 shadow-2xl"
            >
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-black text-foreground flex items-center gap-2">
                  <span>📖</span> How to Play Neon Nonogram
                </h3>
                <button
                  onClick={() => setShowRules(false)}
                  className="p-1.5 rounded-xl hover:bg-surface-hover text-foreground-muted hover:text-foreground text-sm cursor-pointer"
                >
                  ✕
                </button>
              </div>

              <div className="text-xs text-foreground-secondary space-y-3 leading-relaxed">
                <p>
                  <strong>1. Objective:</strong> Use the numbers on each row and column to deduce and illuminate the correct neon cells, revealing a hidden pixel picture.
                </p>
                <p>
                  <strong>2. Number Clues:</strong> Each number represents a consecutive run of filled cells in that row or column. For example, <code className="px-1 rounded bg-surface-hover text-accent font-mono">3 1</code> means a group of 3 filled cells, followed by at least one empty space, then 1 filled cell.
                </p>
                <p>
                  <strong>3. Mark with X:</strong> Use the <code className="px-1 rounded bg-surface-hover text-rose-400 font-mono">✕</code> tool to cross out cells that must remain empty, narrowing down your deductions.
                </p>
                <p>
                  <strong>4. Game Modes:</strong>
                  <br />• <strong>Classic:</strong> Each mistake costs 1 heart (max 3 mistakes).
                  <br />• <strong>Zen:</strong> Unlimited mistakes. Relax and solve at your own pace.
                </p>
              </div>

              <button
                onClick={() => setShowRules(false)}
                className="mt-6 w-full py-3 rounded-2xl bg-accent hover:bg-accent-hover text-white font-bold text-xs transition-colors cursor-pointer"
              >
                Got It, Let&apos;s Play!
              </button>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
