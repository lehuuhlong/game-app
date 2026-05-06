'use client';

import React from 'react';
import { motion } from 'framer-motion';
import { ShipPlacement } from '@/types/socket';

interface GridProps {
  ships?: ShipPlacement[];
  shots?: { x: number; y: number; result: 'hit' | 'miss' | 'sunk' }[];
  onCellClick?: (x: number, y: number) => void;
  showShips?: boolean;
  disabled?: boolean;
  activeTurn?: boolean;
}

const ROWS = ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H', 'I', 'J'];
const COLS = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10];

export function Grid({ ships = [], shots = [], onCellClick, showShips = false, disabled = false, activeTurn = false }: GridProps) {
  const getCellStatus = (x: number, y: number) => {
    const shot = shots.find(s => s.x === x && s.y === y);
    const ship = ships.find(s => {
      if (s.vertical) {
        return s.x === x && y >= s.y && y < s.y + s.length;
      } else {
        return y === s.y && x >= s.x && x < s.x + s.length;
      }
    });

    return { shot, ship };
  };

  return (
    <div className="flex flex-col items-center">
      {/* Column Labels */}
      <div className="flex ml-6">
        {COLS.map(c => (
          <div key={c} className="w-8 h-6 flex items-center justify-center text-[10px] font-bold text-foreground-muted">
            {c}
          </div>
        ))}
      </div>

      <div className="flex">
        {/* Row Labels */}
        <div className="flex flex-col">
          {ROWS.map(r => (
            <div key={r} className="w-6 h-8 flex items-center justify-center text-[10px] font-bold text-foreground-muted">
              {r}
            </div>
          ))}
        </div>

        {/* Grid Body */}
        <div className={`grid grid-cols-10 border border-border bg-background/50 rounded-sm overflow-hidden ${activeTurn ? 'ring-2 ring-accent ring-offset-2 ring-offset-background' : ''}`}>
          {Array.from({ length: 100 }).map((_, i) => {
            const x = i % 10;
            const y = Math.floor(i / 10);
            const { shot, ship } = getCellStatus(x, y);

            return (
              <button
                key={`${x}-${y}`}
                onClick={() => !disabled && onCellClick?.(x, y)}
                disabled={disabled || !!shot}
                className={`
                  w-8 h-8 border-[0.5px] border-border/30 relative transition-colors
                  ${!disabled && !shot ? 'hover:bg-accent/10' : ''}
                  ${disabled ? 'cursor-default' : 'cursor-crosshair'}
                `}
              >
                {/* Ship Layer */}
                {showShips && ship && (
                  <div className={`absolute inset-1 rounded-sm ${shot ? 'bg-slate-600' : 'bg-slate-500'} shadow-inner opacity-80`} />
                )}

                {/* Shot Indicator */}
                {shot && (
                  <motion.div
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    className="absolute inset-0 flex items-center justify-center z-10"
                  >
                    {shot.result === 'miss' ? (
                      <div className="w-2.5 h-2.5 rounded-full bg-white shadow-[0_0_8px_rgba(255,255,255,0.8)]" />
                    ) : (
                      <div className={`w-3 h-3 rounded-sm ${shot.result === 'sunk' ? 'bg-red-700' : 'bg-red-500'} shadow-[0_0_10px_rgba(239,68,68,0.8)] animate-pulse`} />
                    )}
                  </motion.div>
                )}

                {/* Grid Overlay for hits */}
                {shot && shot.result !== 'miss' && (
                  <div className="absolute inset-0 bg-red-500/10" />
                )}
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}
