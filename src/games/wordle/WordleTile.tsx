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

  return (
    <motion.div
      // Pop animation when a letter is typed
      animate={
        hasLetter && !isEvaluated
          ? { scale: [1, 1.1, 1] }
          : undefined
      }
      transition={{ duration: 0.1 }}
      className={`
        relative flex items-center justify-center
        w-[52px] h-[52px] sm:w-[62px] sm:h-[62px]
        border-2 rounded-lg
        text-2xl sm:text-3xl font-extrabold uppercase
        select-none
        transition-colors duration-300
        ${STATUS_STYLES[styleKey]}
        ${isActive && !hasLetter ? "border-border" : ""}
      `}
    >
      {/* Flip animation for evaluated tiles */}
      {isEvaluated ? (
        <motion.span
          initial={{ rotateX: 90, opacity: 0 }}
          animate={{ rotateX: 0, opacity: 1 }}
          transition={{
            delay: index * 0.15,
            duration: 0.3,
            ease: "easeOut",
          }}
          className="inline-block"
        >
          {tile.letter}
        </motion.span>
      ) : (
        <span>{tile.letter}</span>
      )}
    </motion.div>
  );
});
