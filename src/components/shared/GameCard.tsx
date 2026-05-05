"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import type { GameInfo } from "@/config/games";

interface GameCardProps {
  game: GameInfo;
  index: number;
}

// Map game IDs to their icon SVG content
const gameIcons: Record<string, React.ReactNode> = {
  "2048": (
    <svg width="48" height="48" viewBox="0 0 48 48" fill="none">
      <rect x="4" y="4" width="17" height="17" rx="3" fill="rgba(255,255,255,0.3)" />
      <rect x="27" y="4" width="17" height="17" rx="3" fill="rgba(255,255,255,0.5)" />
      <rect x="4" y="27" width="17" height="17" rx="3" fill="rgba(255,255,255,0.5)" />
      <rect x="27" y="27" width="17" height="17" rx="3" fill="rgba(255,255,255,0.2)" />
      <text x="12.5" y="17" textAnchor="middle" fill="white" fontSize="10" fontWeight="bold">2</text>
      <text x="35.5" y="17" textAnchor="middle" fill="white" fontSize="10" fontWeight="bold">4</text>
      <text x="12.5" y="40" textAnchor="middle" fill="white" fontSize="10" fontWeight="bold">8</text>
      <text x="35.5" y="40" textAnchor="middle" fill="white" fontSize="8" fontWeight="bold">16</text>
    </svg>
  ),
  caro: (
    <svg width="48" height="48" viewBox="0 0 48 48" fill="none">
      {/* Grid lines */}
      <line x1="16" y1="4" x2="16" y2="44" stroke="rgba(255,255,255,0.3)" strokeWidth="1.5" />
      <line x1="32" y1="4" x2="32" y2="44" stroke="rgba(255,255,255,0.3)" strokeWidth="1.5" />
      <line x1="4" y1="16" x2="44" y2="16" stroke="rgba(255,255,255,0.3)" strokeWidth="1.5" />
      <line x1="4" y1="32" x2="44" y2="32" stroke="rgba(255,255,255,0.3)" strokeWidth="1.5" />
      {/* X */}
      <line x1="6" y1="6" x2="14" y2="14" stroke="white" strokeWidth="2.5" strokeLinecap="round" />
      <line x1="14" y1="6" x2="6" y2="14" stroke="white" strokeWidth="2.5" strokeLinecap="round" />
      {/* O */}
      <circle cx="24" cy="24" r="5" stroke="white" strokeWidth="2.5" fill="none" />
      {/* X */}
      <line x1="34" y1="34" x2="42" y2="42" stroke="white" strokeWidth="2.5" strokeLinecap="round" />
      <line x1="42" y1="34" x2="34" y2="42" stroke="white" strokeWidth="2.5" strokeLinecap="round" />
    </svg>
  ),
  minesweeper: (
    <svg width="48" height="48" viewBox="0 0 48 48" fill="none">
      {/* Mine body */}
      <circle cx="24" cy="24" r="10" fill="rgba(255,255,255,0.4)" />
      <circle cx="24" cy="24" r="6" fill="rgba(255,255,255,0.6)" />
      <circle cx="22" cy="22" r="2" fill="white" />
      {/* Spikes */}
      <line x1="24" y1="8" x2="24" y2="14" stroke="white" strokeWidth="2.5" strokeLinecap="round" />
      <line x1="24" y1="34" x2="24" y2="40" stroke="white" strokeWidth="2.5" strokeLinecap="round" />
      <line x1="8" y1="24" x2="14" y2="24" stroke="white" strokeWidth="2.5" strokeLinecap="round" />
      <line x1="34" y1="24" x2="40" y2="24" stroke="white" strokeWidth="2.5" strokeLinecap="round" />
      <line x1="12.7" y1="12.7" x2="16.9" y2="16.9" stroke="white" strokeWidth="2" strokeLinecap="round" />
      <line x1="31.1" y1="31.1" x2="35.3" y2="35.3" stroke="white" strokeWidth="2" strokeLinecap="round" />
      <line x1="35.3" y1="12.7" x2="31.1" y2="16.9" stroke="white" strokeWidth="2" strokeLinecap="round" />
      <line x1="16.9" y1="31.1" x2="12.7" y2="35.3" stroke="white" strokeWidth="2" strokeLinecap="round" />
    </svg>
  ),
  wordle: (
    <svg width="48" height="48" viewBox="0 0 48 48" fill="none">
      {/* Letter tiles */}
      <rect x="3" y="14" width="12" height="12" rx="2" fill="rgba(255,255,255,0.5)" />
      <rect x="18" y="14" width="12" height="12" rx="2" fill="rgba(255,255,255,0.3)" />
      <rect x="33" y="14" width="12" height="12" rx="2" fill="rgba(255,255,255,0.5)" />
      <rect x="3" y="29" width="12" height="12" rx="2" fill="rgba(255,255,255,0.2)" />
      <rect x="18" y="29" width="12" height="12" rx="2" fill="rgba(255,255,255,0.5)" />
      <rect x="33" y="29" width="12" height="12" rx="2" fill="rgba(255,255,255,0.2)" />
      <text x="9" y="24" textAnchor="middle" fill="white" fontSize="9" fontWeight="bold">W</text>
      <text x="24" y="24" textAnchor="middle" fill="white" fontSize="9" fontWeight="bold">O</text>
      <text x="39" y="24" textAnchor="middle" fill="white" fontSize="9" fontWeight="bold">R</text>
      <text x="9" y="39" textAnchor="middle" fill="white" fontSize="9" fontWeight="bold">D</text>
      <text x="24" y="39" textAnchor="middle" fill="white" fontSize="9" fontWeight="bold">L</text>
      <text x="39" y="39" textAnchor="middle" fill="white" fontSize="9" fontWeight="bold">E</text>
    </svg>
  ),
  sudoku: (
    <svg width="48" height="48" viewBox="0 0 48 48" fill="none">
      {/* Grid lines */}
      <line x1="8" y1="4" x2="8" y2="44" stroke="rgba(255,255,255,0.3)" strokeWidth="1.5" />
      <line x1="16" y1="4" x2="16" y2="44" stroke="rgba(255,255,255,0.3)" strokeWidth="1.5" />
      <line x1="24" y1="4" x2="24" y2="44" stroke="rgba(255,255,255,0.3)" strokeWidth="1.5" />
      <line x1="32" y1="4" x2="32" y2="44" stroke="rgba(255,255,255,0.3)" strokeWidth="1.5" />
      <line x1="40" y1="4" x2="40" y2="44" stroke="rgba(255,255,255,0.3)" strokeWidth="1.5" />
      <line x1="4" y1="8" x2="44" y2="8" stroke="rgba(255,255,255,0.3)" strokeWidth="1.5" />
      <line x1="4" y1="16" x2="44" y2="16" stroke="rgba(255,255,255,0.3)" strokeWidth="1.5" />
      <line x1="4" y1="24" x2="44" y2="24" stroke="rgba(255,255,255,0.3)" strokeWidth="1.5" />
      <line x1="4" y1="32" x2="44" y2="32" stroke="rgba(255,255,255,0.3)" strokeWidth="1.5" />
      <line x1="4" y1="40" x2="44" y2="40" stroke="rgba(255,255,255,0.3)" strokeWidth="1.5" />
      {/* Sample numbers */}
      <text x="12" y="14" textAnchor="middle" fill="white" fontSize="9" fontWeight="bold">5</text>
      <text x="28" y="14" textAnchor="middle" fill="white" fontSize="9" fontWeight="bold">3</text>
      <text x="44" y="14" textAnchor="middle" fill="white" fontSize="9" fontWeight="bold">7</text>
      <text x="12" y="30" textAnchor="middle" fill="white" fontSize="9" fontWeight="bold">6</text>
      <text x="28" y="30" textAnchor="middle" fill="white" fontSize="9" fontWeight="bold">1</text>
      <text x="44" y="30" textAnchor="middle" fill="white" fontSize="9" fontWeight="bold">9</text>
    </svg>
  ),
  trex: (
    <svg width="48" height="48" viewBox="0 0 48 48" fill="none">
      {/* Dino body */}
      <rect x="18" y="10" width="14" height="18" rx="2" fill="rgba(255,255,255,0.5)" />
      {/* Head */}
      <rect x="22" y="4" width="14" height="10" rx="2" fill="rgba(255,255,255,0.6)" />
      {/* Eye */}
      <rect x="32" y="7" width="3" height="3" rx="1" fill="white" />
      {/* Arm */}
      <rect x="14" y="18" width="6" height="3" rx="1" fill="rgba(255,255,255,0.4)" />
      {/* Tail */}
      <rect x="10" y="12" width="10" height="3" rx="1" fill="rgba(255,255,255,0.3)" />
      {/* Legs */}
      <rect x="20" y="28" width="4" height="10" rx="1" fill="rgba(255,255,255,0.5)" />
      <rect x="28" y="28" width="4" height="8" rx="1" fill="rgba(255,255,255,0.4)" />
      {/* Ground */}
      <line x1="4" y1="40" x2="44" y2="40" stroke="rgba(255,255,255,0.3)" strokeWidth="2" />
      {/* Cactus */}
      <rect x="40" y="32" width="3" height="8" rx="1" fill="rgba(255,255,255,0.4)" />
      <rect x="38" y="34" width="3" height="3" rx="1" fill="rgba(255,255,255,0.3)" />
    </svg>
  ),
  wordchain: (
    <svg width="48" height="48" viewBox="0 0 48 48" fill="none">
      {/* Chain link 1 */}
      <path d="M14 28 C8 28 8 20 14 20 L20 20 C26 20 26 28 20 28 Z" stroke="rgba(255,255,255,0.8)" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />
      {/* Chain link 2 */}
      <path d="M28 28 C34 28 34 20 28 20 L22 20 C16 20 16 28 22 28 Z" stroke="rgba(255,255,255,0.4)" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />
      {/* Letters */}
      <text x="17" y="27" textAnchor="middle" fill="white" fontSize="10" fontWeight="bold">W</text>
      <text x="31" y="27" textAnchor="middle" fill="white" fontSize="10" fontWeight="bold" opacity="0.6">C</text>
    </svg>
  ),
};

export function GameCard({ game, index }: GameCardProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 30 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{
        duration: 0.5,
        delay: index * 0.15,
        ease: [0.22, 1, 0.36, 1],
      }}
    >
      <Link href={game.route} className="block group" id={`game-card-${game.id}`}>
        <div className="relative rounded-2xl overflow-hidden card-shimmer transition-all duration-300 hover:shadow-xl hover:-translate-y-1">
          {/* Gradient header */}
          <div
            className={`relative h-48 bg-gradient-to-br ${game.color} p-6 flex flex-col justify-between`}
          >
            {/* Decorative circles */}
            <div className="absolute top-0 right-0 w-32 h-32 rounded-full bg-white/10 -translate-y-1/2 translate-x-1/2" />
            <div className="absolute bottom-0 left-0 w-24 h-24 rounded-full bg-white/10 translate-y-1/2 -translate-x-1/2" />

            {/* Icon */}
            <div className="relative z-10 flex h-14 w-14 items-center justify-center rounded-2xl bg-white/15 backdrop-blur-sm border border-white/20 transition-transform duration-300 group-hover:scale-110 group-hover:rotate-3">
              {gameIcons[game.id] || (
                <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2">
                  <rect x="3" y="3" width="18" height="18" rx="2" />
                </svg>
              )}
            </div>

            {/* Player count badge */}
            <div className="relative z-10 flex items-center gap-1.5">
              <div className="flex items-center gap-1.5 rounded-full bg-white/20 backdrop-blur-sm px-3 py-1 text-xs font-medium text-white">
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                  <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
                  <circle cx="12" cy="7" r="4" />
                </svg>
                {game.minPlayers === game.maxPlayers
                  ? `${game.minPlayers} Player`
                  : `${game.minPlayers}-${game.maxPlayers} Players`}
              </div>
            </div>
          </div>

          {/* Content */}
          <div className="bg-surface border border-t-0 border-border rounded-b-2xl p-5 transition-colors group-hover:bg-surface-hover">
            <h3 className="text-lg font-bold text-foreground mb-1.5">
              {game.title}
            </h3>
            <p className="text-sm text-foreground-secondary leading-relaxed mb-4 line-clamp-2">
              {game.description}
            </p>

            {/* Tags */}
            <div className="flex flex-wrap gap-2">
              {game.tags.map((tag) => (
                <span
                  key={tag}
                  className="rounded-md bg-accent-light px-2.5 py-1 text-xs font-medium text-accent"
                >
                  {tag}
                </span>
              ))}
            </div>

            {/* Play button (appears on hover) */}
            <div className="mt-4 flex items-center justify-between">
              <span className="text-xs text-foreground-muted">Click to play</span>
              <div className="flex h-8 w-8 items-center justify-center rounded-full bg-accent text-white opacity-0 translate-x-2 transition-all duration-300 group-hover:opacity-100 group-hover:translate-x-0">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                  <polyline points="9 18 15 12 9 6" />
                </svg>
              </div>
            </div>
          </div>
        </div>
      </Link>
    </motion.div>
  );
}
