'use client';

import React, { useEffect, useRef } from 'react';
import { motion } from 'framer-motion';

export type GameCategory = 'all' | 'multiplayer' | 'puzzle' | 'arcade';

interface CategoryOption {
  id: GameCategory;
  label: string;
  count: number;
}

interface ArcadeToolbarProps {
  categories: CategoryOption[];
  activeCategory: GameCategory;
  onSelectCategory: (cat: GameCategory) => void;
  searchQuery: string;
  onSearchChange: (query: string) => void;
  totalFiltered: number;
}

export function ArcadeToolbar({
  categories,
  activeCategory,
  onSelectCategory,
  searchQuery,
  onSearchChange,
  totalFiltered,
}: ArcadeToolbarProps) {
  const searchInputRef = useRef<HTMLInputElement | null>(null);

  // Keyboard shortcut listener ('/' to focus search)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (
        e.key === '/' &&
        document.activeElement?.tagName !== 'INPUT' &&
        document.activeElement?.tagName !== 'TEXTAREA'
      ) {
        e.preventDefault();
        searchInputRef.current?.focus();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  return (
    <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
      {/* Category Filter Pills */}
      <div className="flex flex-wrap items-center gap-2 p-1.5 rounded-2xl bg-slate-900/80 border border-slate-800/90 backdrop-blur-xl">
        {categories.map((cat) => {
          const isActive = activeCategory === cat.id;
          return (
            <button
              key={cat.id}
              onClick={() => onSelectCategory(cat.id)}
              className={`relative flex items-center gap-2 rounded-xl px-3.5 py-2 text-xs sm:text-sm font-semibold transition-colors duration-200 ${
                isActive ? 'text-white' : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              {isActive && (
                <motion.div
                  layoutId="activeCategoryPill"
                  className="absolute inset-0 rounded-xl bg-gradient-to-r from-sky-500 to-blue-600 shadow-md shadow-sky-500/20"
                  transition={{ type: 'spring', stiffness: 400, damping: 30 }}
                />
              )}
              <span className="relative z-10">{cat.label}</span>
              <span
                className={`relative z-10 rounded-md px-1.5 py-0.5 text-xs font-mono font-bold ${
                  isActive
                    ? 'bg-black/20 text-white'
                    : 'bg-slate-800 text-slate-400'
                }`}
              >
                {cat.count}
              </span>
            </button>
          );
        })}
      </div>

      {/* Search Input Bar */}
      <div className="flex items-center gap-3">
        <div className="relative flex-1 md:w-72">
          <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400">
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <circle cx="11" cy="11" r="8" />
              <line x1="21" y1="21" x2="16.65" y2="16.65" />
            </svg>
          </span>

          <input
            ref={searchInputRef}
            type="text"
            value={searchQuery}
            onChange={(e) => onSearchChange(e.target.value)}
            placeholder="Search 11 games... (Press /)"
            className="w-full rounded-xl border border-slate-800 bg-slate-900/90 pl-10 pr-9 py-2.5 text-xs sm:text-sm text-white placeholder-slate-500 transition-colors focus:border-sky-500 focus:outline-none focus:ring-1 focus:ring-sky-500"
          />

          {searchQuery && (
            <button
              onClick={() => onSearchChange('')}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white"
              title="Clear search"
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                <line x1="18" y1="6" x2="6" y2="18" />
                <line x1="6" y1="6" x2="18" y2="18" />
              </svg>
            </button>
          )}
        </div>

        <span className="hidden lg:inline-block font-mono text-xs text-slate-400">
          {totalFiltered} {totalFiltered === 1 ? 'game' : 'games'}
        </span>
      </div>
    </div>
  );
}

export default ArcadeToolbar;
