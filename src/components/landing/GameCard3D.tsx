'use client';

import React, { useRef, useState, type MouseEvent } from 'react';
import { motion, useMotionValue, useSpring, useTransform } from 'framer-motion';
import Link from 'next/link';
import { type GameInfo } from '@/config/games';
import { getGameSvgIcon } from './GameIcons';
import { GameVisualGraphic } from './GameVisualGraphic';

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
  'wordchain': '3–10m',
  'aimtrainer': '1m',
  'battleship': '10–20m',
  'monopoly': '15–45m',
  'chess': '10–30m',
};

/**
 * 3D Tilt Game Card for the Arcade Bento Grid.
 * Powered by dynamic vector & styled visual graphics (GameVisualGraphic)
 * with dual action triggers (Instant Play / 1v1 Duel) and stable tabular metrics.
 */
export function GameCard3D({
  game,
  index,
  featured = false,
  className = '',
}: GameCard3DProps) {
  const cardRef = useRef<HTMLDivElement | null>(null);
  const [isHovered, setIsHovered] = useState(false);

  // Raw mouse coordinates normalized [0, 1]
  const mouseX = useMotionValue(0.5);
  const mouseY = useMotionValue(0.5);

  // Smooth spring configuration for fluid 3D tilt
  const springConfig = { stiffness: 280, damping: 22 };

  // Calculate 3D tilt angles
  const rawRotateX = useTransform(mouseY, [0, 1], [6, -6]);
  const rawRotateY = useTransform(mouseX, [0, 1], [-6, 6]);

  const rotateX = useSpring(rawRotateX, springConfig);
  const rotateY = useSpring(rawRotateY, springConfig);

  // Spotlight glow position (in pixels)
  const glowX = useMotionValue(0);
  const glowY = useMotionValue(0);

  const handleMouseMove = (e: MouseEvent<HTMLDivElement>) => {
    if (!cardRef.current) return;
    const rect = cardRef.current.getBoundingClientRect();
    const x = (e.clientX - rect.left) / rect.width;
    const y = (e.clientY - rect.top) / rect.height;

    mouseX.set(x);
    mouseY.set(y);

    glowX.set(e.clientX - rect.left);
    glowY.set(e.clientY - rect.top);
  };

  const handleMouseEnter = () => {
    setIsHovered(true);
  };

  const handleMouseLeave = () => {
    setIsHovered(false);
    mouseX.set(0.5);
    mouseY.set(0.5);
  };

  const isMultiplayer = game.maxPlayers > 1;
  const duration = GAME_DURATIONS[game.id] || '5–15m';

  return (
    <motion.div
      initial={{ opacity: 0, y: 25 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: '-60px' }}
      transition={{ duration: 0.5, delay: index * 0.05, ease: [0.21, 0.47, 0.32, 0.98] }}
      className={`group relative perspective-1000 ${className}`}
      style={{ perspective: 1000 }}
    >
      <motion.div
        ref={cardRef}
        onMouseMove={handleMouseMove}
        onMouseEnter={handleMouseEnter}
        onMouseLeave={handleMouseLeave}
        style={{
          rotateX,
          rotateY,
          transformStyle: 'preserve-3d',
        }}
        className="relative h-full overflow-hidden rounded-2xl border border-slate-800/80 bg-slate-900/90 p-6 backdrop-blur-xl transition-all duration-300 hover:border-sky-500/40 hover:shadow-2xl hover:shadow-sky-500/10"
      >
        {/* Spotlight Cursor Glow Effect */}
        {isHovered && (
          <motion.div
            className="pointer-events-none absolute -inset-px rounded-2xl opacity-100 transition-opacity duration-300"
            style={{
              background: `radial-gradient(450px circle at ${glowX.get()}px ${glowY.get()}px, rgba(56, 189, 248, 0.12), transparent 60%)`,
            }}
          />
        )}

        {/* Background Accent Tint */}
        <div
          className={`absolute top-0 right-0 h-48 w-48 rounded-full bg-gradient-to-br ${game.color} opacity-10 blur-3xl transition-opacity duration-500 group-hover:opacity-25`}
        />

        {featured ? (
          /* ════ FEATURED 2-COLUMN HORIZONTAL BENTO CARD ═══════════════ */
          <div
            className="relative z-10 flex h-full flex-col sm:flex-row items-stretch justify-between gap-6"
            style={{ transform: 'translateZ(20px)' }}
          >
            {/* Left Column: Info & Details */}
            <div className="flex flex-1 flex-col justify-between space-y-4">
              <div>
                <div className="flex items-center justify-between gap-3">
                  <div className="flex items-center gap-2">
                    <span
                      className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-semibold tracking-wide ${
                        isMultiplayer
                          ? 'bg-violet-500/15 text-violet-400 border border-violet-500/30'
                          : 'bg-sky-500/15 text-sky-400 border border-sky-500/30'
                      }`}
                    >
                      <span
                        className={`h-1.5 w-1.5 rounded-full ${
                          isMultiplayer ? 'bg-violet-400 animate-pulse' : 'bg-sky-400'
                        }`}
                      />
                      <span className="font-mono">{isMultiplayer ? `${game.minPlayers}-${game.maxPlayers}P Online` : 'Solo'}</span>
                    </span>

                    <span className="rounded-md bg-slate-800/80 px-2 py-0.5 font-mono text-xs text-slate-400">
                      ⏱ {duration}
                    </span>
                  </div>

                  <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-slate-800/80 border border-slate-700 text-slate-300 group-hover:border-sky-500/40 group-hover:text-sky-400 transition-colors">
                    {getGameSvgIcon(game.id, '', 16)}
                  </div>
                </div>

                <h3 className="mt-3 text-2xl font-black tracking-tight text-white group-hover:text-sky-400 transition-colors">
                  <Link href={game.route}>{game.title}</Link>
                </h3>

                <p className="mt-2 text-sm leading-relaxed text-slate-400 line-clamp-3">
                  {game.description}
                </p>
              </div>

              {/* Action Buttons */}
              <div className="pt-4 border-t border-slate-800/80 space-y-3">
                <div className="flex flex-wrap gap-1.5">
                  {game.tags.slice(0, 3).map((tag) => (
                    <span
                      key={tag}
                      className="rounded-md bg-slate-800/60 px-2.5 py-1 text-xs font-medium text-slate-300"
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
                      className="flex-1 inline-flex items-center justify-center gap-1.5 rounded-xl border border-violet-500/40 bg-violet-500/10 px-4 py-2.5 text-xs font-bold text-violet-300 transition-all hover:bg-violet-500/20 hover:border-violet-500"
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
            <div className="relative w-full sm:w-56 h-48 sm:h-auto min-h-[160px] flex-shrink-0 overflow-hidden rounded-xl border border-slate-800 bg-slate-950/80 p-3 transition-colors duration-300 group-hover:border-slate-700">
              <GameVisualGraphic id={game.id} />
            </div>
          </div>
        ) : (
          /* ════ STANDARD 1-COLUMN BENTO CARD ══════════════════════════ */
          <div
            className="relative z-10 flex h-full flex-col justify-between"
            style={{ transform: 'translateZ(20px)' }}
          >
            {/* Header: Player badge + Game Icon */}
            <div>
              <div className="flex items-center justify-between gap-2">
                <div className="flex items-center gap-1.5">
                  <span
                    className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-semibold tracking-wide ${
                      isMultiplayer
                        ? 'bg-violet-500/15 text-violet-400 border border-violet-500/30'
                        : 'bg-sky-500/15 text-sky-400 border border-sky-500/30'
                    }`}
                  >
                    <span
                      className={`h-1.5 w-1.5 rounded-full ${
                        isMultiplayer ? 'bg-violet-400 animate-pulse' : 'bg-sky-400'
                      }`}
                    />
                    <span className="font-mono">{isMultiplayer ? `${game.minPlayers}-${game.maxPlayers}P` : 'Solo'}</span>
                  </span>

                  <span className="rounded-md bg-slate-800/80 px-2 py-0.5 font-mono text-xs text-slate-400">
                    ⏱ {duration}
                  </span>
                </div>

                <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-slate-800/80 border border-slate-700 text-slate-300 group-hover:border-sky-500/40 group-hover:text-sky-400 transition-colors">
                  {getGameSvgIcon(game.id, '', 16)}
                </div>
              </div>

              {/* Visual Preview */}
              <div className="my-4 overflow-hidden rounded-xl border border-slate-800 bg-slate-950/80 p-3 transition-colors duration-300 group-hover:border-slate-700">
                <div className="relative flex h-36 w-full items-center justify-center">
                  <GameVisualGraphic id={game.id} />
                </div>
              </div>

              {/* Title & Description */}
              <h3 className="text-xl font-bold tracking-tight text-white transition-colors duration-200 group-hover:text-sky-400">
                <Link href={game.route}>{game.title}</Link>
              </h3>
              <p className="mt-1.5 text-xs sm:text-sm leading-relaxed text-slate-400 line-clamp-2">
                {game.description}
              </p>
            </div>

            {/* Footer: Tags & Action CTAs */}
            <div className="mt-5 pt-3 border-t border-slate-800/80 space-y-3">
              <div className="flex flex-wrap gap-1.5">
                {game.tags.slice(0, 2).map((tag) => (
                  <span
                    key={tag}
                    className="rounded-md bg-slate-800/60 px-2 py-0.5 text-xs font-medium text-slate-300"
                  >
                    {tag}
                  </span>
                ))}
              </div>

              <div className="flex items-center gap-2">
                <Link
                  href={game.route}
                  className="flex-1 inline-flex items-center justify-center gap-1.5 rounded-xl bg-gradient-to-r from-sky-500 to-blue-600 py-2 text-xs font-bold text-white shadow-md shadow-sky-500/20 transition-all hover:from-sky-400 hover:to-blue-500"
                >
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor">
                    <polygon points="5 3 19 12 5 21 5 3" />
                  </svg>
                  <span>{isMultiplayer ? 'Solo' : 'Play'}</span>
                </Link>

                {isMultiplayer && (
                  <Link
                    href={`${game.route}?mode=multiplayer`}
                    className="flex-1 inline-flex items-center justify-center gap-1.5 rounded-xl border border-violet-500/40 bg-violet-500/10 py-2 text-xs font-bold text-violet-300 transition-all hover:bg-violet-500/20 hover:border-violet-500"
                  >
                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
                      <circle cx="9" cy="7" r="4" />
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
