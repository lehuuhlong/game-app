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
      whileHover={{ scale: 1.04 }}
      whileTap={{ scale: 0.96 }}
      animate={
        isRemoving
          ? { scale: [1, 1.15, 0], opacity: [1, 1, 0], rotate: 0 }
          : isSelected
          ? { scale: 1.06, rotate: 0 }
          : isHinted
          ? { scale: [1, 1.06, 1], rotate: 0, transition: { repeat: Infinity, duration: 1 } }
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
      className={`relative aspect-[4/5] w-full select-none flex items-center justify-center cursor-pointer focus:outline-none transition-all p-0 overflow-visible ${
        isSelected
          ? 'ring-2 sm:ring-[3px] ring-red-500 shadow-[0_0_12px_rgba(239,68,68,0.7)] z-20 brightness-110'
          : isHinted
          ? 'ring-2 sm:ring-[3px] ring-sky-400 shadow-[0_0_12px_rgba(56,189,248,0.8)] z-20 animate-pulse brightness-110'
          : 'hover:brightness-105 hover:ring-1 hover:ring-amber-300/70 shadow-xs'
      }`}
      style={{
        gridRowStart: r + 1,
        gridColumnStart: c + 1,
      }}
    >
      <CreatureIcon type={tile.type} className="w-full h-full block" />
    </motion.button>
  );
});

PikachuTile.displayName = 'PikachuTile';
