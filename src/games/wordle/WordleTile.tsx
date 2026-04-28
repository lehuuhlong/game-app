"use client";

import { memo } from "react";
import { motion } from "framer-motion";
import type { LetterTile } from "./types";

interface TileProps {
  tile: LetterTile;
  /** Position within the row (0-4) for stagger animation */
  index: number;
  /** Whether this tile is in a submitted (evaluated) row */
  isEvaluated: boolean;
  /** Whether this tile is in the currently active row */
  isActive: boolean;
}

const STATUS_STYLES: Record<string, string> = {
  correct:
    "bg-emerald-500 dark:bg-emerald-600 border-emerald-500 dark:border-emerald-600 text-white",
  present:
    "bg-amber-500 dark:bg-amber-500 border-amber-500 dark:border-amber-500 text-white",
  absent:
    "bg-slate-500 dark:bg-slate-600 border-slate-500 dark:border-slate-600 text-white",
  empty: "border-border bg-surface",
  filled: "border-foreground-muted bg-surface",
};

export const WordleTile = memo(function WordleTile({
  tile,
  index,
  isEvaluated,
  isActive,
}: TileProps) {
  const hasLetter = tile.letter !== "";
  let styleKey: string;

  if (isEvaluated) {
    styleKey = tile.status;
  } else if (hasLetter) {
    styleKey = "filled";
  } else {
    styleKey = "empty";
  }

  // Animation timing for evaluated tiles
  const flipDelay = index * 0.2; // Stagger delay (200ms between each tile)
  const colorChangeDelay = flipDelay + 0.2; // Halfway point of the 400ms flip

  return (
    <motion.div
      initial={false}
      // Animate the entire tile flip or just a pop when typing
      animate={
        isEvaluated
          ? { rotateX: [0, 90, 0] }
          : hasLetter
          ? { scale: [1, 1.1, 1] }
          : { scale: 1, rotateX: 0 }
      }
      transition={
        isEvaluated
          ? { duration: 0.4, delay: flipDelay, times: [0, 0.5, 1], ease: "easeInOut" }
          : { duration: 0.1 }
      }
      style={{
        // We delay the color switch until the tile is face-down (at 90 degrees rotateX)
        transitionProperty: "background-color, border-color, color",
        transitionDuration: isEvaluated ? "0s" : "0.15s",
        transitionDelay: isEvaluated ? `${colorChangeDelay}s` : "0s",
      }}
      className={`
        relative flex items-center justify-center
        w-[52px] h-[52px] sm:w-[62px] sm:h-[62px]
        border-2 rounded-lg
        text-2xl sm:text-3xl font-extrabold uppercase
        select-none
        ${STATUS_STYLES[styleKey]}
        ${isActive && !hasLetter ? "border-border" : ""}
      `}
    >
      {tile.letter}
    </motion.div>
  );
});
