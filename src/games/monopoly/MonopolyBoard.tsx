'use client';

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import type {
  MonopolyGameState,
  MonopolyPlayerState,
  MonopolyBoardSpace,
  MonopolyTokenColor,
  Room,
} from '@/types/socket';
import {
  MONOPOLY_BOARD,
  COLOR_GROUP_STYLES,
  TOKEN_STYLES,
  SPACE_ICONS,
  HOUSE_LEVEL_ICONS,
  HOUSE_LEVEL_LABELS,
  getUpgradeCost,
  getSaleValue,
} from './boardData';

// ── Business Tour 32-Space Layout (9×9 Grid) ─────────────────────

/** Bottom row: spaces 0–8, rendered RIGHT to LEFT */
const BOTTOM_ROW = [8, 7, 6, 5, 4, 3, 2, 1, 0];
/** Left column: spaces 9–15, rendered BOTTOM to TOP */
const LEFT_COL = [9, 10, 11, 12, 13, 14, 15];
/** Top row: spaces 16–24, rendered LEFT to RIGHT */
const TOP_ROW = [16, 17, 18, 19, 20, 21, 22, 23, 24];
/** Right column: spaces 25–31, rendered TOP to BOTTOM */
const RIGHT_COL = [25, 26, 27, 28, 29, 30, 31];

interface MonopolyBoardProps {
  gameState?: MonopolyGameState | null;
  playerId?: string | null;
  room?: Room | null;
  roomId?: string;
  onRollDice?: () => void;
  onBuyProperty?: () => void;
  onUpgradeProperty?: (targetLevel: number) => void;
  onSellProperty?: (spaceIndex: number) => void;
  onPayDebt?: () => void;
  onDeclareBankruptcy?: () => void;
  onEndTurn?: () => void;
  onLeaveRoom?: () => void;
  onRematch?: () => void;
  isFinished?: boolean;
  buyOffer?: { spaceIndex: number; spaceName: string; price: number } | null;
  upgradeOffer?: {
    spaceIndex: number;
    spaceName: string;
    currentLevel: number;
    upgradeCost: number;
    maxLevel: number;
    costs: number[];
  } | null;
  monopolyCelebration?: {
    playerId: string;
    username: string;
    tokenColor: MonopolyTokenColor;
    colorGroup: string;
    propertyNames: string[];
  } | null;
  onDismissCelebration?: () => void;
  onWorldTourTravel?: (targetSpaceIndex: number) => void;
  onHostWorldCup?: (spaceIndex: number) => void;
  onSelectChanceTarget?: (targetSpaceIndex: number) => void;
  endReason?: string | null;
}

// ── World Tour Target Validation Helper ───────────────────────────

export function isWorldTourTargetValid(spaceIndex: number): boolean {
  if (typeof spaceIndex !== 'number' || spaceIndex < 0 || spaceIndex >= MONOPOLY_BOARD.length) {
    return false;
  }
  // 4 corners cannot be targeted: START (0), Lost Island (8), World Cup (16), World Tour (24)
  if (spaceIndex === 0 || spaceIndex === 8 || spaceIndex === 16 || spaceIndex === 24) {
    return false;
  }
  const space = MONOPOLY_BOARD[spaceIndex];
  if (!space) return false;
  // Chance and Tax cannot be targeted
  if (space.type === 'chance' || space.type === 'tax') {
    return false;
  }
  return true;
}

// ── Color Group Display Order for My Properties ───────────────────

const COLOR_GROUP_ORDER: Record<string, number> = {
  brown: 1,
  light_blue: 2,
  pink: 3,
  orange: 4,
  red: 5,
  yellow: 6,
  green: 7,
  dark_blue: 8,
  beach: 9,
};

// ── Helper: Check if an owner completed a color monopoly group ────

function isColorGroupMonopolized(
  colorGroup?: string | null,
  owner?: MonopolyPlayerState | null
): boolean {
  if (!colorGroup || !owner) return false;
  const groupSpaces = MONOPOLY_BOARD.filter((s) => s.colorGroup === colorGroup);
  if (groupSpaces.length === 0) return false;
  return groupSpaces.every((s) => owner.ownedProperties.includes(s.index));
}

// ── Utility: Get house level for a space ──────────────────────────

function getHouseLevel(players: MonopolyPlayerState[], spaceIndex: number): number {
  for (const p of players) {
    if (p.isActive && p.ownedProperties.includes(spaceIndex)) {
      const space = MONOPOLY_BOARD[spaceIndex];
      if (space?.type === 'beach') {
        const ownedBeaches = p.ownedProperties.filter((idx) => MONOPOLY_BOARD[idx]?.type === 'beach').length;
        return Math.min(4, Math.max(1, ownedBeaches));
      }
      return p.houseLevels[spaceIndex] ?? 0;
    }
  }
  return 0;
}

// ── Utility: Calculate current rent for a space (with 1.5x Monopoly & 2x World Cup bonuses) ──

function calculateSpaceRent(
  space: MonopolyBoardSpace,
  houseLevel: number = 0,
  players: MonopolyPlayerState[] = [],
  worldCupSpaceIndex?: number | null,
  blackoutSpaces?: number[]
): number | null {
  const owner = players.find((p) => p.isActive && p.ownedProperties.includes(space.index));
  if (!owner) return null; // Unowned property -> DO NOT display rent or price

  // Blackout: Rent is $0
  if (blackoutSpaces && blackoutSpaces.includes(space.index)) {
    return 0;
  }

  let rent = 0;
  if (space.type === 'beach') {
    const beachCount = owner.ownedProperties.filter((idx) => MONOPOLY_BOARD[idx]?.type === 'beach').length;
    const BEACH_RENT_SCALE = [50, 120, 250, 500];
    rent = BEACH_RENT_SCALE[Math.min(beachCount, BEACH_RENT_SCALE.length) - 1] ?? 50;
  } else if (houseLevel > 0 && space.rentScale && space.rentScale.length >= houseLevel) {
    rent = space.rentScale[houseLevel - 1];
  } else {
    rent = space.baseRent ?? 0;
  }

  let finalRent = rent;

  // Full color group monopoly rule: Rent is increased by 1.5×
  if (space.colorGroup && isColorGroupMonopolized(space.colorGroup, owner)) {
    finalRent = Math.round(finalRent * 1.5);
  }

  // World Cup Host City rule: Rent is doubled (2×)
  if (worldCupSpaceIndex === space.index) {
    finalRent = Math.round(finalRent * 2);
  }

  return finalRent;
}

// ── Player Token on Board ─────────────────────────────────────────

function PlayerTokens({
  players,
  displayedPositions,
  movingPlayerId,
  spaceIndex,
}: {
  players: MonopolyPlayerState[];
  displayedPositions: Record<string, number>;
  movingPlayerId: string | null;
  spaceIndex: number;
}) {
  const playersHere = players.filter(
    (p) => p.isActive && (displayedPositions[p.playerId] ?? p.position) === spaceIndex
  );
  if (playersHere.length === 0) return null;

  return (
    <div className="flex flex-wrap items-center justify-center gap-0.5 z-20">
      {playersHere.map((p) => {
        const style = TOKEN_STYLES[p.tokenColor] || TOKEN_STYLES.red;
        const isHopping = movingPlayerId === p.playerId;

        return (
          <motion.div
            key={p.playerId}
            layoutId={`token-${p.playerId}`}
            animate={
              isHopping
                ? {
                    scale: [1, 1.4, 1],
                    y: [0, -12, 0],
                  }
                : { scale: 1, y: 0 }
            }
            transition={
              isHopping
                ? { duration: 0.18, ease: 'easeInOut' }
                : { type: 'spring', stiffness: 450, damping: 28 }
            }
            className={`
              w-4 h-4 sm:w-5 sm:h-5 md:w-6 md:h-6 rounded-full ${style.bg} ${style.glow}
              flex items-center justify-center shadow-md border border-white/90 dark:border-slate-900
              text-[10px] sm:text-xs md:text-sm select-none z-20
            `}
            title={p.username}
          >
            <span className="drop-shadow-sm leading-none">{style.avatar}</span>
          </motion.div>
        );
      })}
    </div>
  );
}

// ── Helper: Format rent display (e.g. $40 or 55K) ─────────────────

function formatRentDisplay(rent: number): string {
  if (rent >= 1000) {
    const k = rent / 1000;
    return `${k % 1 === 0 ? k : k.toFixed(1)}K`;
  }
  return `$${rent}`;
}

// ── Player Colored House Plot Components ──────────────────────────

const PLAYER_HOUSE_THEMES: Record<string, { roof: string; roofDark: string; wall: string; accent: string; hotelGlow: string }> = {
  red: {
    roof: '#f43f5e',
    roofDark: '#be123c',
    wall: '#fff1f2',
    accent: '#e11d48',
    hotelGlow: 'drop-shadow(0 0 3px rgba(244, 63, 94, 0.6))',
  },
  blue: {
    roof: '#0ea5e9',
    roofDark: '#0369a1',
    wall: '#f0f9ff',
    accent: '#0284c7',
    hotelGlow: 'drop-shadow(0 0 3px rgba(14, 165, 233, 0.6))',
  },
  green: {
    roof: '#10b981',
    roofDark: '#047857',
    wall: '#ecfdf5',
    accent: '#059669',
    hotelGlow: 'drop-shadow(0 0 3px rgba(16, 185, 129, 0.6))',
  },
  yellow: {
    roof: '#f59e0b',
    roofDark: '#b45309',
    wall: '#fffbeb',
    accent: '#d97706',
    hotelGlow: 'drop-shadow(0 0 3px rgba(245, 158, 11, 0.6))',
  },
};

function SingleHouseSVG({ color = 'red', size = 15 }: { color?: string | null; size?: number }) {
  const theme = (color && PLAYER_HOUSE_THEMES[color]) || PLAYER_HOUSE_THEMES.red;
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" className="drop-shadow-xs flex-shrink-0">
      {/* Chimney */}
      <rect x="15" y="4" width="3" height="6" fill={theme.roofDark} rx="0.5" />
      {/* Roof */}
      <polygon points="12,2 2,11 22,11" fill={theme.roof} stroke={theme.roofDark} strokeWidth="0.8" />
      <polygon points="12,2 12,11 22,11" fill={theme.roofDark} opacity="0.3" />
      {/* Wall */}
      <rect x="4" y="11" width="16" height="11" fill={theme.wall} stroke="#94a3b8" strokeWidth="0.8" rx="1" />
      {/* Door */}
      <rect x="10" y="15" width="4" height="7" fill={theme.accent} rx="0.5" />
      {/* Windows */}
      <rect x="5.5" y="13" width="3" height="3" fill="#38bdf8" stroke="#0284c7" strokeWidth="0.4" rx="0.4" />
      <rect x="15.5" y="13" width="3" height="3" fill="#38bdf8" stroke="#0284c7" strokeWidth="0.4" rx="0.4" />
    </svg>
  );
}

function HotelLandmarkSVG({ color = 'red', size = 20 }: { color?: string | null; size?: number }) {
  const theme = (color && PLAYER_HOUSE_THEMES[color]) || PLAYER_HOUSE_THEMES.red;
  return (
    <svg width={size} height={size} viewBox="0 0 28 28" fill="none" className="drop-shadow-md flex-shrink-0" style={{ filter: theme.hotelGlow }}>
      {/* Base */}
      <rect x="3" y="24" width="22" height="3" fill="#334155" rx="0.8" />
      {/* Body */}
      <rect x="5" y="7" width="18" height="17" fill={theme.wall} stroke={theme.roofDark} strokeWidth="0.8" rx="1" />
      {/* Roof */}
      <polygon points="14,1 3,7 25,7" fill={theme.roof} stroke={theme.roofDark} strokeWidth="0.8" />
      <polygon points="14,1 14,7 25,7" fill={theme.roofDark} opacity="0.3" />
      {/* Star on Top */}
      <text x="14" y="5.8" fontSize="4.5" textAnchor="middle" fill="#fbbf24" fontWeight="bold">★</text>
      {/* Windows */}
      <rect x="7" y="9" width="3" height="3" fill="#38bdf8" stroke="#0284c7" strokeWidth="0.3" rx="0.3" />
      <rect x="12.5" y="9" width="3" height="3" fill="#38bdf8" stroke="#0284c7" strokeWidth="0.3" rx="0.3" />
      <rect x="18" y="9" width="3" height="3" fill="#38bdf8" stroke="#0284c7" strokeWidth="0.3" rx="0.3" />
      <rect x="7" y="14" width="3" height="3" fill="#38bdf8" stroke="#0284c7" strokeWidth="0.3" rx="0.3" />
      <rect x="12.5" y="14" width="3" height="3" fill="#38bdf8" stroke="#0284c7" strokeWidth="0.3" rx="0.3" />
      <rect x="18" y="14" width="3" height="3" fill="#38bdf8" stroke="#0284c7" strokeWidth="0.3" rx="0.3" />
      {/* Entrance */}
      <rect x="11" y="19" width="6" height="5" fill={theme.accent} rx="0.5" />
    </svg>
  );
}

function HousePlotDisplay({
  level,
  ownerColor,
  isRotated = false,
}: {
  level: number;
  ownerColor?: string | null;
  isRotated?: boolean;
}) {
  if (level <= 0) return null;

  return (
    <div className={`flex items-center justify-center gap-0.5 ${isRotated ? '-rotate-90' : ''}`}>
      {level === 1 && <SingleHouseSVG color={ownerColor} size={15} />}
      {level === 2 && (
        <>
          <SingleHouseSVG color={ownerColor} size={12.5} />
          <SingleHouseSVG color={ownerColor} size={12.5} />
        </>
      )}
      {level === 3 && (
        <>
          <SingleHouseSVG color={ownerColor} size={10.5} />
          <SingleHouseSVG color={ownerColor} size={10.5} />
          <SingleHouseSVG color={ownerColor} size={10.5} />
        </>
      )}
      {level >= 4 && <HotelLandmarkSVG color={ownerColor} size={18} />}
    </div>
  );
}

// ── Board Cell Component (2-Subbox Layout) ─────────────────────────

// ── Helper: Space Orientation (bottom, left, top, right) ─────────

function getSpaceOrientation(index: number): 'bottom' | 'left' | 'top' | 'right' {
  if (index >= 1 && index <= 7) return 'bottom';
  if (index >= 9 && index <= 15) return 'left';
  if (index >= 17 && index <= 23) return 'top';
  if (index >= 25 && index <= 31) return 'right';
  return 'bottom';
}

// ── Board Cell Component (Directional 2-Subbox Layout) ────────────

function BoardCell({
  space,
  players,
  displayedPositions,
  movingPlayerId,
  ownerColor,
  houseLevel = 0,
  isCorner = false,
  isWorldTourActive = false,
  isValidWorldTourTarget = false,
  onSelectDestination,
  isWorldCupHost = false,
  isWorldCupSelectionActive = false,
  isMyOwnedProperty = false,
  onHostWorldCup,
  isShielded = false,
  isBlackout = false,
  isChanceTargetActive = false,
  isValidChanceTarget = false,
  onSelectChanceTarget,
  blackoutSpaces = [],
}: {
  space: MonopolyBoardSpace;
  players: MonopolyPlayerState[];
  displayedPositions: Record<string, number>;
  movingPlayerId: string | null;
  ownerColor: string | null;
  houseLevel?: number;
  isCorner?: boolean;
  isWorldTourActive?: boolean;
  isValidWorldTourTarget?: boolean;
  onSelectDestination?: (index: number) => void;
  isWorldCupHost?: boolean;
  isWorldCupSelectionActive?: boolean;
  isMyOwnedProperty?: boolean;
  onHostWorldCup?: (index: number) => void;
  isShielded?: boolean;
  isBlackout?: boolean;
  isChanceTargetActive?: boolean;
  isValidChanceTarget?: boolean;
  onSelectChanceTarget?: (index: number) => void;
  blackoutSpaces?: number[];
}) {
  const colorStyle = space.colorGroup ? COLOR_GROUP_STYLES[space.colorGroup] : null;
  const ownerStyle = ownerColor ? TOKEN_STYLES[ownerColor] : null;
  const icon = SPACE_ICONS[space.type];
  const currentRent = calculateSpaceRent(space, houseLevel, players, isWorldCupHost ? space.index : null, blackoutSpaces);
  const orientation = getSpaceOrientation(space.index);

  const isRotatedSide = orientation === 'left' || orientation === 'right';
  const owner = players.find((p) => p.isActive && p.ownedProperties.includes(space.index));
  const isMonopolized = space.colorGroup ? isColorGroupMonopolized(space.colorGroup, owner) : false;

  const isClickableChance = isChanceTargetActive && isValidChanceTarget;
  const isDimmedChance = isChanceTargetActive && !isValidChanceTarget;

  const isClickableWorldTour = isWorldTourActive && isValidWorldTourTarget;
  const isDimmedWorldTour = isWorldTourActive && !isValidWorldTourTarget;

  const isClickableWorldCup = isWorldCupSelectionActive && isMyOwnedProperty;
  const isDimmedWorldCup = isWorldCupSelectionActive && !isMyOwnedProperty;

  const cellHighlightClasses = isClickableChance
    ? 'ring-2 ring-purple-400 ring-offset-1 shadow-xl shadow-purple-500/60 cursor-pointer animate-pulse hover:ring-4 hover:scale-[1.03] z-20 transition-all'
    : isClickableWorldCup
    ? 'ring-2 ring-amber-400 ring-offset-1 shadow-xl shadow-amber-500/60 cursor-pointer animate-pulse hover:ring-4 hover:scale-[1.03] z-20 transition-all'
    : isClickableWorldTour
    ? 'ring-2 ring-sky-400 ring-offset-1 shadow-lg shadow-sky-500/50 cursor-pointer animate-pulse hover:ring-4 hover:scale-[1.03] z-20 transition-all'
    : isDimmedChance || isDimmedWorldCup || isDimmedWorldTour
    ? 'opacity-35 grayscale-[50%] transition-opacity'
    : '';

  const handleClick = () => {
    if (isClickableChance) {
      onSelectChanceTarget?.(space.index);
    } else if (isClickableWorldCup) {
      onHostWorldCup?.(space.index);
    } else if (isClickableWorldTour) {
      onSelectDestination?.(space.index);
    }
  };

  const tooltipTitle = isClickableChance
    ? `Target ${space.name} 🎯`
    : isClickableWorldCup
    ? `Host World Cup on ${space.name} 🏆`
    : isClickableWorldTour
    ? `Fly to ${space.name} ✈️`
    : undefined;

  // ── 4 Main Corner Tiles (START, Lost Island, World Cup, World Tour) ──
  if (isCorner) {
    return (
      <div className={`relative w-full h-full border border-slate-300 dark:border-slate-700/60 bg-gradient-to-br from-amber-50 via-amber-100/50 to-amber-200/40 dark:from-slate-800/95 dark:to-slate-900/95 select-none overflow-hidden font-black flex flex-col justify-between p-1 ${cellHighlightClasses}`}>
        {/* Centered Icon on top & Text below icon (Centered vertically and horizontally) */}
        <div className="flex-1 flex flex-col items-center justify-center text-center px-0.5 min-h-0">
          <span className="text-xl sm:text-2xl md:text-3xl leading-none mb-1 drop-shadow-xs">
            {icon}
          </span>
          <span className="text-[8.5px] sm:text-[10px] md:text-[11.5px] font-black uppercase tracking-tight text-center leading-tight line-clamp-2 text-amber-800 dark:text-amber-300">
            {space.name}
          </span>
        </div>

        {/* Player Tokens (Bottom) */}
        <div className="w-full flex items-center justify-center min-h-[14px] sm:min-h-[18px]">
          <PlayerTokens
            players={players}
            displayedPositions={displayedPositions}
            movingPlayerId={movingPlayerId}
            spaceIndex={space.index}
          />
        </div>
      </div>
    );
  }

  // ── Special Tiles (Chance / Tax) 100% Full Tile Layout ───────────
  if (space.type === 'chance' || space.type === 'tax') {
    const isTax = space.type === 'tax';
    const bgClasses = isTax
      ? 'border-rose-200 dark:border-rose-800/50 bg-gradient-to-br from-rose-50 to-rose-100/70 dark:from-rose-950/50 dark:to-slate-900/90'
      : 'border-purple-200 dark:border-purple-800/50 bg-gradient-to-br from-purple-50 to-purple-100/70 dark:from-purple-950/50 dark:to-slate-900/90';

    // 90-degree sideways rotation for Chance & Tax on left and right columns
    if (isRotatedSide) {
      return (
        <div className={`relative w-full h-full border select-none overflow-hidden font-black flex flex-row items-center justify-between p-0.5 sm:p-1 ${bgClasses} ${cellHighlightClasses}`}>
          {/* Space Name (Perfect straight vertical line along outer edge) */}
          <div className="w-4 h-full flex items-center justify-center flex-shrink-0">
            <span
              className={`
                uppercase tracking-tight leading-none [writing-mode:vertical-rl] rotate-180 whitespace-nowrap
                ${isTax
                  ? 'text-[8px] sm:text-[9.5px] md:text-[10px] font-black text-rose-800 dark:text-rose-300'
                  : 'text-[8px] sm:text-[9.5px] md:text-[10px] font-black text-purple-800 dark:text-purple-300'
                }
              `}
            >
              {space.name}
            </span>
          </div>

          {/* Icon (Center) */}
          <div className="flex-1 flex items-center justify-center">
            <span className="text-base sm:text-lg md:text-xl leading-none drop-shadow-xs -rotate-90">
              {icon}
            </span>
          </div>

          {/* Player Tokens (Right side) */}
          <div className="w-4 h-full flex items-center justify-center flex-shrink-0 min-h-[14px] sm:min-h-[18px]">
            <PlayerTokens
              players={players}
              displayedPositions={displayedPositions}
              movingPlayerId={movingPlayerId}
              spaceIndex={space.index}
            />
          </div>
        </div>
      );
    }

    return (
      <div className={`relative w-full h-full border select-none overflow-hidden font-black flex items-center justify-center ${bgClasses} ${cellHighlightClasses}`}>
        <div className="w-full h-full flex flex-col justify-between p-0.5 sm:p-1">
          {/* Space Name (Pinned to top edge, matching top and bottom rows) */}
          <span
            className={`
              uppercase tracking-tight text-center truncate px-0.5 leading-none
              ${isTax
                ? 'text-[8px] sm:text-[9.5px] md:text-[10.5px] font-black text-rose-800 dark:text-rose-300'
                : 'text-[8px] sm:text-[9.5px] md:text-[10.5px] font-black text-purple-800 dark:text-purple-300'
              }
            `}
          >
            {space.name}
          </span>

          {/* Special Icon (Center) */}
          <div className="flex-1 flex items-center justify-center min-h-0 py-0.5">
            <span className="text-sm sm:text-base md:text-lg leading-none drop-shadow-xs">
              {icon}
            </span>
          </div>

          {/* Player Tokens (Bottom) */}
          <div className="w-full flex items-center justify-center min-h-[14px] sm:min-h-[18px]">
            <PlayerTokens
              players={players}
              displayedPositions={displayedPositions}
              movingPlayerId={movingPlayerId}
              spaceIndex={space.index}
            />
          </div>
        </div>
      </div>
    );
  }

  // ── Horizontal Side Cells (Left & Right Columns - 14w x 10h Ratio) ─
  if (isRotatedSide) {
    return (
      <div
        onClick={handleClick}
        className={`relative w-full h-full flex flex-row border ${colorStyle ? colorStyle.border : 'border-slate-300 dark:border-slate-700/70'} select-none overflow-hidden ${cellHighlightClasses}`}
        title={tooltipTitle}
      >
        {/* ── Sub-box 1: Land Plot (75% Width) ──────────────────────── */}
        <div
          className={`
            relative w-[75%] h-full flex flex-row items-center justify-between p-0.5 sm:p-1 overflow-hidden transition-colors
            ${colorStyle ? `${colorStyle.softBg} ${colorStyle.darkSoftBg}` : 'bg-slate-100/70 dark:bg-slate-800/40'}
          `}
        >
          {/* Owner Token Badge (Only shown when no houses are built yet) */}
          {ownerStyle && houseLevel === 0 && (
            <div
              className={`absolute top-0.5 left-0.5 w-2 h-2 sm:w-2.5 sm:h-2.5 rounded-full ${ownerStyle.bg} border border-white shadow-xs z-20`}
              title={`Owner: ${ownerStyle.emoji}`}
            />
          )}

          {/* World Cup Host Badge */}
          {isWorldCupHost && (
            <div
              className="absolute bottom-0.5 left-0.5 z-20 flex items-center gap-0.5 bg-gradient-to-r from-amber-400 to-yellow-300 text-slate-950 font-black text-[7px] sm:text-[8px] px-1 py-0.2 rounded-full border border-yellow-100 shadow-md animate-bounce"
              title="World Cup Host City: 2× Rent Active!"
            >
              <span>🏆</span>
              <span>2×</span>
            </div>
          )}

          {/* Asset Shield Badge */}
          {isShielded && (
            <div
              className="absolute top-0.5 right-0.5 z-20 flex items-center justify-center bg-gradient-to-r from-emerald-500 to-teal-400 text-slate-950 font-black text-[7px] sm:text-[8px] p-0.5 rounded-full border border-emerald-100 shadow-md shadow-emerald-500/40"
              title="Protected by Asset Shield 🛡️"
            >
              <span>🛡️</span>
            </div>
          )}

          {/* Blackout Badge */}
          {isBlackout && (
            <div
              className="absolute bottom-0.5 right-0.5 z-20 flex items-center gap-0.5 bg-gradient-to-r from-amber-600 to-rose-600 text-white font-black text-[6.5px] sm:text-[7.5px] px-1 py-0.2 rounded-full border border-amber-300 shadow-md animate-pulse"
              title="Blackout: Rent is $0!"
            >
              <span>⚡</span>
            </div>
          )}

          {/* City / Space Name (Perfect straight vertical line along outer edge) */}
          <div className="w-4 h-full flex items-center justify-center flex-shrink-0">
            <span
              className={`
                text-[8px] sm:text-[9.5px] md:text-[10px] font-black uppercase tracking-tight text-center leading-none [writing-mode:vertical-rl] rotate-180 whitespace-nowrap
                ${colorStyle ? colorStyle.text : 'text-slate-800 dark:text-slate-100'}
              `}
              title={space.name}
            >
              {space.name}
            </span>
          </div>

          {/* Plot Content: Colored 3D Houses / Special Icons (Center) */}
          <div className="flex-1 flex items-center justify-center">
            {houseLevel > 0 ? (
              <HousePlotDisplay level={houseLevel} ownerColor={ownerColor} isRotated={true} />
            ) : icon ? (
              <span className="text-[11px] sm:text-sm md:text-base leading-none opacity-85 -rotate-90">
                {icon}
              </span>
            ) : null}
          </div>

          {/* Player Tokens (Inside Land Plot - Right side near Road Slab) */}
          <div className="w-4 h-full flex items-center justify-center flex-shrink-0 min-h-[14px] sm:min-h-[18px]">
            <PlayerTokens
              players={players}
              displayedPositions={displayedPositions}
              movingPlayerId={movingPlayerId}
              spaceIndex={space.index}
            />
          </div>
        </div>

        {/* ── Sub-box 2: Road Track / Pavement (25% Width) ──────────── */}
        <div className="w-[25%] h-full bg-white dark:bg-slate-900 border-l border-slate-300 dark:border-slate-700/60 flex items-center justify-center p-0.5 overflow-hidden">
          {currentRent !== null ? (
            <div className="flex items-center justify-center gap-0.5 [writing-mode:vertical-rl] rotate-180 whitespace-nowrap">
              <span className="text-[8px] sm:text-[9.5px] md:text-[14px] font-mono font-black text-slate-900 dark:text-slate-100 tracking-tight leading-none text-center">
                {formatRentDisplay(currentRent)}
              </span>
              {isMonopolized && (
                <span className="text-[7px] sm:text-[8px] font-black text-amber-600 dark:text-amber-400 leading-none" title="Monopoly Set 1.5× Rent Active">
                  👑
                </span>
              )}
              {isWorldCupHost && (
                <span className="text-[7px] sm:text-[8px] font-black text-amber-500 dark:text-amber-300 leading-none" title="World Cup 2× Rent Active">
                  🏆
                </span>
              )}
            </div>
          ) : null}
        </div>
      </div>
    );
  }

  // ── Vertical Top & Bottom Rows (10w x 14h Ratio) ─────────────────
  return (
    <div
      onClick={handleClick}
      className={`relative w-full h-full flex flex-col border ${colorStyle ? colorStyle.border : 'border-slate-300 dark:border-slate-700/70'} select-none overflow-hidden ${cellHighlightClasses}`}
      title={tooltipTitle}
    >
      {/* ── Sub-box 1: Land Plot (75% Height) ──────────────────────── */}
      <div
        className={`
          relative h-[75%] w-full flex flex-col justify-between p-0.5 sm:p-1 overflow-hidden transition-colors
          ${colorStyle ? `${colorStyle.softBg} ${colorStyle.darkSoftBg}` : 'bg-slate-100/70 dark:bg-slate-800/40'}
        `}
      >
        {/* Owner Token Badge (Only shown when no houses are built yet) */}
        {ownerStyle && houseLevel === 0 && (
          <div
            className={`absolute top-0.5 right-0.5 w-2 h-2 sm:w-2.5 sm:h-2.5 rounded-full ${ownerStyle.bg} border border-white shadow-xs z-10`}
            title={`Owner: ${ownerStyle.emoji}`}
          />
        )}

        {/* World Cup Host Badge */}
        {isWorldCupHost && (
          <div
            className="absolute top-0.5 left-0.5 z-20 flex items-center gap-0.5 bg-gradient-to-r from-amber-400 to-yellow-300 text-slate-950 font-black text-[7px] sm:text-[8px] px-1 py-0.2 rounded-full border border-yellow-100 shadow-md animate-bounce"
            title="World Cup Host City: 2× Rent Active!"
          >
            <span>🏆</span>
          </div>
        )}

        {/* Asset Shield Badge */}
        {isShielded && (
          <div
            className="absolute top-0.5 right-0.5 z-20 flex items-center justify-center bg-gradient-to-r from-emerald-500 to-teal-400 text-slate-950 font-black text-[7px] sm:text-[8px] p-0.5 rounded-full border border-emerald-100 shadow-md shadow-emerald-500/40"
            title="Protected by Asset Shield 🛡️"
          >
            <span>🛡️</span>
          </div>
        )}

        {/* Blackout Badge */}
        {isBlackout && (
          <div
            className="absolute bottom-0.5 right-0.5 z-20 flex items-center gap-0.5 bg-gradient-to-r from-amber-600 to-rose-600 text-white font-black text-[6.5px] sm:text-[7.5px] px-1 py-0.2 rounded-full border border-amber-300 shadow-md animate-pulse"
            title="Blackout: Rent is $0!"
          >
            <span>⚡</span>
          </div>
        )}

        {/* City / Space Name */}
        <span
          className={`
            text-[8px] sm:text-[9.5px] md:text-[10.5px] font-black uppercase tracking-tight text-center truncate px-0.5 leading-none
            ${colorStyle ? colorStyle.text : 'text-slate-800 dark:text-slate-100'}
          `}
          title={space.name}
        >
          {space.name}
        </span>

        {/* Plot Content: Colored 3D Houses / Special Icons */}
        <div className="flex-1 flex items-center justify-center min-h-0 py-0.5">
          {houseLevel > 0 ? (
            <HousePlotDisplay level={houseLevel} ownerColor={ownerColor} isRotated={false} />
          ) : icon ? (
            <span className="text-[11px] sm:text-sm md:text-base leading-none opacity-85">
              {icon}
            </span>
          ) : null}
        </div>

        {/* Player Tokens (Inside Land Plot) */}
        <div className="w-full flex items-center justify-center min-h-[14px] sm:min-h-[18px]">
          <PlayerTokens
            players={players}
            displayedPositions={displayedPositions}
            movingPlayerId={movingPlayerId}
            spaceIndex={space.index}
          />
        </div>
      </div>

      {/* ── Sub-box 2: Road Track / Pavement (25% Height) ─────────── */}
      <div className="h-[25%] w-full bg-white dark:bg-slate-900 border-t border-slate-300 dark:border-slate-700/60 flex items-center justify-center p-0.5 overflow-hidden">
        {currentRent !== null ? (
          <div className="flex items-center justify-center gap-1 text-center leading-none">
            <span className="text-[8.5px] sm:text-[10px] md:text-[14px] font-mono font-black text-slate-900 dark:text-slate-100 tracking-tight leading-none text-center">
              {formatRentDisplay(currentRent)}
            </span>
            {isMonopolized && (
              <span className="text-[7.5px] sm:text-[9px] font-black text-amber-600 dark:text-amber-400 animate-pulse flex-shrink-0" title="Monopoly Set 1.5× Rent Active">
                👑
              </span>
            )}
            {isWorldCupHost && (
              <span className="text-[7.5px] sm:text-[9px] font-black text-amber-500 dark:text-amber-300 animate-pulse flex-shrink-0" title="World Cup 2× Rent Active">
                🏆
              </span>
            )}
          </div>
        ) : null}
      </div>
    </div>
  );
}

// ── Monopoly Set Celebration Floating Modal ───────────────────────

function MonopolySetCelebrationModal({
  celebration,
  onDismiss,
}: {
  celebration: {
    playerId: string;
    username: string;
    tokenColor: MonopolyTokenColor;
    colorGroup: string;
    propertyNames: string[];
  } | null;
  onDismiss?: () => void;
}) {
  useEffect(() => {
    if (!celebration) return;
    const timer = setTimeout(() => {
      onDismiss?.();
    }, 4500);
    return () => clearTimeout(timer);
  }, [celebration, onDismiss]);

  if (!celebration) return null;

  const colorStyle = COLOR_GROUP_STYLES[celebration.colorGroup] || COLOR_GROUP_STYLES.brown;
  const tokenStyle = TOKEN_STYLES[celebration.tokenColor] || TOKEN_STYLES.red;
  const groupTitle = celebration.colorGroup.replace('_', ' ').toUpperCase();

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/65 backdrop-blur-md animate-in fade-in duration-300 select-none pointer-events-auto">
      <motion.div
        initial={{ scale: 0.7, opacity: 0, y: 30 }}
        animate={{ scale: 1, opacity: 1, y: 0 }}
        exit={{ scale: 0.8, opacity: 0, y: -20 }}
        transition={{ type: 'spring', stiffness: 400, damping: 25 }}
        onClick={onDismiss}
        className="relative w-full max-w-sm sm:max-w-md bg-gradient-to-b from-slate-900 via-slate-900 to-slate-950 border-2 border-amber-400 rounded-3xl p-5 shadow-2xl shadow-amber-500/30 text-center overflow-hidden cursor-pointer"
      >
        {/* Glow halo in background */}
        <div className={`absolute -top-12 left-1/2 -translate-x-1/2 w-52 h-52 rounded-full ${colorStyle.bg} opacity-30 blur-3xl pointer-events-none`} />

        {/* Floating Crown / Stars */}
        <div className="relative flex items-center justify-center gap-2 mb-2">
          <span className="text-3xl sm:text-4xl animate-bounce">👑</span>
          <span className="text-2xl sm:text-3xl animate-pulse">✨</span>
          <span className="text-3xl sm:text-4xl animate-bounce">🏰</span>
        </div>

        {/* Header */}
        <h3 className="text-xl sm:text-2xl font-black uppercase tracking-wider text-transparent bg-clip-text bg-gradient-to-r from-amber-200 via-yellow-400 to-amber-300 drop-shadow-sm">
          MONOPOLY COMPLETED!
        </h3>

        {/* Player Badge */}
        <div className="inline-flex items-center gap-2 px-3.5 py-1.5 my-2.5 rounded-full bg-slate-800/90 border border-slate-700 shadow-inner">
          <span className="text-base">{tokenStyle.avatar}</span>
          <span className="text-xs sm:text-sm font-black text-slate-100">
            {celebration.username}
          </span>
          <span className="text-[10px] uppercase font-bold text-amber-400">
            OWNER
          </span>
        </div>

        <p className="text-xs sm:text-sm text-slate-300 font-medium mb-3">
          Has acquired the complete <span className="font-black text-amber-300">{groupTitle}</span> set!
        </p>

        {/* Property Chips */}
        <div className="flex flex-wrap items-center justify-center gap-1.5 mb-3.5">
          {celebration.propertyNames.map((name, i) => (
            <span
              key={i}
              className={`px-3 py-1 rounded-xl text-xs font-black ${colorStyle.bg} text-white shadow-xs`}
            >
              {name}
            </span>
          ))}
        </div>

        {/* 1.5x Penalty Multiplier Callout */}
        <div className="p-2.5 rounded-2xl bg-gradient-to-r from-amber-500/20 via-yellow-500/30 to-amber-500/20 border border-amber-400/40 text-amber-300 text-xs sm:text-sm font-black shadow-md">
          ⚡ 1.5× RENT PENALTY ACTIVATED ON THIS SET! ⚡
        </div>

        <p className="text-[10px] text-slate-400 mt-3 italic">
          Tap anywhere to continue
        </p>
      </motion.div>
    </div>
  );
}

// ── Bankruptcy Notification Floating Modal (Displays ~2.5s before Winner) ────

function BankruptcyModal({
  player,
}: {
  player: {
    playerId: string;
    username: string;
    tokenColor: MonopolyTokenColor;
  } | null;
}) {
  if (!player) return null;
  const token = TOKEN_STYLES[player.tokenColor] || TOKEN_STYLES.red;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-in fade-in duration-300 select-none pointer-events-auto">
      <motion.div
        initial={{ scale: 0.6, opacity: 0, y: 40 }}
        animate={{ scale: 1, opacity: 1, y: 0 }}
        exit={{ scale: 0.8, opacity: 0, y: -30 }}
        transition={{ type: 'spring', stiffness: 450, damping: 25 }}
        className="relative w-full max-w-sm sm:max-w-md bg-gradient-to-b from-slate-900 via-rose-950/90 to-slate-950 border-2 border-rose-500 rounded-3xl p-6 shadow-2xl shadow-rose-950/60 text-center overflow-hidden"
      >
        {/* Glow halo in background */}
        <div className="absolute -top-12 left-1/2 -translate-x-1/2 w-48 h-48 rounded-full bg-rose-600 opacity-30 blur-3xl pointer-events-none" />

        {/* Skull & Shatter Icon */}
        <div className="relative flex items-center justify-center gap-2 mb-3">
          <span className="text-4xl sm:text-5xl animate-bounce">💀</span>
          <span className="text-3xl sm:text-4xl animate-pulse">💸</span>
          <span className="text-4xl sm:text-5xl animate-bounce">📉</span>
        </div>

        {/* Header */}
        <h3 className="text-2xl sm:text-3xl font-black uppercase tracking-wider text-transparent bg-clip-text bg-gradient-to-r from-rose-400 via-red-300 to-amber-400 drop-shadow-md">
          BANKRUPT!
        </h3>

        {/* Player Badge */}
        <div className="inline-flex items-center gap-2.5 px-4 py-2 my-3 rounded-full bg-slate-800/90 border border-rose-500/40 shadow-inner">
          <span className="text-lg">{token.avatar}</span>
          <span className="text-sm sm:text-base font-black text-rose-200">
            {player.username}
          </span>
          <span className="text-[10px] uppercase font-bold text-rose-400 bg-rose-950 px-2 py-0.5 rounded-full border border-rose-800">
            ELIMINATED
          </span>
        </div>

        <p className="text-xs sm:text-sm text-slate-300 font-medium">
          Ran out of funds to pay expenses and has gone bankrupt!
        </p>

        <div className="mt-4 inline-block px-3 py-1 rounded-full bg-rose-500/15 border border-rose-500/30 text-rose-300 text-[11px] font-mono font-bold animate-pulse">
          Declaring game outcome...
        </div>
      </motion.div>
    </div>
  );
}

// ── Dice Display Component ────────────────────────────────────────

function DiceDisplay({
  dice,
  isRolling,
}: {
  dice: [number, number] | null;
  isRolling: boolean;
}) {
  const [displayDice, setDisplayDice] = useState<[number, number]>(dice || [1, 1]);

  // When rolling finishes or when dice changes while not rolling, ALWAYS synchronize with the exact server dice!
  useEffect(() => {
    if (!isRolling && dice) {
      setDisplayDice(dice);
    }
  }, [dice, isRolling]);

  // Rolling shuffle effect
  useEffect(() => {
    if (!isRolling) return;
    const interval = setInterval(() => {
      setDisplayDice([
        Math.floor(Math.random() * 6) + 1,
        Math.floor(Math.random() * 6) + 1,
      ]);
    }, 80);
    return () => clearInterval(interval);
  }, [isRolling]);

  const dotPositions: Record<number, string[]> = {
    1: ['top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2'],
    2: ['top-1.5 left-1.5', 'bottom-1.5 right-1.5'],
    3: ['top-1.5 left-1.5', 'top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2', 'bottom-1.5 right-1.5'],
    4: ['top-1.5 left-1.5', 'top-1.5 right-1.5', 'bottom-1.5 left-1.5', 'bottom-1.5 right-1.5'],
    5: ['top-1.5 left-1.5', 'top-1.5 right-1.5', 'top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2', 'bottom-1.5 left-1.5', 'bottom-1.5 right-1.5'],
    6: ['top-1.5 left-1.5', 'top-1.5 right-1.5', 'top-1/2 left-1.5 -translate-y-1/2', 'top-1/2 right-1.5 -translate-y-1/2', 'bottom-1.5 left-1.5', 'bottom-1.5 right-1.5'],
  };

  const dotClass = 'bg-slate-900 dark:bg-slate-100 shadow-inner';

  const isDoubles = !isRolling && dice && dice[0] === dice[1];
  const diceSum = !isRolling && dice ? dice[0] + dice[1] : null;

  return (
    <div className="flex flex-col items-center justify-center gap-1.5">
      <div className="flex items-center justify-center gap-3">
        {displayDice.map((val, i) => (
          <motion.div
            key={i}
            animate={
              isRolling
                ? {
                    rotate: [0, 90, 180, 270, 360],
                    scale: [1, 1.15, 0.95, 1.1, 1],
                  }
                : { rotate: 0, scale: 1 }
            }
            transition={
              isRolling
                ? { repeat: Infinity, duration: 0.3 }
                : { type: 'spring', stiffness: 300, damping: 20 }
            }
            className={`w-9 h-9 sm:w-11 sm:h-11 rounded-xl bg-white dark:bg-slate-800 border-2 ${
              isDoubles
                ? 'border-amber-400 ring-2 ring-amber-400/50 shadow-amber-500/20 shadow-lg'
                : 'border-amber-400 dark:border-amber-500/80 shadow-md'
            } relative select-none flex-shrink-0`}
          >
            {(dotPositions[val] || []).map((pos, j) => (
              <div
                key={j}
                className={`absolute w-2 h-2 rounded-full ${pos} ${dotClass}`}
              />
            ))}
          </motion.div>
        ))}
      </div>

      {/* Dice total indicator */}
      <div className="min-h-[16px] flex items-center justify-center">
        {isRolling ? (
          <span className="text-[10px] sm:text-xs font-black tracking-widest text-amber-300 dark:text-amber-400 animate-pulse">
            ROLLING...
          </span>
        ) : diceSum !== null ? (
          <span className={`text-[10px] sm:text-xs font-black tracking-wider ${isDoubles ? 'text-amber-300 animate-bounce' : 'text-amber-200/90 dark:text-amber-300/80'}`}>
            🎲 {diceSum} {isDoubles ? '✨ DOUBLES! ✨' : ''}
          </span>
        ) : null}
      </div>
    </div>
  );
}

// ── Animated Balance Display ──────────────────────────────────────

function AnimatedBalanceDisplay({
  balance,
  className = '',
}: {
  balance: number;
  isMoving?: boolean;
  className?: string;
}) {
  const [displayedBalance, setDisplayedBalance] = useState(balance);
  const [delta, setDelta] = useState<{ id: number; amount: number } | null>(null);
  const prevBalanceRef = useRef(balance);

  // Trigger popup when displayed balance changes (e.g. stepping on START or settling on tile)
  useEffect(() => {
    if (prevBalanceRef.current !== balance) {
      const diff = balance - prevBalanceRef.current;
      prevBalanceRef.current = balance;
      setDisplayedBalance(balance);

      if (diff !== 0) {
        setDelta({ id: Date.now(), amount: diff });
        const timer = setTimeout(() => setDelta(null), 2500);
        return () => clearTimeout(timer);
      }
    }
  }, [balance]);

  return (
    <div className="relative inline-flex items-center">
      <motion.span
        key={displayedBalance}
        initial={{ scale: delta ? 1.35 : 1 }}
        animate={{ scale: 1 }}
        transition={{ type: 'spring', stiffness: 400, damping: 15 }}
        className={`font-mono font-black transition-colors duration-500 ${
          delta
            ? delta.amount > 0
              ? 'text-emerald-500 dark:text-emerald-400'
              : 'text-rose-500 dark:text-rose-400'
            : ''
        } ${className}`}
      >
        ${displayedBalance.toLocaleString()}
      </motion.span>

      {/* Floating Delta Animation (+ / - Bubble) */}
      <AnimatePresence>
        {delta && (
          <motion.div
            key={delta.id}
            initial={{ opacity: 0, y: 0, scale: 0.6 }}
            animate={{ opacity: 1, y: -22, scale: 1.15 }}
            exit={{ opacity: 0, y: -34, scale: 0.8 }}
            transition={{ duration: 1.4, ease: 'easeOut' }}
            className={`absolute -top-3 left-full ml-1 px-1.5 py-0.5 rounded-md text-[11px] sm:text-xs font-mono font-black shadow-lg pointer-events-none z-30 flex items-center gap-0.5 whitespace-nowrap ${
              delta.amount > 0
                ? 'bg-emerald-500 text-slate-950 border border-emerald-300 ring-2 ring-emerald-400/40'
                : 'bg-rose-500 text-white border border-rose-300 ring-2 ring-rose-400/40'
            }`}
          >
            {delta.amount > 0 ? `+` : `−`}${Math.abs(delta.amount).toLocaleString()}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

// ── Compact Player Card ──────────────────────────────────────────

function CompactPlayerCard({
  player,
  displayedBalance,
  isCurrentTurn,
  isSelf,
  isMoving,
}: {
  player: MonopolyPlayerState;
  displayedBalance?: number;
  isCurrentTurn: boolean;
  isSelf: boolean;
  isMoving?: boolean;
}) {
  const token = TOKEN_STYLES[player.tokenColor] || TOKEN_STYLES.red;
  const balanceToShow = displayedBalance !== undefined ? displayedBalance : player.balance;

  return (
    <div
      className={`
        flex items-center gap-3 px-3.5 py-2.5 rounded-2xl border transition-all duration-200 shadow-sm
        ${isCurrentTurn
          ? 'border-amber-400 dark:border-amber-400/90 bg-amber-50/95 dark:bg-amber-400/15 ring-2 ring-amber-400/50 shadow-md'
          : 'border-slate-200 dark:border-slate-700/60 bg-slate-50/90 dark:bg-slate-800/50 text-slate-800 dark:text-slate-200'
        }
        ${!player.isActive ? 'opacity-30 grayscale' : ''}
      `}
    >
      <div className={`w-9 h-9 sm:w-10 sm:h-10 rounded-xl ${token.bg} flex items-center justify-center text-lg sm:text-xl shadow-md flex-shrink-0 text-white border border-white/40`}>
        <span>{token.avatar}</span>
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-1.5">
          <span className="text-xs sm:text-sm font-black text-slate-900 dark:text-slate-100 truncate">
            {player.username}
          </span>
          {isSelf && (
            <span className="w-2 h-2 rounded-full bg-emerald-500 flex-shrink-0" title="You" />
          )}
          {player.inJail && (
            <span className="text-[9px] bg-rose-100 dark:bg-rose-950/70 text-rose-600 dark:text-rose-400 px-1.5 py-0.2 rounded-md font-black border border-rose-300 dark:border-rose-800/50">
              🔒 JAIL
            </span>
          )}
        </div>
        <div className="flex items-center gap-3 mt-1">
          <AnimatedBalanceDisplay
            balance={balanceToShow}
            isMoving={isMoving}
            className="text-xs sm:text-sm font-mono font-black"
          />
          <span className="text-xs text-slate-500 dark:text-slate-400 font-bold">
            🏢 {player.ownedProperties.length}
          </span>
        </div>
      </div>
      {isCurrentTurn && (
        <span className="text-[10px] sm:text-xs text-amber-600 dark:text-amber-400 font-black animate-pulse px-2 py-0.5 rounded-md bg-amber-100 dark:bg-amber-950/60 border border-amber-300 dark:border-amber-700/60">
          🎲 TURN
        </span>
      )}
    </div>
  );
}


// ── House Building Modal (Overlay) ──────────────────────────────

function BuildHouseModal({
  offer,
  playerBalance,
  onBuild,
  onSkip,
}: {
  offer: {
    spaceIndex: number;
    spaceName: string;
    currentLevel: number;
    upgradeCost: number;
    maxLevel: number;
    costs: number[];
  };
  playerBalance: number;
  onBuild: (targetLevel: number) => void;
  onSkip: () => void;
}) {
  const space = MONOPOLY_BOARD[offer.spaceIndex];
  const colorStyle = space?.colorGroup ? COLOR_GROUP_STYLES[space.colorGroup] : null;
  const isFirstPurchase = offer.currentLevel === 0;

  const levels = [
    { level: 1, name: 'House Lv.1', icon: '🏠', baseCost: offer.costs[0] },
    { level: 2, name: 'House Lv.2', icon: '🏠🏠', baseCost: offer.costs[1] },
    { level: 3, name: 'House Lv.3', icon: '🏠🏠🏠', baseCost: offer.costs[2] },
    { level: 4, name: 'Hotel', icon: '🏨', baseCost: offer.costs[3] },
  ];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-md p-4 select-none animate-in fade-in duration-200">
      <motion.div
        initial={{ scale: 0.9, opacity: 0, y: 20 }}
        animate={{ scale: 1, opacity: 1, y: 0 }}
        exit={{ scale: 0.9, opacity: 0, y: 20 }}
        className="w-full max-w-md bg-white dark:bg-slate-900 border-2 border-amber-400 dark:border-amber-500 rounded-3xl shadow-2xl overflow-hidden"
      >
        {/* Modal Header */}
        <div className={`p-4 ${colorStyle ? colorStyle.bg : 'bg-amber-600'} text-white flex items-center justify-between shadow-md`}>
          <div className="flex items-center gap-2.5">
            <span className="text-2xl">{isFirstPurchase ? '🏠' : '🏗️'}</span>
            <div>
              <h3 className="text-base font-black tracking-wide">
                {isFirstPurchase ? 'BUY & BUILD PROPERTY' : 'UPGRADE PROPERTY'}
              </h3>
              <p className="text-xs font-bold opacity-90">
                {offer.spaceName} • {isFirstPurchase ? 'New Purchase' : HOUSE_LEVEL_LABELS[offer.currentLevel]}
              </p>
            </div>
          </div>
          <div className="text-right">
            <span className="text-[10px] uppercase tracking-wider block opacity-80">Your Cash</span>
            <span className="text-sm font-mono font-black text-amber-200">
              ${playerBalance.toLocaleString()}
            </span>
          </div>
        </div>

        {/* Modal Body / 4 Level Cards */}
        <div className="p-4 space-y-3">
          <div className="grid grid-cols-2 gap-2.5">
            {levels.map(({ level, name, icon, baseCost }) => {
              const isAlreadyBuilt = !isFirstPurchase && level <= offer.currentLevel;
              const isLocked = level > offer.maxLevel;
              const canAfford = playerBalance >= baseCost;

              return (
                <div
                  key={level}
                  className={`p-3 rounded-2xl border flex flex-col justify-between transition-all ${
                    isAlreadyBuilt
                      ? 'border-slate-200 dark:border-slate-800 bg-slate-100/70 dark:bg-slate-800/40 opacity-50'
                      : isLocked
                      ? 'border-dashed border-amber-400/40 bg-amber-50/40 dark:bg-amber-950/20 opacity-60'
                      : canAfford
                      ? 'border-amber-400/80 dark:border-amber-500/60 bg-amber-50/80 dark:bg-slate-800/70 shadow-sm'
                      : 'border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/30 opacity-60'
                  }`}
                >
                  <div className="flex items-start justify-between">
                    <span className="text-lg">{icon}</span>
                    <span className="text-[9px] font-black uppercase px-2 py-0.5 rounded-full bg-black/10 dark:bg-white/10">
                      Lv.{level}
                    </span>
                  </div>

                  <div className="my-1.5">
                    <div className="text-xs font-black text-slate-900 dark:text-slate-100">
                      {name}
                    </div>
                    <div className="text-xs font-mono font-bold text-emerald-600 dark:text-emerald-400 mt-0.5">
                      {isAlreadyBuilt ? 'Built' : `Cost: $${baseCost.toLocaleString()}`}
                    </div>
                  </div>

                  {isAlreadyBuilt ? (
                    <span className="text-[10px] font-bold text-slate-400 text-center py-1">
                      ✅ Built
                    </span>
                  ) : isLocked ? (
                    <span className="text-[9px] font-bold text-amber-600 dark:text-amber-400 text-center py-1 bg-amber-100/60 dark:bg-amber-950/40 rounded-lg">
                      🔒 2nd Visit Only
                    </span>
                  ) : canAfford ? (
                    <motion.button
                      whileHover={{ scale: 1.03 }}
                      whileTap={{ scale: 0.97 }}
                      onClick={() => onBuild(level)}
                      className="w-full py-1.5 bg-gradient-to-r from-emerald-500 to-teal-500 text-slate-950 font-black rounded-xl text-[11px] shadow cursor-pointer transition-all"
                    >
                      {isFirstPurchase ? `BUY LV.${level}` : `BUILD LV.${level}`}
                    </motion.button>
                  ) : (
                    <span className="text-[10px] font-bold text-rose-500 text-center py-1 bg-rose-50 dark:bg-rose-950/40 rounded-lg">
                      ❌ Not enough cash
                    </span>
                  )}
                </div>
              );
            })}
          </div>

          {/* Skip button */}
          <div className="pt-1">
            <motion.button
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              onClick={onSkip}
              className="w-full py-2.5 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 font-bold rounded-xl text-xs border border-slate-300 dark:border-slate-700 transition-colors cursor-pointer"
            >
              {isFirstPurchase ? 'PASS ✋' : 'SKIP BUILDING ✋'}
            </motion.button>
          </div>
        </div>
      </motion.div>
    </div>
  );
}

// ── Main MonopolyBoard Component ────────────────────────────────

export function MonopolyBoard({
  gameState,
  playerId,
  room,
  roomId,
  onRollDice,
  onBuyProperty,
  onUpgradeProperty,
  onSellProperty,
  onPayDebt,
  onDeclareBankruptcy,
  onEndTurn,
  onLeaveRoom,
  onRematch,
  isFinished,
  buyOffer,
  upgradeOffer,
  monopolyCelebration,
  onDismissCelebration,
  onWorldTourTravel,
  onHostWorldCup,
  onSelectChanceTarget,
  endReason,
}: MonopolyBoardProps) {
  const players = gameState?.players ?? [];
  const currentTurnPlayerId = gameState?.currentTurnPlayerId;
  const turnPhase = gameState?.turnPhase ?? 'roll';
  const lastDice = gameState?.lastDice ?? null;
  const winner = gameState?.winner;

  const isMyTurn = currentTurnPlayerId === playerId;

  // ── Step-by-Step Movement & Dice Animation States ────────────────
  const [displayedPositions, setDisplayedPositions] = useState<Record<string, number>>({});
  const [displayedBalances, setDisplayedBalances] = useState<Record<string, number>>({});
  const [isRollingDice, setIsRollingDice] = useState(false);
  const [movingPlayerId, setMovingPlayerId] = useState<string | null>(null);
  const [isAnimatingMove, setIsAnimatingMove] = useState(false);
  const [hasMovementSettled, setHasMovementSettled] = useState(true);

  // ── Bankruptcy & Delayed Winner Transition States ────────────────
  const [bankruptModalPlayer, setBankruptModalPlayer] = useState<{
    playerId: string;
    username: string;
    tokenColor: MonopolyTokenColor;
  } | null>(null);
  const [isWinnerVisible, setIsWinnerVisible] = useState<boolean>(!gameState?.winner ? false : true);
  const [startBonusPlayer, setStartBonusPlayer] = useState<string | null>(null);
  const [chanceToast, setChanceToast] = useState<{ title: string; description: string; icon: string } | null>(null);
  const lastChanceTimestampRef = useRef<number>(0);

  const prevPlayersRef = useRef<MonopolyPlayerState[]>([]);
  const pendingBankruptcyRef = useRef<{
    playerId: string;
    username: string;
    tokenColor: MonopolyTokenColor;
  } | null>(null);

  const moveTimersRef = useRef<NodeJS.Timeout[]>([]);

  const clearTimers = () => {
    moveTimersRef.current.forEach((t) => clearTimeout(t));
    moveTimersRef.current = [];
  };

  useEffect(() => {
    return () => clearTimers();
  }, []);

  const prevRollCountRef = useRef<number>(0);

  // Synchronize server player positions & balances with smooth sequential hopping animation
  useEffect(() => {
    if (!gameState || players.length === 0) return;

    // Handle Game Reset / Rematch (rollCount === 0 and winner === null)
    if (gameState.rollCount === 0 && !gameState.winner) {
      clearTimers();
      setIsRollingDice(false);
      setIsAnimatingMove(false);
      setMovingPlayerId(null);
      setHasMovementSettled(true);
      setBankruptModalPlayer(null);
      setIsWinnerVisible(false);
      setStartBonusPlayer(null);
      pendingBankruptcyRef.current = null;
      prevRollCountRef.current = 0;
      prevPlayersRef.current = players;

      const freshPositions: Record<string, number> = {};
      const freshBalances: Record<string, number> = {};
      players.forEach((p) => {
        freshPositions[p.playerId] = p.position;
        freshBalances[p.playerId] = p.balance;
      });
      setDisplayedPositions(freshPositions);
      setDisplayedBalances(freshBalances);
      return;
    }

    // Detect newly bankrupt player
    if (prevPlayersRef.current.length > 0) {
      const newlyBankrupt = players.find((p) => {
        const prev = prevPlayersRef.current.find((oldP) => oldP.playerId === p.playerId);
        return prev && prev.isActive && !p.isActive;
      });
      if (newlyBankrupt) {
        pendingBankruptcyRef.current = {
          playerId: newlyBankrupt.playerId,
          username: newlyBankrupt.username,
          tokenColor: newlyBankrupt.tokenColor,
        };
      }
    }
    prevPlayersRef.current = players;

    const currentRollCount = gameState.rollCount ?? 0;
    const isNewDiceRoll = currentRollCount > 0 && currentRollCount !== prevRollCountRef.current;
    if (isNewDiceRoll) {
      prevRollCountRef.current = currentRollCount;
    }

    let hasPositionChange = false;

    players.forEach((p) => {
      const currentPos = displayedPositions[p.playerId];
      const targetPos = p.position;

      // Initial mount / setup
      if (currentPos === undefined) {
        setDisplayedPositions((prev) => ({ ...prev, [p.playerId]: targetPos }));
        setDisplayedBalances((prev) => ({ ...prev, [p.playerId]: p.balance }));
        return;
      }

      // If player position changed on server and not currently mid-animation
      if (currentPos !== targetPos && !isAnimatingMove) {
        hasPositionChange = true;
        clearTimers();
        setIsAnimatingMove(true);
        setHasMovementSettled(false);
        setMovingPlayerId(p.playerId);

        const isWorldTourFlight = currentPos === 24;
        const diceDelay = isWorldTourFlight ? 0 : 600;

        if (!isWorldTourFlight) {
          setIsRollingDice(true);
        }

        // Phase 1: Dice rolling animation for 600ms (or 0ms if World Tour flight)
        const diceTimer = setTimeout(() => {
          setIsRollingDice(false);

          // Phase 2: Step-by-step hopping
          const stepsToMove = (targetPos - currentPos + 32) % 32;

          // Special direct warp (e.g. Go to jail teleport where stepsToMove !== dice roll)
          const diceTotal = (gameState?.lastDice?.[0] || 0) + (gameState?.lastDice?.[1] || 0);
          const isTeleport = targetPos === 8 && stepsToMove !== diceTotal && diceTotal > 0;
          if (stepsToMove === 0 || isTeleport) {
            setDisplayedPositions((prev) => ({ ...prev, [p.playerId]: targetPos }));
            const settleTimer = setTimeout(() => {
              setIsAnimatingMove(false);
              setMovingPlayerId(null);
              setHasMovementSettled(true);

              // Sync all player balances once settled
              setDisplayedBalances((prev) => {
                const nextB: Record<string, number> = { ...prev };
                players.forEach((pl) => {
                  nextB[pl.playerId] = pl.balance;
                });
                return nextB;
              });

              // Check if any player just went bankrupt
              if (pendingBankruptcyRef.current) {
                const bPlayer = pendingBankruptcyRef.current;
                pendingBankruptcyRef.current = null;
                setBankruptModalPlayer(bPlayer);
                setIsWinnerVisible(false);

                const bankTimer = setTimeout(() => {
                  setBankruptModalPlayer(null);
                  if (winner) {
                    setIsWinnerVisible(true);
                  }
                }, 2500);
                moveTimersRef.current.push(bankTimer);
              } else if (winner) {
                const winTimer = setTimeout(() => {
                  setIsWinnerVisible(true);
                }, 400);
                moveTimersRef.current.push(winTimer);
              }
            }, 300);
            moveTimersRef.current.push(settleTimer);
            return;
          }

          // Sequential 1-by-1 cell hopping
          const STEP_INTERVAL_MS = isWorldTourFlight ? 150 : 200;
          for (let step = 1; step <= stepsToMove; step++) {
            const stepTimer = setTimeout(() => {
              const nextPos = (currentPos + step) % 32;
              setDisplayedPositions((prev) => ({ ...prev, [p.playerId]: nextPos }));

              // Crossing START gives +250 on this exact step
              if (nextPos === 0) {
                setDisplayedBalances((prev) => ({
                  ...prev,
                  [p.playerId]: (prev[p.playerId] ?? (p.balance - 250)) + 250,
                }));
                setStartBonusPlayer(p.username);
                const bonusTimer = setTimeout(() => setStartBonusPlayer(null), 2200);
                moveTimersRef.current.push(bonusTimer);
              }

              if (step === stepsToMove) {
                // Landed on final space! Wait a moment for visual settlement before opening action cards
                const settleTimer = setTimeout(() => {
                  setIsAnimatingMove(false);
                  setMovingPlayerId(null);
                  setHasMovementSettled(true);

                  // Sync all player balances upon landing
                  setDisplayedBalances((prev) => {
                    const nextB: Record<string, number> = { ...prev };
                    players.forEach((pl) => {
                      nextB[pl.playerId] = pl.balance;
                    });
                    return nextB;
                  });

                  // Check bankruptcy or winner
                  if (pendingBankruptcyRef.current) {
                    const bPlayer = pendingBankruptcyRef.current;
                    pendingBankruptcyRef.current = null;
                    setBankruptModalPlayer(bPlayer);
                    setIsWinnerVisible(false);

                    const bankTimer = setTimeout(() => {
                      setBankruptModalPlayer(null);
                      if (winner) {
                        setIsWinnerVisible(true);
                      }
                    }, 2500);
                    moveTimersRef.current.push(bankTimer);
                  } else if (winner) {
                    const winTimer = setTimeout(() => {
                      setIsWinnerVisible(true);
                    }, 400);
                    moveTimersRef.current.push(winTimer);
                  }
                }, 350);
                moveTimersRef.current.push(settleTimer);
              }
            }, step * STEP_INTERVAL_MS);

            moveTimersRef.current.push(stepTimer);
          }
        }, diceDelay);

        moveTimersRef.current.push(diceTimer);
      }
    });

    // If a new dice roll happened but position didn't change (e.g. rolled in jail or trapped)
    if (isNewDiceRoll && !hasPositionChange && !isAnimatingMove) {
      clearTimers();
      setIsRollingDice(true);
      const diceTimer = setTimeout(() => {
        setIsRollingDice(false);
      }, 600);
      moveTimersRef.current.push(diceTimer);
    }

    // When not moving, keep balances and winner state synchronized
    if (!hasPositionChange && !isAnimatingMove) {
      setDisplayedBalances((prev) => {
        let changed = false;
        const nextB: Record<string, number> = { ...prev };
        players.forEach((pl) => {
          if (nextB[pl.playerId] !== pl.balance) {
            nextB[pl.playerId] = pl.balance;
            changed = true;
          }
        });
        return changed ? nextB : prev;
      });

      if (pendingBankruptcyRef.current) {
        const bPlayer = pendingBankruptcyRef.current;
        pendingBankruptcyRef.current = null;
        setBankruptModalPlayer(bPlayer);
        setIsWinnerVisible(false);

        const bankTimer = setTimeout(() => {
          setBankruptModalPlayer(null);
          if (winner) {
            setIsWinnerVisible(true);
          }
        }, 2500);
        moveTimersRef.current.push(bankTimer);
      } else if (winner && !bankruptModalPlayer) {
        setIsWinnerVisible(true);
      }
    }
  }, [players, gameState?.lastDice, gameState?.rollCount, winner]);

  // Listen to Chance Card Trigger Events and display Floating Toast Banner
  useEffect(() => {
    if (gameState?.lastChanceEvent && gameState.lastChanceEvent.timestamp !== lastChanceTimestampRef.current) {
      lastChanceTimestampRef.current = gameState.lastChanceEvent.timestamp;
      setChanceToast({
        title: gameState.lastChanceEvent.title,
        description: gameState.lastChanceEvent.description,
        icon: gameState.lastChanceEvent.icon,
      });
      const timer = setTimeout(() => {
        setChanceToast(null);
      }, 3000);
      return () => clearTimeout(timer);
    }
  }, [gameState?.lastChanceEvent]);

  const getOwnerColor = useCallback(
    (spaceIndex: number): string | null => {
      for (const p of players) {
        if (p.isActive && p.ownedProperties.includes(spaceIndex)) {
          return p.tokenColor;
        }
      }
      return null;
    },
    [players]
  );

  // My player data
  const myPlayer = players.find((p) => p.playerId === playerId);
  const myRenderedPos = myPlayer ? (displayedPositions[myPlayer.playerId] ?? myPlayer.position) : 0;
  const currentSpace = myPlayer ? MONOPOLY_BOARD[myRenderedPos] : null;

  // Determine if any player is actively moving, rolling, or has not reached target tile
  const isAnyMoving =
    isAnimatingMove ||
    isRollingDice ||
    !hasMovementSettled ||
    players.some(
      (p) =>
        displayedPositions[p.playerId] !== undefined &&
        displayedPositions[p.playerId] !== p.position
    );

  // Check if World Tour phase is active for current user
  const isWorldTourActive =
    !winner &&
    !isWinnerVisible &&
    !bankruptModalPlayer &&
    !isAnyMoving &&
    hasMovementSettled &&
    isMyTurn &&
    Boolean(myPlayer) &&
    (turnPhase === 'world_tour' || (turnPhase === 'roll' && myPlayer?.position === 24));

  // Check if World Cup host selection phase is active for current user
  const isWorldCupSelectionActive =
    !winner &&
    !isWinnerVisible &&
    !bankruptModalPlayer &&
    !isAnyMoving &&
    hasMovementSettled &&
    isMyTurn &&
    Boolean(myPlayer) &&
    turnPhase === 'world_cup' &&
    (myPlayer?.ownedProperties.length ?? 0) > 0;

  // Check if Chance Target selection phase is active for current user
  const isChanceTargetSelectionActive =
    !winner &&
    !isWinnerVisible &&
    !bankruptModalPlayer &&
    !isAnyMoving &&
    hasMovementSettled &&
    isMyTurn &&
    Boolean(myPlayer) &&
    turnPhase === 'chance_target' &&
    Boolean(gameState?.pendingChanceTarget);

  const pendingChanceTarget = gameState?.pendingChanceTarget;

  const isSpaceValidChanceTarget = useCallback(
    (spaceIndex: number): boolean => {
      if (!isChanceTargetSelectionActive || !pendingChanceTarget) return false;
      const space = MONOPOLY_BOARD[spaceIndex];
      if (!space || (space.type !== 'property' && space.type !== 'beach')) return false;

      const shielded = gameState?.shieldedSpaces || [];
      const blackout = gameState?.blackoutSpaces || [];

      if (pendingChanceTarget.type === 'shield') {
        return Boolean(myPlayer?.ownedProperties?.includes(spaceIndex) && !shielded.includes(spaceIndex));
      }

      // Demolish, Blackout, Downgrade: Must be opponent unshielded property
      const isOpponentProp = players.some(
        (p) => p.isActive && p.playerId !== playerId && p.ownedProperties.includes(spaceIndex)
      );
      if (!isOpponentProp || shielded.includes(spaceIndex)) return false;

      if (pendingChanceTarget.type === 'blackout') {
        return !blackout.includes(spaceIndex);
      }
      if (pendingChanceTarget.type === 'downgrade') {
        const owner = players.find((p) => p.isActive && p.ownedProperties.includes(spaceIndex));
        return (owner?.houseLevels?.[spaceIndex] ?? 0) > 0;
      }

      return true; // demolish
    },
    [
      isChanceTargetSelectionActive,
      pendingChanceTarget,
      gameState?.shieldedSpaces,
      gameState?.blackoutSpaces,
      myPlayer,
      players,
      playerId,
    ]
  );

  // Actions/Modals can only show once movement has 100% completed and settled
  const canShowActions =
    !winner &&
    !isWinnerVisible &&
    !bankruptModalPlayer &&
    !isAnyMoving &&
    hasMovementSettled &&
    isMyTurn &&
    Boolean(myPlayer) &&
    (myPlayer ? displayedPositions[myPlayer.playerId] === myPlayer.position : false);

  return (
    <div className="w-full max-w-[1300px] mx-auto h-[min(90vh,860px)] flex gap-4 px-2 py-0.5 items-stretch justify-center select-none">
      
      {/* ── MONOPOLY SET CELEBRATION MODAL OVERLAY ───────────── */}
      <AnimatePresence>
        {monopolyCelebration && (
          <MonopolySetCelebrationModal
            celebration={monopolyCelebration}
            onDismiss={onDismissCelebration}
          />
        )}
      </AnimatePresence>

      {/* ── BANKRUPTCY MODAL OVERLAY ──────────────────────────── */}
      <AnimatePresence>
        {bankruptModalPlayer && (
          <BankruptcyModal player={bankruptModalPlayer} />
        )}
      </AnimatePresence>

      {/* ── BUILD HOUSE MODAL OVERLAY ─────────────────────────── */}
      <AnimatePresence>
        {canShowActions && turnPhase === 'action' && upgradeOffer && myPlayer && (
          <BuildHouseModal
            offer={upgradeOffer}
            playerBalance={displayedBalances[myPlayer.playerId] ?? myPlayer.balance}
            onBuild={(targetLevel) => onUpgradeProperty?.(targetLevel)}
            onSkip={() => onEndTurn?.()}
          />
        )}
      </AnimatePresence>

      {/* ── CENTER: Game Board (Occupies main area) ──────────── */}
      <div className="flex-1 flex flex-col items-center justify-center min-w-0 h-full">
        {/* Board Grid Container */}
        <div className="w-full max-w-[min(100%,min(90vh,860px))] aspect-square h-full max-h-[min(90vh,860px)] rounded-3xl border-2 border-amber-400/90 dark:border-amber-500/70 bg-slate-100 dark:bg-slate-950 shadow-2xl dark:shadow-amber-950/30 overflow-hidden flex items-center justify-center p-1.5 sm:p-2">
          <div
            className="grid w-full h-full rounded-2xl overflow-hidden bg-slate-200 dark:bg-slate-950"
            style={{
              gridTemplateColumns: '1.4fr repeat(7, minmax(0, 1fr)) 1.4fr',
              gridTemplateRows: '1.4fr repeat(7, minmax(0, 1fr)) 1.4fr',
            }}
          >
            {/* Top Row (16-24) */}
            {TOP_ROW.map((idx, col) => (
              <div key={`top-${idx}`} className="w-full h-full" style={{ gridRow: 1, gridColumn: col + 1 }}>
                <BoardCell
                  space={MONOPOLY_BOARD[idx]}
                  players={players}
                  displayedPositions={displayedPositions}
                  movingPlayerId={movingPlayerId}
                  ownerColor={getOwnerColor(idx)}
                  houseLevel={getHouseLevel(players, idx)}
                  isCorner={idx === 16 || idx === 24}
                  isWorldTourActive={isWorldTourActive}
                  isValidWorldTourTarget={isWorldTourTargetValid(idx)}
                  onSelectDestination={onWorldTourTravel}
                  isWorldCupHost={gameState?.worldCupSpaceIndex === idx}
                  isWorldCupSelectionActive={isWorldCupSelectionActive}
                  isMyOwnedProperty={Boolean(myPlayer?.ownedProperties.includes(idx))}
                  onHostWorldCup={onHostWorldCup}
                  isShielded={gameState?.shieldedSpaces?.includes(idx)}
                  isBlackout={gameState?.blackoutSpaces?.includes(idx)}
                  isChanceTargetActive={isChanceTargetSelectionActive}
                  isValidChanceTarget={isSpaceValidChanceTarget(idx)}
                  onSelectChanceTarget={onSelectChanceTarget}
                  blackoutSpaces={gameState?.blackoutSpaces}
                />
              </div>
            ))}

            {/* Left Column (15-9, bottom to top) */}
            {LEFT_COL.slice().reverse().map((idx, row) => (
              <div key={`left-${idx}`} className="w-full h-full" style={{ gridRow: row + 2, gridColumn: 1 }}>
                <BoardCell
                  space={MONOPOLY_BOARD[idx]}
                  players={players}
                  displayedPositions={displayedPositions}
                  movingPlayerId={movingPlayerId}
                  ownerColor={getOwnerColor(idx)}
                  houseLevel={getHouseLevel(players, idx)}
                  isWorldTourActive={isWorldTourActive}
                  isValidWorldTourTarget={isWorldTourTargetValid(idx)}
                  onSelectDestination={onWorldTourTravel}
                  isWorldCupHost={gameState?.worldCupSpaceIndex === idx}
                  isWorldCupSelectionActive={isWorldCupSelectionActive}
                  isMyOwnedProperty={Boolean(myPlayer?.ownedProperties.includes(idx))}
                  onHostWorldCup={onHostWorldCup}
                  isShielded={gameState?.shieldedSpaces?.includes(idx)}
                  isBlackout={gameState?.blackoutSpaces?.includes(idx)}
                  isChanceTargetActive={isChanceTargetSelectionActive}
                  isValidChanceTarget={isSpaceValidChanceTarget(idx)}
                  onSelectChanceTarget={onSelectChanceTarget}
                  blackoutSpaces={gameState?.blackoutSpaces}
                />
              </div>
            ))}

            {/* Right Column (25-31) */}
            {RIGHT_COL.map((idx, row) => (
              <div key={`right-${idx}`} className="w-full h-full" style={{ gridRow: row + 2, gridColumn: 9 }}>
                <BoardCell
                  space={MONOPOLY_BOARD[idx]}
                  players={players}
                  displayedPositions={displayedPositions}
                  movingPlayerId={movingPlayerId}
                  ownerColor={getOwnerColor(idx)}
                  houseLevel={getHouseLevel(players, idx)}
                  isWorldTourActive={isWorldTourActive}
                  isValidWorldTourTarget={isWorldTourTargetValid(idx)}
                  onSelectDestination={onWorldTourTravel}
                  isWorldCupHost={gameState?.worldCupSpaceIndex === idx}
                  isWorldCupSelectionActive={isWorldCupSelectionActive}
                  isMyOwnedProperty={Boolean(myPlayer?.ownedProperties.includes(idx))}
                  onHostWorldCup={onHostWorldCup}
                  isShielded={gameState?.shieldedSpaces?.includes(idx)}
                  isBlackout={gameState?.blackoutSpaces?.includes(idx)}
                  isChanceTargetActive={isChanceTargetSelectionActive}
                  isValidChanceTarget={isSpaceValidChanceTarget(idx)}
                  onSelectChanceTarget={onSelectChanceTarget}
                  blackoutSpaces={gameState?.blackoutSpaces}
                />
              </div>
            ))}

            {/* Bottom Row (8-0) */}
            {BOTTOM_ROW.map((idx, col) => (
              <div key={`bottom-${idx}`} className="w-full h-full" style={{ gridRow: 9, gridColumn: col + 1 }}>
                <BoardCell
                  space={MONOPOLY_BOARD[idx]}
                  players={players}
                  displayedPositions={displayedPositions}
                  movingPlayerId={movingPlayerId}
                  ownerColor={getOwnerColor(idx)}
                  houseLevel={getHouseLevel(players, idx)}
                  isCorner={idx === 8 || idx === 0}
                  isWorldTourActive={isWorldTourActive}
                  isValidWorldTourTarget={isWorldTourTargetValid(idx)}
                  onSelectDestination={onWorldTourTravel}
                  isWorldCupHost={gameState?.worldCupSpaceIndex === idx}
                  isWorldCupSelectionActive={isWorldCupSelectionActive}
                  isMyOwnedProperty={Boolean(myPlayer?.ownedProperties.includes(idx))}
                  onHostWorldCup={onHostWorldCup}
                  isShielded={gameState?.shieldedSpaces?.includes(idx)}
                  isBlackout={gameState?.blackoutSpaces?.includes(idx)}
                  isChanceTargetActive={isChanceTargetSelectionActive}
                  isValidChanceTarget={isSpaceValidChanceTarget(idx)}
                  onSelectChanceTarget={onSelectChanceTarget}
                  blackoutSpaces={gameState?.blackoutSpaces}
                />
              </div>
            ))}

            {/* ── Center Field (Yellow/Emerald Center Box) ─────── */}
            <div
              style={{ gridRow: '2 / 9', gridColumn: '2 / 9' }}
              className="flex flex-col items-center justify-between p-3 sm:p-4 bg-gradient-to-br from-emerald-600 via-teal-700 to-emerald-800 dark:from-emerald-950 dark:via-teal-950 dark:to-slate-950 relative overflow-hidden border-2 border-amber-400/60 dark:border-amber-500/30 rounded-lg shadow-inner"
            >
              {/* Title */}
              <div className="text-center z-10">
                <h2 className="text-xl sm:text-2xl md:text-3xl font-black tracking-[0.15em] bg-gradient-to-r from-amber-200 via-yellow-100 to-amber-300 dark:from-amber-300 dark:via-yellow-200 dark:to-amber-400 bg-clip-text text-transparent drop-shadow-md">
                  MONOPOLY
                </h2>
              </div>

              {/* Dice Display */}
              <DiceDisplay dice={lastDice} isRolling={isRollingDice} />

              {/* Start Bonus Salary Banner */}
              <AnimatePresence>
                {startBonusPlayer && (
                  <motion.div
                    initial={{ scale: 0.5, y: 15, opacity: 0 }}
                    animate={{ scale: 1.05, y: 0, opacity: 1 }}
                    exit={{ scale: 0.8, y: -15, opacity: 0 }}
                    className="z-30 px-4 py-1.5 bg-gradient-to-r from-emerald-500 via-teal-500 to-emerald-600 text-slate-950 font-black rounded-full text-xs sm:text-sm shadow-2xl border-2 border-emerald-200 animate-bounce flex items-center gap-1.5 pointer-events-none"
                  >
                    <span>🚩</span>
                    <span>{startBonusPlayer} passed START: +$250 Salary!</span>
                    <span>💰</span>
                  </motion.div>
                )}
              </AnimatePresence>

              {/* Chance Event Floating Toast Banner (Like Pass START) */}
              <AnimatePresence>
                {chanceToast && (
                  <motion.div
                    initial={{ scale: 0.5, y: 15, opacity: 0 }}
                    animate={{ scale: 1.05, y: 0, opacity: 1 }}
                    exit={{ scale: 0.8, y: -15, opacity: 0 }}
                    className="z-30 px-5 py-2.5 bg-gradient-to-r from-purple-600 via-indigo-600 to-purple-700 text-white font-black rounded-2xl text-xs sm:text-sm shadow-2xl border-2 border-purple-300 animate-bounce flex items-center gap-2.5 pointer-events-none text-center max-w-[320px]"
                  >
                    <span className="text-xl sm:text-2xl flex-shrink-0">{chanceToast.icon}</span>
                    <div className="flex flex-col text-left leading-tight">
                      <span className="text-amber-300 font-extrabold text-[10px] sm:text-[11px] uppercase tracking-wider">{chanceToast.title}</span>
                      <span className="text-white text-xs sm:text-sm font-black">{chanceToast.description}</span>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>

              {/* Winner Display */}
              {isWinnerVisible && winner && (
                <motion.div
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  transition={{ type: 'spring', stiffness: 350, damping: 20 }}
                  className="flex flex-col items-center gap-2.5 z-20"
                >
                  <div className="px-6 py-3 bg-gradient-to-r from-amber-400 via-yellow-400 to-amber-500 text-slate-950 font-black rounded-2xl text-base sm:text-lg shadow-2xl border-2 border-amber-200 animate-bounce text-center">
                    🏆 {players.find((p) => p.playerId === winner)?.username || gameState?.players?.find((p) => p.playerId === winner)?.username || room?.players?.find((p) => p.id === winner)?.username || 'WINNER'} WINS!
                    {endReason === 'disconnect' && (
                      <div className="text-xs font-bold mt-1 text-slate-900">🏃 Opponent left the match</div>
                    )}
                  </div>
                  {onRematch && (
                    <motion.button
                      whileHover={{ scale: 1.05 }}
                      whileTap={{ scale: 0.95 }}
                      onClick={onRematch}
                      className="px-6 py-2.5 bg-gradient-to-r from-emerald-400 via-teal-400 to-emerald-500 text-slate-950 font-black rounded-xl text-xs sm:text-sm shadow-2xl border-2 border-emerald-200 cursor-pointer flex items-center gap-1.5 transition-transform"
                    >
                      <span>🔄</span>
                      <span>PLAY AGAIN (REMATCH)</span>
                    </motion.button>
                  )}
                </motion.div>
              )}

              {/* Moving status indicator */}
              {isAnyMoving && (
                <div className="text-center z-10 bg-amber-400/20 dark:bg-amber-400/10 px-4 py-1.5 rounded-full border border-amber-300/50 dark:border-amber-400/30 animate-pulse">
                  <span className="text-xs font-black text-amber-200">
                    {isRollingDice ? '🎲 Rolling dice...' : '🏃 Moving...'}
                  </span>
                </div>
              )}

              {/* ── CENTER BOARD ACTION CONTROLS ───────────────── */}

              {/* Chance Target Selection Banner (In Center Box) */}
              {isChanceTargetSelectionActive && pendingChanceTarget && (
                <motion.div
                  initial={{ scale: 0.9, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  className="z-20 bg-slate-950/95 border-2 border-purple-400 p-3.5 rounded-2xl shadow-2xl text-center space-y-1.5 max-w-[300px] w-full select-none"
                >
                  <div className="flex items-center justify-center gap-1.5 text-purple-400 font-black text-xs sm:text-sm tracking-wider">
                    <span className="text-lg animate-bounce">
                      {pendingChanceTarget.type === 'demolish'
                        ? '💣'
                        : pendingChanceTarget.type === 'blackout'
                        ? '⚡'
                        : pendingChanceTarget.type === 'downgrade'
                        ? '🔨'
                        : '🛡️'}
                    </span>
                    <span>{pendingChanceTarget.title}</span>
                  </div>
                  <p className="text-[11px] text-slate-200 font-medium leading-tight">
                    {pendingChanceTarget.description}
                  </p>
                  <div className="text-[10px] text-purple-300 font-mono font-bold bg-purple-950/80 px-2 py-0.5 rounded-lg border border-purple-500/40">
                    🎯 Click a highlighted city on the board to apply!
                  </div>
                </motion.div>
              )}

              {/* World Cup Host Selection Banner (In Center Box) */}
              {isWorldCupSelectionActive && (
                <motion.div
                  initial={{ scale: 0.9, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  className="z-20 bg-slate-950/95 border-2 border-amber-400 p-3 rounded-2xl shadow-2xl text-center space-y-1.5 max-w-[290px] w-full select-none"
                >
                  <div className="flex items-center justify-center gap-1.5 text-amber-400 font-black text-xs sm:text-sm tracking-wider">
                    <span className="text-lg animate-bounce">🏆</span>
                    <span>SELECT WORLD CUP HOST</span>
                  </div>
                  <p className="text-[11px] text-slate-200 font-medium leading-tight">
                    Click one of your highlighted properties on the board to host the World Cup!
                  </p>
                  <div className="text-[10px] text-emerald-300 font-mono font-bold bg-emerald-950/80 px-2 py-0.5 rounded-lg border border-emerald-500/40">
                    💰 Rent on the host property will be DOUBLED (2×)!
                  </div>
                </motion.div>
              )}

              {/* World Tour Flight Banner (In Center Box) */}
              {isWorldTourActive && (
                <motion.div
                  initial={{ scale: 0.9, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  className="z-20 bg-slate-950/95 border-2 border-sky-400 p-3 rounded-2xl shadow-2xl text-center space-y-1.5 max-w-[290px] w-full select-none"
                >
                  <div className="flex items-center justify-center gap-1.5 text-sky-400 font-black text-xs sm:text-sm tracking-wider">
                    <span className="text-lg animate-bounce">✈️</span>
                    <span>WORLD TOUR FLIGHT</span>
                  </div>
                  <p className="text-[11px] text-slate-200 font-medium leading-tight">
                    Click any highlighted city or beach on the board to travel!
                  </p>
                  <div className="text-[10px] text-amber-300 font-mono font-bold bg-amber-950/80 px-2 py-0.5 rounded-lg border border-amber-500/40">
                    💰 Passing START earns +$250 salary
                  </div>
                </motion.div>
              )}

              {/* 1. ROLL DICE BUTTON (In Center Box) */}
              {!winner &&
                !bankruptModalPlayer &&
                !isWinnerVisible &&
                !isAnyMoving &&
                turnPhase === 'roll' &&
                isMyTurn &&
                !isWorldTourActive &&
                !isWorldCupSelectionActive &&
                !isChanceTargetSelectionActive && (
                  <motion.button
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                    onClick={onRollDice}
                    className="px-8 py-3.5 bg-gradient-to-r from-amber-400 via-yellow-400 to-amber-500 text-slate-950 font-black rounded-2xl text-base sm:text-lg shadow-2xl hover:shadow-amber-400/50 cursor-pointer transition-all tracking-wider z-20 border-2 border-yellow-200 ring-4 ring-amber-400/20"
                  >
                    🎲 ROLL DICE
                  </motion.button>
                )}

              {/* 2. BUY PROPERTY CARD (In Center Box) */}
              {canShowActions && turnPhase === 'action' && buyOffer && (
                <motion.div
                  initial={{ scale: 0.9, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  className="z-20 bg-slate-900/95 border-2 border-emerald-400/80 p-3 rounded-2xl shadow-2xl text-center space-y-2 max-w-[280px] w-full"
                >
                  <div className="text-[10px] uppercase font-black tracking-wider text-emerald-400">
                    LANDED ON UNOWNED PROPERTY
                  </div>
                  <div className="text-sm font-black text-white">{buyOffer.spaceName}</div>
                  <div className="text-xs font-mono font-black text-emerald-300">
                    Price: ${buyOffer.price ? buyOffer.price.toLocaleString() : '0'}
                  </div>
                  <div className="flex gap-2 pt-1">
                    {myPlayer && buyOffer.price != null && (displayedBalances[myPlayer.playerId] ?? myPlayer.balance) >= buyOffer.price ? (
                      <motion.button
                        whileHover={{ scale: 1.05 }}
                        whileTap={{ scale: 0.95 }}
                        onClick={onBuyProperty}
                        className="flex-1 py-2 bg-gradient-to-r from-emerald-500 to-teal-500 text-slate-950 font-black rounded-xl text-xs shadow-md cursor-pointer"
                      >
                        🏠 BUY
                      </motion.button>
                    ) : (
                      <span className="flex-1 py-2 bg-slate-800 text-slate-500 font-bold rounded-xl text-[11px]">
                        CAN'T AFFORD
                      </span>
                    )}
                    <motion.button
                      whileHover={{ scale: 1.05 }}
                      whileTap={{ scale: 0.95 }}
                      onClick={onEndTurn}
                      className="px-3 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold rounded-xl text-xs border border-slate-600 cursor-pointer"
                    >
                      PASS ✋
                    </motion.button>
                  </div>
                </motion.div>
              )}

              {/* 3. DEBT SETTLEMENT CARD (In Center Box) */}
              {canShowActions && turnPhase === 'debt' && gameState?.pendingDebt && (
                <motion.div
                  initial={{ scale: 0.9, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  className="z-20 bg-rose-950/95 border-2 border-rose-500 p-3 rounded-2xl shadow-2xl text-center space-y-2 max-w-[280px] w-full"
                >
                  <div className="text-[10px] uppercase font-black tracking-wider text-rose-300 flex items-center justify-center gap-1">
                    <span>⚠️</span> DEBT PAYMENT REQUIRED
                  </div>
                  <div className="text-xs font-black text-white">
                    Owe ${gameState.pendingDebt.amount ? gameState.pendingDebt.amount.toLocaleString() : '0'} for {gameState.pendingDebt.spaceName}
                  </div>
                  <div className="text-[11px] font-mono font-bold text-rose-200">
                    Your Cash: ${(displayedBalances[myPlayer?.playerId ?? ''] ?? myPlayer?.balance ?? 0).toLocaleString()}
                  </div>
                  {myPlayer && gameState.pendingDebt.amount != null && (displayedBalances[myPlayer.playerId] ?? myPlayer.balance) >= gameState.pendingDebt.amount ? (
                    <motion.button
                      whileHover={{ scale: 1.05 }}
                      whileTap={{ scale: 0.95 }}
                      onClick={onPayDebt}
                      className="w-full py-2.5 bg-gradient-to-r from-emerald-500 to-teal-500 text-slate-950 font-black rounded-xl text-xs shadow-lg cursor-pointer"
                    >
                      💵 PAY DEBT (${gameState.pendingDebt.amount.toLocaleString()})
                    </motion.button>
                  ) : (
                    <div className="space-y-1.5">
                      <div className="text-[10px] text-amber-200 font-bold bg-amber-950/80 p-1.5 rounded-lg border border-amber-700/60">
                        Need ${((gameState.pendingDebt.amount ?? 0) - (displayedBalances[myPlayer?.playerId ?? ''] ?? myPlayer?.balance ?? 0)).toLocaleString()} more! Sell properties on right panel.
                      </div>
                      <motion.button
                        whileHover={{ scale: 1.02 }}
                        whileTap={{ scale: 0.98 }}
                        onClick={onDeclareBankruptcy}
                        className="w-full py-1.5 bg-rose-600 hover:bg-rose-700 text-white font-bold rounded-xl text-[11px] cursor-pointer"
                      >
                        💀 CONCEDE & BANKRUPT
                      </motion.button>
                    </div>
                  )}
                </motion.div>
              )}

              {/* Waiting message for opponent */}
              {!winner && !bankruptModalPlayer && !isWinnerVisible && !isAnyMoving && !isMyTurn && gameState && (
                <div className="text-xs sm:text-sm font-bold text-amber-100 dark:text-amber-200/90 animate-pulse bg-black/40 dark:bg-slate-900/70 px-4 py-2 rounded-full border border-amber-300/30 dark:border-amber-400/20 z-10">
                  ⏳ Waiting for {players.find((p) => p.playerId === currentTurnPlayerId)?.username}...
                </div>
              )}

              {/* Player position cards in center */}
              <div className="grid grid-cols-2 gap-2 w-full max-w-[320px] z-10">
                {players.map((p) => {
                  const token = TOKEN_STYLES[p.tokenColor] || TOKEN_STYLES.red;
                  const currentRenderedPos = displayedPositions[p.playerId] ?? p.position;
                  const space = MONOPOLY_BOARD[currentRenderedPos];
                  return (
                    <div
                      key={p.playerId}
                      className={`flex items-center gap-2 px-2.5 py-1.5 rounded-xl border text-xs ${
                        p.playerId === currentTurnPlayerId
                          ? 'border-amber-300 bg-black/50 dark:border-amber-400/50 dark:bg-amber-400/10 shadow'
                          : 'border-white/20 bg-black/30 dark:border-slate-700/40 dark:bg-slate-900/40'
                      } ${!p.isActive ? 'opacity-30' : ''}`}
                    >
                      <span className="text-sm">{token.avatar}</span>
                      <div className="flex-1 min-w-0">
                        <div className="font-black text-white dark:text-slate-100 truncate text-xs">{p.username}</div>
                        <div className="text-slate-200 dark:text-slate-300 truncate text-[11px] font-medium">📍 {space?.name || 'Unknown'}</div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* ── RIGHT PANEL: Controls (Streamlined & Balanced Size) ── */}
      <div className="w-[300px] lg:w-[340px] xl:w-[380px] flex-shrink-0 flex flex-col h-full rounded-3xl border-2 border-slate-200/90 dark:border-slate-700/60 bg-white/95 dark:bg-slate-900/80 backdrop-blur-md shadow-xl overflow-hidden">
        
        {/* Room Info Header */}
        <div className="px-4 py-3.5 border-b border-slate-200/90 dark:border-slate-700/60 bg-slate-50/90 dark:bg-slate-800/60 flex items-center justify-between flex-shrink-0">
          <div className="flex items-center gap-2">
            <span className="text-xs font-black uppercase tracking-wider text-slate-500 dark:text-slate-400">ROOM</span>
            {roomId && (
              <span className="text-xs sm:text-sm font-mono font-black text-amber-700 dark:text-amber-400 bg-amber-50 dark:bg-slate-950/80 px-2.5 py-1 rounded-xl border border-amber-200 dark:border-slate-700/60">
                {roomId}
              </span>
            )}
          </div>
          <div className="flex items-center gap-2">
            {isFinished && onRematch && (
              <motion.button
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                onClick={onRematch}
                className="px-3 py-1 bg-gradient-to-r from-amber-500 to-yellow-500 text-slate-950 font-black rounded-xl text-xs shadow-md cursor-pointer"
              >
                REMATCH
              </motion.button>
            )}
            {onLeaveRoom && (
              <motion.button
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                onClick={onLeaveRoom}
                className="px-3 py-1 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 font-black rounded-xl text-xs border border-slate-300 dark:border-slate-700/60 transition-colors cursor-pointer"
              >
                LEAVE
              </motion.button>
            )}
          </div>
        </div>

        {/* Panel Content Area */}
        <div className="flex-1 overflow-y-auto p-3.5 space-y-4 scrollbar-thin scrollbar-thumb-slate-300 dark:scrollbar-thumb-slate-700 scrollbar-track-transparent">
          {/* Player Cards */}
          <div className="space-y-2">
            <h4 className="text-xs font-black uppercase tracking-wider text-slate-500 dark:text-slate-400 px-1">
              👥 Players ({players.length})
            </h4>
            {players.map((p) => (
              <CompactPlayerCard
                key={p.playerId}
                player={p}
                displayedBalance={displayedBalances[p.playerId]}
                isCurrentTurn={currentTurnPlayerId === p.playerId}
                isSelf={p.playerId === playerId}
                isMoving={
                  (isAnimatingMove && movingPlayerId === p.playerId) ||
                  (displayedPositions[p.playerId] !== undefined && displayedPositions[p.playerId] !== p.position)
                }
              />
            ))}
          </div>

          {/* Divider */}
          <div className="h-px bg-slate-200 dark:bg-slate-700/40" />

          {/* My Properties with 80% Sell Action */}
          {myPlayer && myPlayer.ownedProperties.length > 0 && (
            <div className="pt-1">
              <div className="flex items-center justify-between mb-2 px-1">
                <h4 className="text-xs font-black uppercase tracking-wider text-slate-500 dark:text-slate-400">
                  🏰 My Properties ({myPlayer.ownedProperties.length})
                </h4>
              </div>
              <div className="space-y-2 max-h-[340px] overflow-y-auto pr-0.5 scrollbar-thin scrollbar-thumb-slate-300 dark:scrollbar-thumb-slate-700">
                {myPlayer.ownedProperties
                  .slice()
                  .sort((a, b) => {
                    const spaceA = MONOPOLY_BOARD[a];
                    const spaceB = MONOPOLY_BOARD[b];

                    // 1. Sort by color group order
                    const groupA = spaceA?.colorGroup ? (COLOR_GROUP_ORDER[spaceA.colorGroup] ?? 99) : 99;
                    const groupB = spaceB?.colorGroup ? (COLOR_GROUP_ORDER[spaceB.colorGroup] ?? 99) : 99;
                    if (groupA !== groupB) {
                      return groupA - groupB;
                    }

                    // 2. Sort by price descending (highest price first within color group)
                    const priceA = spaceA?.price ?? 0;
                    const priceB = spaceB?.price ?? 0;
                    if (priceA !== priceB) {
                      return priceB - priceA;
                    }

                    return a - b;
                  })
                  .map((idx) => {
                    const space = MONOPOLY_BOARD[idx];
                    const colorStyle = space?.colorGroup ? COLOR_GROUP_STYLES[space.colorGroup] : null;
                    const level = myPlayer.houseLevels[idx] ?? 0;
                    const saleValue = space?.price ? getSaleValue(space.price, level) : 0;
                    const isMonopolized = space?.colorGroup ? isColorGroupMonopolized(space.colorGroup, myPlayer) : false;

                    return (
                      <div
                        key={idx}
                        className={`flex items-center justify-between p-2 rounded-2xl border ${
                          isMonopolized
                            ? 'border-amber-400/80 bg-amber-50/60 dark:bg-amber-950/30'
                            : 'border-slate-200 dark:border-slate-700/50 bg-slate-50/90 dark:bg-slate-800/50'
                        } hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors text-xs`}
                      >
                        <div className="flex items-center gap-2 min-w-0 flex-1 mr-2">
                          {colorStyle && (
                            <div className={`w-3 h-3 rounded-md ${colorStyle.bg} flex-shrink-0 shadow-xs`} />
                          )}
                          <div className="flex flex-col min-w-0">
                            <div className="flex items-center gap-1.5 flex-wrap">
                              <span className="truncate text-slate-900 dark:text-slate-100 font-bold text-xs sm:text-sm">{space?.name}</span>
                              {level > 0 && (
                                <span className="text-[10px] flex-shrink-0">{HOUSE_LEVEL_ICONS[level]}</span>
                              )}
                              {isMonopolized && (
                                <span className="text-[8px] font-black text-amber-700 dark:text-amber-300 bg-amber-100 dark:bg-amber-900/60 px-1 py-0.2 rounded border border-amber-300 dark:border-amber-600/60 flex-shrink-0">
                                  👑
                                </span>
                              )}
                            </div>
                            {space?.price ? (
                              <span className="text-[10px] font-mono text-slate-500 dark:text-slate-400">
                                Val: ${space.price}
                              </span>
                            ) : null}
                          </div>
                        </div>

                        {/* Sell button at 80% price */}
                        {isMyTurn && onSellProperty && (
                          <motion.button
                            whileHover={{ scale: 1.05 }}
                            whileTap={{ scale: 0.95 }}
                            onClick={() => onSellProperty(idx)}
                            className="px-2.5 py-1 bg-amber-100 hover:bg-amber-200 dark:bg-amber-950/70 dark:hover:bg-amber-900/90 text-amber-800 dark:text-amber-300 font-black rounded-xl text-xs border border-amber-300 dark:border-amber-700/60 flex-shrink-0 cursor-pointer shadow-xs"
                            title={`Sell ${space?.name} for $${saleValue} (80% value)`}
                          >
                            Sell +${saleValue}
                          </motion.button>
                        )}
                      </div>
                    );
                  })}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
