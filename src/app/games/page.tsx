'use client';

import React, { useState, useMemo, useEffect, useRef, Suspense } from 'react';
import Link from 'next/link';
import { motion, AnimatePresence } from 'framer-motion';
import { useSearchParams } from 'next/navigation';
import { GAMES, type GameInfo } from '@/config/games';
import { GameCard3D } from '@/components/landing/GameCard3D';
import { getGameSvgIcon } from '@/components/landing/GameIcons';

const GENRE_TAGS = [
  'All',
  'Board Game',
  'Puzzle',
  'Strategy',
  'Single Player',
  'Action',
  'Reflex',
];

type PlayerFilter = 'all' | 'solo' | 'multiplayer';
type ViewMode = 'grid' | 'list';
type SortOption = 'featured' | 'name' | 'players';

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

function CompactGameRow({ game, index }: { game: GameInfo; index: number }) {
  const isMultiplayer = game.maxPlayers > 1;
  const duration = GAME_DURATIONS[game.id] || '5–15m';

  return (
    <motion.div
      initial={{ opacity: 0, y: 15 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3, delay: Math.min(index * 0.025, 0.2) }}
      className="group relative overflow-hidden rounded-2xl border border-border bg-surface/95 dark:bg-surface/90 p-4 sm:p-5 shadow-xs transition-all duration-200 hover:border-sky-500/40 hover:bg-surface-hover hover:shadow-md"
    >
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        {/* Left: Styled Gradient Icon Badge + Game Details */}
        <div className="flex items-center gap-4 min-w-0">
          <div
            className={`relative flex h-14 w-14 sm:h-16 sm:w-16 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br ${game.color} p-3 text-white shadow-md shadow-black/10 transition-transform duration-300 group-hover:scale-105 group-hover:rotate-2`}
          >
            {getGameSvgIcon(game.id, 'text-white', 30)}
          </div>

          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-2">
              <Link
                href={game.route}
                className="font-black text-lg sm:text-xl text-foreground hover:text-accent transition-colors truncate"
              >
                {game.title}
              </Link>

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

              <span className="rounded-md bg-background border border-border px-2 py-0.5 font-mono text-xs text-foreground-muted">
                ⏱ {duration}
              </span>
            </div>

            <p className="mt-1 text-xs sm:text-sm text-foreground-secondary line-clamp-1 leading-relaxed">
              {game.description}
            </p>

            <div className="mt-2 flex flex-wrap gap-1.5">
              {game.tags.map((tag) => (
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

        {/* Right: Quick Action Launchers */}
        <div className="flex items-center gap-2 shrink-0 self-end sm:self-center">
          <Link
            href={game.route}
            className="inline-flex items-center justify-center gap-1.5 rounded-xl bg-gradient-to-r from-sky-500 to-blue-600 px-5 py-2.5 text-xs font-bold text-white shadow-md shadow-sky-500/20 hover:from-sky-400 hover:to-blue-500 transition-all"
          >
            <svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor">
              <polygon points="5 3 19 12 5 21 5 3" />
            </svg>
            <span>{isMultiplayer ? 'Play Solo' : 'Play Now'}</span>
          </Link>

          {isMultiplayer && (
            <Link
              href={`${game.route}?mode=multiplayer`}
              className="inline-flex items-center justify-center gap-1.5 rounded-xl border border-violet-500/40 bg-violet-500/10 px-5 py-2.5 text-xs font-bold text-violet-600 dark:text-violet-300 hover:bg-violet-500/20 transition-all"
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

function GamesCatalogContent() {
  const searchParams = useSearchParams();
  const initialFilter = searchParams.get('filter') || 'All';

  const [searchQuery, setSearchQuery] = useState('');
  const [selectedTag, setSelectedTag] = useState(
    GENRE_TAGS.find((t) => t.toLowerCase() === initialFilter.toLowerCase()) || 'All'
  );
  const [playerFilter, setPlayerFilter] = useState<PlayerFilter>('all');
  const [sortBy, setSortBy] = useState<SortOption>('featured');
  const [viewMode, setViewMode] = useState<ViewMode>('grid');

  const searchInputRef = useRef<HTMLInputElement>(null);

  // ── Keyboard shortcut `/` to focus search input ─────────────
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (
        e.key === '/' &&
        document.activeElement !== searchInputRef.current &&
        !['INPUT', 'TEXTAREA'].includes((document.activeElement as HTMLElement)?.tagName)
      ) {
        e.preventDefault();
        searchInputRef.current?.focus();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  // ── Multi-criteria Filtering & Sorting ──────────────────────
  const filteredGames = useMemo(() => {
    let result = GAMES.filter((game) => {
      const q = searchQuery.trim().toLowerCase();

      // Search keyword matching
      const matchesSearch =
        !q ||
        game.title.toLowerCase().includes(q) ||
        game.description.toLowerCase().includes(q) ||
        game.tags.some((t) => t.toLowerCase().includes(q)) ||
        (q.includes('multi') && game.maxPlayers > 1) ||
        (q.includes('solo') && game.minPlayers === 1 && game.maxPlayers === 1);

      // Genre tag matching
      const matchesTag =
        selectedTag === 'All' ||
        game.tags.some((t) => t.toLowerCase() === selectedTag.toLowerCase());

      // Player mode matching
      const matchesPlayerMode =
        playerFilter === 'all' ||
        (playerFilter === 'solo' && game.minPlayers === 1 && game.maxPlayers === 1) ||
        (playerFilter === 'multiplayer' && game.maxPlayers > 1);

      return matchesSearch && matchesTag && matchesPlayerMode;
    });

    // Sorting
    if (sortBy === 'name') {
      result = [...result].sort((a, b) => a.title.localeCompare(b.title));
    } else if (sortBy === 'players') {
      result = [...result].sort((a, b) => b.maxPlayers - a.maxPlayers);
    }

    return result;
  }, [searchQuery, selectedTag, playerFilter, sortBy]);

  const multiplayerCount = useMemo(() => GAMES.filter((g) => g.maxPlayers > 1).length, []);
  const soloCount = useMemo(() => GAMES.filter((g) => g.minPlayers === 1 && g.maxPlayers === 1).length, []);

  return (
    <div className="min-h-screen relative overflow-hidden py-12 px-4 sm:px-6 lg:px-8 bg-background text-foreground transition-colors duration-200">
      {/* ── Background Grid & Orbs (Synchronized with Home) ───────── */}
      <div className="pointer-events-none fixed inset-0 z-0 bg-[linear-gradient(to_right,var(--border)_1px,transparent_1px),linear-gradient(to_bottom,var(--border)_1px,transparent_1px)] bg-[size:48px_48px] opacity-35 dark:opacity-15" />
      <div className="pointer-events-none fixed inset-0 -z-10 overflow-hidden">
        <div className="bg-orb bg-orb-1" />
        <div className="bg-orb bg-orb-2" />
        <div className="bg-orb bg-orb-3" />
      </div>

      <div className="relative z-10 mx-auto max-w-7xl">
        {/* ── SECTION 1: CLEAN GRAND HEADER ───────────────────────── */}
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="mb-10"
        >
          <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
            <div>
              <h1 className="text-4xl sm:text-5xl lg:text-6xl font-black text-foreground tracking-tight leading-[1.1]">
                The Arcade <span className="text-accent">Catalog</span>
              </h1>
              <p className="mt-3 text-base sm:text-lg text-foreground-secondary max-w-2xl leading-relaxed">
                Explore all {GAMES.length} browser gaming experiences. Play solo against AI, beat daily puzzle records, or duel friends in real-time 1v1 matches.
              </p>
            </div>

            {/* Quick Stat Indicators */}
            <div className="flex items-center gap-2.5 self-start md:self-auto shrink-0">
              <span className="inline-flex items-center gap-1.5 rounded-xl border border-border bg-surface/90 px-3.5 py-2 text-xs font-mono font-bold text-foreground shadow-sm backdrop-blur-md">
                <span className="h-2 w-2 rounded-full bg-emerald-500" />
                <span>{GAMES.length} Playable Games</span>
              </span>

              <span className="inline-flex items-center gap-1.5 rounded-xl border border-violet-500/30 bg-violet-500/10 px-3.5 py-2 text-xs font-mono font-bold text-violet-600 dark:text-violet-400 shadow-sm backdrop-blur-md">
                <span className="h-2 w-2 rounded-full bg-violet-500 animate-pulse" />
                <span>{multiplayerCount} 1v1 Duels</span>
              </span>
            </div>
          </div>
        </motion.div>

        {/* ── SECTION 2: PRO ARCADE TOOLBAR ───────────────────────── */}
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.1 }}
          className="mb-10 space-y-4 rounded-3xl border border-border bg-surface/90 backdrop-blur-xl p-5 sm:p-6 shadow-sm"
        >
          {/* Top Row: Search Input + Player Mode Segmented Control + View Mode & Sort */}
          <div className="flex flex-col lg:flex-row items-stretch lg:items-center justify-between gap-4">
            {/* Search Input with Keyboard Shortcut */}
            <div className="relative flex-1 max-w-lg">
              <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-foreground-muted">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <circle cx="11" cy="11" r="8" />
                  <line x1="21" y1="21" x2="16.65" y2="16.65" />
                </svg>
              </div>

              <input
                ref={searchInputRef}
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search games by title, rules, tags... (Press '/' to focus)"
                className="w-full pl-10 pr-12 py-2.5 rounded-2xl border border-border bg-background text-sm text-foreground placeholder:text-foreground-muted focus:border-accent focus:outline-none focus:ring-2 focus:ring-accent/20 transition-all shadow-inner"
              />

              <div className="absolute inset-y-0 right-0 pr-3 flex items-center gap-1.5">
                {searchQuery ? (
                  <button
                    onClick={() => setSearchQuery('')}
                    className="p-1 rounded-md text-foreground-muted hover:text-foreground hover:bg-surface transition-colors"
                    title="Clear search"
                  >
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                      <line x1="18" y1="6" x2="6" y2="18" />
                      <line x1="6" y1="6" x2="18" y2="18" />
                    </svg>
                  </button>
                ) : (
                  <kbd className="hidden sm:inline-block rounded-md border border-border bg-surface px-1.5 py-0.5 text-xs font-mono text-foreground-muted shadow-xs">
                    /
                  </kbd>
                )}
              </div>
            </div>

            {/* Middle: Player Mode Filter (Segmented Control) */}
            <div className="flex items-center gap-1 p-1 rounded-2xl bg-background border border-border shadow-inner self-start lg:self-center">
              <button
                onClick={() => setPlayerFilter('all')}
                className={`relative px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all ${
                  playerFilter === 'all'
                    ? 'text-white'
                    : 'text-foreground-secondary hover:text-foreground'
                }`}
              >
                {playerFilter === 'all' && (
                  <motion.div
                    layoutId="activePlayerModePill"
                    className="absolute inset-0 rounded-xl bg-gradient-to-r from-sky-500 to-blue-600 shadow-md shadow-sky-500/20"
                    transition={{ type: 'spring', stiffness: 450, damping: 35 }}
                  />
                )}
                <span className="relative z-10">All Modes ({GAMES.length})</span>
              </button>

              <button
                onClick={() => setPlayerFilter('multiplayer')}
                className={`relative px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all ${
                  playerFilter === 'multiplayer'
                    ? 'text-white'
                    : 'text-foreground-secondary hover:text-foreground'
                }`}
              >
                {playerFilter === 'multiplayer' && (
                  <motion.div
                    layoutId="activePlayerModePill"
                    className="absolute inset-0 rounded-xl bg-gradient-to-r from-blue-600 to-sky-600 shadow-md shadow-blue-500/20"
                    transition={{ type: 'spring', stiffness: 450, damping: 35 }}
                  />
                )}
                <span className="relative z-10">⚡ 1v1 Duels ({multiplayerCount})</span>
              </button>

              <button
                onClick={() => setPlayerFilter('solo')}
                className={`relative px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all ${
                  playerFilter === 'solo'
                    ? 'text-white'
                    : 'text-foreground-secondary hover:text-foreground'
                }`}
              >
                {playerFilter === 'solo' && (
                  <motion.div
                    layoutId="activePlayerModePill"
                    className="absolute inset-0 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-600 shadow-md shadow-emerald-500/20"
                    transition={{ type: 'spring', stiffness: 450, damping: 35 }}
                  />
                )}
                <span className="relative z-10">Solo Only ({soloCount})</span>
              </button>
            </div>

            {/* Right: Dual View Mode Switcher & Sort Dropdown */}
            <div className="flex items-center gap-3 self-end lg:self-center">
              {/* View Mode Switcher */}
              <div className="flex items-center gap-1 p-1 rounded-xl bg-background border border-border">
                <button
                  onClick={() => setViewMode('grid')}
                  className={`p-1.5 rounded-lg transition-colors ${
                    viewMode === 'grid'
                      ? 'bg-surface text-accent shadow-xs'
                      : 'text-foreground-muted hover:text-foreground'
                  }`}
                  title="3D Bento Grid View"
                >
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <rect x="3" y="3" width="7" height="7" rx="1" />
                    <rect x="14" y="3" width="7" height="7" rx="1" />
                    <rect x="14" y="14" width="7" height="7" rx="1" />
                    <rect x="3" y="14" width="7" height="7" rx="1" />
                  </svg>
                </button>

                <button
                  onClick={() => setViewMode('list')}
                  className={`p-1.5 rounded-lg transition-colors ${
                    viewMode === 'list'
                      ? 'bg-surface text-accent shadow-xs'
                      : 'text-foreground-muted hover:text-foreground'
                  }`}
                  title="Compact List View"
                >
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <line x1="8" y1="6" x2="21" y2="6" />
                    <line x1="8" y1="12" x2="21" y2="12" />
                    <line x1="8" y1="18" x2="21" y2="18" />
                    <line x1="3" y1="6" x2="3.01" y2="6" strokeWidth="3" />
                    <line x1="3" y1="12" x2="3.01" y2="12" strokeWidth="3" />
                    <line x1="3" y1="18" x2="3.01" y2="18" strokeWidth="3" />
                  </svg>
                </button>
              </div>

              {/* Sort Dropdown */}
              <div className="flex items-center gap-1.5">
                <select
                  value={sortBy}
                  onChange={(e) => setSortBy(e.target.value as SortOption)}
                  className="rounded-xl border border-border bg-background hover:bg-surface-hover hover:border-accent/40 px-3 py-2 text-xs font-bold text-foreground focus:border-accent focus:outline-none focus:ring-2 focus:ring-accent/20 transition-all cursor-pointer shadow-xs"
                >
                  <option value="featured">Featured (Default)</option>
                  <option value="name">Title (A — Z)</option>
                  <option value="players">Most Players</option>
                </select>
              </div>
            </div>
          </div>

          {/* Bottom Row: Genre Tag Pills & Filtered Counter */}
          <div className="flex flex-wrap items-center justify-between gap-3 pt-3 border-t border-border">
            <div className="flex flex-wrap items-center gap-1.5">
              {GENRE_TAGS.map((tag) => {
                const isSelected = selectedTag === tag;
                const count =
                  tag === 'All'
                    ? GAMES.length
                    : GAMES.filter((g) => g.tags.some((t) => t.toLowerCase() === tag.toLowerCase())).length;

                return (
                  <button
                    key={tag}
                    onClick={() => setSelectedTag(tag)}
                    className={`relative px-3.5 py-1 rounded-xl text-xs font-semibold transition-all ${
                      isSelected
                        ? 'bg-accent/15 border border-accent/40 text-accent font-bold shadow-xs'
                        : 'border border-border bg-background text-foreground-secondary hover:text-foreground hover:bg-surface-hover'
                    }`}
                  >
                    <span>{tag}</span>
                    <span className="ml-1.5 opacity-60 font-mono text-xs">({count})</span>
                  </button>
                );
              })}
            </div>

            <div className="text-xs font-mono text-foreground-muted">
              Showing <span className="font-bold text-accent">{filteredGames.length}</span> of {GAMES.length} games
            </div>
          </div>
        </motion.div>

        {/* ── SECTION 3: 3D BENTO GRID OR COMPACT LIST VIEW ────────── */}
        <AnimatePresence mode="wait">
          {filteredGames.length === 0 ? (
            <motion.div
              key="empty-state"
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="rounded-3xl border border-dashed border-border bg-surface/80 p-12 text-center max-w-md mx-auto my-12 space-y-4 backdrop-blur-xl shadow-sm"
            >
              <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-accent-light text-accent border border-accent/20">
                <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <circle cx="11" cy="11" r="8" />
                  <line x1="21" y1="21" x2="16.65" y2="16.65" />
                </svg>
              </div>

              <div>
                <h3 className="text-xl font-bold text-foreground">No games found</h3>
                <p className="text-sm text-foreground-secondary mt-1.5">
                  No games match your current filter or keyword &ldquo;{searchQuery}&rdquo;.
                </p>
              </div>

              <button
                onClick={() => {
                  setSearchQuery('');
                  setSelectedTag('All');
                  setPlayerFilter('all');
                  setSortBy('featured');
                }}
                className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-accent text-xs font-bold text-white shadow-md shadow-sky-500/25 hover:bg-accent-hover transition-all"
              >
                Reset All Filters
              </button>
            </motion.div>
          ) : viewMode === 'grid' ? (
            /* 🔲 3D BENTO GRID VIEW (Using identical high-craft GameCard3D as Home) */
            <motion.div
              key="grid-view"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6"
            >
              {filteredGames.map((game, i) => (
                <GameCard3D
                  key={game.id}
                  game={game}
                  index={i}
                  featured={false}
                  className="col-span-1"
                />
              ))}
            </motion.div>
          ) : (
            /* ☰ COMPACT LIST VIEW (High-density rows) */
            <motion.div
              key="list-view"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="space-y-3"
            >
              {filteredGames.map((game, i) => (
                <CompactGameRow key={game.id} game={game} index={i} />
              ))}
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}

export default function GamesPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen p-12 text-center text-foreground-muted">
          Loading Arcade Catalog...
        </div>
      }
    >
      <GamesCatalogContent />
    </Suspense>
  );
}
