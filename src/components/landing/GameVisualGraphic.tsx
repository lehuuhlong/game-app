'use client';

import React from 'react';

interface GameVisualGraphicProps {
  id: string;
  className?: string;
}

/**
 * Bespoke dynamic SVG & CSS visual graphics for all 11 games.
 * Replaces static PNG images with crisp, scalable, high-tech animated visual art.
 */
export function GameVisualGraphic({ id, className = '' }: GameVisualGraphicProps) {
  return (
    <div className={`relative flex h-full w-full items-center justify-center overflow-hidden select-none ${className}`}>
      {/* Background Matrix Grid Pattern */}
      <div className="absolute inset-0 bg-[linear-gradient(to_right,#1e293b12_1px,transparent_1px),linear-gradient(to_bottom,#1e293b12_1px,transparent_1px)] bg-[size:16px_16px] opacity-40" />

      {/* ── 1. CHESS ────────────────────────────────────────────── */}
      {id === 'chess' && (
        <div className="relative flex flex-col items-center justify-center">
          {/* Isometric Chessboard */}
          <div className="relative h-24 w-28 rounded-lg border border-slate-700 bg-slate-950/90 shadow-xl overflow-hidden [transform:rotateX(45deg)_rotateZ(-20deg)]">
            <div className="grid grid-cols-4 grid-rows-4 h-full w-full">
              {[...Array(16)].map((_, i) => {
                const isDark = (Math.floor(i / 4) + (i % 4)) % 2 === 1;
                return (
                  <div
                    key={i}
                    className={`flex items-center justify-center transition-colors ${
                      isDark ? 'bg-slate-800/80' : 'bg-slate-900/40'
                    } ${i === 5 ? 'bg-sky-500/30' : ''}`}
                  />
                );
              })}
            </div>
            {/* Active move highlight path */}
            <div className="absolute top-1/4 left-1/4 h-2 w-2 rounded-full bg-sky-400 animate-ping" />
          </div>

          {/* Floating Metallic Chess King Piece */}
          <div className="absolute -top-1 flex items-center justify-center h-12 w-12 rounded-xl bg-slate-900/90 border border-amber-500/50 text-amber-400 shadow-lg shadow-amber-500/20 backdrop-blur-md">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor">
              <path d="M12 2l1.5 2.5L16 4l-1 3.5L18 8l-2.5 2.5L16 14H8l.5-3.5L6 8l3-.5L8 4l2.5.5L12 2z" />
              <path d="M7 16h10v2H7v-2zm-1 3h12v2H6v-2z" />
            </svg>
          </div>
        </div>
      )}

      {/* ── 2. MONOPOLY ─────────────────────────────────────────── */}
      {id === 'monopoly' && (
        <div className="relative flex flex-col items-center justify-center">
          {/* Isometric Board Perimeter */}
          <div className="relative h-24 w-28 rounded-lg border border-emerald-500/40 bg-slate-950/90 shadow-xl overflow-hidden [transform:rotateX(45deg)_rotateZ(-20deg)] p-1">
            <div className="flex justify-between border-b border-emerald-500/30 pb-1">
              <div className="h-2 w-4 rounded-xs bg-rose-500/80" />
              <div className="h-2 w-4 rounded-xs bg-rose-500/80" />
              <div className="h-2 w-4 rounded-xs bg-rose-500/80" />
            </div>
            <div className="my-2 flex justify-between">
              <div className="h-4 w-2 rounded-xs bg-sky-500/80" />
              <div className="h-4 w-2 rounded-xs bg-amber-500/80" />
            </div>
            <div className="flex justify-between border-t border-emerald-500/30 pt-1">
              <div className="h-2 w-4 rounded-xs bg-emerald-500/80" />
              <div className="h-2 w-4 rounded-xs bg-emerald-500/80" />
              <div className="h-2 w-4 rounded-xs bg-emerald-500/80" />
            </div>
          </div>

          {/* Floating 3D Dice Pair */}
          <div className="absolute flex items-center gap-2">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg border border-slate-700 bg-white text-black font-black text-sm shadow-xl [transform:rotate(-8deg)]">
              ⚅
            </div>
            <div className="flex h-9 w-9 items-center justify-center rounded-lg border border-amber-500/60 bg-amber-400 text-amber-950 font-black text-sm shadow-xl [transform:rotate(12deg)]">
              ⚂
            </div>
          </div>
        </div>
      )}

      {/* ── 3. CARO (GOMOKU) ─────────────────────────────────────── */}
      {id === 'caro' && (
        <div className="relative flex items-center justify-center">
          {/* Tactical 5-in-a-row Grid */}
          <div className="grid grid-cols-4 grid-rows-3 gap-2 p-3 rounded-xl border border-violet-500/30 bg-slate-950/80 backdrop-blur-md">
            {/* Row 1 */}
            <div className="flex h-7 w-7 items-center justify-center rounded-lg border border-violet-500/40 bg-violet-500/10 text-violet-400 font-bold text-xs">
              ✕
            </div>
            <div className="flex h-7 w-7 items-center justify-center rounded-lg border border-sky-500/40 bg-sky-500/10 text-sky-400 font-bold text-xs">
              ○
            </div>
            <div className="flex h-7 w-7 items-center justify-center rounded-lg border border-violet-500/40 bg-violet-500/10 text-violet-400 font-bold text-xs">
              ✕
            </div>
            <div className="flex h-7 w-7 items-center justify-center rounded-lg border border-slate-800 bg-slate-900/40" />

            {/* Row 2 (Winning 5-strike alignment) */}
            <div className="flex h-7 w-7 items-center justify-center rounded-lg border border-sky-500/40 bg-sky-500/10 text-sky-400 font-bold text-xs">
              ○
            </div>
            <div className="flex h-7 w-7 items-center justify-center rounded-lg border border-violet-500/80 bg-violet-500/30 text-violet-300 font-bold text-xs shadow-md shadow-violet-500/30 animate-pulse">
              ✕
            </div>
            <div className="flex h-7 w-7 items-center justify-center rounded-lg border border-violet-500/80 bg-violet-500/30 text-violet-300 font-bold text-xs shadow-md shadow-violet-500/30 animate-pulse">
              ✕
            </div>
            <div className="flex h-7 w-7 items-center justify-center rounded-lg border border-violet-500/80 bg-violet-500/30 text-violet-300 font-bold text-xs shadow-md shadow-violet-500/30 animate-pulse">
              ✕
            </div>

            {/* Row 3 */}
            <div className="flex h-7 w-7 items-center justify-center rounded-lg border border-slate-800 bg-slate-900/40" />
            <div className="flex h-7 w-7 items-center justify-center rounded-lg border border-sky-500/40 bg-sky-500/10 text-sky-400 font-bold text-xs">
              ○
            </div>
            <div className="flex h-7 w-7 items-center justify-center rounded-lg border border-slate-800 bg-slate-900/40" />
            <div className="flex h-7 w-7 items-center justify-center rounded-lg border border-sky-500/40 bg-sky-500/10 text-sky-400 font-bold text-xs">
              ○
            </div>
          </div>
        </div>
      )}

      {/* ── 4. BATTLESHIP ────────────────────────────────────────── */}
      {id === 'battleship' && (
        <div className="relative flex items-center justify-center">
          {/* Sonar Radar Circle */}
          <div className="relative flex items-center justify-center h-28 w-28 rounded-full border border-sky-500/40 bg-slate-950/80 p-2 overflow-hidden shadow-lg shadow-sky-500/10">
            <div className="h-16 w-16 rounded-full border border-sky-500/30" />
            <div className="absolute h-8 w-8 rounded-full border border-sky-500/20" />
            {/* Rotating Radar Sweep */}
            <div className="absolute inset-0 rounded-full bg-[conic-gradient(from_0deg,transparent_0_300deg,rgba(56,189,248,0.35)_360deg)] animate-[spin_4s_linear_infinite]" />
            {/* Fleet Targets (Hits & Pings) */}
            <div className="absolute top-5 right-7 h-2 w-2 rounded-full bg-rose-500 shadow-sm shadow-rose-500 animate-ping" />
            <div className="absolute bottom-6 left-7 h-2 w-2 rounded-full bg-sky-400 animate-pulse" />
            {/* Tactical Crosshair */}
            <div className="absolute top-0 bottom-0 w-px bg-sky-500/30" />
            <div className="absolute left-0 right-0 h-px bg-sky-500/30" />
          </div>
        </div>
      )}

      {/* ── 5. 2048 ─────────────────────────────────────────────── */}
      {id === '2048' && (
        <div className="relative flex items-center justify-center">
          {/* 2x2 Grid with 2048 Tile */}
          <div className="grid grid-cols-2 gap-2 p-2.5 rounded-xl border border-amber-500/40 bg-slate-950/80 shadow-lg">
            <div className="flex h-11 w-11 items-center justify-center rounded-lg bg-amber-500/20 border border-amber-500/40 text-amber-300 font-mono font-bold text-xs">
              512
            </div>
            <div className="flex h-11 w-11 items-center justify-center rounded-lg bg-orange-500/20 border border-orange-500/40 text-orange-300 font-mono font-bold text-xs">
              1024
            </div>
            <div className="flex h-11 w-11 items-center justify-center rounded-lg bg-slate-800/80 text-slate-400 font-mono font-bold text-xs">
              256
            </div>
            <div className="flex h-11 w-11 items-center justify-center rounded-lg bg-gradient-to-br from-amber-400 to-orange-500 text-amber-950 font-mono font-black text-xs shadow-md shadow-amber-500/30 animate-pulse">
              2048
            </div>
          </div>
        </div>
      )}

      {/* ── 6. WORDLE ───────────────────────────────────────────── */}
      {id === 'wordle' && (
        <div className="relative flex flex-col gap-1.5 items-center justify-center">
          {/* Row 1: Validated 5-letter tiles */}
          <div className="flex gap-1.5">
            {['P', 'L', 'A', 'Y', 'S'].map((char, i) => (
              <div
                key={i}
                className={`flex h-8 w-8 items-center justify-center rounded-md font-mono font-black text-xs text-white shadow-xs ${
                  i === 0 || i === 2 || i === 4
                    ? 'bg-emerald-600 border border-emerald-400/50'
                    : i === 1
                    ? 'bg-amber-600 border border-amber-400/50'
                    : 'bg-slate-800 border border-slate-700 text-slate-400'
                }`}
              >
                {char}
              </div>
            ))}
          </div>
          {/* Row 2: Secondary Guess */}
          <div className="flex gap-1.5 opacity-60">
            {['G', 'A', 'M', 'E', 'S'].map((char, i) => (
              <div
                key={i}
                className={`flex h-7 w-7 items-center justify-center rounded-md font-mono font-bold text-xs text-white ${
                  i === 1 || i === 4
                    ? 'bg-emerald-600'
                    : 'bg-slate-800 border border-slate-700 text-slate-400'
                }`}
              >
                {char}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ── 7. AIM TRAINER ───────────────────────────────────────── */}
      {id === 'aimtrainer' && (
        <div className="relative flex items-center justify-center">
          {/* Bullseye Target & Crosshair */}
          <div className="relative flex items-center justify-center h-28 w-28 rounded-full border border-rose-500/40 bg-slate-950/80 p-2 shadow-lg shadow-rose-500/10">
            {/* Outer Target Ring */}
            <div className="h-20 w-20 rounded-full border border-dashed border-rose-500/50 animate-[spin_10s_linear_infinite]" />
            <div className="absolute h-12 w-12 rounded-full border border-rose-500/70" />
            <div className="absolute h-4 w-4 rounded-full bg-rose-500 shadow-md shadow-rose-500 animate-ping" />
            <div className="absolute h-2 w-2 rounded-full bg-white" />
            {/* Precision Crosshairs */}
            <div className="absolute top-0 bottom-0 w-px bg-rose-500/40" />
            <div className="absolute left-0 right-0 h-px bg-rose-500/40" />
            {/* Accuracy Badge */}
            <div className="absolute bottom-1 right-1 rounded bg-slate-900/90 border border-rose-500/40 px-1.5 py-0.5 font-mono text-xs font-bold text-rose-400">
              99.4%
            </div>
          </div>
        </div>
      )}

      {/* ── 8. MINESWEEPER ──────────────────────────────────────── */}
      {id === 'minesweeper' && (
        <div className="relative flex items-center justify-center">
          <div className="grid grid-cols-3 grid-rows-3 gap-1.5 p-2.5 rounded-xl border border-emerald-500/30 bg-slate-950/80 shadow-lg">
            <div className="flex h-8 w-8 items-center justify-center rounded bg-slate-900 border border-slate-800 text-sky-400 font-mono font-black text-xs">
              1
            </div>
            <div className="flex h-8 w-8 items-center justify-center rounded bg-slate-900 border border-slate-800 text-emerald-400 font-mono font-black text-xs">
              2
            </div>
            <div className="flex h-8 w-8 items-center justify-center rounded bg-slate-900 border border-slate-800 text-rose-400 font-mono font-black text-xs">
              3
            </div>
            <div className="flex h-8 w-8 items-center justify-center rounded bg-slate-900 border border-slate-800 text-sky-400 font-mono font-black text-xs">
              1
            </div>
            <div className="flex h-8 w-8 items-center justify-center rounded bg-rose-500/20 border border-rose-500/60 text-rose-400 font-mono font-black text-xs animate-pulse">
              💣
            </div>
            <div className="flex h-8 w-8 items-center justify-center rounded bg-amber-500/20 border border-amber-500/50 text-amber-400 font-mono font-black text-xs">
              🚩
            </div>
            <div className="flex h-8 w-8 items-center justify-center rounded bg-slate-900 border border-slate-800 text-slate-500 font-mono text-xs">
              0
            </div>
            <div className="flex h-8 w-8 items-center justify-center rounded bg-slate-900 border border-slate-800 text-sky-400 font-mono font-black text-xs">
              1
            </div>
            <div className="flex h-8 w-8 items-center justify-center rounded bg-slate-900 border border-slate-800 text-slate-500 font-mono text-xs">
              0
            </div>
          </div>
        </div>
      )}

      {/* ── 9. SUDOKU ───────────────────────────────────────────── */}
      {id === 'sudoku' && (
        <div className="relative flex items-center justify-center">
          <div className="grid grid-cols-3 grid-rows-3 gap-1.5 p-2.5 rounded-xl border border-sky-500/40 bg-slate-950/80 shadow-lg">
            {['5', '3', ' ', '6', ' ', ' ', ' ', '9', '8'].map((num, i) => (
              <div
                key={i}
                className={`flex h-8 w-8 items-center justify-center rounded font-mono font-bold text-xs ${
                  num !== ' '
                    ? 'bg-sky-500/15 border border-sky-500/40 text-sky-300'
                    : 'bg-slate-900 border border-slate-800 text-transparent'
                }`}
              >
                {num}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ── 10. T-REX RUNNER ────────────────────────────────────── */}
      {id === 'trex' && (
        <div className="relative flex flex-col items-center justify-center h-28 w-48">
          {/* Running Dinosaur & Jumping Obstacle */}
          <div className="relative flex items-end justify-between w-full px-6 mb-1">
            {/* T-Rex Pixel Silhouette */}
            <div className="flex flex-col items-center text-emerald-400 font-mono text-xl animate-pulse">
              🦖
            </div>
            {/* Approaching Cactus */}
            <div className="flex items-center text-slate-400 font-mono text-sm">
              🌵
            </div>
          </div>
          {/* Ground Track Line */}
          <div className="w-full h-0.5 bg-slate-700 border-b border-dashed border-emerald-500/40" />
          {/* High Score HUD */}
          <div className="mt-2 flex items-center gap-3 font-mono text-xs text-slate-500">
            <span>HI 04820</span>
            <span className="text-emerald-400 font-bold">01290</span>
          </div>
        </div>
      )}

      {/* ── 11. WORD CHAIN ──────────────────────────────────────── */}
      {id === 'wordchain' && (
        <div className="relative flex items-center justify-center gap-2">
          {/* Word Token 1 */}
          <div className="flex items-center gap-1 rounded-lg border border-teal-500/50 bg-teal-500/10 px-2.5 py-1.5 font-mono text-xs font-bold text-teal-300 shadow-md">
            <span>W</span>
            <span>O</span>
            <span>R</span>
            <span className="text-amber-400 underline font-black">D</span>
          </div>

          {/* Linking Laser Arrow */}
          <div className="flex items-center text-amber-400 font-black text-xs animate-pulse">
            →
          </div>

          {/* Word Token 2 */}
          <div className="flex items-center gap-1 rounded-lg border border-amber-500/50 bg-amber-500/10 px-2.5 py-1.5 font-mono text-xs font-bold text-amber-300 shadow-md">
            <span className="text-amber-400 underline font-black">D</span>
            <span>U</span>
            <span>E</span>
            <span>L</span>
          </div>
        </div>
      )}
    </div>
  );
}

export default GameVisualGraphic;
