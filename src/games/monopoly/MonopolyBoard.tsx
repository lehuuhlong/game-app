'use client';

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import type {
  MonopolyGameState,
  MonopolyPlayerState,
  MonopolyBoardSpace,
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
}

// ── Utility: Get house level for a space ──────────────────────────

function getHouseLevel(players: MonopolyPlayerState[], spaceIndex: number): number {
  for (const p of players) {
    if (p.isActive && p.ownedProperties.includes(spaceIndex)) {
      return p.houseLevels[spaceIndex] ?? 0;
    }
  }
  return 0;
}

// ── Utility: Calculate current rent for a space ───────────────────

function calculateSpaceRent(
  space: MonopolyBoardSpace,
  houseLevel: number = 0,
  players: MonopolyPlayerState[] = []
): number | null {
  const owner = players.find((p) => p.isActive && p.ownedProperties.includes(space.index));
  if (!owner) return null; // Unowned property -> DO NOT display rent or price

  if (space.type === 'railroad') {
    const railroadCount = owner.ownedProperties.filter((idx) => MONOPOLY_BOARD[idx]?.type === 'railroad').length;
    const base = space.baseRent ?? 50;
    return base * Math.pow(2, Math.max(0, railroadCount - 1));
  }
  if (houseLevel > 0 && space.rentScale && space.rentScale.length >= houseLevel) {
    return space.rentScale[houseLevel - 1];
  }
  return space.baseRent ?? null;
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
    <div className="flex flex-wrap items-center justify-center gap-0.5 z-10">
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
                    scale: [1, 1.45, 1],
                    y: [0, -10, 0],
                  }
                : { scale: 1, y: 0 }
            }
            transition={
              isHopping
                ? { duration: 0.18, ease: 'easeInOut' }
                : { type: 'spring', stiffness: 400, damping: 25 }
            }
            className={`
              w-4 h-4 sm:w-5 sm:h-5 md:w-6 md:h-6 rounded-full ${style.bg} ${style.glow}
              flex items-center justify-center shadow-md border border-white/80 dark:border-slate-900
              text-[10px] sm:text-xs md:text-sm select-none
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

// ── Board Cell Component ──────────────────────────────────────────

function BoardCell({
  space,
  players,
  displayedPositions,
  movingPlayerId,
  ownerColor,
  houseLevel = 0,
  isCorner = false,
}: {
  space: MonopolyBoardSpace;
  players: MonopolyPlayerState[];
  displayedPositions: Record<string, number>;
  movingPlayerId: string | null;
  ownerColor: string | null;
  houseLevel?: number;
  isCorner?: boolean;
}) {
  const colorStyle = space.colorGroup ? COLOR_GROUP_STYLES[space.colorGroup] : null;
  const ownerStyle = ownerColor ? TOKEN_STYLES[ownerColor] : null;
  const icon = SPACE_ICONS[space.type];
  const currentRent = calculateSpaceRent(space, houseLevel, players);

  return (
    <div
      className={`
        relative flex flex-col justify-between p-0.5 sm:p-1 w-full h-full border border-slate-300 dark:border-slate-700/60
        bg-white/90 dark:bg-slate-900/90 transition-colors select-none overflow-hidden
        ${isCorner ? 'bg-amber-50/70 dark:bg-slate-800/80 font-black' : ''}
      `}
    >
      {/* Property Color Bar */}
      {colorStyle && (
        <div
          className={`h-1.5 sm:h-2 md:h-2.5 w-full bg-gradient-to-r ${colorStyle.barGradient} rounded-xs flex-shrink-0 relative overflow-hidden`}
        >
          {/* House Icons inside color bar */}
          {houseLevel > 0 && (
            <div className="absolute inset-0 flex items-center justify-center text-[7px] sm:text-[8px] md:text-[9px] leading-none text-white drop-shadow-xs">
              {HOUSE_LEVEL_ICONS[houseLevel]}
            </div>
          )}
        </div>
      )}

      {/* Owner Badge Indicator */}
      {ownerStyle && (
        <div
          className={`absolute top-0.5 right-0.5 w-2 h-2 sm:w-2.5 sm:h-2.5 rounded-full ${ownerStyle.bg} border border-white shadow-xs z-10`}
          title={`Owner: ${ownerStyle.emoji}`}
        />
      )}

      {/* Space Content */}
      <div className="flex-1 flex flex-col items-center justify-center text-center px-0.5 min-h-0 py-0.5">
        {/* Special Icon */}
        {icon && (
          <span className={`${isCorner ? 'text-base sm:text-lg md:text-xl' : 'text-xs sm:text-sm md:text-base'} leading-none mb-0.5`}>
            {icon}
          </span>
        )}

        {/* Space Name */}
        <span
          className={`
            leading-tight line-clamp-2 uppercase tracking-tight
            ${isCorner
              ? 'text-[9px] sm:text-[10.5px] md:text-xs font-black text-amber-700 dark:text-amber-300'
              : 'text-[8px] sm:text-[9.5px] md:text-[11px] font-black text-slate-800 dark:text-slate-100'
            }
          `}
        >
          {space.name}
        </span>

        {/* Rent Display (Only when owned) */}
        {currentRent !== null && (
          <span className="text-[7px] sm:text-[8.5px] md:text-[9.5px] font-mono font-black text-amber-600 dark:text-amber-400 bg-amber-50 dark:bg-amber-950/60 px-1 py-0.2 rounded border border-amber-300/40 mt-0.5">
            ${currentRent}
          </span>
        )}
      </div>

      {/* Player Tokens on this space */}
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

// ── Dice Display Component ────────────────────────────────────────

function DiceDisplay({
  dice,
  isRolling,
}: {
  dice: [number, number] | null;
  isRolling: boolean;
}) {
  const [displayDice, setDisplayDice] = useState<[number, number]>([1, 1]);

  useEffect(() => {
    if (dice) {
      setDisplayDice(dice);
    }
  }, [dice]);

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

  return (
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
          className="w-9 h-9 sm:w-11 sm:h-11 rounded-xl bg-white dark:bg-slate-800 border-2 border-amber-400 dark:border-amber-500/80 shadow-md relative select-none flex-shrink-0"
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
  );
}

// ── Animated Balance Display ──────────────────────────────────────

function AnimatedBalanceDisplay({
  balance,
  isMoving,
  className = '',
}: {
  balance: number;
  isMoving?: boolean;
  className?: string;
}) {
  const [displayedBalance, setDisplayedBalance] = useState(balance);
  const [delta, setDelta] = useState<{ id: number; amount: number } | null>(null);
  const prevBalanceRef = useRef(balance);

  useEffect(() => {
    if (isMoving) return;

    if (prevBalanceRef.current !== balance) {
      const diff = balance - prevBalanceRef.current;
      prevBalanceRef.current = balance;
      setDisplayedBalance(balance);

      if (diff !== 0) {
        setDelta({ id: Date.now(), amount: diff });
        const timer = setTimeout(() => setDelta(null), 2200);
        return () => clearTimeout(timer);
      }
    }
  }, [balance, isMoving]);

  return (
    <div className="relative inline-flex items-center">
      <motion.span
        key={displayedBalance}
        initial={{ scale: delta ? 1.25 : 1 }}
        animate={{ scale: 1 }}
        className={`font-mono font-black ${className}`}
      >
        ${displayedBalance.toLocaleString()}
      </motion.span>
    </div>
  );
}

// ── Compact Player Card ──────────────────────────────────────────

function CompactPlayerCard({
  player,
  isCurrentTurn,
  isSelf,
  isMoving,
}: {
  player: MonopolyPlayerState;
  isCurrentTurn: boolean;
  isSelf: boolean;
  isMoving?: boolean;
}) {
  const token = TOKEN_STYLES[player.tokenColor] || TOKEN_STYLES.red;

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
            balance={player.balance}
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
}: MonopolyBoardProps) {
  const players = gameState?.players ?? [];
  const currentTurnPlayerId = gameState?.currentTurnPlayerId;
  const turnPhase = gameState?.turnPhase ?? 'roll';
  const lastDice = gameState?.lastDice ?? null;
  const winner = gameState?.winner;

  const isMyTurn = currentTurnPlayerId === playerId;

  // ── Step-by-Step Movement & Dice Animation States ────────────────
  const [displayedPositions, setDisplayedPositions] = useState<Record<string, number>>({});
  const [isRollingDice, setIsRollingDice] = useState(false);
  const [movingPlayerId, setMovingPlayerId] = useState<string | null>(null);
  const [isAnimatingMove, setIsAnimatingMove] = useState(false);

  const moveTimersRef = useRef<NodeJS.Timeout[]>([]);

  const clearTimers = () => {
    moveTimersRef.current.forEach((t) => clearTimeout(t));
    moveTimersRef.current = [];
  };

  useEffect(() => {
    return () => clearTimers();
  }, []);

  // Synchronize server player positions with smooth sequential hopping animation
  useEffect(() => {
    if (!gameState || players.length === 0) return;

    players.forEach((p) => {
      const currentPos = displayedPositions[p.playerId];
      const targetPos = p.position;

      // Initial mount / setup
      if (currentPos === undefined) {
        setDisplayedPositions((prev) => ({ ...prev, [p.playerId]: targetPos }));
        return;
      }

      // If player position changed on server and not currently mid-animation
      if (currentPos !== targetPos && !isAnimatingMove) {
        clearTimers();
        setIsAnimatingMove(true);
        setIsRollingDice(true);
        setMovingPlayerId(p.playerId);

        // Phase 1: Dice rolling animation for 600ms
        const diceTimer = setTimeout(() => {
          setIsRollingDice(false);

          // Phase 2: Step-by-step hopping
          const stepsToMove = (targetPos - currentPos + 32) % 32;

          // Special direct warp (e.g. Go to jail / Lost Island)
          if (stepsToMove === 0 || (p.inJail && targetPos === 8)) {
            setDisplayedPositions((prev) => ({ ...prev, [p.playerId]: targetPos }));
            setIsAnimatingMove(false);
            setMovingPlayerId(null);
            return;
          }

          // Sequential 1-by-1 cell hopping
          const STEP_INTERVAL_MS = 200;
          for (let step = 1; step <= stepsToMove; step++) {
            const stepTimer = setTimeout(() => {
              const nextPos = (currentPos + step) % 32;
              setDisplayedPositions((prev) => ({ ...prev, [p.playerId]: nextPos }));

              if (step === stepsToMove) {
                // Landed on final space!
                setIsAnimatingMove(false);
                setMovingPlayerId(null);
              }
            }, step * STEP_INTERVAL_MS);

            moveTimersRef.current.push(stepTimer);
          }
        }, 600);

        moveTimersRef.current.push(diceTimer);
      }
    });
  }, [players, gameState?.lastDice]);

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

  return (
    <div className="w-full max-w-[1300px] mx-auto h-[min(90vh,860px)] flex gap-4 px-2 py-0.5 items-stretch justify-center select-none">
      
      {/* ── BUILD HOUSE MODAL OVERLAY ─────────────────────────── */}
      <AnimatePresence>
        {!winner && !isAnimatingMove && turnPhase === 'action' && upgradeOffer && isMyTurn && myPlayer && (
          <BuildHouseModal
            offer={upgradeOffer}
            playerBalance={myPlayer.balance}
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
              gridTemplateColumns: 'repeat(9, minmax(0, 1fr))',
              gridTemplateRows: 'repeat(9, minmax(0, 1fr))',
            }}
          >
            {/* Top Row (16-24) */}
            {TOP_ROW.map((idx, col) => (
              <div key={`top-${idx}`} style={{ gridRow: 1, gridColumn: col + 1 }}>
                <BoardCell
                  space={MONOPOLY_BOARD[idx]}
                  players={players}
                  displayedPositions={displayedPositions}
                  movingPlayerId={movingPlayerId}
                  ownerColor={getOwnerColor(idx)}
                  houseLevel={getHouseLevel(players, idx)}
                  isCorner={idx === 16 || idx === 24}
                />
              </div>
            ))}

            {/* Left Column (15-9, bottom to top) */}
            {LEFT_COL.slice().reverse().map((idx, row) => (
              <div key={`left-${idx}`} style={{ gridRow: row + 2, gridColumn: 1 }}>
                <BoardCell
                  space={MONOPOLY_BOARD[idx]}
                  players={players}
                  displayedPositions={displayedPositions}
                  movingPlayerId={movingPlayerId}
                  ownerColor={getOwnerColor(idx)}
                  houseLevel={getHouseLevel(players, idx)}
                />
              </div>
            ))}

            {/* Right Column (25-31) */}
            {RIGHT_COL.map((idx, row) => (
              <div key={`right-${idx}`} style={{ gridRow: row + 2, gridColumn: 9 }}>
                <BoardCell
                  space={MONOPOLY_BOARD[idx]}
                  players={players}
                  displayedPositions={displayedPositions}
                  movingPlayerId={movingPlayerId}
                  ownerColor={getOwnerColor(idx)}
                  houseLevel={getHouseLevel(players, idx)}
                />
              </div>
            ))}

            {/* Bottom Row (8-0) */}
            {BOTTOM_ROW.map((idx, col) => (
              <div key={`bottom-${idx}`} style={{ gridRow: 9, gridColumn: col + 1 }}>
                <BoardCell
                  space={MONOPOLY_BOARD[idx]}
                  players={players}
                  displayedPositions={displayedPositions}
                  movingPlayerId={movingPlayerId}
                  ownerColor={getOwnerColor(idx)}
                  houseLevel={getHouseLevel(players, idx)}
                  isCorner={idx === 8 || idx === 0}
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

              {/* Winner Display */}
              {winner && (
                <motion.div
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  className="px-6 py-3 bg-gradient-to-r from-amber-400 to-yellow-500 text-slate-950 font-black rounded-2xl text-base sm:text-lg shadow-2xl z-20"
                >
                  🏆 {players.find((p) => p.playerId === winner)?.username} WINS!
                </motion.div>
              )}

              {/* Moving status indicator */}
              {isAnimatingMove && (
                <div className="text-center z-10 bg-amber-400/20 dark:bg-amber-400/10 px-4 py-1.5 rounded-full border border-amber-300/50 dark:border-amber-400/30 animate-pulse">
                  <span className="text-xs font-black text-amber-200">
                    {isRollingDice ? '🎲 Rolling dice...' : '🏃 Hopping spaces...'}
                  </span>
                </div>
              )}

              {/* ── CENTER BOARD ACTION CONTROLS ───────────────── */}

              {/* 1. ROLL DICE BUTTON (In Center Box) */}
              {!winner && !isAnimatingMove && turnPhase === 'roll' && isMyTurn && (
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
              {!winner && !isAnimatingMove && turnPhase === 'action' && buyOffer && isMyTurn && (
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
                    {myPlayer && buyOffer.price != null && myPlayer.balance >= buyOffer.price ? (
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
              {!winner && !isAnimatingMove && turnPhase === 'debt' && gameState?.pendingDebt && isMyTurn && (
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
                    Your Cash: ${myPlayer?.balance ? myPlayer.balance.toLocaleString() : '0'}
                  </div>
                  {myPlayer && gameState.pendingDebt.amount != null && myPlayer.balance >= gameState.pendingDebt.amount ? (
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
                        Need ${((gameState.pendingDebt.amount ?? 0) - (myPlayer?.balance ?? 0)).toLocaleString()} more! Sell properties on right panel.
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
              {!winner && !isAnimatingMove && !isMyTurn && gameState && (
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
                isCurrentTurn={currentTurnPlayerId === p.playerId}
                isSelf={p.playerId === playerId}
                isMoving={isAnimatingMove && movingPlayerId === p.playerId}
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
                {myPlayer.ownedProperties.map((idx) => {
                  const space = MONOPOLY_BOARD[idx];
                  const colorStyle = space?.colorGroup ? COLOR_GROUP_STYLES[space.colorGroup] : null;
                  const level = myPlayer.houseLevels[idx] ?? 0;
                  const saleValue = space?.price ? getSaleValue(space.price, level) : 0;

                  return (
                    <div
                      key={idx}
                      className="flex items-center justify-between p-2 rounded-2xl border border-slate-200 dark:border-slate-700/50 bg-slate-50/90 dark:bg-slate-800/50 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors text-xs"
                    >
                      <div className="flex items-center gap-2 min-w-0 flex-1 mr-2">
                        {colorStyle && (
                          <div className={`w-3 h-3 rounded-md ${colorStyle.bg} flex-shrink-0`} />
                        )}
                        <span className="truncate text-slate-900 dark:text-slate-100 font-bold text-xs sm:text-sm">{space?.name}</span>
                        {level > 0 && (
                          <span className="text-[10px] flex-shrink-0">{HOUSE_LEVEL_ICONS[level]}</span>
                        )}
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
