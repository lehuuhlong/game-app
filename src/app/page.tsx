"use client";

import { GAMES } from "@/config/games";
import { GameCard } from "@/components/shared/GameCard";
import { StatCard } from "@/components/shared/StatCard";
import { motion } from "framer-motion";
import { useState, useEffect } from "react";

interface SiteStats {
  totalPlayers: number;
  bestScore2048: number;
  caroMatches: number;
}

export default function HomePage() {
  const [stats, setStats] = useState<SiteStats | null>(null);
  const [onlinePlayers, setOnlinePlayers] = useState<number | null>(null);

  useEffect(() => {
    fetch("/api/stats")
      .then((r) => r.ok ? r.json() : null)
      .then((d) => d && setStats(d))
      .catch(() => {});

    const socketUrl = process.env.NEXT_PUBLIC_SOCKET_URL || "http://localhost:4000";
    fetch(`${socketUrl}/stats`)
      .then((r) => r.ok ? r.json() : null)
      .then((d) => d && setOnlinePlayers(d.onlinePlayers))
      .catch(() => {});
  }, []);

  return (
    <div className="relative overflow-hidden">
      {/* ── Background Orbs ──────────────────────────────────────── */}
      <div className="pointer-events-none fixed inset-0 -z-10">
        <div className="bg-orb bg-orb-1" />
        <div className="bg-orb bg-orb-2" />
        <div className="bg-orb bg-orb-3" />
      </div>

      {/* ── Hero Section ─────────────────────────────────────────── */}
      <section className="relative px-4 pt-16 pb-12 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-7xl text-center">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
          >
            <div className="mb-6 inline-flex items-center gap-2 rounded-full border border-border bg-surface px-4 py-1.5 text-sm font-medium text-foreground-secondary shadow-sm">
              <span className="relative flex h-2 w-2">
                <span className="absolute inline-flex h-full w-full animate-pulse-ring rounded-full bg-emerald-400 opacity-75" />
                <span className="relative inline-flex h-2 w-2 rounded-full bg-emerald-500" />
              </span>
              2 Games Available — More Coming Soon
            </div>
          </motion.div>

          <motion.h1
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.1, ease: [0.22, 1, 0.36, 1] }}
            className="text-4xl sm:text-5xl lg:text-6xl font-extrabold tracking-tight text-foreground"
          >
            Play. Compete.{" "}
            <span className="text-gradient">Dominate.</span>
          </motion.h1>

          <motion.p
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.2, ease: [0.22, 1, 0.36, 1] }}
            className="mx-auto mt-5 max-w-2xl text-lg text-foreground-secondary leading-relaxed"
          >
            Your ultimate web game portal. Jump into classic puzzles, challenge
            friends in real-time, and climb the global leaderboards.
          </motion.p>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.3, ease: [0.22, 1, 0.36, 1] }}
            className="mt-8 flex flex-col sm:flex-row items-center justify-center gap-3"
          >
            <a
              href="#games"
              className="inline-flex h-12 items-center justify-center gap-2 rounded-xl bg-accent px-6 text-sm font-semibold text-white shadow-lg shadow-accent/25 transition-all duration-200 hover:bg-accent-hover hover:shadow-xl hover:shadow-accent/30 hover:-translate-y-0.5"
            >
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
                <polygon points="5 3 19 12 5 21 5 3" />
              </svg>
              Start Playing
            </a>
            <a
              href="/leaderboard"
              className="inline-flex h-12 items-center justify-center gap-2 rounded-xl border border-border px-6 text-sm font-semibold text-foreground transition-all duration-200 hover:bg-surface hover:border-border-hover hover:-translate-y-0.5"
            >
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M8.21 13.89L7 23l5-3 5 3-1.21-9.12" />
                <path d="M12 2l3.09 6.26L22 9.27l-5 4.87L18.18 21 12 17.27 5.82 21 7 14.14l-5-4.87 6.91-1.01L12 2z" />
              </svg>
              Leaderboard
            </a>
          </motion.div>
        </div>
      </section>

      {/* ── Stats Bar ────────────────────────────────────────────── */}
      <section className="px-4 pb-12 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-7xl grid grid-cols-2 lg:grid-cols-4 gap-4">
          <StatCard
            icon={
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <rect x="2" y="7" width="20" height="14" rx="2" ry="2" />
                <path d="M16 21V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v16" />
              </svg>
            }
            label="Games Available"
            value={String(GAMES.length)}
            delay={0.1}
          />
          <StatCard
            icon={
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
                <circle cx="9" cy="7" r="4" />
                <path d="M23 21v-2a4 4 0 0 0-3-3.87" />
                <path d="M16 3.13a4 4 0 0 1 0 7.75" />
              </svg>
            }
            label="Total Players"
            value={stats ? stats.totalPlayers.toLocaleString() : "…"}
            delay={0.2}
          />
          <StatCard
            icon={
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <circle cx="12" cy="12" r="10" />
                <circle cx="12" cy="12" r="3" />
              </svg>
            }
            label="Online Players"
            value={onlinePlayers !== null ? onlinePlayers.toLocaleString() : "…"}
            delay={0.3}
          />
          <StatCard
            icon={
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                <line x1="6" y1="6" x2="10" y2="10" />
                <line x1="10" y1="6" x2="6" y2="10" />
                <circle cx="16" cy="16" r="3" />
              </svg>
            }
            label="Caro Matches"
            value={stats ? stats.caroMatches.toLocaleString() : "…"}
            delay={0.4}
          />
        </div>
      </section>

      {/* ── Game Grid ────────────────────────────────────────────── */}
      <section id="games" className="px-4 pb-20 sm:px-6 lg:px-8 scroll-mt-20">
        <div className="mx-auto max-w-7xl">
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.5, delay: 0.3 }}
            className="mb-8 flex items-center justify-between"
          >
            <div>
              <h2 className="text-2xl font-bold text-foreground">Featured Games</h2>
              <p className="mt-1 text-sm text-foreground-secondary">
                Choose a game and start playing instantly
              </p>
            </div>
            <div className="hidden sm:flex items-center gap-2 text-sm text-foreground-muted">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <circle cx="11" cy="11" r="8" />
                <line x1="21" y1="21" x2="16.65" y2="16.65" />
              </svg>
              {GAMES.length} game{GAMES.length !== 1 ? "s" : ""}
            </div>
          </motion.div>

          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {GAMES.map((game, i) => (
              <GameCard key={game.id} game={game} index={i} />
            ))}

            {/* "Coming soon" placeholder card */}
            <motion.div
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{
                duration: 0.5,
                delay: GAMES.length * 0.15,
                ease: [0.22, 1, 0.36, 1],
              }}
            >
              <div className="flex h-full flex-col items-center justify-center rounded-2xl border-2 border-dashed border-border p-10 text-center transition-colors hover:border-border-hover hover:bg-surface">
                <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-accent-light text-accent">
                  <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                    <line x1="12" y1="5" x2="12" y2="19" />
                    <line x1="5" y1="12" x2="19" y2="12" />
                  </svg>
                </div>
                <h3 className="text-lg font-bold text-foreground mb-1">
                  More Games
                </h3>
                <p className="text-sm text-foreground-secondary max-w-[200px]">
                  New games are added regularly. Stay tuned!
                </p>
              </div>
            </motion.div>
          </div>
        </div>
      </section>
    </div>
  );
}
