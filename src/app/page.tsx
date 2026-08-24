'use client';

import { useState, useEffect, useMemo } from 'react';
import { motion } from 'framer-motion';
import { io } from 'socket.io-client';
import Link from 'next/link';

import { GAMES } from '@/config/games';
import {
  SmoothScroll,
  Hero3D,
  MagneticButton,
  GameCard3D,
  ComingSoonCard,
  DailySpotlight,
  ActiveRoomsBar,
  ArcadeToolbar,
  type GameCategory,
} from '@/components/landing';

// Kinetic animated rotating headline phrases
const KINETIC_PHRASES = [
  'Zero Latency Duels.',
  'Brain-Bending Logic.',
  '1v1 Real-Time Chess.',
  'Classic Web Puzzles.',
  'Global Leaderboards.',
];

// All 11 completed browser games for the Arcade Bento Grid
const COMPLETED_GAME_IDS = [
  'chess',
  'monopoly',
  'caro',
  'battleship',
  '2048',
  'wordle',
  'aimtrainer',
  'minesweeper',
  'sudoku',
  'trex',
  'wordchain',
];

// Upcoming teaser game profiles
const COMING_SOON_GAMES = [
  {
    id: 'pikachu',
    title: 'Pikachu Connect (Onet Link)',
    category: 'Animal Pair Matching',
    description:
      'The legendary 3-line animal tile connection classic. Link identical pairs with unobstructed pathlines, trigger combo lightning storms, and beat the ticking timer.',
    features: [
      'Classic & Shuffle challenge modes',
      'Dynamic pathfinding electric lines',
      'Multi-stage level progression',
      'Score multiplier combos',
    ],
    accentColor: 'from-amber-400 to-yellow-600',
    glowColor: 'bg-amber-500',
    icon: 'lightning' as const,
    status: 'In Active Development',
  },
  {
    id: 'brickbreaker',
    title: 'Neon Brick Breaker',
    category: 'Arcade Physics Action',
    description:
      'High-octane arcade voxel block breaker. Deflect laser-charged spheres, collect multi-ball power-ups, unlock rocket blasters, and shatter indestructible brick bosses.',
    features: [
      'Multi-ball & laser paddle power-ups',
      'Voxel physics particle explosions',
      'Boss encounter stages',
      'Endless arcade high-score mode',
    ],
    accentColor: 'from-rose-500 to-indigo-600',
    glowColor: 'bg-rose-500',
    icon: 'breakout' as const,
    status: 'Alpha Sandbox Phase',
  },
];

export default function HomePage() {
  const [onlinePlayers, setOnlinePlayers] = useState<number | null>(null);
  const [phraseIndex, setPhraseIndex] = useState(0);
  const [currentText, setCurrentText] = useState('');
  const [isDeleting, setIsDeleting] = useState(false);

  // Search & Category Filter State
  const [activeCategory, setActiveCategory] = useState<GameCategory>('all');
  const [searchQuery, setSearchQuery] = useState('');

  // ── 1. Typewriter Kinetic Phrase Rotation ─────────────────────
  useEffect(() => {
    const phrase = KINETIC_PHRASES[phraseIndex];
    let timer: NodeJS.Timeout;

    if (!isDeleting && currentText === phrase) {
      timer = setTimeout(() => setIsDeleting(true), 2000);
    } else if (isDeleting && currentText === '') {
      setIsDeleting(false);
      setPhraseIndex((prev) => (prev + 1) % KINETIC_PHRASES.length);
      timer = setTimeout(() => {}, 300);
    } else {
      const nextText = isDeleting
        ? phrase.substring(0, currentText.length - 1)
        : phrase.substring(0, currentText.length + 1);

      timer = setTimeout(() => setCurrentText(nextText), isDeleting ? 35 : 75);
    }

    return () => clearTimeout(timer);
  }, [currentText, isDeleting, phraseIndex]);

  // ── 2. Live WebSocket Player Count Connection ──────────────────
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

  // Filter all 11 completed arcade games in structured order
  const completedGames = useMemo(() => {
    return COMPLETED_GAME_IDS.map((id) => GAMES.find((g) => g.id === id)).filter(Boolean);
  }, []);

  // Category counts
  const categoryCounts = useMemo(() => {
    const multiplayer = completedGames.filter((g) => g && g.maxPlayers > 1).length;
    const puzzle = completedGames.filter((g) =>
      g && (g.tags.includes('Puzzle') || g.tags.includes('Logic') || g.tags.includes('Word') || g.tags.includes('Number'))
    ).length;
    const arcade = completedGames.filter((g) =>
      g && (g.tags.includes('Action') || g.tags.includes('Arcade') || g.tags.includes('Reflex') || g.tags.includes('Endless'))
    ).length;

    return [
      { id: 'all' as GameCategory, label: 'All Games', count: completedGames.length },
      { id: 'multiplayer' as GameCategory, label: 'Multiplayer Duels', count: multiplayer },
      { id: 'puzzle' as GameCategory, label: 'Logic & Puzzles', count: puzzle },
      { id: 'arcade' as GameCategory, label: 'Action & Reflex', count: arcade },
    ];
  }, [completedGames]);

  // Filtered games based on active category & search query
  const filteredGames = useMemo(() => {
    return completedGames.filter((game) => {
      if (!game) return false;

      // Category matching
      if (activeCategory === 'multiplayer' && game.maxPlayers <= 1) return false;
      if (
        activeCategory === 'puzzle' &&
        !game.tags.some((t) => ['Puzzle', 'Logic', 'Word', 'Number'].includes(t))
      ) {
        return false;
      }
      if (
        activeCategory === 'arcade' &&
        !game.tags.some((t) => ['Action', 'Arcade', 'Reflex', 'Endless'].includes(t))
      ) {
        return false;
      }

      // Keyword query matching
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matchTitle = game.title.toLowerCase().includes(q);
        const matchDesc = game.description.toLowerCase().includes(q);
        const matchTags = game.tags.some((t) => t.toLowerCase().includes(q));
        if (!matchTitle && !matchDesc && !matchTags) return false;
      }

      return true;
    });
  }, [completedGames, activeCategory, searchQuery]);

  return (
    <SmoothScroll>
      <div className="relative min-h-screen bg-[#050a18] text-white">
        {/* ── Background Subtle Ambient Grid ────────────────────────── */}
        <div className="pointer-events-none fixed inset-0 z-0 bg-[linear-gradient(to_right,#1e293b15_1px,transparent_1px),linear-gradient(to_bottom,#1e293b15_1px,transparent_1px)] bg-[size:48px_48px]" />

        {/* ── SECTION 1: HERO SECTION ──────────────────────────────── */}
        <section className="relative flex min-h-[calc(100vh-4rem)] w-full items-center justify-center overflow-hidden px-4 sm:px-6 lg:px-8 py-20">
          {/* Interactive WebGL Three.js Hero Canvas */}
          <Hero3D />

          <div className="relative z-10 mx-auto max-w-5xl text-center">
            {/* Live Multiplayer Status Badge */}
            <motion.div
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5 }}
              className="mb-8 inline-flex items-center gap-3 rounded-full border border-slate-800 bg-slate-900/80 px-4 py-1.5 text-xs sm:text-sm font-semibold text-slate-300 backdrop-blur-xl shadow-lg shadow-black/40"
            >
              <span className="relative flex h-2.5 w-2.5">
                <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-75" />
                <span className="relative inline-flex h-2.5 w-2.5 rounded-full bg-emerald-500" />
              </span>
              <span className="font-mono">{onlinePlayers !== null ? `${onlinePlayers} Players Online` : 'Live Multiplayer Engine'}</span>
              <span className="text-slate-700">•</span>
              <span className="text-sky-400 font-mono">{completedGames.length} Playable Games</span>
            </motion.div>

            {/* Kinetic Typography Headline */}
            <motion.h1
              initial={{ opacity: 0, y: 24 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.7, delay: 0.1, ease: [0.16, 1, 0.3, 1] }}
              className="text-4xl sm:text-6xl lg:text-7xl font-black tracking-tight text-white leading-[1.1]"
            >
              The Next-Gen Arcade for
              <div className="mt-2 flex items-center justify-center min-h-[56px] sm:min-h-[84px]">
                <span className="text-sky-400 font-black">
                  {currentText || '\u00A0'}
                </span>
                <span className="ml-1.5 inline-block w-[3px] sm:w-[4px] h-[36px] sm:h-[56px] bg-sky-400 rounded-full animate-pulse align-middle" />
              </div>
            </motion.h1>

            {/* Subtitle */}
            <motion.p
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.25 }}
              className="mt-6 text-base sm:text-lg lg:text-xl text-slate-400 max-w-2xl mx-auto leading-relaxed"
            >
              Pure browser gaming engineered with zero latency, instant room codes, and responsive design. Challenge friends or climb the leaderboards solo.
            </motion.p>

            {/* CTA Group with Magnetic Button */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.35 }}
              className="mt-10 flex flex-wrap items-center justify-center gap-4"
            >
              {/* Primary Magnetic CTA */}
              <MagneticButton href="#arcade" strength={0.4}>
                <span className="inline-flex h-13 items-center justify-center gap-2.5 rounded-xl bg-gradient-to-r from-sky-500 to-blue-600 px-8 text-sm font-bold text-white shadow-xl shadow-sky-500/25 transition-all duration-300 hover:from-sky-400 hover:to-blue-500 hover:shadow-2xl hover:shadow-sky-500/40">
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
                    <polygon points="5 3 19 12 5 21 5 3" />
                  </svg>
                  Play Now
                </span>
              </MagneticButton>

              {/* Secondary Navigation Actions */}
              <Link
                href="/games"
                className="inline-flex h-13 items-center justify-center gap-2 rounded-xl border border-slate-800 bg-slate-900/80 px-6 text-sm font-semibold text-slate-200 backdrop-blur-xl transition-all duration-200 hover:border-slate-700 hover:bg-slate-800/80 hover:text-white"
              >
                Browse All Games ({GAMES.length})
              </Link>

              <Link
                href="/leaderboard"
                className="inline-flex h-13 items-center justify-center gap-2 rounded-xl border border-slate-800 bg-slate-900/80 px-6 text-sm font-semibold text-slate-200 backdrop-blur-xl transition-all duration-200 hover:border-slate-700 hover:bg-slate-800/80 hover:text-white"
              >
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M8.21 13.89L7 23l5-3 5 3-1.21-9.12" />
                  <path d="M12 2l3.09 6.26L22 9.27l-5 4.87L18.18 21 12 17.27 5.82 21 7 14.14l-5-4.87 6.91-1.01L12 2z" />
                </svg>
                Leaderboards
              </Link>
            </motion.div>

            {/* Micro-Features Indicator */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 0.8, delay: 0.5 }}
              className="mt-14 flex flex-wrap items-center justify-center gap-6 sm:gap-10 text-xs text-slate-400"
            >
              <div className="flex items-center gap-2">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" className="text-sky-400">
                  <polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2" />
                </svg>
                <span>Zero Downloads</span>
              </div>
              <div className="flex items-center gap-2">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="text-sky-400">
                  <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
                  <path d="M7 11V7a5 5 0 0 1 10 0v4" />
                </svg>
                <span>Private Room Codes</span>
              </div>
              <div className="flex items-center gap-2">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="text-sky-400">
                  <rect x="5" y="2" width="14" height="20" rx="2" ry="2" />
                  <line x1="12" y1="18" x2="12.01" y2="18" />
                </svg>
                <span>100% Mobile & Desktop</span>
              </div>
            </motion.div>
          </div>
        </section>

        {/* ── SECTION 2: DAILY CHALLENGE SPOTLIGHT ─────────────────── */}
        <DailySpotlight />

        {/* ── SECTION 3: LIVE MULTIPLAYER LOBBIES ───────────────────── */}
        <ActiveRoomsBar />

        {/* ── SECTION 4: THE ARCADE CATALOG (BENTO GRID) ───────────── */}
        <section id="arcade" className="relative z-10 px-4 py-20 sm:px-6 lg:px-8">
          <div className="mx-auto max-w-7xl">
            {/* Section Header */}
            <div className="flex flex-col md:flex-row md:items-end justify-between mb-8 gap-4">
              <div>
                <h2 className="text-3xl sm:text-4xl font-extrabold tracking-tight text-white">
                  The Arcade
                </h2>
                <p className="mt-2 text-sm sm:text-base text-slate-400 max-w-xl">
                  {completedGames.length} completed browser experiences ready for instant match play, strategic duels, and puzzle mastery.
                </p>
              </div>

              <Link
                href="/games"
                className="inline-flex items-center gap-1.5 text-sm font-semibold text-sky-400 hover:text-sky-300 transition-colors"
              >
                <span>View Complete Registry</span>
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M5 12h14M12 5l7 7-7 7" />
                </svg>
              </Link>
            </div>

            {/* Interactive Category & Search Toolbar */}
            <ArcadeToolbar
              categories={categoryCounts}
              activeCategory={activeCategory}
              onSelectCategory={setActiveCategory}
              searchQuery={searchQuery}
              onSearchChange={setSearchQuery}
              totalFiltered={filteredGames.length}
            />

            {/* Games Grid or Empty Search Fallback */}
            {filteredGames.length > 0 ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                {filteredGames.map((game, i) => {
                  if (!game) return null;
                  // Featured 2-col span for Chess & Monopoly when showing all games with no search filter
                  const isWide =
                    activeCategory === 'all' && !searchQuery.trim() && (game.id === 'chess' || game.id === 'monopoly');

                  return (
                    <GameCard3D
                      key={game.id}
                      game={game}
                      index={i}
                      featured={isWide}
                      className={isWide ? 'sm:col-span-2 lg:col-span-2' : 'col-span-1'}
                    />
                  );
                })}
              </div>
            ) : (
              <div className="rounded-3xl border border-slate-800 bg-slate-900/40 p-12 text-center backdrop-blur-xl">
                <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-slate-800 text-slate-400 mb-4">
                  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <circle cx="11" cy="11" r="8" />
                    <line x1="21" y1="21" x2="16.65" y2="16.65" />
                  </svg>
                </div>
                <h3 className="text-xl font-bold text-white">No games found</h3>
                <p className="mt-2 text-sm text-slate-400 max-w-md mx-auto">
                  No games matched &ldquo;{searchQuery}&rdquo; in this category. Try adjusting your search keyword or clearing the filter.
                </p>
                <button
                  onClick={() => {
                    setSearchQuery('');
                    setActiveCategory('all');
                  }}
                  className="mt-6 inline-flex items-center gap-2 rounded-xl bg-slate-800 px-5 py-2.5 text-xs font-semibold text-slate-200 transition-colors hover:bg-slate-700 hover:text-white"
                >
                  Reset Search & Filters
                </button>
              </div>
            )}
          </div>
        </section>

        {/* ── SECTION 5: COMING SOON (ROADMAP) ──────────────────────── */}
        <section className="relative z-10 px-4 py-20 sm:px-6 lg:px-8 border-t border-slate-900 bg-slate-950/40">
          <div className="mx-auto max-w-7xl">
            <div className="text-center max-w-2xl mx-auto mb-14">
              <h2 className="text-3xl sm:text-4xl font-extrabold tracking-tight text-white">
                Coming Next to the Portal
              </h2>
              <p className="mt-2 text-sm sm:text-base text-slate-400">
                We are actively engineering next-gen arcade experiences. Here is an exclusive preview of what arrives next.
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
              {COMING_SOON_GAMES.map((game, i) => (
                <ComingSoonCard key={game.id} game={game} index={i} />
              ))}
            </div>
          </div>
        </section>

        {/* ── SECTION 6: PLATFORM PILLARS (TECH EXCELLENCE) ─────────── */}
        <section className="relative z-10 px-4 py-20 sm:px-6 lg:px-8">
          <div className="mx-auto max-w-7xl rounded-3xl border border-slate-800 bg-slate-900/50 p-8 sm:p-14 backdrop-blur-2xl">
            <div className="text-center max-w-2xl mx-auto mb-14">
              <h2 className="text-3xl sm:text-4xl font-extrabold tracking-tight text-white">
                Built Without Compromise
              </h2>
              <p className="mt-2 text-sm text-slate-400">
                Under the hood, GamePortal leverages modern web standards for fluid gameplay and real-time connectivity.
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
              <div className="rounded-2xl border border-slate-800 bg-slate-950/80 p-6 space-y-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-sky-500/10 border border-sky-500/20 text-sky-400 font-bold text-lg">
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                    <polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2" />
                  </svg>
                </div>
                <h3 className="text-lg font-bold text-white">Zero Installs, Instant Run</h3>
                <p className="text-sm text-slate-400 leading-relaxed">
                  No bulky downloads or app store hurdles. Built with Next.js App Router for instant sub-second cold loads on every device.
                </p>
              </div>

              <div className="rounded-2xl border border-slate-800 bg-slate-950/80 p-6 space-y-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-violet-500/10 border border-violet-500/20 text-violet-400 font-bold text-lg">
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M4.93 4.93a10 10 0 0 1 14.14 0" />
                    <path d="M7.76 7.76a6 6 0 0 1 8.48 0" />
                    <circle cx="12" cy="12" r="2" fill="currentColor" />
                    <line x1="12" y1="14" x2="12" y2="20" />
                  </svg>
                </div>
                <h3 className="text-lg font-bold text-white">Real-Time WebSocket Sync</h3>
                <p className="text-sm text-slate-400 leading-relaxed">
                  Private room matchmaking with ultra-low latency state broadcasting for intense multiplayer Caro, Chess, Monopoly, and Battleship.
                </p>
              </div>

              <div className="rounded-2xl border border-slate-800 bg-slate-950/80 p-6 space-y-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 font-bold text-lg">
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M6 9H4.5a2.5 2.5 0 0 1 0-5H6" />
                    <path d="M18 9h1.5a2.5 2.5 0 0 0 0-5H18" />
                    <path d="M4 22h16" />
                    <path d="M10 14.66V17c0 .55-.45 1-1 1H7" />
                    <path d="M14 14.66V17c0 .55.45 1 1 1h2" />
                    <path d="M18 2H6v7a6 6 0 0 0 12 0V2Z" />
                  </svg>
                </div>
                <h3 className="text-lg font-bold text-white">Ranked Leaderboards</h3>
                <p className="text-sm text-slate-400 leading-relaxed">
                  Compete for glory. Track high scores in 2048, Minesweeper, Wordle, and Sudoku with persistent cloud stat profiles.
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* ── SECTION 7: FINAL CALL TO ACTION ──────────────────────── */}
        <section className="relative z-10 px-4 pb-20 sm:px-6 lg:px-8">
          <div className="mx-auto max-w-7xl">
            <div className="relative overflow-hidden rounded-3xl border border-slate-800 bg-gradient-to-b from-slate-900 via-sky-950/20 to-slate-900 p-10 sm:p-16 text-center backdrop-blur-2xl">
              {/* Radial glow background aura */}
              <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 h-80 w-80 rounded-full bg-sky-500/15 blur-3xl pointer-events-none" />

              <div className="relative z-10 max-w-2xl mx-auto space-y-6">
                <h2 className="text-3xl sm:text-5xl font-black tracking-tight text-white">
                  Ready to Challenge the <span className="text-sky-400">Arcade?</span>
                </h2>
                <p className="text-slate-400 text-sm sm:text-base">
                  Free forever. Jump into single-player challenges or create a room to duel with friends immediately.
                </p>

                <div className="pt-4 flex flex-wrap items-center justify-center gap-4">
                  <MagneticButton href="#arcade" strength={0.35}>
                    <span className="inline-flex h-12 items-center justify-center rounded-xl bg-gradient-to-r from-sky-500 to-blue-600 px-8 text-sm font-bold text-white shadow-lg shadow-sky-500/25 transition-all hover:from-sky-400 hover:to-blue-500">
                      Explore All {completedGames.length} Games Now
                    </span>
                  </MagneticButton>

                  <a
                    href="https://github.com/lehuuhlong/game-app"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex h-12 items-center justify-center gap-2 rounded-xl border border-slate-800 bg-slate-900 px-6 text-sm font-semibold text-slate-300 hover:border-slate-700 hover:text-white transition-colors"
                  >
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
                      <path fillRule="evenodd" clipRule="evenodd" d="M12 2C6.477 2 2 6.484 2 12.017c0 4.425 2.865 8.18 6.839 9.504.5.092.682-.217.682-.483 0-.237-.008-.868-.013-1.703-2.782.605-3.369-1.343-3.369-1.343-.454-1.158-1.11-1.466-1.11-1.466-.908-.62.069-.608.069-.608 1.003.07 1.53 1.032 1.53 1.032.892 1.53 2.341 1.088 2.91.832.092-.647.35-1.088.636-1.338-2.22-.253-4.555-1.113-4.555-4.951 0-1.093.39-1.988 1.029-2.688-.103-.253-.446-1.272.098-2.65 0 0 .84-.27 2.75 1.026A9.564 9.564 0 0112 6.844c.85.004 1.705.115 2.504.337 1.909-1.296 2.747-1.027 2.747-1.027.546 1.379.202 2.398.1 2.651.64.7 1.028 1.595 1.028 2.688 0 3.848-2.339 4.695-4.566 4.943.359.309.678.92.678 1.855 0 1.338-.012 2.419-.012 2.747 0 .268.18.58.688.482A10.019 10.019 0 0022 12.017C22 6.484 17.522 2 12 2z" />
                    </svg>
                    <span>View Source Code</span>
                  </a>
                </div>
              </div>
            </div>
          </div>
        </section>
      </div>
    </SmoothScroll>
  );
}
