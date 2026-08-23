'use client';

import { GAMES } from '@/config/games';
import { GameCard } from '@/components/shared/GameCard';
import { motion } from 'framer-motion';
import { useState, useMemo } from 'react';
import { useSearchParams } from 'next/navigation';
import { Suspense } from 'react';

const FILTER_TAGS = ['All', 'Multiplayer', 'Puzzle', 'Strategy', 'Single Player', 'Board Game'];

function GamesCatalogContent() {
  const searchParams = useSearchParams();
  const initialFilter = searchParams.get('filter') || 'All';

  const [searchQuery, setSearchQuery] = useState('');
  const [selectedTag, setSelectedTag] = useState(FILTER_TAGS.find((t) => t.toLowerCase() === initialFilter.toLowerCase()) || 'All');
  const [sortBy, setSortBy] = useState<'featured' | 'name' | 'players'>('featured');

  const filteredGames = useMemo(() => {
    let result = GAMES.filter((game) => {
      const q = searchQuery.trim().toLowerCase();
      const matchesSearch =
        !q ||
        game.title.toLowerCase().includes(q) ||
        game.description.toLowerCase().includes(q) ||
        game.tags.some((t) => t.toLowerCase().includes(q)) ||
        (q.includes('multi') && game.maxPlayers > 1) ||
        (q.includes('single') && game.minPlayers === 1 && game.maxPlayers === 1);

      const matchesTag = selectedTag === 'All' || game.tags.some((t) => t.toLowerCase() === selectedTag.toLowerCase());

      return matchesSearch && matchesTag;
    });

    if (sortBy === 'name') {
      result = [...result].sort((a, b) => a.title.localeCompare(b.title));
    } else if (sortBy === 'players') {
      result = [...result].sort((a, b) => b.maxPlayers - a.maxPlayers);
    }

    return result;
  }, [searchQuery, selectedTag, sortBy]);

  return (
    <div className="min-h-screen relative overflow-hidden py-12 px-4 sm:px-6 lg:px-8">
      {/* ── Background Orbs ──────────────────────────────────────── */}
      <div className="pointer-events-none fixed inset-0 -z-10">
        <div className="bg-orb bg-orb-1" />
        <div className="bg-orb bg-orb-2" />
        <div className="bg-orb bg-orb-3" />
      </div>

      <div className="mx-auto max-w-7xl">
        {/* ── Header ────────────────────────────────────────────── */}
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="text-center sm:text-left mb-10"
        >
          <h1 className="text-3xl sm:text-4xl lg:text-5xl font-extrabold text-foreground tracking-tight">
            Explore All <span className="text-gradient">Games</span>
          </h1>
          <p className="mt-2 text-base text-foreground-secondary max-w-2xl">
            Choose from classic puzzles, rapid arcade runners, and real-time 1v1 multiplayer games. Instant play in your browser with zero installs.
          </p>
        </motion.div>

        {/* ── Search & Filter Controls ──────────────────────────── */}
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.1 }}
          className="mb-8 space-y-4 rounded-2xl border border-border bg-surface/80 backdrop-blur-md p-4 sm:p-6 shadow-sm"
        >
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            {/* Search Input */}
            <div className="relative flex-1 max-w-md">
              <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-foreground-muted">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <circle cx="11" cy="11" r="8" />
                  <line x1="21" y1="21" x2="16.65" y2="16.65" />
                </svg>
              </div>
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search games by title, tags, or description..."
                aria-label="Search games"
                className="w-full pl-10 pr-10 py-2.5 rounded-xl border border-border bg-background text-sm text-foreground placeholder:text-foreground-muted focus:border-accent focus:outline-none focus:ring-2 focus:ring-accent/20 transition-all shadow-sm"
              />
              {searchQuery && (
                <button
                  onClick={() => setSearchQuery('')}
                  className="absolute inset-y-0 right-0 pr-3 flex items-center text-foreground-muted hover:text-foreground transition-colors"
                  title="Clear search"
                  aria-label="Clear search query"
                >
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
                    <line x1="18" y1="6" x2="6" y2="18" />
                    <line x1="6" y1="6" x2="18" y2="18" />
                  </svg>
                </button>
              )}
            </div>

            {/* Sort Options */}
            <div className="flex items-center gap-2">
              <span className="text-xs font-semibold text-foreground-muted hidden sm:inline">Sort by:</span>
              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value as 'featured' | 'name' | 'players')}
                aria-label="Sort games by"
                className="rounded-xl border border-border/70 bg-surface-hover/60 hover:bg-surface-hover hover:border-accent/40 px-3 py-1.5 text-xs font-semibold text-foreground focus:border-accent focus:outline-none focus:ring-1 focus:ring-accent/20 transition-all cursor-pointer"
              >
                <option value="featured">Featured (Default)</option>
                <option value="name">Name (A — Z)</option>
                <option value="players">Max Players</option>
              </select>
            </div>
          </div>

          {/* Filter Tag Chips */}
          <div className="flex flex-wrap items-center justify-between gap-3 pt-3 border-t border-border/60">
            <div className="flex flex-wrap items-center gap-1" role="toolbar" aria-label="Game categories">
              {FILTER_TAGS.map((tag) => {
                const isSelected = selectedTag === tag;
                const count =
                  tag === 'All'
                    ? GAMES.length
                    : GAMES.filter((g) => g.tags.some((t) => t.toLowerCase() === tag.toLowerCase())).length;

                return (
                  <button
                    key={tag}
                    onClick={() => setSelectedTag(tag)}
                    aria-pressed={isSelected}
                    aria-label={`Filter games by ${tag} (${count} available)`}
                    className={`relative px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-colors ${
                      isSelected
                        ? 'text-accent dark:text-white font-bold'
                        : 'text-foreground-secondary hover:text-foreground'
                    }`}
                  >
                    {isSelected && (
                      <motion.div
                        layoutId="activeGamesFilterIndicator"
                        className="absolute inset-0 rounded-lg bg-accent/15 border border-accent/30 dark:bg-accent dark:border-transparent shadow-xs"
                        transition={{ type: 'spring', stiffness: 450, damping: 35 }}
                      />
                    )}
                    <span className="relative z-10">
                      {tag} <span className={isSelected ? 'opacity-80' : 'opacity-60'}>({count})</span>
                    </span>
                  </button>
                );
              })}
            </div>

            <div className="text-xs font-medium text-foreground-muted">
              Showing <span className="font-bold text-foreground">{filteredGames.length}</span> of {GAMES.length} games
            </div>
          </div>
        </motion.div>

        {/* ── Games Grid or Empty State ─────────────────────────── */}
        {filteredGames.length === 0 ? (
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            className="rounded-2xl border border-dashed border-border bg-surface p-12 text-center max-w-md mx-auto my-12 space-y-4"
          >
            <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-accent-light text-accent">
              <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <circle cx="11" cy="11" r="8" />
                <line x1="21" y1="21" x2="16.65" y2="16.65" />
              </svg>
            </div>
            <div>
              <h3 className="text-lg font-bold text-foreground">No games found</h3>
              <p className="text-sm text-foreground-secondary mt-1">
                No games match &quot;{searchQuery}&quot;. Try searching for another keyword or reset the filters.
              </p>
            </div>
            <button
              onClick={() => {
                setSearchQuery('');
                setSelectedTag('All');
                setSortBy('featured');
              }}
              className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-accent text-xs font-bold text-white shadow-md hover:bg-accent-hover transition-all"
            >
              Reset filters
            </button>
          </motion.div>
        ) : (
          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {filteredGames.map((game, i) => (
              <GameCard key={game.id} game={game} index={i} />
            ))}

            {/* "Coming soon" card when on All view without active search */}
            {!searchQuery && selectedTag === 'All' && (
              <motion.div
                initial={{ opacity: 0, y: 30 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{
                  duration: 0.5,
                  delay: GAMES.length * 0.08,
                  ease: [0.22, 1, 0.36, 1],
                }}
              >
                <div className="flex h-full min-h-[320px] flex-col items-center justify-center rounded-2xl border-2 border-dashed border-border p-10 text-center transition-colors hover:border-border-hover hover:bg-surface">
                  <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-accent-light text-accent">
                    <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                      <line x1="12" y1="5" x2="12" y2="19" />
                      <line x1="5" y1="12" x2="19" y2="12" />
                    </svg>
                  </div>
                  <h3 className="text-lg font-bold text-foreground mb-1">More Games Incoming</h3>
                  <p className="text-sm text-foreground-secondary max-w-[220px]">
                    We regularly develop new multiplayer games and puzzles. Stay tuned!
                  </p>
                </div>
              </motion.div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

export default function GamesPage() {
  return (
    <Suspense fallback={<div className="min-h-screen p-8 text-center text-foreground-muted">Loading games...</div>}>
      <GamesCatalogContent />
    </Suspense>
  );
}
