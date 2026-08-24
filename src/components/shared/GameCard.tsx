'use client';

import React from 'react';
import Link from 'next/link';
import { motion } from 'framer-motion';
import type { GameInfo } from '@/config/games';

export interface GameMeta {
  duration: string;
  difficulty: 'Beginner' | 'Medium' | 'Expert' | 'Master';
  difficultyColor: string;
  badge?: '🔥 Hot' | '⚡ 1v1 Duel' | '🏆 Classic' | '🎯 Daily';
}

export const GAME_METAS: Record<string, GameMeta> = {
  chess: {
    duration: '10-30m',
    difficulty: 'Master',
    difficultyColor: 'text-amber-600 dark:text-amber-400 bg-amber-500/10 border-amber-500/30',
    badge: '🔥 Hot',
  },
  caro: {
    duration: '3-10m',
    difficulty: 'Medium',
    difficultyColor: 'text-sky-600 dark:text-sky-400 bg-sky-500/10 border-sky-500/30',
    badge: '⚡ 1v1 Duel',
  },
  monopoly: {
    duration: '15-45m',
    difficulty: 'Expert',
    difficultyColor: 'text-purple-600 dark:text-purple-400 bg-purple-500/10 border-purple-500/30',
    badge: '🔥 Hot',
  },
  battleship: {
    duration: '5-15m',
    difficulty: 'Medium',
    difficultyColor: 'text-emerald-600 dark:text-emerald-400 bg-emerald-500/10 border-emerald-500/30',
    badge: '⚡ 1v1 Duel',
  },
  '2048': {
    duration: '3-8m',
    difficulty: 'Beginner',
    difficultyColor: 'text-emerald-600 dark:text-emerald-400 bg-emerald-500/10 border-emerald-500/30',
    badge: '🏆 Classic',
  },
  wordle: {
    duration: '2-5m',
    difficulty: 'Medium',
    difficultyColor: 'text-amber-600 dark:text-amber-400 bg-amber-500/10 border-amber-500/30',
    badge: '🎯 Daily',
  },
  minesweeper: {
    duration: '3-10m',
    difficulty: 'Expert',
    difficultyColor: 'text-purple-600 dark:text-purple-400 bg-purple-500/10 border-purple-500/30',
    badge: '🏆 Classic',
  },
  sudoku: {
    duration: '5-15m',
    difficulty: 'Expert',
    difficultyColor: 'text-purple-600 dark:text-purple-400 bg-purple-500/10 border-purple-500/30',
    badge: '🏆 Classic',
  },
  aimtrainer: {
    duration: '1-3m',
    difficulty: 'Beginner',
    difficultyColor: 'text-sky-600 dark:text-sky-400 bg-sky-500/10 border-sky-500/30',
  },
  trex: {
    duration: '1-5m',
    difficulty: 'Beginner',
    difficultyColor: 'text-emerald-600 dark:text-emerald-400 bg-emerald-500/10 border-emerald-500/30',
    badge: '🏆 Classic',
  },
  wordchain: {
    duration: '3-8m',
    difficulty: 'Medium',
    difficultyColor: 'text-sky-600 dark:text-sky-400 bg-sky-500/10 border-sky-500/30',
  },
};

// Map game IDs to their icon SVG content
const gameIcons: Record<string, React.ReactNode> = {
  '2048': (
    <svg width="40" height="40" viewBox="0 0 48 48" fill="none">
      <rect x="4" y="4" width="17" height="17" rx="3" fill="rgba(255,255,255,0.3)" />
      <rect x="27" y="4" width="17" height="17" rx="3" fill="rgba(255,255,255,0.5)" />
      <rect x="4" y="27" width="17" height="17" rx="3" fill="rgba(255,255,255,0.5)" />
      <rect x="27" y="27" width="17" height="17" rx="3" fill="rgba(255,255,255,0.2)" />
      <text x="12.5" y="17" textAnchor="middle" fill="white" fontSize="10" fontWeight="bold">2</text>
      <text x="35.5" y="17" textAnchor="middle" fill="white" fontSize="10" fontWeight="bold">4</text>
      <text x="12.5" y="40" textAnchor="middle" fill="white" fontSize="10" fontWeight="bold">8</text>
      <text x="35.5" y="40" textAnchor="middle" fill="white" fontSize="8" fontWeight="bold">16</text>
    </svg>
  ),
  caro: (
    <svg width="40" height="40" viewBox="0 0 48 48" fill="none">
      <line x1="16" y1="4" x2="16" y2="44" stroke="rgba(255,255,255,0.3)" strokeWidth="1.5" />
      <line x1="32" y1="4" x2="32" y2="44" stroke="rgba(255,255,255,0.3)" strokeWidth="1.5" />
      <line x1="4" y1="16" x2="44" y2="16" stroke="rgba(255,255,255,0.3)" strokeWidth="1.5" />
      <line x1="4" y1="32" x2="44" y2="32" stroke="rgba(255,255,255,0.3)" strokeWidth="1.5" />
      <line x1="6" y1="6" x2="14" y2="14" stroke="white" strokeWidth="2.5" strokeLinecap="round" />
      <line x1="14" y1="6" x2="6" y2="14" stroke="white" strokeWidth="2.5" strokeLinecap="round" />
      <circle cx="24" cy="24" r="5" stroke="white" strokeWidth="2.5" fill="none" />
      <line x1="34" y1="34" x2="42" y2="42" stroke="white" strokeWidth="2.5" strokeLinecap="round" />
      <line x1="42" y1="34" x2="34" y2="42" stroke="white" strokeWidth="2.5" strokeLinecap="round" />
    </svg>
  ),
  minesweeper: (
    <svg width="40" height="40" viewBox="0 0 48 48" fill="none">
      <circle cx="24" cy="24" r="10" fill="rgba(255,255,255,0.4)" />
      <circle cx="24" cy="24" r="6" fill="rgba(255,255,255,0.6)" />
      <circle cx="22" cy="22" r="2" fill="white" />
      <line x1="24" y1="8" x2="24" y2="14" stroke="white" strokeWidth="2.5" strokeLinecap="round" />
      <line x1="24" y1="34" x2="24" y2="40" stroke="white" strokeWidth="2.5" strokeLinecap="round" />
      <line x1="8" y1="24" x2="14" y2="24" stroke="white" strokeWidth="2.5" strokeLinecap="round" />
      <line x1="34" y1="24" x2="40" y2="24" stroke="white" strokeWidth="2.5" strokeLinecap="round" />
    </svg>
  ),
  wordle: (
    <svg width="40" height="40" viewBox="0 0 48 48" fill="none">
      <rect x="3" y="14" width="12" height="12" rx="2" fill="rgba(255,255,255,0.5)" />
      <rect x="18" y="14" width="12" height="12" rx="2" fill="rgba(255,255,255,0.3)" />
      <rect x="33" y="14" width="12" height="12" rx="2" fill="rgba(255,255,255,0.5)" />
      <text x="9" y="24" textAnchor="middle" fill="white" fontSize="9" fontWeight="bold">W</text>
      <text x="24" y="24" textAnchor="middle" fill="white" fontSize="9" fontWeight="bold">O</text>
      <text x="39" y="24" textAnchor="middle" fill="white" fontSize="9" fontWeight="bold">R</text>
    </svg>
  ),
  sudoku: (
    <svg width="40" height="40" viewBox="0 0 48 48" fill="none">
      <line x1="16" y1="4" x2="16" y2="44" stroke="rgba(255,255,255,0.3)" strokeWidth="1.5" />
      <line x1="32" y1="4" x2="32" y2="44" stroke="rgba(255,255,255,0.3)" strokeWidth="1.5" />
      <line x1="4" y1="16" x2="44" y2="16" stroke="rgba(255,255,255,0.3)" strokeWidth="1.5" />
      <line x1="4" y1="32" x2="44" y2="32" stroke="rgba(255,255,255,0.3)" strokeWidth="1.5" />
      <text x="10" y="14" textAnchor="middle" fill="white" fontSize="9" fontWeight="bold">5</text>
      <text x="24" y="14" textAnchor="middle" fill="white" fontSize="9" fontWeight="bold">3</text>
      <text x="38" y="14" textAnchor="middle" fill="white" fontSize="9" fontWeight="bold">7</text>
    </svg>
  ),
  trex: (
    <svg width="40" height="40" viewBox="0 0 48 48" fill="none">
      <rect x="18" y="10" width="14" height="18" rx="2" fill="rgba(255,255,255,0.5)" />
      <rect x="22" y="4" width="14" height="10" rx="2" fill="rgba(255,255,255,0.6)" />
      <rect x="32" y="7" width="3" height="3" rx="1" fill="white" />
      <line x1="4" y1="40" x2="44" y2="40" stroke="rgba(255,255,255,0.3)" strokeWidth="2" />
    </svg>
  ),
  wordchain: (
    <svg width="40" height="40" viewBox="0 0 48 48" fill="none">
      <path d="M14 28 C8 28 8 20 14 20 L20 20 C26 20 26 28 20 28 Z" stroke="rgba(255,255,255,0.8)" strokeWidth="2.5" strokeLinecap="round" />
      <path d="M28 28 C34 28 34 20 28 20 L22 20 C16 20 16 28 22 28 Z" stroke="rgba(255,255,255,0.4)" strokeWidth="2.5" strokeLinecap="round" />
      <text x="17" y="27" textAnchor="middle" fill="white" fontSize="9" fontWeight="bold">W</text>
    </svg>
  ),
  aimtrainer: (
    <svg width="40" height="40" viewBox="0 0 48 48" fill="none">
      <circle cx="24" cy="24" r="16" stroke="rgba(255,255,255,0.2)" strokeWidth="1" />
      <circle cx="24" cy="24" r="10" stroke="rgba(255,255,255,0.4)" strokeWidth="1" />
      <circle cx="24" cy="24" r="4" fill="rgba(255,255,255,0.6)" />
      <line x1="24" y1="4" x2="24" y2="44" stroke="white" strokeWidth="1.5" strokeLinecap="round" />
      <line x1="4" y1="24" x2="44" y2="24" stroke="white" strokeWidth="1.5" strokeLinecap="round" />
    </svg>
  ),
  battleship: (
    <svg width="40" height="40" viewBox="0 0 48 48" fill="none">
      <path d="M8 32 L40 32 L36 40 L12 40 Z" fill="rgba(255,255,255,0.6)" />
      <rect x="18" y="24" width="12" height="8" rx="1" fill="rgba(255,255,255,0.4)" />
      <path d="M4 36 Q12 34 20 36 T36 36 T44 36" stroke="rgba(255,255,255,0.4)" strokeWidth="2" strokeLinecap="round" />
    </svg>
  ),
  monopoly: (
    <svg width="40" height="40" viewBox="0 0 48 48" fill="none">
      <path d="M16 20 L16 12 C16 10 32 10 32 12 L32 20 Z" fill="rgba(255,255,255,0.7)" />
      <ellipse cx="24" cy="20" rx="14" ry="3" fill="rgba(255,255,255,0.9)" />
      <text x="24" y="38" textAnchor="middle" fill="white" fontSize="12" fontWeight="extrabold">$</text>
    </svg>
  ),
  chess: (
    <svg width="40" height="40" viewBox="0 0 48 48" fill="none">
      <line x1="24" y1="6" x2="24" y2="12" stroke="white" strokeWidth="2" strokeLinecap="round" />
      <line x1="21" y1="8" x2="27" y2="8" stroke="white" strokeWidth="2" strokeLinecap="round" />
      <path d="M16 18 C16 14 32 14 32 18 C30 24 28 28 30 34 L18 34 C20 28 18 24 16 18 Z" fill="rgba(255,255,255,0.6)" stroke="white" strokeWidth="1.5" />
      <path d="M12 36 L36 36 L38 42 L10 42 Z" fill="rgba(255,255,255,0.8)" stroke="white" strokeWidth="1.5" />
    </svg>
  ),
};

interface GameCardProps {
  game: GameInfo;
  index: number;
  viewMode?: 'grid' | 'list';
}

export function GameCard({ game, index, viewMode = 'grid' }: GameCardProps) {
  const isMultiplayer = game.maxPlayers > 1;
  const meta = GAME_METAS[game.id] || {
    duration: '3-10m',
    difficulty: 'Medium',
    difficultyColor: 'text-sky-600 dark:text-sky-400 bg-sky-500/10 border-sky-500/30',
  };

  /* ═════════════════════════════════════════════════════════════════════
     COMPACT LIST VIEW MODE (High-density table card)
  ═════════════════════════════════════════════════════════════════════ */
  if (viewMode === 'list') {
    return (
      <motion.div
        initial={{ opacity: 0, y: 15 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.35, delay: index * 0.04 }}
        className="group relative overflow-hidden rounded-2xl border border-border bg-surface p-4 backdrop-blur-xl transition-all duration-200 hover:border-accent/40 hover:bg-surface-hover hover:shadow-md"
      >
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          {/* Left: Icon & Game Metadata */}
          <div className="flex items-center gap-4 min-w-0">
            <div
              className={`relative flex h-14 w-14 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br ${game.color} p-2 shadow-sm`}
            >
              {gameIcons[game.id] || (
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2">
                  <rect x="3" y="3" width="18" height="18" rx="2" />
                </svg>
              )}
            </div>

            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-2">
                <Link
                  href={game.route}
                  className="font-extrabold text-base sm:text-lg text-foreground hover:text-accent transition-colors truncate"
                >
                  {game.title}
                </Link>

                {meta.badge && (
                  <span className="rounded-full bg-accent/15 border border-accent/30 px-2 py-0.5 text-xs font-bold text-accent">
                    {meta.badge}
                  </span>
                )}

                <span
                  className={`rounded-md border px-2 py-0.5 text-xs font-mono font-semibold ${meta.difficultyColor}`}
                >
                  {meta.difficulty}
                </span>

                <span className="rounded-md bg-background border border-border px-2 py-0.5 text-xs font-mono text-foreground-muted">
                  ⏱ {meta.duration}
                </span>
              </div>

              <p className="mt-1 text-xs text-foreground-secondary line-clamp-1">
                {game.description}
              </p>
            </div>
          </div>

          {/* Right: Quick Action Launchers */}
          <div className="flex items-center gap-2 shrink-0 self-end sm:self-center">
            <Link
              href={game.route}
              className="inline-flex items-center justify-center gap-1.5 rounded-xl bg-gradient-to-r from-sky-500 to-blue-600 px-4 py-2 text-xs font-bold text-white shadow-sm shadow-sky-500/20 hover:from-sky-400 hover:to-blue-500 transition-all"
            >
              <svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor">
                <polygon points="5 3 19 12 5 21 5 3" />
              </svg>
              <span>{isMultiplayer ? 'Play Solo' : 'Play Now'}</span>
            </Link>

            {isMultiplayer && (
              <Link
                href={`${game.route}?mode=multiplayer`}
                className="inline-flex items-center justify-center gap-1.5 rounded-xl border border-violet-500/40 bg-violet-500/10 px-4 py-2 text-xs font-bold text-violet-600 dark:text-violet-300 hover:bg-violet-500/20 transition-all"
              >
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
                  <circle cx="9" cy="7" r="4" />
                </svg>
                <span>Duel 1v1</span>
              </Link>
            )}
          </div>
        </div>
      </motion.div>
    );
  }

  /* ═════════════════════════════════════════════════════════════════════
     RICH 3D GRID VIEW MODE (Tactile card with gradient header)
  ═════════════════════════════════════════════════════════════════════ */
  return (
    <motion.div
      initial={{ opacity: 0, y: 25 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{
        duration: 0.45,
        delay: index * 0.08,
        ease: [0.22, 1, 0.36, 1],
      }}
      className="group relative flex flex-col justify-between overflow-hidden rounded-2xl border border-border bg-surface shadow-sm transition-all duration-300 hover:-translate-y-1 hover:border-accent/40 hover:shadow-xl"
    >
      <div>
        {/* Card Header with Graphic Gradient */}
        <div
          className={`relative h-44 bg-gradient-to-br ${game.color} p-5 flex flex-col justify-between overflow-hidden`}
        >
          {/* Ambient Background Circles */}
          <div className="absolute top-0 right-0 w-32 h-32 rounded-full bg-white/10 -translate-y-1/2 translate-x-1/2 pointer-events-none" />
          <div className="absolute bottom-0 left-0 w-24 h-24 rounded-full bg-white/10 translate-y-1/2 -translate-x-1/2 pointer-events-none" />

          {/* Top Bar: Mode Badge & Duration */}
          <div className="relative z-10 flex items-center justify-between gap-2">
            <div className="flex items-center gap-1.5">
              <span
                className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-bold tracking-wide backdrop-blur-md shadow-sm ${
                  isMultiplayer
                    ? 'bg-black/40 text-violet-300 border border-violet-400/40'
                    : 'bg-black/40 text-sky-300 border border-sky-400/40'
                }`}
              >
                <span
                  className={`h-1.5 w-1.5 rounded-full ${
                    isMultiplayer ? 'bg-violet-400 animate-pulse' : 'bg-sky-400'
                  }`}
                />
                <span>{isMultiplayer ? `${game.minPlayers}-${game.maxPlayers}P Online` : 'Solo'}</span>
              </span>

              {meta.badge && (
                <span className="rounded-full bg-black/40 border border-white/20 px-2 py-0.5 text-xs font-bold text-white backdrop-blur-md">
                  {meta.badge}
                </span>
              )}
            </div>

            <span className="rounded-md bg-black/40 border border-white/15 px-2 py-0.5 font-mono text-xs font-medium text-white backdrop-blur-md">
              ⏱ {meta.duration}
            </span>
          </div>

          {/* Center: Glowing SVG Graphic Icon */}
          <div className="relative z-10 flex items-center justify-between">
            <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-black/40 backdrop-blur-md border border-white/20 shadow-lg transition-transform duration-300 group-hover:scale-110 group-hover:rotate-2">
              {gameIcons[game.id] || (
                <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2">
                  <rect x="3" y="3" width="18" height="18" rx="2" />
                </svg>
              )}
            </div>

            <span className="rounded-lg bg-black/40 border border-white/20 px-2.5 py-1 text-xs font-mono font-semibold text-white backdrop-blur-md">
              {meta.difficulty}
            </span>
          </div>
        </div>

        {/* Card Body */}
        <div className="p-5">
          <h3 className="text-xl font-black text-foreground tracking-tight group-hover:text-accent transition-colors">
            <Link href={game.route}>{game.title}</Link>
          </h3>

          <p className="mt-1.5 text-xs sm:text-sm text-foreground-secondary leading-relaxed line-clamp-2">
            {game.description}
          </p>

          {/* Tags */}
          <div className="mt-4 flex flex-wrap gap-1.5">
            {game.tags.slice(0, 3).map((tag) => (
              <span
                key={tag}
                className="rounded-md bg-background border border-border px-2 py-0.5 text-xs font-medium text-foreground-secondary"
              >
                {tag}
              </span>
            ))}
          </div>
        </div>
      </div>

      {/* Card Action Footer */}
      <div className="p-5 pt-0 border-t border-border mt-2 flex items-center gap-2">
        <Link
          href={game.route}
          className="flex-1 inline-flex items-center justify-center gap-1.5 rounded-xl bg-gradient-to-r from-sky-500 to-blue-600 py-2.5 text-xs font-bold text-white shadow-md shadow-sky-500/20 hover:from-sky-400 hover:to-blue-500 transition-all"
        >
          <svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor">
            <polygon points="5 3 19 12 5 21 5 3" />
          </svg>
          <span>{isMultiplayer ? 'Play Solo' : 'Play Now'}</span>
        </Link>

        {isMultiplayer && (
          <Link
            href={`${game.route}?mode=multiplayer`}
            className="flex-1 inline-flex items-center justify-center gap-1.5 rounded-xl border border-violet-500/40 bg-violet-500/10 py-2.5 text-xs font-bold text-violet-600 dark:text-violet-300 hover:bg-violet-500/20 transition-all"
          >
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
              <circle cx="9" cy="7" r="4" />
            </svg>
            <span>Duel 1v1</span>
          </Link>
        )}
      </div>
    </motion.div>
  );
}

export default GameCard;
