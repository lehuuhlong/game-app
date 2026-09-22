'use client';

import React from 'react';
import { motion } from 'framer-motion';
import { Cell } from './types';
import { CreatureIcon } from './CreatureIcons';

interface PikachuTileProps {
  cell: Cell;
  onSelect: (cell: Cell) => void;
}

export const PikachuTile: React.FC<PikachuTileProps> = React.memo(({ cell, onSelect }) => {
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
      className={`relative aspect-square w-full rounded-xl select-none flex flex-col items-center justify-center cursor-pointer p-0.5 sm:p-1 md:p-1.5 focus:outline-none transition-colors ${
        isSelected
          ? 'ring-2 ring-amber-500 bg-amber-500/15 border border-amber-500 shadow-sm z-20'
          : isHinted
          ? 'ring-2 ring-sky-500 bg-sky-500/15 border border-sky-500 shadow-sm animate-pulse z-20'
          : 'bg-surface border border-border hover:border-foreground/30 hover:bg-surface-hover shadow-xs'
      }`}
      style={{
        gridRowStart: r + 1,
        gridColumnStart: c + 1,
      }}
    >
      {/* Synchronized Vector SVG Creature Icon */}
      <div className="relative z-10 w-full h-full p-1 sm:p-1.5 flex items-center justify-center filter drop-shadow-xs select-none">
        <CreatureIcon type={tile.type} className="w-full h-full object-contain" />
      </div>
    </motion.button>
  );
});

PikachuTile.displayName = 'PikachuTile';
