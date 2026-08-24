'use client';

import React, { useMemo } from 'react';
import Link from 'next/link';
import { motion } from 'framer-motion';
import { GAMES } from '@/config/games';
import { GameVisualGraphic } from './GameVisualGraphic';
import { getGameSvgIcon } from './GameIcons';

// Daily custom challenge goals mapped per game
const DAILY_CHALLENGES: Record<string, { goal: string; reward: string; difficulty: string }> = {
  '2048': { goal: 'Merge to 2048 tile in under 350 total moves', reward: '+150 Arcade XP', difficulty: 'Medium' },
  'wordle': { goal: 'Solve today’s 5-letter mystery in 4 tries or fewer', reward: '+120 Arcade XP', difficulty: 'Daily' },
  'sudoku': { goal: 'Complete the daily grid with zero error flags', reward: '+200 Arcade XP', difficulty: 'Hard' },
  'minesweeper': { goal: 'Clear Expert minefield without detonating a bomb', reward: '+250 Arcade XP', difficulty: 'Hard' },
  'aimtrainer': { goal: 'Score 45+ target hits in 60-second reflex trial', reward: '+100 Arcade XP', difficulty: 'Reflex' },
  'trex': { goal: 'Survive past 1,500 distance meters without collision', reward: '+100 Arcade XP', difficulty: 'Classic' },
  'chess': { goal: 'Win a 1v1 ranked multiplayer duel or play AI', reward: '+300 Arcade XP', difficulty: 'Master' },
  'caro': { goal: 'Claim a 5-in-a-row victory against an online rival', reward: '+200 Arcade XP', difficulty: 'Tactical' },
  'battleship': { goal: 'Sink the enemy carrier within first 12 rounds', reward: '+220 Arcade XP', difficulty: 'Strategy' },
  'monopoly': { goal: 'Acquire 3 complete property sets in multiplayer', reward: '+350 Arcade XP', difficulty: 'Empire' },
  'wordchain': { goal: 'Keep a 15-word combo chain running without stalling', reward: '+180 Arcade XP', difficulty: 'Speed' },
};

export function DailySpotlight() {
  // Deterministic daily rotation based on date
  const { featuredGame, challenge, formattedDate } = useMemo(() => {
    const now = new Date();
    const startOfYear = new Date(now.getFullYear(), 0, 0);
    const diff = now.getTime() - startOfYear.getTime();
    const oneDay = 1000 * 60 * 60 * 24;
    const dayOfYear = Math.floor(diff / oneDay);

    const gameIndex = dayOfYear % GAMES.length;
    const game = GAMES[gameIndex] || GAMES[0];
    const customChallenge = DAILY_CHALLENGES[game.id] || {
      goal: 'Complete a match session today',
      reward: '+100 Arcade XP',
      difficulty: 'Standard',
    };

    const formatted = now.toLocaleDateString('en-US', {
      weekday: 'long',
      month: 'short',
      day: 'numeric',
    });

    return { featuredGame: game, challenge: customChallenge, formattedDate: formatted };
  }, []);

  return (
    <motion.section
      initial={{ opacity: 0, y: 20 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: '-50px' }}
      transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
      className="relative z-10 mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-8"
    >
      <div className="relative overflow-hidden rounded-3xl border border-sky-500/30 dark:border-sky-500/20 bg-gradient-to-r from-surface via-surface/90 to-sky-50/70 dark:from-slate-900/90 dark:via-slate-900/70 dark:to-sky-950/40 p-6 sm:p-8 md:p-10 backdrop-blur-xl shadow-xl shadow-sky-500/5 dark:shadow-sky-950/30">
        {/* Ambient radial glow */}
        <div className="pointer-events-none absolute -right-20 -top-20 h-80 w-80 rounded-full bg-sky-500/10 blur-3xl" />
        <div className="pointer-events-none absolute -left-20 -bottom-20 h-80 w-80 rounded-full bg-blue-600/10 blur-3xl" />

        <div className="relative z-10 flex flex-col lg:flex-row items-center justify-between gap-8">
          {/* Left Column: Challenge Brief */}
          <div className="flex-1 space-y-4 text-left">
            <div className="flex flex-wrap items-center gap-3">
              <span className="inline-flex items-center gap-1.5 rounded-full border border-amber-500/30 bg-amber-500/10 px-3 py-1 text-xs font-bold text-amber-600 dark:text-amber-300">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M12 2l3.09 6.26L22 9.27l-5 4.87L18.18 21 12 17.27 5.82 21 7 14.14l-5-4.87 6.91-1.01L12 2z" />
                </svg>
                Game of the Day
              </span>
              <span className="text-xs font-mono font-medium text-foreground-muted">
                {formattedDate}
              </span>
              <span className="inline-flex items-center gap-1 text-xs font-mono font-semibold text-emerald-600 dark:text-emerald-400">
                <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" />
                Live Streak Active
              </span>
            </div>

            <div className="space-y-2">
              <h3 className="text-2xl sm:text-3xl lg:text-4xl font-black tracking-tight text-foreground flex items-center gap-3">
                <span>{featuredGame.title}</span>
                <span className="inline-flex h-8 w-8 items-center justify-center rounded-xl bg-accent-light dark:bg-slate-800 border border-accent/20 dark:border-slate-700 text-accent dark:text-sky-400">
                  {getGameSvgIcon(featuredGame.id, '', 18)}
                </span>
              </h3>
              <p className="text-sm sm:text-base text-foreground-secondary max-w-2xl leading-relaxed">
                <strong className="text-accent font-semibold">Today’s Challenge: </strong>
                {challenge.goal}
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-4 pt-2">
              <div className="flex items-center gap-2 rounded-xl border border-border bg-background/80 dark:bg-slate-950/60 px-3.5 py-2 text-xs text-foreground-secondary">
                <span className="text-foreground-muted">Difficulty:</span>
                <span className="font-semibold text-amber-600 dark:text-amber-300">{challenge.difficulty}</span>
              </div>
              <div className="flex items-center gap-2 rounded-xl border border-border bg-background/80 dark:bg-slate-950/60 px-3.5 py-2 text-xs text-foreground-secondary">
                <span className="text-foreground-muted">Reward:</span>
                <span className="font-mono font-semibold text-emerald-600 dark:text-emerald-400">{challenge.reward}</span>
              </div>
              <div className="flex items-center gap-2 rounded-xl border border-border bg-background/80 dark:bg-slate-950/60 px-3.5 py-2 text-xs text-foreground-secondary">
                <span className="text-foreground-muted">Players:</span>
                <span className="font-mono font-semibold text-accent">
                  {featuredGame.minPlayers === featuredGame.maxPlayers
                    ? `${featuredGame.minPlayers}P`
                    : `${featuredGame.minPlayers}-${featuredGame.maxPlayers}P`}
                </span>
              </div>
            </div>
          </div>

          {/* Right Column: Visual Preview & Launch Action */}
          <div className="flex flex-col sm:flex-row lg:flex-col items-center gap-6 w-full lg:w-auto">
            {/* Visual Graphic preview */}
            <div className="relative w-full sm:w-56 h-36 rounded-2xl border border-border bg-background dark:bg-slate-950/80 p-3 overflow-hidden shadow-inner">
              <GameVisualGraphic id={featuredGame.id} />
            </div>

            {/* Launch CTA */}
            <Link
              href={featuredGame.route}
              className="inline-flex w-full sm:w-auto lg:w-full items-center justify-center gap-2.5 rounded-xl bg-gradient-to-r from-sky-500 via-blue-600 to-indigo-600 px-6 py-3.5 text-sm font-bold text-white shadow-xl shadow-sky-500/20 transition-all duration-200 hover:from-sky-400 hover:to-indigo-500 hover:shadow-2xl hover:shadow-sky-500/35 hover:-translate-y-0.5"
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
                <polygon points="5 3 19 12 5 21 5 3" />
              </svg>
              <span>Play Daily Challenge</span>
            </Link>
          </div>
        </div>
      </div>
    </motion.section>
  );
}

export default DailySpotlight;
