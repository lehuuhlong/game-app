"use client";

import { useEffect, useState } from "react";
import type { Tile as TileType } from "./types";

/**
 * Color palette for tile values.
 * Maps tile value → { bg, text, glow } colors.
 */
const TILE_STYLES: Record<
  number,
  { bg: string; text: string; shadow: string; fontSize?: string }
> = {
  2: {
    bg: "bg-[#eee4da]",
    text: "text-[#776e65]",
    shadow: "shadow-[#eee4da]/40",
  },
  4: {
    bg: "bg-[#ede0c8]",
    text: "text-[#776e65]",
    shadow: "shadow-[#ede0c8]/40",
  },
  8: {
    bg: "bg-[#f2b179]",
    text: "text-white",
    shadow: "shadow-[#f2b179]/40",
  },
  16: {
    bg: "bg-[#f59563]",
    text: "text-white",
    shadow: "shadow-[#f59563]/40",
  },
  32: {
    bg: "bg-[#f67c5f]",
    text: "text-white",
    shadow: "shadow-[#f67c5f]/40",
  },
  64: {
    bg: "bg-[#f65e3b]",
    text: "text-white",
    shadow: "shadow-[#f65e3b]/50",
  },
  128: {
    bg: "bg-[#edcf72]",
    text: "text-white",
    shadow: "shadow-[#edcf72]/50",
    fontSize: "text-xl",
  },
  256: {
    bg: "bg-[#edcc61]",
    text: "text-white",
    shadow: "shadow-[#edcc61]/50",
    fontSize: "text-xl",
  },
  512: {
    bg: "bg-[#edc850]",
    text: "text-white",
    shadow: "shadow-[#edc850]/50",
    fontSize: "text-xl",
  },
  1024: {
    bg: "bg-[#edc53f]",
    text: "text-white",
    shadow: "shadow-[#edc53f]/60",
    fontSize: "text-lg",
  },
  2048: {
    bg: "bg-[#edc22e]",
    text: "text-white",
    shadow: "shadow-[#edc22e]/60",
    fontSize: "text-lg",
  },
};

const DEFAULT_STYLE = {
  bg: "bg-[#3c3a32]",
  text: "text-white",
  shadow: "shadow-[#3c3a32]/50",
  fontSize: "text-base",
};

interface TileProps {
  tile: TileType;
  cellSize: number;
  gap: number;
}

export function TileComponent({ tile, cellSize, gap }: TileProps) {
  const style = TILE_STYLES[tile.value] || DEFAULT_STYLE;
  const fontSize = style.fontSize || (tile.value < 100 ? "text-2xl" : "text-xl");

  // Calculate pixel position from grid coordinates
  const x = tile.col * (cellSize + gap) + gap;
  const y = tile.row * (cellSize + gap) + gap;

  // For new/merged tiles, animate scale via CSS
  const [scale, setScale] = useState(tile.isNew ? 0 : tile.mergedFrom ? 0.8 : 1);

  useEffect(() => {
    if (tile.isNew || tile.mergedFrom) {
      // Trigger scale animation on next frame
      const raf = requestAnimationFrame(() => {
        setScale(tile.mergedFrom ? 1.15 : 1);
        // For merged tiles, settle back to 1
        if (tile.mergedFrom) {
          const timer = setTimeout(() => setScale(1), 120);
          return () => clearTimeout(timer);
        }
      });
      return () => cancelAnimationFrame(raf);
    } else {
      setScale(1);
    }
  }, [tile.isNew, tile.mergedFrom]);

  return (
    <div
      className={`absolute rounded-lg ${style.bg} ${style.text} ${fontSize} font-extrabold flex items-center justify-center select-none shadow-lg ${style.shadow}`}
      style={{
        width: cellSize,
        height: cellSize,
        // Use transform for positioning — GPU-accelerated, no diagonal issues
        transform: `translate(${x}px, ${y}px) scale(${scale})`,
        // Only transition transform — single property, no conflicts
        transition: "transform 0.12s ease-in-out",
        top: 0,
        left: 0,
        willChange: "transform",
      }}
    >
      {tile.value}
    </div>
  );
}
