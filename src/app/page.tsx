'use client';

import { GAMES } from '@/config/games';
import { GameCard } from '@/components/shared/GameCard';
import { motion } from 'framer-motion';
import { useState, useEffect } from 'react';
import { io } from 'socket.io-client';
import Link from 'next/link';

const ROTATING_WORDS = [
  'Real-Time Battles',
  'Brain Puzzles',
  '1v1 Chess Duels',
  'Instant Multiplayer',
  'Global Leaderboards',
];

export default function HomePage() {
  const [onlinePlayers, setOnlinePlayers] = useState<number | null>(null);
  const [wordIndex, setWordIndex] = useState(0);
  const [currentText, setCurrentText] = useState('');
  const [isDeleting, setIsDeleting] = useState(false);

  // Typewriter effect rotating between phrases
  useEffect(() => {
    const word = ROTATING_WORDS[wordIndex];
    let timeout: NodeJS.Timeout;

    if (!isDeleting && currentText === word) {
      // Pause at full word
      timeout = setTimeout(() => {
        setIsDeleting(true);
      }, 1800);
    } else if (isDeleting && currentText === '') {
      // Advance to next word
      setIsDeleting(false);
      setWordIndex((prev) => (prev + 1) % ROTATING_WORDS.length);
      timeout = setTimeout(() => {}, 250);
    } else {
      // Type or delete next char
      const nextText = isDeleting
        ? word.substring(0, currentText.length - 1)
        : word.substring(0, currentText.length + 1);

      timeout = setTimeout(
        () => {
          setCurrentText(nextText);
        },
        isDeleting ? 45 : 85
      );
    }

    return () => clearTimeout(timeout);
  }, [currentText, isDeleting, wordIndex]);

  useEffect(() => {
    const socketUrl = process.env.NEXT_PUBLIC_SOCKET_URL || 'http://localhost:4000';
    const socket = io(socketUrl, {
      transports: ['websocket', 'polling'],
    });

    socket.on('online_players_count', (count: number) => {
      setOnlinePlayers(count);
    });

    return () => {
      socket.disconnect();
    };
  }, []);

  // Top trending showcase games
  const spotlightGames = GAMES.filter((g) => ['chess', 'caro', 'battleship'].includes(g.id));

  return (
    <div className="relative overflow-hidden">
      {/* ── Background Ambient Lights ────────────────────────────── */}
      <div className="pointer-events-none fixed inset-0 -z-10">
        <div className="bg-orb bg-orb-1" />
        <div className="bg-orb bg-orb-2" />
        <div className="bg-orb bg-orb-3" />
      </div>

      {/* ── 1. HERO SECTION ──────────────────────────────────────── */}
      <section className="relative px-4 pt-16 pb-16 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-7xl">
          <div className="text-center max-w-3xl mx-auto">
            {/* Live Online Badge */}
            <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }}>
              <div className="mb-6 inline-flex items-center gap-2.5 rounded-full border border-border bg-surface/80 backdrop-blur-md px-4 py-1.5 text-xs sm:text-sm font-semibold text-foreground-secondary shadow-sm">
                <span className="relative flex h-2.5 w-2.5">
                  <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-75" />
                  <span className="relative inline-flex h-2.5 w-2.5 rounded-full bg-emerald-500" />
                </span>
                <span>{onlinePlayers !== null ? `${onlinePlayers} Players Online` : 'Live Multiplayer'}</span>
                <span className="text-foreground-muted">•</span>
                <span className="text-accent">{GAMES.length} Free Games</span>
              </div>
            </motion.div>

            {/* Main Headline with Typewriter Loop */}
            <motion.h1
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.1 }}
              className="text-4xl sm:text-6xl font-black tracking-tight text-foreground leading-[1.2] flex flex-col items-center justify-center min-h-[96px] sm:min-h-[148px]"
            >
              <span>Classic Games</span>
              <span className="inline-flex items-center text-gradient mt-1">
                <span>{currentText || '\u00A0'}</span>
                <span className="ml-1 inline-block w-[3px] sm:w-[4px] h-[34px] sm:h-[50px] bg-accent rounded-full animate-pulse align-middle" />
              </span>
            </motion.h1>

            {/* Subtitle */}
            <motion.p
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.2 }}
              className="mt-4 text-base sm:text-lg text-foreground-secondary max-w-xl mx-auto leading-relaxed"
            >
              Play solo puzzles or challenge friends in real-time rooms. Zero installs, no lag, pure fun.
            </motion.p>

            {/* CTA Buttons */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.3 }}
              className="mt-8 flex flex-wrap items-center justify-center gap-3 sm:gap-4"
            >
              <Link
                href="/games"
                className="inline-flex h-12 items-center justify-center gap-2 rounded-xl bg-accent px-7 text-sm font-bold text-white shadow-lg shadow-accent/25 transition-all duration-200 hover:bg-accent-hover hover:shadow-xl hover:shadow-accent/30 hover:-translate-y-0.5"
              >
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                  <polygon points="5 3 19 12 5 21 5 3" />
                </svg>
                Explore All Games
              </Link>
              <Link
                href="/games/chess"
                className="inline-flex h-12 items-center justify-center gap-2 rounded-xl border border-border bg-surface/80 backdrop-blur-md px-6 text-sm font-semibold text-foreground transition-all duration-200 hover:bg-surface hover:border-border-hover hover:-translate-y-0.5"
              >
                <span>♟️</span> Play Chess Online
              </Link>
              <Link
                href="/leaderboard"
                className="inline-flex h-12 items-center justify-center gap-2 rounded-xl border border-border bg-surface/80 backdrop-blur-md px-6 text-sm font-semibold text-foreground transition-all duration-200 hover:bg-surface hover:border-border-hover hover:-translate-y-0.5"
              >
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M8.21 13.89L7 23l5-3 5 3-1.21-9.12" />
                  <path d="M12 2l3.09 6.26L22 9.27l-5 4.87L18.18 21 12 17.27 5.82 21 7 14.14l-5-4.87 6.91-1.01L12 2z" />
                </svg>
                Leaderboard
              </Link>
            </motion.div>
          </div>
        </div>
      </section>

      {/* ── 3. FEATURED & TRENDING SPOTLIGHT ────────────────────── */}
      <section className="px-4 pb-20 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-7xl">
          <div className="flex flex-col sm:flex-row sm:items-end justify-between mb-8 gap-4">
            <div>
              <div className="inline-flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-accent mb-2">
                <span>🔥</span> Top Trending Games
              </div>
              <h2 className="text-2xl sm:text-3xl font-extrabold text-foreground tracking-tight">Player Favorites</h2>
              <p className="mt-1 text-sm text-foreground-secondary">Our most contested online multiplayer battles and addictive solo puzzles.</p>
            </div>
          </div>

          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {spotlightGames.slice(0, 3).map((game, i) => (
              <GameCard key={game.id} game={game} index={i} />
            ))}
          </div>

          {/* Full Library Banner Callout */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="mt-8 rounded-2xl border border-border bg-gradient-to-r from-accent/10 via-surface to-accent/5 p-6 sm:p-8 flex flex-col sm:flex-row items-center justify-between gap-6 shadow-sm"
          >
            <div className="space-y-1 text-center sm:text-left">
              <h3 className="text-xl font-bold text-foreground">Looking for more games?</h3>
              <p className="text-sm text-foreground-secondary">
                Explore Battleship, Monopoly, Minesweeper, Sudoku, T-Rex Runner, Aim Trainer, and Word Chain!
              </p>
            </div>
            <Link
              href="/games"
              className="whitespace-nowrap px-6 py-3 rounded-xl bg-accent text-white font-bold text-sm shadow-md hover:bg-accent-hover hover:-translate-y-0.5 transition-all"
            >
              Open Game Library ({GAMES.length}) →
            </Link>
          </motion.div>
        </div>
      </section>

      {/* ── 4. GAME CATEGORIES ──────────────────────────────────── */}
      <section className="px-4 pb-20 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-7xl">
          <div className="text-center max-w-2xl mx-auto mb-12">
            <h2 className="text-2xl sm:text-3xl font-extrabold text-foreground tracking-tight">Explore by Category</h2>
            <p className="mt-2 text-sm text-foreground-secondary">
              Whether you want a quick 2-minute brain workout or an intense 1v1 tactical match.
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
            {/* Category 1: Multiplayer */}
            <Link
              href="/games?filter=multiplayer"
              className="group rounded-2xl border border-border bg-surface p-6 transition-all duration-300 hover:border-violet-500/50 hover:shadow-lg hover:-translate-y-1"
            >
              <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-violet-500/10 text-violet-500 mb-4 group-hover:scale-110 transition-transform">
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
                  <circle cx="9" cy="7" r="4" />
                  <path d="M23 21v-2a4 4 0 0 0-3-3.87" />
                  <path d="M16 3.13a4 4 0 0 1 0 7.75" />
                </svg>
              </div>
              <h3 className="font-bold text-foreground text-lg group-hover:text-violet-500 transition-colors">Real-Time Multiplayer</h3>
              <p className="text-xs text-foreground-secondary mt-1.5">Chess, Caro, Battleship, Monopoly, and Word Chain with instant room codes.</p>
              <div className="mt-4 text-xs font-semibold text-violet-500 flex items-center gap-1">5 Games Available →</div>
            </Link>

            {/* Category 2: Logic & Puzzles */}
            <Link
              href="/games?filter=puzzle"
              className="group rounded-2xl border border-border bg-surface p-6 transition-all duration-300 hover:border-amber-500/50 hover:shadow-lg hover:-translate-y-1"
            >
              <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-amber-500/10 text-amber-500 mb-4 group-hover:scale-110 transition-transform">
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z" />
                  <polyline points="3.27 6.96 12 12.01 20.73 6.96" />
                  <line x1="12" y1="22.08" x2="12" y2="12" />
                </svg>
              </div>
              <h3 className="font-bold text-foreground text-lg group-hover:text-amber-500 transition-colors">Brain & Puzzles</h3>
              <p className="text-xs text-foreground-secondary mt-1.5">2048, Sudoku, Wordle, and Minesweeper to test your deduction skills.</p>
              <div className="mt-4 text-xs font-semibold text-amber-500 flex items-center gap-1">4 Games Available →</div>
            </Link>

            {/* Category 3: Strategy */}
            <Link
              href="/games?filter=strategy"
              className="group rounded-2xl border border-border bg-surface p-6 transition-all duration-300 hover:border-sky-500/50 hover:shadow-lg hover:-translate-y-1"
            >
              <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-sky-500/10 text-sky-500 mb-4 group-hover:scale-110 transition-transform">
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <circle cx="12" cy="12" r="10" />
                  <path d="M12 2a14.5 14.5 0 0 0 0 20 14.5 14.5 0 0 0 0-20" />
                  <path d="M2 12h20" />
                </svg>
              </div>
              <h3 className="font-bold text-foreground text-lg group-hover:text-sky-500 transition-colors">Tactics & Strategy</h3>
              <p className="text-xs text-foreground-secondary mt-1.5">Outthink your opponent in high-stakes Chess, Gomoku, and Naval Combat.</p>
              <div className="mt-4 text-xs font-semibold text-sky-500 flex items-center gap-1">4 Games Available →</div>
            </Link>

            {/* Category 4: Casual & Speed */}
            <Link
              href="/games?filter=all"
              className="group rounded-2xl border border-border bg-surface p-6 transition-all duration-300 hover:border-emerald-500/50 hover:shadow-lg hover:-translate-y-1"
            >
              <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-emerald-500/10 text-emerald-500 mb-4 group-hover:scale-110 transition-transform">
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2" />
                </svg>
              </div>
              <h3 className="font-bold text-foreground text-lg group-hover:text-emerald-500 transition-colors">Arcade & Reflex</h3>
              <p className="text-xs text-foreground-secondary mt-1.5">Fast-paced T-Rex infinite runner, Aim Trainer reflexes, and casual fun.</p>
              <div className="mt-4 text-xs font-semibold text-emerald-500 flex items-center gap-1">Explore All →</div>
            </Link>
          </div>
        </div>
      </section>

      {/* ── 5. WHY PLAY ON GAMEPORTAL (FEATURES) ────────────────── */}
      <section className="px-4 pb-20 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-7xl rounded-3xl border border-border bg-surface/50 backdrop-blur-md p-8 sm:p-12">
          <div className="text-center max-w-2xl mx-auto mb-12">
            <h2 className="text-2xl sm:text-3xl font-extrabold text-foreground tracking-tight">Why Play on Game<span className="text-gradient">Portal?</span></h2>
            <p className="mt-2 text-sm text-foreground-secondary">
              Engineered from the ground up for seamless, responsive, and competitive web gaming.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="rounded-2xl border border-border bg-surface p-6 space-y-3">
              <div className="inline-flex h-11 w-11 items-center justify-center rounded-xl bg-accent-light text-accent text-xl">⚡</div>
              <h3 className="text-base font-bold text-foreground">Instant Zero-Install Play</h3>
              <p className="text-sm text-foreground-secondary leading-relaxed">
                No apps, no heavy downloads, no loading screens. Open any browser on your computer, tablet, or phone and start playing in
                milliseconds.
              </p>
            </div>

            <div className="rounded-2xl border border-border bg-surface p-6 space-y-3">
              <div className="inline-flex h-11 w-11 items-center justify-center rounded-xl bg-accent-light text-accent text-xl">🌐</div>
              <h3 className="text-base font-bold text-foreground">Real-Time Peer Rooms</h3>
              <p className="text-sm text-foreground-secondary leading-relaxed">
                Create a private room, copy the 6-character code, and share it with friends for instant, low-latency multiplayer matches powered by
                WebSockets.
              </p>
            </div>

            <div className="rounded-2xl border border-border bg-surface p-6 space-y-3">
              <div className="inline-flex h-11 w-11 items-center justify-center rounded-xl bg-accent-light text-accent text-xl">🏆</div>
              <h3 className="text-base font-bold text-foreground">Ranked Leaderboards</h3>
              <p className="text-sm text-foreground-secondary leading-relaxed">
                Log in to save your personal bests, track match records, and compete with other players to rank at the top of the global leaderboards.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* ── 6. HOW IT WORKS (3 STEPS) ────────────────────────────── */}
      <section className="px-4 pb-20 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-7xl">
          <div className="text-center max-w-2xl mx-auto mb-12">
            <h2 className="text-2xl sm:text-3xl font-extrabold text-foreground tracking-tight">Get Started in 3 Simple Steps</h2>
            <p className="mt-2 text-sm text-foreground-secondary">From zero to playing with friends in under 10 seconds.</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="rounded-2xl border border-border bg-surface p-6 space-y-3 relative">
              <span className="text-4xl font-black text-accent/20 absolute top-4 right-5">01</span>
              <div className="h-9 w-9 rounded-xl bg-accent text-white flex items-center justify-center font-bold text-sm">1</div>
              <h3 className="font-bold text-foreground text-lg">Pick a Game</h3>
              <p className="text-sm text-foreground-secondary">
                Browse our collection of 11 multiplayer battles and single-player puzzles in the Game Library.
              </p>
            </div>

            <div className="rounded-2xl border border-border bg-surface p-6 space-y-3 relative">
              <span className="text-4xl font-black text-accent/20 absolute top-4 right-5">02</span>
              <div className="h-9 w-9 rounded-xl bg-accent text-white flex items-center justify-center font-bold text-sm">2</div>
              <h3 className="font-bold text-foreground text-lg">Create or Join Room</h3>
              <p className="text-sm text-foreground-secondary">
                Play solo immediately or generate a room code to duel with friends in real-time online.
              </p>
            </div>

            <div className="rounded-2xl border border-border bg-surface p-6 space-y-3 relative">
              <span className="text-4xl font-black text-accent/20 absolute top-4 right-5">03</span>
              <div className="h-9 w-9 rounded-xl bg-accent text-white flex items-center justify-center font-bold text-sm">3</div>
              <h3 className="font-bold text-foreground text-lg">Climb Leaderboard</h3>
              <p className="text-sm text-foreground-secondary">
                Win matches, achieve high scores, and solidify your reputation as a top-ranked champion.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* ── 7. BOTTOM CTA BANNER ─────────────────────────────────── */}
      <section className="px-4 pb-20 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-7xl">
          <div className="relative rounded-3xl overflow-hidden border border-border bg-gradient-to-b from-surface/90 via-accent/[0.04] to-surface/70 backdrop-blur-xl p-8 sm:p-14 text-center shadow-sm">
            {/* Subtle soft ambient glow in the background */}
            <div className="absolute -top-24 left-1/2 -translate-x-1/2 w-96 h-48 bg-accent/10 rounded-full blur-3xl pointer-events-none" />

            <div className="relative z-10 max-w-2xl mx-auto space-y-6">
              <h2 className="text-3xl sm:text-4xl lg:text-5xl font-extrabold text-foreground tracking-tight leading-tight">
                Ready to Challenge <span className="text-gradient">Your Friends?</span>
              </h2>
              <p className="text-foreground-secondary text-sm sm:text-base max-w-xl mx-auto">
                Jump into the arcade right now. Free forever, no registration required to play.
              </p>
              <div className="pt-2 flex flex-wrap justify-center gap-3">
                <Link
                  href="/games"
                  className="px-7 py-3 rounded-xl bg-accent text-white font-bold text-sm shadow-md hover:bg-accent-hover transition-all"
                >
                  Browse Game Library
                </Link>
                <Link
                  href="/leaderboard"
                  className="px-7 py-3 rounded-xl bg-surface border border-border text-foreground hover:bg-surface-hover hover:border-accent/30 font-semibold text-sm transition-all shadow-xs"
                >
                  View Leaderboard
                </Link>
              </div>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
