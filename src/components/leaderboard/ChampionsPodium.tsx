'use client';

import React from 'react';
import { motion } from 'framer-motion';

export interface PodiumPlayer {
  rank: 1 | 2 | 3;
  username: string;
  avatarUrl: string | null;
  primaryStat: string;
  secondaryStat?: string;
}

interface ChampionsPodiumProps {
  first?: PodiumPlayer | null;
  second?: PodiumPlayer | null;
  third?: PodiumPlayer | null;
  metricLabel: string;
  onSelectPlayer: (username: string) => void;
}

export function ChampionsPodium({
  first,
  second,
  third,
  metricLabel,
  onSelectPlayer,
}: ChampionsPodiumProps) {
  // If no players have ranked in this level yet
  if (!first) {
    return (
      <motion.div
        initial={{ opacity: 0, y: 15 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
        className="relative mx-auto mb-8 w-full max-w-4xl px-4"
      >
        <div className="relative z-10 flex flex-col items-center justify-center rounded-2xl border border-border bg-surface p-8 backdrop-blur-xl text-center shadow-sm">
          <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-amber-500/10 text-amber-500 mb-3 shadow-inner">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor">
              <path d="M5 16L3 5l5.5 5L12 4l3.5 6L21 5l-2 11H5zm14 3c0 .6-.4 1-1 1H6c-.6 0-1-.4-1-1v-1h14v1z" />
            </svg>
          </div>
          <h3 className="text-base font-bold text-foreground">Podium Unclaimed</h3>
          <p className="text-xs text-foreground-secondary mt-1 max-w-sm">
            No verified records set for this category yet. Be the first champion to set a record and claim the #1 crown!
          </p>
        </div>
      </motion.div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 15 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4 }}
      className="relative mx-auto mb-10 w-full max-w-4xl px-4"
    >
      {/* Background soft glow aura */}
      <div className="pointer-events-none absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 h-64 w-96 rounded-full bg-amber-500/10 blur-3xl" />

      <div className="relative z-10 grid grid-cols-3 items-end gap-3 sm:gap-6 pt-8 pb-4">
        {/* ── 2nd Place (Silver - Left) ─────────────────────────── */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.1 }}
          className="flex flex-col items-center"
        >
          {second ? (
            <button
              onClick={() => onSelectPlayer(second.username)}
              className="group flex flex-col items-center w-full focus:outline-none"
            >
              {/* Avatar & Rank Pill */}
              <div className="relative mb-3 flex flex-col items-center">
                <div className="relative flex h-16 w-16 sm:h-20 sm:w-20 items-center justify-center overflow-hidden rounded-full border-2 border-slate-300 dark:border-slate-400 bg-slate-100 dark:bg-slate-800 text-lg sm:text-2xl font-bold text-foreground dark:text-slate-200 shadow-md shadow-black/10 dark:shadow-black/40 transition-transform duration-200 group-hover:scale-105">
                  {second.avatarUrl ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={second.avatarUrl}
                      alt={second.username}
                      className="h-full w-full object-cover"
                    />
                  ) : (
                    <span>{second.username.charAt(0).toUpperCase()}</span>
                  )}
                </div>
                <span className="absolute -bottom-2 flex h-6 w-6 items-center justify-center rounded-full bg-slate-300 dark:bg-slate-400 font-mono text-xs font-black text-slate-800 dark:text-slate-950 shadow-md">
                  2
                </span>
              </div>

              {/* Player Info */}
              <span className="max-w-[100px] sm:max-w-[140px] truncate text-xs sm:text-sm font-bold text-foreground group-hover:text-sky-500 transition-colors">
                {second.username}
              </span>
              <span className="mt-0.5 font-mono text-xs sm:text-sm font-bold text-foreground-secondary dark:text-slate-300">
                {second.primaryStat}
              </span>
              {second.secondaryStat && (
                <span className="text-xs text-foreground-muted">
                  {second.secondaryStat}
                </span>
              )}
            </button>
          ) : (
            <div className="h-28 flex items-center justify-center text-xs text-foreground-muted font-medium">
              Unclaimed
            </div>
          )}

          {/* Podium Pillar */}
          <div className="mt-4 flex h-24 sm:h-28 w-full flex-col items-center justify-center rounded-t-2xl border-t border-x border-slate-200 dark:border-slate-700/80 bg-gradient-to-b from-slate-100/90 via-slate-50/50 to-surface/80 dark:from-slate-800/80 dark:to-slate-900/90 shadow-lg backdrop-blur-xl">
            <span className="font-mono text-base sm:text-xl font-black text-slate-600 dark:text-slate-400">
              #2
            </span>
            <span className="text-xs text-slate-500 dark:text-slate-400 uppercase tracking-wider font-semibold">
              Silver
            </span>
          </div>
        </motion.div>

        {/* ── 1st Place (Gold - Center) ─────────────────────────── */}
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
          className="flex flex-col items-center"
        >
          <button
            onClick={() => onSelectPlayer(first.username)}
            className="group flex flex-col items-center w-full focus:outline-none"
          >
            {/* Crown Icon */}
            <div className="mb-1 flex h-8 w-8 items-center justify-center text-amber-500 drop-shadow-[0_0_8px_rgba(245,158,11,0.5)]">
              <svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor">
                <path d="M5 16L3 5l5.5 5L12 4l3.5 6L21 5l-2 11H5zm14 3c0 .6-.4 1-1 1H6c-.6 0-1-.4-1-1v-1h14v1z" />
              </svg>
            </div>

            {/* Avatar & Rank Pill */}
            <div className="relative mb-3 flex flex-col items-center">
              <div className="relative flex h-20 w-20 sm:h-24 sm:w-24 items-center justify-center overflow-hidden rounded-full border-2 border-amber-400 bg-amber-50 dark:bg-slate-800 text-xl sm:text-3xl font-extrabold text-amber-600 dark:text-amber-300 shadow-xl shadow-amber-500/20 transition-transform duration-200 group-hover:scale-105">
                {first.avatarUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={first.avatarUrl}
                    alt={first.username}
                    className="h-full w-full object-cover"
                  />
                ) : (
                  <span>{first.username.charAt(0).toUpperCase()}</span>
                )}
              </div>
              <span className="absolute -bottom-2 flex h-7 w-7 items-center justify-center rounded-full bg-amber-400 font-mono text-xs sm:text-sm font-black text-amber-950 shadow-md">
                1
              </span>
            </div>

            {/* Player Info */}
            <span className="max-w-[120px] sm:max-w-[160px] truncate text-sm sm:text-base font-extrabold text-foreground group-hover:text-amber-500 transition-colors">
              {first.username}
            </span>
            <span className="mt-0.5 font-mono text-sm sm:text-base font-black text-amber-600 dark:text-amber-300">
              {first.primaryStat}
            </span>
            {first.secondaryStat && (
              <span className="text-xs text-foreground-muted">
                {first.secondaryStat}
              </span>
            )}
          </button>

          {/* Podium Pillar */}
          <div className="mt-4 flex h-32 sm:h-40 w-full flex-col items-center justify-center rounded-t-2xl border-t border-x border-amber-400/60 dark:border-amber-500/40 bg-gradient-to-b from-amber-100/90 via-amber-50/50 to-surface/80 dark:from-amber-500/20 dark:via-slate-800/90 dark:to-slate-900 shadow-2xl backdrop-blur-xl">
            <span className="font-mono text-xl sm:text-2xl font-black text-amber-600 dark:text-amber-400">
              #1
            </span>
            <span className="text-xs text-amber-600 dark:text-amber-300 uppercase tracking-wider font-bold">
              Champion
            </span>
          </div>
        </motion.div>

        {/* ── 3rd Place (Bronze - Right) ────────────────────────── */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.2 }}
          className="flex flex-col items-center"
        >
          {third ? (
            <button
              onClick={() => onSelectPlayer(third.username)}
              className="group flex flex-col items-center w-full focus:outline-none"
            >
              {/* Avatar & Rank Pill */}
              <div className="relative mb-3 flex flex-col items-center">
                <div className="relative flex h-16 w-16 sm:h-20 sm:w-20 items-center justify-center overflow-hidden rounded-full border-2 border-amber-600/70 dark:border-amber-700 bg-amber-50/70 dark:bg-slate-800 text-lg sm:text-2xl font-bold text-amber-700 dark:text-amber-600 shadow-md shadow-black/10 dark:shadow-black/40 transition-transform duration-200 group-hover:scale-105">
                  {third.avatarUrl ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={third.avatarUrl}
                      alt={third.username}
                      className="h-full w-full object-cover"
                    />
                  ) : (
                    <span>{third.username.charAt(0).toUpperCase()}</span>
                  )}
                </div>
                <span className="absolute -bottom-2 flex h-6 w-6 items-center justify-center rounded-full bg-amber-600 dark:bg-amber-700 font-mono text-xs font-black text-white dark:text-amber-100 shadow-md">
                  3
                </span>
              </div>

              {/* Player Info */}
              <span className="max-w-[100px] sm:max-w-[140px] truncate text-xs sm:text-sm font-bold text-foreground group-hover:text-amber-600 transition-colors">
                {third.username}
              </span>
              <span className="mt-0.5 font-mono text-xs sm:text-sm font-bold text-amber-700 dark:text-slate-300">
                {third.primaryStat}
              </span>
              {third.secondaryStat && (
                <span className="text-xs text-foreground-muted">
                  {third.secondaryStat}
                </span>
              )}
            </button>
          ) : (
            <div className="h-28 flex items-center justify-center text-xs text-foreground-muted font-medium">
              Unclaimed
            </div>
          )}

          {/* Podium Pillar */}
          <div className="mt-4 flex h-18 sm:h-20 w-full flex-col items-center justify-center rounded-t-2xl border-t border-x border-amber-300/60 dark:border-amber-800/60 bg-gradient-to-b from-amber-100/70 via-amber-50/40 to-surface/80 dark:from-amber-950/40 dark:via-slate-800/80 dark:to-slate-900/90 shadow-lg backdrop-blur-xl">
            <span className="font-mono text-base sm:text-xl font-black text-amber-700 dark:text-amber-600">
              #3
            </span>
            <span className="text-xs text-amber-700/80 dark:text-amber-600/80 uppercase tracking-wider font-semibold">
              Bronze
            </span>
          </div>
        </motion.div>
      </div>
    </motion.div>
  );
}

export default ChampionsPodium;
