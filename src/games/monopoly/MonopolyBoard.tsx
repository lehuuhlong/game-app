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
  onUpgradeProperty?: () => void;
  onEndTurn?: () => void;
  onLeaveRoom?: () => void;
  onRematch?: () => void;
  isFinished?: boolean;
  buyOffer?: { spaceIndex: number; spaceName: string; price: number } | null;
  upgradeOffer?: { spaceIndex: number; spaceName: string; currentLevel: number; upgradeCost: number } | null;
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
                ? {
                    duration: 0.18,
                    ease: 'easeInOut',
                  }
                : {
                    type: 'spring',
                    stiffness: 300,
                    damping: 22,
                  }
            }
            className={`flex items-center justify-center w-5 h-5 sm:w-6 sm:h-6 rounded-full ${style.bg} ring-2 ring-white shadow-md text-[10px] sm:text-xs font-bold`}
            title={`${p.username} (${style.avatar})`}
          >
            <span className="drop-shadow-sm">{style.avatar}</span>
          </motion.div>
        );
      })}
    </div>
  );
}

// ── Board Cell Component (High Contrast Light/Dark) ──────────────

function BoardCell({
  space,
  players,
  displayedPositions,
  movingPlayerId,
  ownerColor,
  houseLevel,
  isCorner,
}: {
  space: MonopolyBoardSpace;
  players: MonopolyPlayerState[];
  displayedPositions: Record<string, number>;
  movingPlayerId: string | null;
  ownerColor?: string | null;
  houseLevel: number;
  isCorner?: boolean;
}) {
  const colorStyle = space.colorGroup ? COLOR_GROUP_STYLES[space.colorGroup] : null;
  const ownerToken = ownerColor ? TOKEN_STYLES[ownerColor] : null;

  return (
    <div
      className={`
        relative flex flex-col border border-slate-200 dark:border-slate-800
        bg-white dark:bg-slate-900 hover:bg-amber-50/80 dark:hover:bg-slate-800/90
        transition-colors duration-150 overflow-hidden group select-none h-full w-full
        ${isCorner ? 'bg-slate-50 dark:bg-slate-950 font-bold' : ''}
      `}
      title={`${space.name}${space.price ? ` — $${space.price}` : ''}${houseLevel > 0 ? ` — ${HOUSE_LEVEL_LABELS[houseLevel]}` : ''}`}
    >
      {/* Property Group Color Header Bar */}
      {colorStyle && space.type === 'property' && (
        <div
          className={`w-full h-3 sm:h-3.5 flex-shrink-0 bg-gradient-to-r ${colorStyle.barGradient} border-b border-black/10 dark:border-black/30`}
        />
      )}

      {/* Owner Badge + House Level */}
      {ownerToken && (
        <div className="absolute top-0 right-0 flex items-center gap-0.5 px-1 py-0.2 bg-slate-900/90 dark:bg-slate-950/90 rounded-bl text-amber-300 z-10 shadow-xs">
          {houseLevel > 0 && (
            <span className="text-[9px] sm:text-[10px] leading-none">
              {HOUSE_LEVEL_ICONS[houseLevel]}
            </span>
          )}
          <span className="text-[9px] sm:text-[10px] drop-shadow-sm">{ownerToken.avatar}</span>
        </div>
      )}

      {/* Cell Content */}
      <div className={`flex-1 flex flex-col items-center justify-center p-0.5 ${isCorner ? 'gap-0.5' : 'gap-0'}`}>
        {space.type === 'property' ? (
          <>
            <span className="text-[8px] sm:text-[9.5px] md:text-[11px] font-black leading-tight text-center text-slate-800 dark:text-slate-100 truncate w-full px-0.5 group-hover:text-amber-600 dark:group-hover:text-amber-400 transition-colors">
              {space.name}
            </span>
            {space.price && (
              <span className="text-[7.5px] sm:text-[9px] md:text-[10px] font-mono font-black text-emerald-700 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/60 px-1 py-0.5 rounded border border-emerald-200/60 dark:border-emerald-800/40">
                ${space.price}
              </span>
            )}
          </>
        ) : (
          <>
            <span className="text-sm sm:text-base md:text-lg drop-shadow-xs">
              {SPACE_ICONS[space.type] || '📍'}
            </span>
            <span className="text-[7.5px] sm:text-[9px] md:text-[10.5px] font-black leading-tight text-center text-slate-800 dark:text-amber-300 uppercase tracking-tight">
              {isCorner ? space.name : space.name.split(' ')[0]}
            </span>
            {space.price && (
              <span className="text-[7px] sm:text-[8.5px] md:text-[9.5px] font-mono font-black text-emerald-700 dark:text-emerald-400">
                ${space.price}
              </span>
            )}
          </>
        )}
      </div>

      {/* Player Tokens */}
      <PlayerTokens
        players={players}
        displayedPositions={displayedPositions}
        movingPlayerId={movingPlayerId}
        spaceIndex={space.index}
      />
    </div>
  );
}

// ── Dice Display Component with Rolling Animation ─────────────────

function DiceDisplay({
  dice,
  isRolling,
}: {
  dice: [number, number] | null;
  isRolling: boolean;
}) {
  const [randomDice, setRandomDice] = useState<[number, number]>([1, 1]);

  useEffect(() => {
    if (!isRolling) return;
    const interval = setInterval(() => {
      setRandomDice([
        Math.floor(Math.random() * 6) + 1,
        Math.floor(Math.random() * 6) + 1,
      ]);
    }, 70);
    return () => clearInterval(interval);
  }, [isRolling]);

  const activeDice = isRolling ? randomDice : dice;
  if (!activeDice) return null;

  const dotPositions: Record<number, string[]> = {
    1: ['top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 bg-red-600 w-3 h-3'],
    2: ['top-1.5 right-1.5 bg-slate-900', 'bottom-1.5 left-1.5 bg-slate-900'],
    3: ['top-1.5 right-1.5 bg-slate-900', 'top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 bg-slate-900', 'bottom-1.5 left-1.5 bg-slate-900'],
    4: ['top-1.5 left-1.5 bg-slate-900', 'top-1.5 right-1.5 bg-slate-900', 'bottom-1.5 left-1.5 bg-slate-900', 'bottom-1.5 right-1.5 bg-slate-900'],
    5: ['top-1.5 left-1.5 bg-slate-900', 'top-1.5 right-1.5 bg-slate-900', 'top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 bg-slate-900', 'bottom-1.5 left-1.5 bg-slate-900', 'bottom-1.5 right-1.5 bg-slate-900'],
    6: ['top-1.5 left-1.5 bg-slate-900', 'top-1.5 right-1.5 bg-slate-900', 'top-1/2 left-1.5 -translate-y-1/2 bg-slate-900', 'top-1/2 right-1.5 -translate-y-1/2 bg-slate-900', 'bottom-1.5 left-1.5 bg-slate-900', 'bottom-1.5 right-1.5 bg-slate-900'],
  };

  return (
    <div className="flex items-center gap-3">
      {activeDice.map((value, i) => (
        <motion.div
          key={i}
          animate={
            isRolling
              ? {
                  rotate: [0, 90, 180, 270, 360],
                  scale: [0.9, 1.2, 0.9],
                  y: [0, -14, 0],
                }
              : { rotate: 0, scale: 1, y: 0 }
          }
          transition={
            isRolling
              ? { repeat: Infinity, duration: 0.28, ease: 'linear' }
              : { type: 'spring', stiffness: 350, damping: 20 }
          }
          className="relative w-10 h-10 sm:w-11 sm:h-11 bg-gradient-to-br from-white to-slate-100 rounded-xl shadow-xl border-2 border-slate-300 dark:border-slate-100 flex-shrink-0 select-none"
        >
          {dotPositions[value]?.map((dotClass, j) => (
            <div
              key={j}
              className={`absolute w-2 h-2 rounded-full ${dotClass}`}
            />
          ))}
        </motion.div>
      ))}
    </div>
  );
}

// ── Compact Player Card (Right Panel) ────────────────────

function CompactPlayerCard({
  player,
  isCurrentTurn,
  isSelf,
}: {
  player: MonopolyPlayerState;
  isCurrentTurn: boolean;
  isSelf: boolean;
}) {
  const token = TOKEN_STYLES[player.tokenColor] || TOKEN_STYLES.red;

  return (
    <div
      className={`
        flex items-center gap-2.5 px-3 py-2.5 rounded-xl border transition-all duration-200
        ${isCurrentTurn
          ? 'border-amber-400 dark:border-amber-400/80 bg-amber-50/90 dark:bg-amber-400/10 ring-1 ring-amber-400/50 shadow-sm'
          : 'border-slate-200 dark:border-slate-700/60 bg-slate-50/80 dark:bg-slate-800/40 text-slate-800 dark:text-slate-200'
        }
        ${!player.isActive ? 'opacity-30 grayscale' : ''}
      `}
    >
      <div className={`w-8 h-8 rounded-xl ${token.bg} flex items-center justify-center text-base shadow-sm flex-shrink-0 text-white`}>
        <span>{token.avatar}</span>
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-1.5">
          <span className="text-xs sm:text-sm font-black text-slate-800 dark:text-slate-100 truncate">
            {player.username}
          </span>
          {isSelf && (
            <span className="w-2 h-2 rounded-full bg-emerald-500 flex-shrink-0" title="You" />
          )}
          {player.inJail && (
            <span className="text-[9px] bg-rose-100 dark:bg-rose-950/60 text-rose-600 dark:text-rose-400 px-1.5 py-0.2 rounded font-black border border-rose-300 dark:border-rose-800/40">
              🔒 JAIL
            </span>
          )}
        </div>
        <div className="flex items-center gap-2.5 mt-0.5">
          <span className="text-xs sm:text-sm font-mono font-black text-emerald-600 dark:text-emerald-400">
            ${player.balance.toLocaleString()}
          </span>
          <span className="text-xs text-slate-500 dark:text-slate-400 font-bold">
            🏢 {player.ownedProperties.length}
          </span>
        </div>
      </div>
      {isCurrentTurn && (
        <span className="text-[10px] text-amber-500 dark:text-amber-400 font-black animate-pulse">
          🎲 TURN
        </span>
      )}
    </div>
  );
}

// ── Event Log Entry ─────────────────────────────────────────────

function LogEntry({ message, isNew }: { message: string; isNew: boolean }) {
  return (
    <motion.div
      initial={isNew ? { opacity: 0, x: -10 } : false}
      animate={{ opacity: 1, x: 0 }}
      className="text-xs sm:text-[13px] font-mono leading-relaxed text-slate-700 dark:text-slate-200 py-1 border-b border-slate-100 dark:border-slate-800/50 last:border-0"
    >
      {message}
    </motion.div>
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
  onEndTurn,
  onLeaveRoom,
  onRematch,
  isFinished,
  buyOffer,
  upgradeOffer,
}: MonopolyBoardProps) {
  const logContainerRef = useRef<HTMLDivElement>(null);
  const players = gameState?.players ?? [];
  const currentTurnPlayerId = gameState?.currentTurnPlayerId;
  const turnPhase = gameState?.turnPhase ?? 'roll';
  const lastDice = gameState?.lastDice ?? null;
  const eventLog = gameState?.eventLog ?? [];
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

  // Scroll ONLY the inner log box to bottom, never the page/window
  useEffect(() => {
    if (logContainerRef.current) {
      logContainerRef.current.scrollTop = logContainerRef.current.scrollHeight;
    }
  }, [eventLog.length]);

  // My player data
  const myPlayer = players.find((p) => p.playerId === playerId);
  const myRenderedPos = myPlayer ? (displayedPositions[myPlayer.playerId] ?? myPlayer.position) : 0;
  const currentSpace = myPlayer ? MONOPOLY_BOARD[myRenderedPos] : null;

  return (
    <div className="w-full max-w-[1440px] mx-auto h-[min(84vh,740px)] flex gap-3 px-2 sm:px-3 py-1 items-stretch justify-center select-none">
      
      {/* ── LEFT PANEL: Event Log (Equal height & balanced width) ── */}
      <div className="w-[270px] xl:w-[310px] flex-shrink-0 flex flex-col h-full rounded-2xl border border-slate-200/90 dark:border-slate-700/60 bg-white/95 dark:bg-slate-900/80 backdrop-blur-md shadow-lg dark:shadow-xl overflow-hidden">
        {/* Log Header */}
        <div className="px-3.5 py-3 border-b border-slate-200/90 dark:border-slate-700/60 bg-slate-50/90 dark:bg-slate-800/60 flex items-center justify-between flex-shrink-0">
          <h3 className="text-xs sm:text-sm font-black uppercase tracking-wider text-slate-700 dark:text-slate-200 flex items-center gap-1.5">
            <span>📜</span> Game History
          </h3>
          <span className="text-xs font-mono font-bold text-slate-600 dark:text-slate-300 bg-slate-100 dark:bg-slate-950/60 px-2.5 py-0.5 rounded-full border border-slate-200 dark:border-slate-700/50">
            {eventLog.length} logs
          </span>
        </div>
        
        {/* Log Content - Scrolled internally without touching window scroll */}
        <div
          ref={logContainerRef}
          className="flex-1 overflow-y-auto p-3 space-y-1.5 scrollbar-thin scrollbar-thumb-slate-300 dark:scrollbar-thumb-slate-700 scrollbar-track-transparent"
        >
          {eventLog.map((entry, i) => (
            <LogEntry
              key={`${entry.timestamp}-${i}`}
              message={entry.message}
              isNew={i >= eventLog.length - 2}
            />
          ))}
        </div>
      </div>

      {/* ── CENTER: Game Board (Equal height, 9x9 uniform grid) ── */}
      <div className="flex-1 flex flex-col items-center justify-center min-w-0 h-full">
        {/* Board Grid Container */}
        <div className="w-full max-w-[min(100%,min(84vh,740px))] aspect-square h-full max-h-[min(84vh,740px)] rounded-2xl border-2 border-amber-400/80 dark:border-amber-500/50 bg-slate-100 dark:bg-slate-950 shadow-xl dark:shadow-2xl dark:shadow-amber-950/20 overflow-hidden flex items-center justify-center p-1 sm:p-1.5">
          <div
            className="grid w-full h-full rounded-xl overflow-hidden bg-slate-200 dark:bg-slate-950"
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

            {/* ── Center Field ─────────────────────────────────── */}
            <div
              style={{ gridRow: '2 / 9', gridColumn: '2 / 9' }}
              className="flex flex-col items-center justify-between p-3 sm:p-4 bg-gradient-to-br from-emerald-600 via-teal-700 to-emerald-800 dark:from-emerald-950 dark:via-teal-950 dark:to-slate-950 relative overflow-hidden border border-emerald-400/40 dark:border-emerald-500/20 rounded-lg shadow-inner"
            >
              {/* Title */}
              <div className="text-center z-10">
                <h2 className="text-xl sm:text-2xl font-black tracking-[0.15em] bg-gradient-to-r from-amber-200 via-yellow-100 to-amber-300 dark:from-amber-300 dark:via-yellow-200 dark:to-amber-400 bg-clip-text text-transparent drop-shadow-md">
                  BUSINESS TOUR
                </h2>
                <p className="text-[10px] sm:text-xs uppercase font-bold tracking-widest text-emerald-100/90 dark:text-emerald-300/60">
                  32 Spaces • Multiplayer
                </p>
              </div>

              {/* Dice Display */}
              <DiceDisplay dice={lastDice} isRolling={isRollingDice} />

              {/* Winner Display */}
              {winner && (
                <motion.div
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  className="px-6 py-3 bg-gradient-to-r from-amber-400 to-yellow-500 text-slate-950 font-black rounded-xl text-base sm:text-lg shadow-xl"
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

              {/* Current position info */}
              {!winner && !isAnimatingMove && isMyTurn && currentSpace && turnPhase !== 'roll' && (
                <div className="text-center z-10 bg-black/40 dark:bg-slate-900/70 px-4 py-1.5 rounded-xl border border-white/20 dark:border-amber-400/20">
                  <span className="text-xs text-slate-200 dark:text-slate-300 font-medium">You landed on</span>
                  <div className="text-sm sm:text-base font-black text-amber-300">{currentSpace.name}</div>
                </div>
              )}

              {/* Waiting message for non-active player */}
              {!winner && !isAnimatingMove && !isMyTurn && gameState && (
                <div className="text-xs sm:text-sm font-bold text-amber-100 dark:text-amber-200/90 animate-pulse bg-black/40 dark:bg-slate-900/70 px-4 py-2 rounded-full border border-amber-300/30 dark:border-amber-400/20">
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

      {/* ── RIGHT PANEL: Controls (Equal height & balanced width) ── */}
      <div className="w-[270px] xl:w-[310px] flex-shrink-0 flex flex-col h-full rounded-2xl border border-slate-200/90 dark:border-slate-700/60 bg-white/95 dark:bg-slate-900/80 backdrop-blur-md shadow-lg dark:shadow-xl overflow-hidden">
        
        {/* Room Info Header */}
        <div className="px-3.5 py-3 border-b border-slate-200/90 dark:border-slate-700/60 bg-slate-50/90 dark:bg-slate-800/60 flex items-center justify-between flex-shrink-0">
          <div className="flex items-center gap-1.5">
            <span className="text-xs font-black uppercase tracking-wider text-slate-500 dark:text-slate-400">ROOM</span>
            {roomId && (
              <span className="text-xs font-mono font-black text-amber-700 dark:text-amber-400 bg-amber-50 dark:bg-slate-950/80 px-2.5 py-0.5 rounded-lg border border-amber-200 dark:border-slate-700/60">
                {roomId}
              </span>
            )}
          </div>
          <div className="flex items-center gap-1.5">
            {isFinished && onRematch && (
              <motion.button
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                onClick={onRematch}
                className="px-2.5 py-1 bg-gradient-to-r from-amber-500 to-yellow-500 text-slate-950 font-bold rounded-lg text-xs shadow cursor-pointer"
              >
                🔄 REMATCH
              </motion.button>
            )}
            {onLeaveRoom && (
              <motion.button
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                onClick={onLeaveRoom}
                className="px-3 py-1 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 font-bold rounded-lg text-xs border border-slate-300 dark:border-slate-700/60 transition-colors cursor-pointer"
              >
                LEAVE
              </motion.button>
            )}
          </div>
        </div>

        {/* Panel Content Area */}
        <div className="flex-1 overflow-y-auto p-3 space-y-3.5 scrollbar-thin scrollbar-thumb-slate-300 dark:scrollbar-thumb-slate-700 scrollbar-track-transparent">
          {/* Player Cards */}
          <div className="space-y-2">
            <h4 className="text-xs font-black uppercase tracking-wider text-slate-500 dark:text-slate-400 px-0.5">
              👥 Players ({players.length})
            </h4>
            {players.map((p) => (
              <CompactPlayerCard
                key={p.playerId}
                player={p}
                isCurrentTurn={currentTurnPlayerId === p.playerId}
                isSelf={p.playerId === playerId}
              />
            ))}
          </div>

          {/* Divider */}
          <div className="h-px bg-slate-200 dark:bg-slate-700/40" />

          {/* Action Buttons */}
          <div className="space-y-2.5">
            <h4 className="text-xs font-black uppercase tracking-wider text-slate-500 dark:text-slate-400 px-0.5">
              🎮 Actions
            </h4>

            {/* If moving or rolling, show movement indicator in Actions panel */}
            {isAnimatingMove && (
              <div className="p-3 bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800/40 rounded-xl text-center space-y-1">
                <div className="text-sm font-black text-amber-700 dark:text-amber-300 animate-pulse">
                  {isRollingDice ? '🎲 Rolling dice...' : '🏃 Moving...'}
                </div>
                <div className="text-[11px] text-amber-600/80 dark:text-amber-400/70">
                  Please wait for character to land
                </div>
              </div>
            )}

            {!winner && !isAnimatingMove && isMyTurn && gameState && (() => {
              const propertyPrice = buyOffer?.price ?? currentSpace?.price ?? 0;
              const canAffordBuy = myPlayer && propertyPrice > 0 ? myPlayer.balance >= propertyPrice : false;
              const canAffordUpgrade = myPlayer && upgradeOffer ? myPlayer.balance >= upgradeOffer.upgradeCost : false;

              return (
                <div className="flex flex-col gap-2.5">
                  {/* Roll Dice */}
                  {turnPhase === 'roll' && (
                    <motion.button
                      whileHover={{ scale: 1.02 }}
                      whileTap={{ scale: 0.97 }}
                      onClick={onRollDice}
                      className="w-full py-3.5 bg-gradient-to-r from-amber-400 via-yellow-400 to-amber-500 text-slate-950 font-black rounded-xl text-sm sm:text-base shadow-lg hover:shadow-amber-400/30 cursor-pointer transition-all tracking-wide"
                    >
                      🎲 ROLL DICE
                    </motion.button>
                  )}

                  {/* Buy Property */}
                  {turnPhase === 'action' && buyOffer && (
                    <>
                      {/* Property Preview */}
                      <div className="px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700/50 bg-slate-50 dark:bg-slate-800/40 space-y-1">
                        <div className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase">Buy Property</div>
                        <div className="text-sm font-black text-slate-900 dark:text-slate-100">{buyOffer.spaceName}</div>
                        <div className="text-xs sm:text-sm font-mono font-black text-emerald-600 dark:text-emerald-400">Price: ${buyOffer.price.toLocaleString()}</div>
                      </div>

                      <motion.button
                        whileHover={canAffordBuy ? { scale: 1.02 } : {}}
                        whileTap={canAffordBuy ? { scale: 0.97 } : {}}
                        onClick={canAffordBuy ? onBuyProperty : undefined}
                        disabled={!canAffordBuy}
                        className={`w-full py-3 font-black rounded-xl text-xs sm:text-sm shadow transition-all ${
                          canAffordBuy
                            ? 'bg-gradient-to-r from-emerald-500 to-teal-500 text-slate-950 hover:shadow-emerald-400/30 cursor-pointer'
                            : 'bg-slate-200 dark:bg-slate-800 text-slate-400 dark:text-slate-500 cursor-not-allowed'
                        }`}
                      >
                        🏠 {canAffordBuy ? `BUY $${buyOffer.price.toLocaleString()}` : `CAN'T AFFORD`}
                      </motion.button>

                      <motion.button
                        whileHover={{ scale: 1.02 }}
                        whileTap={{ scale: 0.97 }}
                        onClick={onEndTurn}
                        className="w-full py-2.5 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 font-bold rounded-xl text-xs sm:text-sm border border-slate-300 dark:border-slate-700/50 transition-colors cursor-pointer"
                      >
                        PASS ✋
                      </motion.button>
                    </>
                  )}

                  {/* Upgrade Property */}
                  {turnPhase === 'action' && upgradeOffer && (
                    <>
                      {/* Upgrade Preview */}
                      <div className="px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700/50 bg-slate-50 dark:bg-slate-800/40 space-y-1">
                        <div className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase">Upgrade Property</div>
                        <div className="text-sm font-black text-slate-900 dark:text-slate-100">{upgradeOffer.spaceName}</div>
                        <div className="flex items-center gap-2 text-xs">
                          <span className="text-slate-500 dark:text-slate-400">Level:</span>
                          <span className="font-bold text-amber-600 dark:text-amber-300">
                            {HOUSE_LEVEL_LABELS[upgradeOffer.currentLevel]} → {HOUSE_LEVEL_LABELS[upgradeOffer.currentLevel + 1]}
                          </span>
                        </div>
                        <div className="text-xs sm:text-sm font-mono font-black text-emerald-600 dark:text-emerald-400">
                          Cost: ${upgradeOffer.upgradeCost.toLocaleString()}
                        </div>
                      </div>

                      <motion.button
                        whileHover={canAffordUpgrade ? { scale: 1.02 } : {}}
                        whileTap={canAffordUpgrade ? { scale: 0.97 } : {}}
                        onClick={canAffordUpgrade ? onUpgradeProperty : undefined}
                        disabled={!canAffordUpgrade}
                        className={`w-full py-3 font-black rounded-xl text-xs sm:text-sm shadow transition-all ${
                          canAffordUpgrade
                            ? 'bg-gradient-to-r from-violet-500 to-purple-500 text-white hover:shadow-violet-400/30 cursor-pointer'
                            : 'bg-slate-200 dark:bg-slate-800 text-slate-400 dark:text-slate-500 cursor-not-allowed'
                        }`}
                      >
                        🏗️ {canAffordUpgrade ? `UPGRADE $${upgradeOffer.upgradeCost.toLocaleString()}` : `CAN'T AFFORD`}
                      </motion.button>

                      <motion.button
                        whileHover={{ scale: 1.02 }}
                        whileTap={{ scale: 0.97 }}
                        onClick={onEndTurn}
                        className="w-full py-2.5 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 font-bold rounded-xl text-xs sm:text-sm border border-slate-300 dark:border-slate-700/50 transition-colors cursor-pointer"
                      >
                        SKIP UPGRADE ✋
                      </motion.button>
                    </>
                  )}
                </div>
              );
            })()}

            {/* Not my turn message */}
            {!winner && !isMyTurn && gameState && (
              <div className="text-center py-4">
                <div className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 font-medium">
                  Waiting for opponent's turn...
                </div>
              </div>
            )}

            {/* Winner state */}
            {winner && (
              <div className="text-center py-4 space-y-2">
                <div className="text-3xl">🏆</div>
                <div className="text-base font-black text-amber-600 dark:text-amber-400">
                  {players.find((p) => p.playerId === winner)?.username} WINS!
                </div>
              </div>
            )}
          </div>

          {/* My Properties */}
          {myPlayer && myPlayer.ownedProperties.length > 0 && (
            <div className="pt-1">
              <h4 className="text-xs font-black uppercase tracking-wider text-slate-500 dark:text-slate-400 px-0.5 mb-1.5">
                🏰 My Properties ({myPlayer.ownedProperties.length})
              </h4>
              <div className="grid grid-cols-2 gap-1.5 max-h-[200px] overflow-y-auto">
                {myPlayer.ownedProperties.map((idx) => {
                  const space = MONOPOLY_BOARD[idx];
                  const colorStyle = space?.colorGroup ? COLOR_GROUP_STYLES[space.colorGroup] : null;
                  const level = myPlayer.houseLevels[idx] ?? 0;
                  return (
                    <div
                      key={idx}
                      className="flex items-center gap-1.5 px-2 py-1 rounded-lg border border-slate-200 dark:border-slate-700/30 bg-slate-50 dark:bg-slate-800/30 text-[10px] sm:text-xs"
                    >
                      {colorStyle && (
                        <div className={`w-2.5 h-2.5 rounded-sm ${colorStyle.bg} flex-shrink-0`} />
                      )}
                      <span className="truncate text-slate-700 dark:text-slate-200 font-bold">{space?.name}</span>
                      {level > 0 && (
                        <span className="text-[9px] flex-shrink-0">{HOUSE_LEVEL_ICONS[level]}</span>
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
