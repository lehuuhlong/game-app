'use client';

import React, { useRef, useState, type MouseEvent } from 'react';
import { motion, useMotionValue, useSpring, useTransform } from 'framer-motion';
import Link from 'next/link';
import { type GameInfo } from '@/config/games';
import { getGameSvgIcon } from './GameIcons';
import { GameVisualGraphic } from './GameVisualGraphic';
import { usePerformance } from '@/components/shared';

interface GameCard3DProps {
  game: GameInfo;
  index: number;
  featured?: boolean;
  className?: string;
}

// Estimated game durations for fast browsing decisions
const GAME_DURATIONS: Record<string, string> = {
  '2048': '3–10m',
  'caro': '5–15m',
  'minesweeper': '2–8m',
  'wordle': '3–5m',
  'sudoku': '5–20m',
  'trex': '1–5m',
  'flappybird': '1–5m',
  'wordchain': '3–10m',
  'aimtrainer': '1m',
  'battleship': '10–20m',
  'monopoly': '15–45m',
  'chess': '10–30m',
};

/**
 * High-Performance 3D/2D Adaptive Game Card for the Arcade Bento Grid.
 * Dynamically switches between hardware-accelerated 3D springs and zero-overhead CSS
 * transforms based on user device and Graphics Quality Mode.
 */
export function GameCard3D({
  game,
  index,
  featured = false,
  className = '',
}: GameCard3DProps) {
  const cardRef = useRef<HTMLDivElement | null>(null);
  const [isHovered, setIsHovered] = useState(false);
  const { graphicsMode, isLowPowerDevice } = usePerformance();

  // Enable 3D tilt tracking only on high-power desktop devices
  const enable3DTilt = graphicsMode === 'high' && !isLowPowerDevice;

  // Raw mouse coordinates normalized [0, 1]
  const mouseX = useMotionValue(0.5);
  const mouseY = useMotionValue(0.5);

  const springConfig = { stiffness: 220, damping: 24 };

  const rawRotateX = useTransform(mouseY, [0, 1], [4, -4]);
  const rawRotateY = useTransform(mouseX, [0, 1], [-4, 4]);

  const rotateX = useSpring(rawRotateX, springConfig);
  const rotateY = useSpring(rawRotateY, springConfig);

  const handleMouseMove = (e: MouseEvent<HTMLDivElement>) => {
    if (!enable3DTilt || !cardRef.current) return;
    const rect = cardRef.current.getBoundingClientRect();
    const x = (e.clientX - rect.left) / rect.width;
    const y = (e.clientY - rect.top) / rect.height;

    mouseX.set(x);
    mouseY.set(y);
  };

  const handleMouseEnter = () => {
    setIsHovered(true);
  };

  const handleMouseLeave = () => {
    setIsHovered(false);
    if (enable3DTilt) {
      mouseX.set(0.5);
      mouseY.set(0.5);
    }
  };

  const isMultiplayer = game.maxPlayers > 1;
  const duration = GAME_DURATIONS[game.id] || '5–15m';

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: '-40px' }}
      transition={{ duration: 0.4, delay: Math.min(index * 0.04, 0.25), ease: [0.21, 0.47, 0.32, 0.98] }}
      className={`group relative ${className}`}
    >
      <motion.div
        ref={cardRef}
        onMouseMove={handleMouseMove}
        onMouseEnter={handleMouseEnter}
        onMouseLeave={handleMouseLeave}
        style={{
          rotateX: enable3DTilt ? rotateX : 0,
          rotateY: enable3DTilt ? rotateY : 0,
          transform: enable3DTilt ? undefined : isHovered ? 'translate3d(0, -4px, 0)' : 'translate3d(0, 0, 0)',
        }}
        className="relative h-full overflow-hidden rounded-2xl border border-border bg-surface/95 dark:bg-surface/90 p-6 shadow-sm transition-[border-color,box-shadow,transform] duration-200 hover:border-sky-500/50 hover:shadow-xl hover:shadow-sky-500/10"
      >
        {/* Background Accent Tint */}
        <div
          className={`pointer-events-none absolute top-0 right-0 h-40 w-40 rounded-full bg-gradient-to-br ${game.color} opacity-10 blur-2xl transition-opacity duration-300 group-hover:opacity-20`}
        />

        {featured ? (
          /* ════ FEATURED 2-COLUMN HORIZONTAL BENTO CARD ═══════════════ */
          <div className="relative z-10 flex h-full flex-col sm:flex-row items-stretch justify-between gap-6">
            {/* Left Column: Info & Details */}
            <div className="flex flex-1 flex-col justify-between space-y-4">
              <div>
                <div className="flex items-center justify-between gap-3">
                  <div className="flex items-center gap-2">
                    <span
                      className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-semibold tracking-wide ${
                        isMultiplayer
                          ? 'bg-violet-500/15 text-violet-600 dark:text-violet-400 border border-violet-500/30'
                          : 'bg-sky-500/15 text-sky-600 dark:text-sky-400 border border-sky-500/30'
                      }`}
                    >
                      <span
                        className={`h-1.5 w-1.5 rounded-full ${
                          isMultiplayer ? 'bg-violet-500 animate-pulse' : 'bg-sky-500'
                        }`}
                      />
                      <span className="font-mono">{isMultiplayer ? `${game.minPlayers}-${game.maxPlayers}P Online` : 'Solo'}</span>
                    </span>

                    <span className="rounded-md bg-background border border-border px-2 py-0.5 font-mono text-xs text-foreground-muted">
                      ⏱ {duration}
                    </span>
                  </div>

                  <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-background border border-border text-foreground-secondary group-hover:border-sky-500/40 group-hover:text-accent transition-colors">
                    {getGameSvgIcon(game.id, '', 16)}
                  </div>
                </div>

                <h3 className="mt-3 text-2xl font-black tracking-tight text-foreground group-hover:text-accent transition-colors">
                  <Link href={game.route}>{game.title}</Link>
                </h3>

                <p className="mt-2 text-sm leading-relaxed text-foreground-secondary line-clamp-3">
                  {game.description}
                </p>
              </div>

              {/* Action Buttons */}
              <div className="pt-4 border-t border-border space-y-3">
                <div className="flex flex-wrap gap-1.5">
                  {game.tags.slice(0, 3).map((tag) => (
                    <span
                      key={tag}
                      className="rounded-md bg-background border border-border px-2.5 py-1 text-xs font-medium text-foreground-secondary"
                    >
                      {tag}
                    </span>
                  ))}
                </div>

                <div className="flex items-center gap-2 pt-1">
                  <Link
                    href={game.route}
                    className="flex-1 inline-flex items-center justify-center gap-1.5 rounded-xl bg-gradient-to-r from-sky-500 to-blue-600 px-4 py-2.5 text-xs font-bold text-white shadow-md shadow-sky-500/20 transition-all hover:from-sky-400 hover:to-blue-500"
                  >
                    <svg width="13" height="13" viewBox="0 0 24 24" fill="currentColor">
                      <polygon points="5 3 19 12 5 21 5 3" />
                    </svg>
                    <span>{isMultiplayer ? 'Play Solo / AI' : 'Play Now'}</span>
                  </Link>

                  {isMultiplayer && (
                    <Link
                      href={`${game.route}?mode=multiplayer`}
                      className="flex-1 inline-flex items-center justify-center gap-1.5 rounded-xl border border-violet-500/40 bg-violet-500/10 px-4 py-2.5 text-xs font-bold text-violet-600 dark:text-violet-300 transition-all hover:bg-violet-500/20 hover:border-violet-500"
                    >
                      <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                        <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
                        <circle cx="9" cy="7" r="4" />
                        <path d="M23 21v-2a4 4 0 0 0-3-3.87" />
                        <path d="M16 3.13a4 4 0 0 1 0 7.75" />
                      </svg>
                      <span>Duel 1v1</span>
                    </Link>
                  )}
                </div>
              </div>
            </div>

            {/* Right Column: Dynamic Visual Art */}
            <div className="relative w-full sm:w-56 h-48 sm:h-auto min-h-[160px] flex-shrink-0 overflow-hidden rounded-xl border border-border/70 bg-surface-secondary/30 transition-colors duration-300 group-hover:border-sky-500/40">
              <GameVisualGraphic id={game.id} />
            </div>
          </div>
        ) : (
          /* ════ STANDARD 1-COLUMN BENTO CARD ══════════════════════════ */
          <div className="relative z-10 flex h-full flex-col justify-between space-y-4">
            <div>
              {/* Header: Tag + Icon */}
              <div className="flex items-center justify-between gap-2">
                <span
                  className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-semibold tracking-wide ${
                    isMultiplayer
                      ? 'bg-violet-500/15 text-violet-600 dark:text-violet-400 border border-violet-500/30'
                      : 'bg-sky-500/15 text-sky-600 dark:text-sky-400 border border-sky-500/30'
                  }`}
                >
                  <span
                    className={`h-1.5 w-1.5 rounded-full ${
                      isMultiplayer ? 'bg-violet-500 animate-pulse' : 'bg-sky-500'
                    }`}
                  />
                  <span className="font-mono">{isMultiplayer ? `${game.minPlayers}-${game.maxPlayers}P Online` : 'Solo'}</span>
                </span>

                <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-background border border-border text-foreground-secondary group-hover:border-sky-500/40 group-hover:text-accent transition-colors">
                  {getGameSvgIcon(game.id, '', 15)}
                </div>
              </div>

              {/* Visual Preview Graphic */}
              <div className="mt-3 relative h-32 w-full overflow-hidden rounded-xl border border-border/70 bg-surface-secondary/30 transition-colors duration-300 group-hover:border-sky-500/40">
                <GameVisualGraphic id={game.id} />
              </div>

              {/* Title & Description */}
              <div className="mt-3 flex items-baseline justify-between gap-2">
                <h3 className="text-lg font-black tracking-tight text-foreground group-hover:text-accent transition-colors">
                  <Link href={game.route}>{game.title}</Link>
                </h3>
                <span className="font-mono text-xs text-foreground-muted shrink-0">
                  ⏱ {duration}
                </span>
              </div>

              <p className="mt-1 text-xs leading-relaxed text-foreground-secondary line-clamp-2">
                {game.description}
              </p>
            </div>

            {/* Bottom Actions */}
            <div className="pt-3 border-t border-border space-y-2.5">
              <div className="flex flex-wrap gap-1">
                {game.tags.slice(0, 2).map((tag) => (
                  <span
                    key={tag}
                    className="rounded-md bg-background border border-border px-2 py-0.5 text-xs font-medium text-foreground-secondary"
                  >
                    {tag}
                  </span>
                ))}
              </div>

              <div className="flex items-center gap-1.5 pt-1">
                <Link
                  href={game.route}
                  className="flex-1 inline-flex items-center justify-center gap-1.5 rounded-xl bg-gradient-to-r from-sky-500 to-blue-600 px-3 py-2 text-xs font-bold text-white shadow-sm transition-all hover:from-sky-400 hover:to-blue-500"
                >
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor">
                    <polygon points="5 3 19 12 5 21 5 3" />
                  </svg>
                  <span>Play</span>
                </Link>

                {isMultiplayer && (
                  <Link
                    href={`${game.route}?mode=multiplayer`}
                    className="inline-flex items-center justify-center gap-1 rounded-xl border border-violet-500/40 bg-violet-500/10 px-2.5 py-2 text-xs font-bold text-violet-600 dark:text-violet-300 transition-all hover:bg-violet-500/20"
                    title="1v1 Multiplayer Duel"
                  >
                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                      <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
                      <circle cx="9" cy="7" r="4" />
                      <path d="M23 21v-2a4 4 0 0 0-3-3.87" />
                      <path d="M16 3.13a4 4 0 0 1 0 7.75" />
                    </svg>
                    <span>Duel</span>
                  </Link>
                )}
              </div>
            </div>
          </div>
        )}
      </motion.div>
    </motion.div>
  );
}

export default GameCard3D;
