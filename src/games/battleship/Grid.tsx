'use client';

import React from 'react';
import { motion } from 'framer-motion';
import { ShipPlacement } from '@/types/socket';
import {
  Shot,
  ROWS,
  COLS,
  SHIP_COLORS,
  getShipPart,
  getShipBorderRadius,
} from './types';

interface GridProps {
  ships?: ShipPlacement[];
  /** Shots to display — can include 'pending' result for optimistic UI */
  shots?: Shot[];
  onCellClick?: (x: number, y: number) => void;
  showShips?: boolean;
  disabled?: boolean;
  activeTurn?: boolean;
  isOwnBoard?: boolean;
  /** Sunk enemy ships to reveal on enemy board */
  revealedShips?: ShipPlacement[];
  onShipDrop?: (shipType: string, x: number, y: number, offsetX: number, offsetY: number) => void;
  onCellContextMenu?: (x: number, y: number) => void;
}

export function Grid({
  ships = [],
  shots = [],
  onCellClick,
  showShips = false,
  disabled = false,
  activeTurn = false,
  isOwnBoard = false,
  revealedShips = [],
  onShipDrop,
  onCellContextMenu,
}: GridProps) {
  const allShips = [...ships, ...revealedShips];

  const getCellStatus = (x: number, y: number) => {
    const shot = shots.find(s => s.x === x && s.y === y);
    const ship = allShips.find(s => {
      if (s.vertical) {
        return s.x === x && y >= s.y && y < s.y + s.length;
      } else {
        return y === s.y && x >= s.x && x < s.x + s.length;
      }
    });
    const isRevealed = revealedShips.some(s => {
      if (s.vertical) {
        return s.x === x && y >= s.y && y < s.y + s.length;
      } else {
        return y === s.y && x >= s.x && x < s.x + s.length;
      }
    });

    return { shot, ship, isRevealed };
  };

  return (
    <div className="flex flex-col items-center select-none">
      {/* Column Labels */}
      <div className="flex ml-7">
        {COLS.map(c => (
          <div key={c} className="w-9 h-6 flex items-center justify-center text-[10px] font-bold text-foreground-muted">
            {c}
          </div>
        ))}
      </div>

      <div className="flex">
        {/* Row Labels */}
        <div className="flex flex-col">
          {ROWS.map(r => (
            <div key={r} className="w-7 h-9 flex items-center justify-center text-[10px] font-bold text-foreground-muted">
              {r}
            </div>
          ))}
        </div>

        {/* Grid Body */}
        <div
          className={`
            grid grid-cols-10 rounded-xl overflow-hidden
            border-2 transition-all duration-300
            ${activeTurn
              ? 'border-emerald-500/80 ring-2 ring-emerald-500/30 shadow-[0_0_25px_rgba(16,185,129,0.25)]'
              : 'border-border'
            }
            ${isOwnBoard
              ? 'bg-gradient-to-br from-sky-950/80 via-blue-950/60 to-cyan-950/50'
              : 'bg-gradient-to-br from-slate-900/80 via-gray-900/60 to-zinc-900/50'
            }
          `}
        >
          {Array.from({ length: 100 }).map((_, i) => {
            const x = i % 10;
            const y = Math.floor(i / 10);
            const { shot, ship, isRevealed } = getCellStatus(x, y);
            const colors = ship ? SHIP_COLORS[ship.type] || SHIP_COLORS.destroyer : null;
            const shipPart = ship ? getShipPart(x, y, ship) : null;
            const isAlreadyShot = !!shot;
            const isPending = shot?.result === 'pending';
            const canClick = !disabled && !isAlreadyShot;
            const shouldShowShip = showShips || isRevealed;
            const isSunkCell = shot?.result === 'sunk';
            const isHitCell = shot?.result === 'hit';

            return (
              <button
                key={`${x}-${y}`}
                onClick={() => canClick && onCellClick?.(x, y)}
                onContextMenu={(e) => {
                  e.preventDefault();
                  if (!disabled) onCellContextMenu?.(x, y);
                }}
                disabled={disabled || isAlreadyShot}
                onDragOver={(e) => {
                  e.preventDefault(); // necessary to allow dropping
                }}
                onDrop={(e) => {
                  e.preventDefault();
                  if (disabled) return;
                  const shipType = e.dataTransfer.getData('shipType');
                  const offsetX = parseInt(e.dataTransfer.getData('offsetX') || '0', 10);
                  const offsetY = parseInt(e.dataTransfer.getData('offsetY') || '0', 10);
                  if (shipType) {
                    onShipDrop?.(shipType, x, y, offsetX, offsetY);
                  }
                }}
                className={`
                  w-9 h-9 relative transition-all duration-150
                  border-[0.5px] border-white/5
                  ${canClick ? 'cursor-crosshair hover:bg-sky-500/15' : 'cursor-default'}
                  ${isAlreadyShot ? 'cursor-not-allowed' : ''}
                `}
                title={
                  isPending ? 'Firing...'
                  : isAlreadyShot
                    ? (shot.result === 'miss' ? 'Miss' : shot.result === 'sunk' ? 'Sunk!' : 'Hit!')
                    : `${ROWS[y]}${x + 1}`
                }
              >
                {/* Water texture pattern — only on empty cells */}
                {!isAlreadyShot && !(shouldShowShip && ship) && (
                  <div className="absolute inset-0 opacity-[0.03]" style={{
                    backgroundImage: `radial-gradient(circle at ${30 + (x * 7) % 40}% ${20 + (y * 11) % 60}%, rgba(56,189,248,0.4) 0%, transparent 50%)`,
                  }} />
                )}

                {/* Ship Layer — own board ships OR revealed sunk enemy ships */}
                {shouldShowShip && ship && shipPart && colors && (
                  <div
                    draggable={!disabled && isOwnBoard && !isAlreadyShot}
                    onDragStart={(e) => {
                      if (disabled || !isOwnBoard) {
                        e.preventDefault();
                        return;
                      }
                      e.dataTransfer.setData('shipType', ship.type);
                      e.dataTransfer.setData('offsetX', (x - ship.x).toString());
                      e.dataTransfer.setData('offsetY', (y - ship.y).toString());
                    }}
                    className={`absolute inset-[2px] ${isSunkCell ? 'bg-red-900/80' : colors.bg} shadow-inner transition-all ${(!disabled && isOwnBoard && !isAlreadyShot) ? 'cursor-grab active:cursor-grabbing' : ''}`}
                    style={{
                      borderRadius: getShipBorderRadius(shipPart, ship.vertical),
                      opacity: isSunkCell ? 0.7 : shot ? 0.5 : 0.85,
                      boxShadow: isSunkCell
                        ? 'inset 0 0 10px rgba(220,38,38,0.4)'
                        : shot
                          ? 'inset 0 0 8px rgba(0,0,0,0.5)'
                          : `inset 0 1px 2px rgba(255,255,255,0.15), inset 0 -1px 2px rgba(0,0,0,0.3)`,
                    }}
                  >
                    {/* Ship Detail: window/porthole for body cells */}
                    {shipPart === 'body' && !shot && (
                      <div className="absolute inset-0 flex items-center justify-center">
                        <div className="w-2 h-2 rounded-full bg-white/10 border border-white/5" />
                      </div>
                    )}
                    {/* Ship Detail: bow arrow/point */}
                    {shipPart === 'bow' && !shot && (
                      <div className="absolute inset-0 flex items-center justify-center">
                        <div className="w-2.5 h-2.5 bg-white/10 rounded-sm" style={{
                          clipPath: ship.vertical ? 'polygon(50% 0%, 100% 100%, 0% 100%)' : 'polygon(0% 0%, 100% 50%, 0% 100%)',
                        }} />
                      </div>
                    )}
                    {/* Ship Detail: stern circle */}
                    {shipPart === 'stern' && !shot && (
                      <div className="absolute inset-0 flex items-center justify-center">
                        <div className="w-3 h-1.5 rounded-full bg-white/8 border border-white/5" />
                      </div>
                    )}
                  </div>
                )}

                {/* Hit on enemy board — show generic ship background when no revealed ship */}
                {!showShips && !isRevealed && isHitCell && (
                  <div className="absolute inset-[2px] bg-slate-600/60 rounded-sm shadow-inner" />
                )}

                {/* Pending fire indicator — pulsing crosshair */}
                {isPending && (
                  <div className="absolute inset-0 flex items-center justify-center z-10">
                    <div className="w-5 h-5 border-2 border-sky-400 rounded-full animate-ping opacity-60" />
                    <div className="absolute w-2 h-2 bg-sky-400/80 rounded-full" />
                  </div>
                )}

                {/* Shot Indicator (non-pending) */}
                {shot && !isPending && (
                  <motion.div
                    initial={{ scale: 0, rotate: -180 }}
                    animate={{ scale: 1, rotate: 0 }}
                    transition={{ type: 'spring', damping: 12, stiffness: 200 }}
                    className="absolute inset-0 flex items-center justify-center z-10"
                  >
                    {shot.result === 'miss' ? (
                      /* Water splash */
                      <div className="relative">
                        <div className="w-3 h-3 rounded-full bg-white/80 shadow-[0_0_6px_rgba(255,255,255,0.6)]" />
                        <div className="absolute inset-0 w-3 h-3 rounded-full bg-white/30 animate-ping" />
                      </div>
                    ) : shot.result === 'sunk' ? (
                      /* Sunk — skull on destroyed ship */
                      <div className="relative flex items-center justify-center">
                        <div className="w-5 h-5 rounded-sm bg-red-600/80 shadow-[0_0_12px_rgba(220,38,38,0.8)]" />
                        <span className="absolute text-[10px]">💀</span>
                      </div>
                    ) : (
                      /* Hit — fire */
                      <div className="relative flex items-center justify-center">
                        <div className="w-4 h-4 rounded-sm bg-orange-500 shadow-[0_0_10px_rgba(249,115,22,0.8)] animate-pulse" />
                        <span className="absolute text-[9px]">🔥</span>
                      </div>
                    )}
                  </motion.div>
                )}

                {/* Hit/Sunk background glow */}
                {shot && shot.result !== 'miss' && shot.result !== 'pending' && (
                  <div className={`absolute inset-0 ${
                    shot.result === 'sunk' ? 'bg-red-600/20' : 'bg-orange-500/15'
                  }`} />
                )}

                {/* Pending background highlight */}
                {isPending && (
                  <div className="absolute inset-0 bg-sky-500/10" />
                )}
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}
