import React from 'react';
import Image from 'next/image';

export interface CreatureIconProps {
  type: number;
  className?: string;
  size?: number;
}

/**
 * Classic Pikachu 2003 piece images (pieces 1 to 36).
 * Sourced directly from classic Pikachu 2003 (pikachu-online.github.io).
 * 40x50 authentic pixel art sprites.
 */
const getPiecePath = (type: number): string => {
  // If 0-indexed (0 to 35) -> pieces1.png to pieces36.png
  let pieceNum: number;
  if (type >= 0 && type < 36) {
    pieceNum = type + 1;
  } else if (type >= 36) {
    pieceNum = (type % 36) + 1;
  } else {
    pieceNum = (Math.abs(type) % 36) + 1;
  }
  return `/games/pikachu/pieces/pieces${pieceNum}.png`;
};

/**
 * Pure, memoized CreatureIcon component using classic Pikachu 2003 pieces.
 * Renders pixel-perfect retro icons matching the original Pikachu matching game.
 */
export const CreatureIcon: React.FC<CreatureIconProps> = React.memo(({ type, className = 'w-full h-full' }) => {
  const src = getPiecePath(type);

  return (
    <Image
      src={src}
      alt={`Pikachu piece #${type}`}
      width={40}
      height={50}
      className={className}
      draggable={false}
      style={{ imageRendering: 'pixelated', objectFit: 'fill' }}
      priority={type < 12}
      unoptimized
    />
  );
});

CreatureIcon.displayName = 'CreatureIcon';
