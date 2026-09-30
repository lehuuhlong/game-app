'use client';

import React from 'react';
import { motion } from 'framer-motion';

interface ComingSoonGame {
  id: string;
  title: string;
  category: string;
  description: string;
  features: string[];
  accentColor: string;
  glowColor: string;
  icon: 'crosshair' | 'radar' | 'lightning' | 'breakout' | 'tetris' | 'pacman';
  status: string;
}

interface ComingSoonCardProps {
  game: ComingSoonGame;
  index: number;
}

/**
 * Futuristic HUD-styled teaser card for upcoming games.
 * Features rich dynamic graphic previews for Neon Tetris and Neon Brick Breaker.
 */
export function ComingSoonCard({ game, index }: ComingSoonCardProps) {
  return (
    <motion.div
      initial={{ opacity: 0, filter: 'blur(12px)', y: 35 }}
      whileInView={{ opacity: 1, filter: 'blur(0px)', y: 0 }}
      viewport={{ once: true, margin: '-50px' }}
      transition={{
        duration: 0.7,
        delay: index * 0.15,
        ease: [0.16, 1, 0.3, 1],
      }}
      className="group relative overflow-hidden rounded-3xl border border-border bg-gradient-to-b from-surface via-surface/95 to-surface/80 dark:from-slate-900/90 dark:to-slate-950/95 p-8 backdrop-blur-2xl transition-all duration-300 hover:border-border-hover shadow-md hover:shadow-xl"
    >
      {/* ── Futuristic HUD Corner Reticles ────────────────────────── */}
      <div className="pointer-events-none absolute top-4 left-4 h-3 w-3 border-t-2 border-l-2 border-border transition-colors duration-300 group-hover:border-sky-500/80" />
      <div className="pointer-events-none absolute top-4 right-4 h-3 w-3 border-t-2 border-r-2 border-border transition-colors duration-300 group-hover:border-sky-500/80" />
      <div className="pointer-events-none absolute bottom-4 left-4 h-3 w-3 border-b-2 border-l-2 border-border transition-colors duration-300 group-hover:border-sky-500/80" />
      <div className="pointer-events-none absolute bottom-4 right-4 h-3 w-3 border-b-2 border-r-2 border-border transition-colors duration-300 group-hover:border-sky-500/80" />

      {/* Ambient background glow */}
      <div
        className={`pointer-events-none absolute -top-12 -right-12 h-64 w-64 rounded-full ${game.glowColor} opacity-15 blur-3xl transition-opacity duration-500 group-hover:opacity-30`}
      />

      <div className="relative z-10 flex flex-col justify-between h-full space-y-6">
        {/* Top bar: Status Chip & Category */}
        <div className="flex items-center justify-between">
          <div className="inline-flex items-center gap-2 rounded-full border border-amber-500/30 bg-amber-500/10 px-3.5 py-1 text-xs font-mono font-semibold text-amber-600 dark:text-amber-400">
            <span className="relative flex h-2 w-2">
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-amber-400 opacity-75" />
              <span className="relative inline-flex h-2 w-2 rounded-full bg-amber-500" />
            </span>
            <span className="tracking-wider uppercase">{game.status}</span>
          </div>

          <span className="font-mono text-xs text-foreground-muted tracking-widest uppercase">
            {game.category}
          </span>
        </div>

        {/* Center: Graphic HUD Visual Preview */}
        <div className="relative flex h-40 w-full items-center justify-center rounded-2xl border border-border bg-background dark:bg-slate-950/80 p-5 overflow-hidden shadow-inner">
          {/* Subtle animated scanline / grid background */}
          <div className="absolute inset-0 bg-[linear-gradient(to_right,#1e293b15_1px,transparent_1px),linear-gradient(to_bottom,#1e293b15_1px,transparent_1px)] bg-[size:20px_20px] opacity-30" />

          {game.icon === 'tetris' || game.icon === 'lightning' ? (
            /* ── Neon Tetris Cyber Matrix Graphic ── */
            <div className="relative flex items-center justify-center h-32 w-56 z-10">
              <div className="relative w-44 h-28 border border-border/80 bg-surface/60 rounded-xl p-2 flex flex-col justify-end overflow-hidden shadow-inner">
                {/* Background Grid Lines */}
                <div className="absolute inset-0 bg-[linear-gradient(to_right,#38bdf812_1px,transparent_1px),linear-gradient(to_bottom,#38bdf812_1px,transparent_1px)] bg-[size:14px_14px]" />

                {/* Ghost Piece Indicator */}
                <div className="absolute bottom-5 left-15 flex flex-col items-center opacity-40">
                  <div className="flex gap-0.5">
                    <div className="w-3.5 h-3.5 rounded-xs border border-purple-400 border-dashed" />
                  </div>
                  <div className="flex gap-0.5">
                    <div className="w-3.5 h-3.5 rounded-xs border border-purple-400 border-dashed" />
                    <div className="w-3.5 h-3.5 rounded-xs border border-purple-400 border-dashed" />
                    <div className="w-3.5 h-3.5 rounded-xs border border-purple-400 border-dashed" />
                  </div>
                </div>

                {/* Falling Glowing Purple T-Piece */}
                <div className="absolute top-2 left-15 flex flex-col items-center animate-bounce-gentle">
                  <div className="flex gap-0.5">
                    <div className="w-3.5 h-3.5 rounded-xs bg-purple-500 shadow-sm shadow-purple-400/80 border border-purple-300" />
                  </div>
                  <div className="flex gap-0.5">
                    <div className="w-3.5 h-3.5 rounded-xs bg-purple-500 shadow-sm shadow-purple-400/80 border border-purple-300" />
                    <div className="w-3.5 h-3.5 rounded-xs bg-purple-500 shadow-sm shadow-purple-400/80 border border-purple-300" />
                    <div className="w-3.5 h-3.5 rounded-xs bg-purple-500 shadow-sm shadow-purple-400/80 border border-purple-300" />
                  </div>
                </div>

                {/* Stacked bottom blocks */}
                <div className="relative z-10 flex flex-col gap-0.5">
                  {/* Row 2: Cyan & Amber Blocks */}
                  <div className="flex gap-0.5 ml-3.5">
                    <div className="w-3.5 h-3.5 rounded-xs bg-cyan-400 shadow-xs shadow-cyan-300/60 border border-cyan-200/50" />
                    <div className="w-3.5 h-3.5 rounded-xs bg-cyan-400 shadow-xs shadow-cyan-300/60 border border-cyan-200/50" />
                    <div className="w-3.5 h-3.5 rounded-xs bg-amber-400 shadow-xs shadow-amber-300/60 border border-amber-200/50" />
                    <div className="w-3.5 h-3.5 rounded-xs bg-amber-400 shadow-xs shadow-amber-300/60 border border-amber-200/50" />
                  </div>
                  {/* Row 1: Full bottom line */}
                  <div className="flex gap-0.5">
                    <div className="w-3.5 h-3.5 rounded-xs bg-emerald-400 border border-emerald-200/50" />
                    <div className="w-3.5 h-3.5 rounded-xs bg-emerald-400 border border-emerald-200/50" />
                    <div className="w-3.5 h-3.5 rounded-xs bg-rose-500 border border-rose-200/50" />
                    <div className="w-3.5 h-3.5 rounded-xs bg-rose-500 border border-rose-200/50" />
                    <div className="w-3.5 h-3.5 rounded-xs bg-blue-500 border border-blue-200/50" />
                    <div className="w-3.5 h-3.5 rounded-xs bg-blue-500 border border-blue-200/50" />
                    <div className="w-3.5 h-3.5 rounded-xs bg-cyan-400 border border-cyan-200/50" />
                    <div className="w-3.5 h-3.5 rounded-xs bg-cyan-400 border border-cyan-200/50" />
                    <div className="w-3.5 h-3.5 rounded-xs bg-purple-500 border border-purple-200/50" />
                  </div>
                </div>
              </div>
            </div>
          ) : game.icon === 'breakout' ? (
            /* ── Neon Brick Breaker Graphic ── */
            <div className="relative flex flex-col items-center justify-between h-28 w-56 z-10">
              {/* Row 1: Neon Bricks */}
              <div className="grid grid-cols-5 gap-1.5 w-full">
                <div className="h-3.5 rounded-sm bg-rose-500 shadow-sm shadow-rose-500/60" />
                <div className="h-3.5 rounded-sm bg-amber-500 shadow-sm shadow-amber-500/60" />
                <div className="h-3.5 rounded-sm bg-cyan-400 shadow-sm shadow-cyan-400/60" />
                <div className="h-3.5 rounded-sm bg-emerald-400 shadow-sm shadow-emerald-400/60" />
                <div className="h-3.5 rounded-sm bg-violet-500 shadow-sm shadow-violet-500/60" />
              </div>

              {/* Row 2: Secondary Bricks */}
              <div className="grid grid-cols-5 gap-1.5 w-full opacity-70">
                <div className="h-3 rounded-sm bg-rose-500" />
                <div className="h-3 rounded-sm bg-amber-500 opacity-40" />
                <div className="h-3 rounded-sm bg-cyan-400" />
                <div className="h-3 rounded-sm bg-emerald-400 opacity-40" />
                <div className="h-3 rounded-sm bg-violet-500" />
              </div>

              {/* Glowing Ball with Motion Trail */}
              <div className="relative flex items-center justify-center">
                <div className="h-3.5 w-3.5 rounded-full bg-cyan-300 shadow-lg shadow-cyan-400 animate-pulse" />
              </div>

              {/* Bottom Cyber Paddle */}
              <div className="h-2.5 w-24 rounded-full bg-gradient-to-r from-sky-400 via-indigo-400 to-sky-400 shadow-md shadow-sky-500/50" />
            </div>
          ) : game.icon === 'pacman' ? (
            /* ── Neon Maze Muncher (Cyber Pac-Man) Graphic ── */
            <div className="relative flex flex-col items-center justify-center h-28 w-60 z-10 select-none">
              {/* Neon Maze Top Wall */}
              <div className="w-full flex items-center justify-between px-2">
                <div className="h-1.5 w-16 rounded-full bg-blue-500 shadow-sm shadow-blue-500/80 border border-blue-400/60" />
                <div className="h-1.5 w-20 rounded-full bg-blue-500 shadow-sm shadow-blue-500/80 border border-blue-400/60" />
                <div className="h-1.5 w-12 rounded-full bg-blue-500 shadow-sm shadow-blue-500/80 border border-blue-400/60" />
              </div>

              {/* Main Corridor with Characters & Pellets */}
              <div className="relative w-full h-16 my-1 flex items-center justify-between px-2 overflow-hidden">
                {/* Left side: Ghosts in pursuit */}
                <div className="flex items-center gap-2">
                  {/* Crimson Ghost */}
                  <div className="relative flex flex-col items-center">
                    <div className="relative h-7 w-7 rounded-t-full bg-rose-500 shadow-md shadow-rose-500/80 flex items-center justify-center">
                      <div className="flex gap-1">
                        <div className="h-2 w-2 rounded-full bg-white flex items-center justify-end p-0.5">
                          <div className="h-1 w-1 rounded-full bg-blue-700" />
                        </div>
                        <div className="h-2 w-2 rounded-full bg-white flex items-center justify-end p-0.5">
                          <div className="h-1 w-1 rounded-full bg-blue-700" />
                        </div>
                      </div>
                      <div className="absolute -bottom-1 left-0 right-0 flex justify-between px-0.5">
                        <div className="h-1.5 w-1.5 rounded-full bg-rose-500" />
                        <div className="h-1.5 w-1.5 rounded-full bg-rose-500" />
                        <div className="h-1.5 w-1.5 rounded-full bg-rose-500" />
                      </div>
                    </div>
                  </div>

                  {/* Pinky Ghost */}
                  <div className="relative flex flex-col items-center opacity-85">
                    <div className="relative h-6 w-6 rounded-t-full bg-pink-500 shadow-sm shadow-pink-500/80 flex items-center justify-center">
                      <div className="flex gap-0.5">
                        <div className="h-1.5 w-1.5 rounded-full bg-white flex items-center justify-end p-0.5">
                          <div className="h-0.5 w-0.5 rounded-full bg-blue-700" />
                        </div>
                        <div className="h-1.5 w-1.5 rounded-full bg-white flex items-center justify-end p-0.5">
                          <div className="h-0.5 w-0.5 rounded-full bg-blue-700" />
                        </div>
                      </div>
                      <div className="absolute -bottom-1 left-0 right-0 flex justify-between px-0.5">
                        <div className="h-1 w-1 rounded-full bg-pink-500" />
                        <div className="h-1 w-1 rounded-full bg-pink-500" />
                        <div className="h-1 w-1 rounded-full bg-pink-500" />
                      </div>
                    </div>
                  </div>
                </div>

                {/* Center / Right: Chomping Pac-Man & Glowing Pellets */}
                <div className="flex items-center gap-2.5">
                  {/* Muncher / Pac-Man SVG with glow */}
                  <div className="relative flex items-center justify-center">
                    <svg
                      width="30"
                      height="30"
                      viewBox="0 0 32 32"
                      className="filter drop-shadow-[0_0_10px_rgba(250,204,21,0.9)] animate-pulse"
                    >
                      <path
                        d="M 16 16 L 30 7 A 15 15 0 1 0 30 25 Z"
                        fill="#facc15"
                      />
                    </svg>
                  </div>

                  {/* Pellets */}
                  <div className="flex items-center gap-2">
                    <div className="h-2 w-2 rounded-full bg-amber-300 shadow-sm shadow-amber-300" />
                    <div className="h-2 w-2 rounded-full bg-amber-300 shadow-sm shadow-amber-300" />
                    {/* Glowing Power Pellet */}
                    <div className="relative flex items-center justify-center">
                      <span className="absolute h-4 w-4 animate-ping rounded-full bg-amber-400 opacity-70" />
                      <div className="relative h-3 w-3 rounded-full bg-white border border-amber-300 shadow-md shadow-amber-400" />
                    </div>
                  </div>
                </div>
              </div>

              {/* Neon Maze Bottom Wall */}
              <div className="w-full flex items-center justify-between px-2">
                <div className="h-1.5 w-24 rounded-full bg-blue-500 shadow-sm shadow-blue-500/80 border border-blue-400/60" />
                <div className="h-1.5 w-14 rounded-full bg-blue-500 shadow-sm shadow-blue-500/80 border border-blue-400/60" />
                <div className="h-1.5 w-16 rounded-full bg-blue-500 shadow-sm shadow-blue-500/80 border border-blue-400/60" />
              </div>
            </div>
          ) : game.icon === 'crosshair' ? (
            <div className="relative flex items-center justify-center">
              <div className="h-20 w-20 rounded-full border border-dashed border-rose-500/40 animate-[spin_12s_linear_infinite]" />
              <div className="absolute h-12 w-12 rounded-full border border-rose-500/60" />
              <div className="absolute h-2 w-2 rounded-full bg-rose-500 animate-ping" />
              <div className="absolute h-1.5 w-1.5 rounded-full bg-foreground" />
              <div className="absolute top-0 bottom-0 w-px bg-rose-500/30" />
              <div className="absolute left-0 right-0 h-px bg-rose-500/30" />
            </div>
          ) : (
            <div className="relative flex items-center justify-center">
              <div className="h-20 w-20 rounded-full border border-sky-500/30" />
              <div className="absolute h-12 w-12 rounded-full border border-sky-500/50" />
              <div className="absolute h-20 w-20 rounded-full bg-[conic-gradient(from_0deg,transparent_0_300deg,rgba(56,189,248,0.4)_360deg)] animate-[spin_3.5s_linear_infinite]" />
              <div className="absolute top-3 right-6 h-2 w-2 rounded-full bg-sky-400 animate-pulse" />
              <div className="absolute bottom-4 left-5 h-2 w-2 rounded-full bg-sky-400 animate-pulse" />
              <div className="absolute h-1.5 w-1.5 rounded-full bg-foreground" />
            </div>
          )}
        </div>

        {/* Title & Description */}
        <div>
          <h3 className="text-2xl font-black tracking-tight text-foreground group-hover:text-accent transition-colors">
            {game.title}
          </h3>
          <p className="mt-2 text-sm leading-relaxed text-foreground-secondary">
            {game.description}
          </p>
        </div>

        {/* Feature Highlights */}
        <div className="space-y-2 pt-2 border-t border-border">
          <span className="text-xs font-mono font-medium text-foreground-muted uppercase tracking-wider">
            Planned Features
          </span>
          <div className="flex flex-wrap gap-2">
            {game.features.map((feature) => (
              <span
                key={feature}
                className="rounded-lg border border-border bg-background px-2.5 py-1 text-xs text-foreground-secondary font-medium"
              >
                ✦ {feature}
              </span>
            ))}
          </div>
        </div>
      </div>
    </motion.div>
  );
}

export default ComingSoonCard;
