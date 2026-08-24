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
  icon: 'crosshair' | 'radar' | 'lightning' | 'breakout';
  status: string;
}

interface ComingSoonCardProps {
  game: ComingSoonGame;
  index: number;
}

/**
 * Futuristic HUD-styled teaser card for upcoming games.
 * Features rich dynamic graphic previews for Pikachu Onet Link and Neon Brick Breaker.
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

          {game.icon === 'lightning' ? (
            /* ── Pikachu Onet Classic Match Matrix ── */
            <div className="relative flex items-center justify-center gap-4 sm:gap-6 z-10">
              {/* Tile 1: Pikachu Electric */}
              <div className="flex flex-col items-center justify-center h-16 w-16 rounded-xl border border-amber-500/60 bg-amber-500/10 shadow-lg shadow-amber-500/20 backdrop-blur-md">
                <span className="text-2xl animate-pulse">⚡</span>
                <span className="text-xs font-mono font-bold text-amber-600 dark:text-amber-400 mt-0.5">PIKA</span>
              </div>

              {/* Connecting Laser Energy Pathway */}
              <div className="relative flex items-center justify-center w-20 sm:w-28 h-8">
                {/* 3-segment pathline visualization */}
                <div className="absolute top-0 left-0 right-0 h-0.5 bg-gradient-to-r from-amber-400 via-yellow-300 to-amber-400 shadow-sm shadow-amber-400" />
                <div className="absolute top-0 left-0 w-0.5 h-4 bg-amber-400 shadow-sm shadow-amber-400" />
                <div className="absolute top-0 right-0 w-0.5 h-4 bg-amber-400 shadow-sm shadow-amber-400" />
                {/* Pulsing energy link spark */}
                <div className="absolute top-0 left-1/2 -translate-x-1/2 -translate-y-1/2 h-2.5 w-2.5 rounded-full bg-yellow-300 animate-ping" />
                <span className="font-mono text-xs font-bold text-amber-600 dark:text-amber-300 bg-surface/90 px-2 py-0.5 rounded border border-amber-500/40">
                  LINK MATCH
                </span>
              </div>

              {/* Tile 2: Target Matching Pikachu */}
              <div className="flex flex-col items-center justify-center h-16 w-16 rounded-xl border border-amber-500/60 bg-amber-500/10 shadow-lg shadow-amber-500/20 backdrop-blur-md">
                <span className="text-2xl animate-pulse">⚡</span>
                <span className="text-xs font-mono font-bold text-amber-600 dark:text-amber-400 mt-0.5">PIKA</span>
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
