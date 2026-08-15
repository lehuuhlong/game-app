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
  spaceIndex,
}: {
  players: MonopolyPlayerState[];
  spaceIndex: number;
}) {
  const playersHere = players.filter(
    (p) => p.isActive && p.position === spaceIndex
  );
  if (playersHere.length === 0) return null;

  return (
    <div className="flex flex-wrap items-center justify-center gap-0.5 z-10">
      {playersHere.map((p) => {
        const style = TOKEN_STYLES[p.tokenColor] || TOKEN_STYLES.red;
        return (
          <motion.div
            key={p.playerId}
            layoutId={`token-${p.playerId}`}
            className={`flex items-center justify-center w-4 h-4 sm:w-5 sm:h-5 rounded-full ${style.bg} ring-2 ring-white shadow-md text-[9px] sm:text-[10px]`}
            transition={{ type: 'spring', stiffness: 300, damping: 22 }}
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
  ownerColor,
  houseLevel,
  isCorner,
}: {
  space: MonopolyBoardSpace;
  players: MonopolyPlayerState[];
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
      title={`${space.name}${space.price ? ` — $${space.price}K` : ''}${houseLevel > 0 ? ` — ${HOUSE_LEVEL_LABELS[houseLevel]}` : ''}`}
    >
      {/* Property Group Color Header Bar */}
      {colorStyle && space.type === 'property' && (
        <div
          className={`w-full h-2.5 sm:h-3 flex-shrink-0 bg-gradient-to-r ${colorStyle.barGradient} border-b border-black/10 dark:border-black/30`}
        />
      )}

      {/* Owner Badge + House Level */}
      {ownerToken && (
        <div className="absolute top-0 right-0 flex items-center gap-0.5 px-0.5 bg-slate-900/90 dark:bg-slate-950/90 rounded-bl text-amber-300 z-10 shadow-xs">
          {houseLevel > 0 && (
            <span className="text-[7px] sm:text-[8px] leading-none">
              {HOUSE_LEVEL_ICONS[houseLevel]}
            </span>
          )}
          <span className="text-[8px] sm:text-[9px] drop-shadow-sm">{ownerToken.avatar}</span>
        </div>
      )}

      {/* Cell Content */}
      <div className={`flex-1 flex flex-col items-center justify-center p-0.5 ${isCorner ? 'gap-0.5' : 'gap-0'}`}>
        {space.type === 'property' ? (
          <>
            <span className="text-[6.5px] sm:text-[8px] md:text-[9px] leading-tight text-center font-extrabold text-slate-800 dark:text-slate-200 truncate w-full group-hover:text-amber-600 dark:group-hover:text-amber-400 transition-colors">
              {space.name}
            </span>
            {space.price && (
              <span className="text-[6px] sm:text-[7px] md:text-[8px] font-mono font-bold text-emerald-700 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/60 px-1 py-0.2 rounded border border-emerald-200/60 dark:border-emerald-800/40">
                ${space.price}K
              </span>
            )}
          </>
        ) : (
          <>
            <span className="text-xs sm:text-sm md:text-base drop-shadow-xs">
              {SPACE_ICONS[space.type] || '📍'}
            </span>
            <span className="text-[6px] sm:text-[7px] md:text-[8px] leading-tight text-center font-black text-slate-800 dark:text-amber-300 uppercase tracking-tighter">
              {isCorner ? space.name : space.name.split(' ')[0]}
            </span>
            {space.price && (
              <span className="text-[5.5px] sm:text-[6.5px] font-mono font-bold text-emerald-700 dark:text-emerald-400">
                ${space.price}K
              </span>
            )}
          </>
        )}
      </div>

      {/* Player Tokens */}
      <PlayerTokens players={players} spaceIndex={space.index} />
    </div>
  );
}

// ── Dice Display Component ──────────────────────────────────────

function DiceDisplay({ dice }: { dice: [number, number] | null }) {
  if (!dice) return null;

  const dotPositions: Record<number, string[]> = {
    1: ['top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 bg-red-600 w-2.5 h-2.5'],
    2: ['top-1 right-1 bg-slate-900', 'bottom-1 left-1 bg-slate-900'],
    3: ['top-1 right-1 bg-slate-900', 'top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 bg-slate-900', 'bottom-1 left-1 bg-slate-900'],
    4: ['top-1 left-1 bg-slate-900', 'top-1 right-1 bg-slate-900', 'bottom-1 left-1 bg-slate-900', 'bottom-1 right-1 bg-slate-900'],
    5: ['top-1 left-1 bg-slate-900', 'top-1 right-1 bg-slate-900', 'top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 bg-slate-900', 'bottom-1 left-1 bg-slate-900', 'bottom-1 right-1 bg-slate-900'],
    6: ['top-1 left-1 bg-slate-900', 'top-1 right-1 bg-slate-900', 'top-1/2 left-1 -translate-y-1/2 bg-slate-900', 'top-1/2 right-1 -translate-y-1/2 bg-slate-900', 'bottom-1 left-1 bg-slate-900', 'bottom-1 right-1 bg-slate-900'],
  };

  return (
    <div className="flex items-center gap-2">
      {dice.map((value, i) => (
        <motion.div
          key={i}
          initial={{ scale: 0.3, rotate: -180 }}
          animate={{ scale: 1, rotate: 0 }}
          transition={{ duration: 0.4, type: 'spring', stiffness: 200 }}
          className="relative w-8 h-8 sm:w-9 sm:h-9 bg-gradient-to-br from-white to-slate-100 rounded-lg shadow-lg border border-slate-300 dark:border-slate-200"
        >
          {dotPositions[value]?.map((dotClass, j) => (
            <div
              key={j}
              className={`absolute w-1.5 h-1.5 rounded-full ${dotClass}`}
            />
          ))}
        </motion.div>
      ))}
    </div>
  );
}

// ── Compact Player Card (Right Panel) ────────────────────────────

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
        flex items-center gap-2 px-2.5 py-2 rounded-xl border transition-all duration-200
        ${isCurrentTurn
          ? 'border-amber-400 dark:border-amber-400/80 bg-amber-50/90 dark:bg-amber-400/10 ring-1 ring-amber-400/50 shadow-sm'
          : 'border-slate-200 dark:border-slate-700/60 bg-slate-50/80 dark:bg-slate-800/40 text-slate-800 dark:text-slate-200'
        }
        ${!player.isActive ? 'opacity-30 grayscale' : ''}
      `}
    >
      <div className={`w-7 h-7 rounded-lg ${token.bg} flex items-center justify-center text-sm shadow-sm flex-shrink-0 text-white`}>
        <span>{token.avatar}</span>
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-1">
          <span className="text-[10px] font-bold text-slate-800 dark:text-slate-200 truncate">
            {player.username}
          </span>
          {isSelf && (
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 flex-shrink-0" title="You" />
          )}
          {player.inJail && (
            <span className="text-[7px] bg-rose-100 dark:bg-rose-950/60 text-rose-600 dark:text-rose-400 px-1 py-0.2 rounded font-bold border border-rose-300 dark:border-rose-800/40">
              🔒 JAIL
            </span>
          )}
        </div>
        <div className="flex items-center gap-2">
          <span className="text-[10px] font-mono font-black text-emerald-600 dark:text-emerald-400">
            ${(player.balance * 1000).toLocaleString()}
          </span>
          <span className="text-[9px] text-slate-500 dark:text-slate-400 font-medium">
            🏢{player.ownedProperties.length}
          </span>
        </div>
      </div>
      {isCurrentTurn && (
        <span className="text-[8px] text-amber-500 dark:text-amber-400 font-black animate-pulse">
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
      className="text-[10px] sm:text-[11px] font-mono leading-relaxed text-slate-700 dark:text-slate-300 py-0.5 border-b border-slate-100 dark:border-slate-800/40 last:border-0"
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
  const currentSpace = myPlayer ? MONOPOLY_BOARD[myPlayer.position] : null;

  return (
    <div className="w-full max-w-[1440px] mx-auto h-[min(84vh,740px)] flex gap-3 px-2 sm:px-3 py-1 items-stretch justify-center select-none">
      
      {/* ── LEFT PANEL: Event Log (Equal height & balanced width) ── */}
      <div className="w-[260px] xl:w-[300px] flex-shrink-0 flex flex-col h-full rounded-2xl border border-slate-200/90 dark:border-slate-700/60 bg-white/95 dark:bg-slate-900/80 backdrop-blur-md shadow-lg dark:shadow-xl overflow-hidden">
        {/* Log Header */}
        <div className="px-3.5 py-3 border-b border-slate-200/90 dark:border-slate-700/60 bg-slate-50/90 dark:bg-slate-800/60 flex items-center justify-between flex-shrink-0">
          <h3 className="text-xs font-black uppercase tracking-wider text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
            <span>📜</span> Game History
          </h3>
          <span className="text-[10px] font-mono font-bold text-slate-600 dark:text-slate-400 bg-slate-100 dark:bg-slate-950/60 px-2 py-0.5 rounded-full border border-slate-200 dark:border-slate-700/50">
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
                <h2 className="text-lg sm:text-xl font-black tracking-[0.15em] bg-gradient-to-r from-amber-200 via-yellow-100 to-amber-300 dark:from-amber-300 dark:via-yellow-200 dark:to-amber-400 bg-clip-text text-transparent drop-shadow-md">
                  BUSINESS TOUR
                </h2>
                <p className="text-[8px] uppercase font-bold tracking-widest text-emerald-100/90 dark:text-emerald-300/60">
                  32 Spaces • Multiplayer
                </p>
              </div>

              {/* Dice Display */}
              <DiceDisplay dice={lastDice} />

              {/* Winner Display */}
              {winner && (
                <motion.div
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  className="px-5 py-2.5 bg-gradient-to-r from-amber-400 to-yellow-500 text-slate-950 font-black rounded-xl text-sm shadow-xl"
                >
                  🏆 {players.find((p) => p.playerId === winner)?.username} WINS!
                </motion.div>
              )}

              {/* Current position info */}
              {!winner && isMyTurn && currentSpace && turnPhase !== 'roll' && (
                <div className="text-center z-10 bg-black/30 dark:bg-slate-900/60 px-3 py-1 rounded-xl border border-white/20 dark:border-amber-400/20">
                  <span className="text-[10px] text-slate-200 dark:text-slate-300 font-medium">You landed on</span>
                  <div className="text-xs font-black text-amber-300">{currentSpace.name}</div>
                </div>
              )}

              {/* Waiting message for non-active player */}
              {!winner && !isMyTurn && gameState && (
                <div className="text-[11px] font-bold text-amber-100 dark:text-amber-200/80 animate-pulse bg-black/40 dark:bg-slate-900/60 px-3 py-1.5 rounded-full border border-amber-300/30 dark:border-amber-400/20">
                  ⏳ Waiting for {players.find((p) => p.playerId === currentTurnPlayerId)?.username}...
                </div>
              )}

              {/* Player position cards in center */}
              <div className="grid grid-cols-2 gap-1.5 w-full max-w-[280px] z-10">
                {players.map((p) => {
                  const token = TOKEN_STYLES[p.tokenColor] || TOKEN_STYLES.red;
                  const space = MONOPOLY_BOARD[p.position];
                  return (
                    <div
                      key={p.playerId}
                      className={`flex items-center gap-1.5 px-2 py-1 rounded-lg border text-[9px] ${
                        p.playerId === currentTurnPlayerId
                          ? 'border-amber-300 bg-black/40 dark:border-amber-400/50 dark:bg-amber-400/10'
                          : 'border-white/20 bg-black/20 dark:border-slate-700/40 dark:bg-slate-900/40'
                      } ${!p.isActive ? 'opacity-30' : ''}`}
                    >
                      <span className="text-xs">{token.avatar}</span>
                      <div className="flex-1 min-w-0">
                        <div className="font-bold text-white dark:text-slate-200 truncate">{p.username}</div>
                        <div className="text-slate-200 dark:text-slate-400 truncate">📍 {space?.name || 'Unknown'}</div>
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
      <div className="w-[260px] xl:w-[300px] flex-shrink-0 flex flex-col h-full rounded-2xl border border-slate-200/90 dark:border-slate-700/60 bg-white/95 dark:bg-slate-900/80 backdrop-blur-md shadow-lg dark:shadow-xl overflow-hidden">
        
        {/* Room Info Header */}
        <div className="px-3.5 py-3 border-b border-slate-200/90 dark:border-slate-700/60 bg-slate-50/90 dark:bg-slate-800/60 flex items-center justify-between flex-shrink-0">
          <div className="flex items-center gap-1.5">
            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">ROOM</span>
            {roomId && (
              <span className="text-[10px] font-mono font-black text-amber-700 dark:text-amber-400 bg-amber-50 dark:bg-slate-950/80 px-2 py-0.5 rounded-md border border-amber-200 dark:border-slate-700/60">
                {roomId}
              </span>
            )}
          </div>
          <div className="flex items-center gap-1">
            {isFinished && onRematch && (
              <motion.button
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                onClick={onRematch}
                className="px-2 py-1 bg-gradient-to-r from-amber-500 to-yellow-500 text-slate-950 font-bold rounded-lg text-[9px] shadow cursor-pointer"
              >
                🔄 REMATCH
              </motion.button>
            )}
            {onLeaveRoom && (
              <motion.button
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                onClick={onLeaveRoom}
                className="px-2.5 py-1 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 font-bold rounded-lg text-[9px] border border-slate-300 dark:border-slate-700/60 transition-colors cursor-pointer"
              >
                LEAVE
              </motion.button>
            )}
          </div>
        </div>

        {/* Panel Content Area */}
        <div className="flex-1 overflow-y-auto p-3 space-y-3 scrollbar-thin scrollbar-thumb-slate-300 dark:scrollbar-thumb-slate-700 scrollbar-track-transparent">
          {/* Player Cards */}
          <div className="space-y-1.5">
            <h4 className="text-[10px] font-black uppercase tracking-wider text-slate-500 dark:text-slate-400 px-0.5">
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
          <div className="space-y-2">
            <h4 className="text-[10px] font-black uppercase tracking-wider text-slate-500 dark:text-slate-400 px-0.5">
              🎮 Actions
            </h4>

            {!winner && isMyTurn && gameState && (() => {
              const propertyPrice = buyOffer?.price ?? currentSpace?.price ?? 0;
              const canAffordBuy = myPlayer && propertyPrice > 0 ? myPlayer.balance >= propertyPrice : false;
              const canAffordUpgrade = myPlayer && upgradeOffer ? myPlayer.balance >= upgradeOffer.upgradeCost : false;

              return (
                <div className="flex flex-col gap-2">
                  {/* Roll Dice */}
                  {turnPhase === 'roll' && (
                    <motion.button
                      whileHover={{ scale: 1.02 }}
                      whileTap={{ scale: 0.97 }}
                      onClick={onRollDice}
                      className="w-full py-3 bg-gradient-to-r from-amber-400 via-yellow-400 to-amber-500 text-slate-950 font-black rounded-xl text-sm shadow-lg hover:shadow-amber-400/30 cursor-pointer transition-all tracking-wide"
                    >
                      🎲 ROLL DICE
                    </motion.button>
                  )}

                  {/* Buy Property */}
                  {turnPhase === 'action' && buyOffer && (
                    <>
                      {/* Property Preview */}
                      <div className="px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700/50 bg-slate-50 dark:bg-slate-800/40 space-y-1">
                        <div className="text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase">Buy Property</div>
                        <div className="text-xs font-black text-slate-900 dark:text-slate-100">{buyOffer.spaceName}</div>
                        <div className="text-[11px] font-mono font-bold text-emerald-600 dark:text-emerald-400">Price: ${buyOffer.price}K</div>
                      </div>

                      <motion.button
                        whileHover={canAffordBuy ? { scale: 1.02 } : {}}
                        whileTap={canAffordBuy ? { scale: 0.97 } : {}}
                        onClick={canAffordBuy ? onBuyProperty : undefined}
                        disabled={!canAffordBuy}
                        className={`w-full py-2.5 font-black rounded-xl text-xs shadow transition-all ${
                          canAffordBuy
                            ? 'bg-gradient-to-r from-emerald-500 to-teal-500 text-slate-950 hover:shadow-emerald-400/30 cursor-pointer'
                            : 'bg-slate-200 dark:bg-slate-800 text-slate-400 dark:text-slate-500 cursor-not-allowed'
                        }`}
                      >
                        🏠 {canAffordBuy ? `BUY $${buyOffer.price}K` : `CAN'T AFFORD`}
                      </motion.button>

                      <motion.button
                        whileHover={{ scale: 1.02 }}
                        whileTap={{ scale: 0.97 }}
                        onClick={onEndTurn}
                        className="w-full py-2 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 font-bold rounded-xl text-xs border border-slate-300 dark:border-slate-700/50 transition-colors cursor-pointer"
                      >
                        PASS ✋
                      </motion.button>
                    </>
                  )}

                  {/* Upgrade Property */}
                  {turnPhase === 'action' && upgradeOffer && (
                    <>
                      {/* Upgrade Preview */}
                      <div className="px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700/50 bg-slate-50 dark:bg-slate-800/40 space-y-1">
                        <div className="text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase">Upgrade Property</div>
                        <div className="text-xs font-black text-slate-900 dark:text-slate-100">{upgradeOffer.spaceName}</div>
                        <div className="flex items-center gap-2 text-[10px]">
                          <span className="text-slate-500 dark:text-slate-400">Level:</span>
                          <span className="font-bold text-amber-600 dark:text-amber-300">
                            {HOUSE_LEVEL_LABELS[upgradeOffer.currentLevel]} → {HOUSE_LEVEL_LABELS[upgradeOffer.currentLevel + 1]}
                          </span>
                        </div>
                        <div className="text-[11px] font-mono font-bold text-emerald-600 dark:text-emerald-400">
                          Cost: ${upgradeOffer.upgradeCost}K
                        </div>
                      </div>

                      <motion.button
                        whileHover={canAffordUpgrade ? { scale: 1.02 } : {}}
                        whileTap={canAffordUpgrade ? { scale: 0.97 } : {}}
                        onClick={canAffordUpgrade ? onUpgradeProperty : undefined}
                        disabled={!canAffordUpgrade}
                        className={`w-full py-2.5 font-black rounded-xl text-xs shadow transition-all ${
                          canAffordUpgrade
                            ? 'bg-gradient-to-r from-violet-500 to-purple-500 text-white hover:shadow-violet-400/30 cursor-pointer'
                            : 'bg-slate-200 dark:bg-slate-800 text-slate-400 dark:text-slate-500 cursor-not-allowed'
                        }`}
                      >
                        🏗️ {canAffordUpgrade ? `UPGRADE $${upgradeOffer.upgradeCost}K` : `CAN'T AFFORD`}
                      </motion.button>

                      <motion.button
                        whileHover={{ scale: 1.02 }}
                        whileTap={{ scale: 0.97 }}
                        onClick={onEndTurn}
                        className="w-full py-2 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 font-bold rounded-xl text-xs border border-slate-300 dark:border-slate-700/50 transition-colors cursor-pointer"
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
                <div className="text-[10px] text-slate-500 dark:text-slate-400 font-medium">
                  Waiting for opponent's turn...
                </div>
              </div>
            )}

            {/* Winner state */}
            {winner && (
              <div className="text-center py-4 space-y-2">
                <div className="text-2xl">🏆</div>
                <div className="text-sm font-black text-amber-600 dark:text-amber-400">
                  {players.find((p) => p.playerId === winner)?.username} WINS!
                </div>
              </div>
            )}
          </div>

          {/* My Properties */}
          {myPlayer && myPlayer.ownedProperties.length > 0 && (
            <div className="pt-1">
              <h4 className="text-[10px] font-black uppercase tracking-wider text-slate-500 dark:text-slate-400 px-0.5 mb-1">
                🏰 My Properties ({myPlayer.ownedProperties.length})
              </h4>
              <div className="grid grid-cols-2 gap-1 max-h-[100px] overflow-y-auto">
                {myPlayer.ownedProperties.map((idx) => {
                  const space = MONOPOLY_BOARD[idx];
                  const colorStyle = space?.colorGroup ? COLOR_GROUP_STYLES[space.colorGroup] : null;
                  const level = myPlayer.houseLevels[idx] ?? 0;
                  return (
                    <div
                      key={idx}
                      className="flex items-center gap-1 px-1.5 py-0.5 rounded border border-slate-200 dark:border-slate-700/30 bg-slate-50 dark:bg-slate-800/30 text-[8px]"
                    >
                      {colorStyle && (
                        <div className={`w-2 h-2 rounded-sm ${colorStyle.bg}`} />
                      )}
                      <span className="truncate text-slate-700 dark:text-slate-300 font-semibold">{space?.name}</span>
                      {level > 0 && (
                        <span className="text-[7px] flex-shrink-0">{HOUSE_LEVEL_ICONS[level]}</span>
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
