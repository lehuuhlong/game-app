"use client";

import { memo } from "react";
import { motion } from "framer-motion";
import type { CellValue } from "./types";

interface CellProps {
  value: CellValue;
  row: number;
  col: number;
  isWinning: boolean;
  isLastMove: boolean;
  onClick: () => void;
  disabled: boolean;
}

export const Cell = memo(function Cell({
  value,
  isWinning,
  isLastMove,
  onClick,
  disabled,
}: CellProps) {
  return (
    <button
      onClick={onClick}
      disabled={disabled || value !== null}
      className={`
        relative flex items-center justify-center
        w-full aspect-square
        border border-border/50
        transition-colors duration-150
        ${value === null && !disabled ? "hover:bg-accent/10 cursor-pointer" : "cursor-default"}
        ${isWinning ? "bg-emerald-100 dark:bg-emerald-900/40" : ""}
        ${isLastMove && !isWinning ? "bg-amber-50 dark:bg-amber-900/20" : ""}
      `}
    >
      {value && (
        <motion.div
          initial={{ scale: 0, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{
            type: "spring",
            stiffness: 500,
            damping: 25,
            mass: 0.5,
          }}
          className="flex items-center justify-center w-full h-full"
        >
          {value === "X" ? <XMark isWinning={isWinning} /> : <OMark isWinning={isWinning} />}
        </motion.div>
      )}
    </button>
  );
});

function XMark({ isWinning }: { isWinning: boolean }) {
  return (
    <svg
      viewBox="0 0 24 24"
      className={`w-[60%] h-[60%] ${
        isWinning
          ? "text-emerald-600 dark:text-emerald-400"
          : "text-rose-500 dark:text-rose-400"
      }`}
      fill="none"
      stroke="currentColor"
      strokeWidth="3"
      strokeLinecap="round"
    >
      <motion.line
        x1="5" y1="5" x2="19" y2="19"
        initial={{ pathLength: 0 }}
        animate={{ pathLength: 1 }}
        transition={{ duration: 0.2, ease: "easeOut" }}
      />
      <motion.line
        x1="19" y1="5" x2="5" y2="19"
        initial={{ pathLength: 0 }}
        animate={{ pathLength: 1 }}
        transition={{ duration: 0.2, delay: 0.1, ease: "easeOut" }}
      />
    </svg>
  );
}

function OMark({ isWinning }: { isWinning: boolean }) {
  return (
    <svg
      viewBox="0 0 24 24"
      className={`w-[60%] h-[60%] ${
        isWinning
          ? "text-emerald-600 dark:text-emerald-400"
          : "text-blue-500 dark:text-blue-400"
      }`}
      fill="none"
      stroke="currentColor"
      strokeWidth="3"
    >
      <motion.circle
        cx="12" cy="12" r="7"
        initial={{ pathLength: 0 }}
        animate={{ pathLength: 1 }}
        transition={{ duration: 0.3, ease: "easeOut" }}
      />
    </svg>
  );
}
