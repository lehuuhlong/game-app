'use client';

import React from 'react';
import { motion } from 'framer-motion';
import { Cell } from './types';

interface PikachuTileProps {
  cell: Cell;
  onSelect: (cell: Cell) => void;
}

export const PikachuTile: React.FC<PikachuTileProps> = ({ cell, onSelect }) => {
  const { tile, isSelected, isHinted, isRemoving, r, c } = cell;

  if (!tile) {
    return null;
  }

  return (
    <motion.button
      type="button"
      layout="position"
      onClick={() => onSelect(cell)}
      whileHover={{ scale: 1.05 }}
      whileTap={{ scale: 0.95 }}
      animate={
        isRemoving
          ? { scale: [1, 1.15, 0], opacity: [1, 1, 0], rotate: 0 }
          : isSelected
          ? { scale: 1.08, rotate: 0 }
          : isHinted
          ? { scale: [1, 1.08, 1], rotate: 0, transition: { repeat: Infinity, duration: 1 } }
          : { scale: 1, opacity: 1, rotate: 0 }
      }
      transition={{
        layout: {
          type: 'spring',
          stiffness: 350,
          damping: 28,
        },
        duration: isRemoving ? 0.25 : 0.15,
      }}
      className={`relative aspect-square w-full rounded-xl select-none flex flex-col items-center justify-center cursor-pointer p-1 sm:p-1.5 focus:outline-none z-10 ${
        isSelected
          ? 'ring-2 sm:ring-4 ring-amber-400 shadow-[0_0_20px_rgba(251,191,36,0.6)] z-20 bg-surface/90'
          : isHinted
          ? 'ring-2 ring-sky-400 shadow-[0_0_16px_rgba(56,189,248,0.5)] z-20 bg-surface/80'
          : 'bg-surface/60 border border-border/80 hover:border-accent hover:shadow-[0_0_12px_rgba(56,189,248,0.25)] hover:bg-surface/90 shadow-sm'
      }`}
      style={{
        gridRowStart: r + 1,
        gridColumnStart: c + 1,
        boxShadow: isSelected
          ? `0 0 24px ${tile.glowColor}88, inset 0 0 12px ${tile.glowColor}44`
          : undefined,
      }}
    >
      {/* Background Soft Glow Tint */}
      <div
        className="absolute inset-0 rounded-xl opacity-20 pointer-events-none"
        style={{
          background: `radial-gradient(circle, ${tile.glowColor} 0%, transparent 80%)`,
        }}
      />

      {/* Emoji Character */}
      <span className="relative z-10 text-xl sm:text-2xl md:text-3xl filter drop-shadow-sm select-none">
        {tile.emoji}
      </span>

      {/* Subtle Mini Name Label on larger screens */}
      <span className="hidden sm:inline-block relative z-10 text-[9px] md:text-[10px] font-mono tracking-tight font-semibold text-foreground-secondary truncate max-w-full px-0.5">
        {tile.name}
      </span>

      {/* Selection Ping Ring */}
      {isSelected && (
        <motion.span
          className="absolute inset-0 rounded-xl border border-amber-300 opacity-75"
          animate={{ scale: [1, 1.15, 1], opacity: [0.8, 0, 0.8] }}
          transition={{ repeat: Infinity, duration: 1.2 }}
        />
      )}
    </motion.button>
  );
};
