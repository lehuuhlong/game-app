"use client";

import { motion } from "framer-motion";

interface ScoreBoardProps {
  score: number;
  bestScore: number;
  moveCount: number;
}

export function ScoreBoard({ score, bestScore, moveCount }: ScoreBoardProps) {
  return (
    <div className="flex items-center gap-3">
      <ScoreBox label="SCORE" value={score} isMain />
      <ScoreBox label="BEST" value={bestScore} />
      <ScoreBox label="MOVES" value={moveCount} />
    </div>
  );
}

function ScoreBox({
  label,
  value,
  isMain = false,
}: {
  label: string;
  value: number;
  isMain?: boolean;
}) {
  return (
    <div
      className={`flex flex-col items-center rounded-lg px-4 py-2 min-w-[80px] ${
        isMain
          ? "bg-gradient-to-br from-amber-500 to-orange-600 text-white shadow-lg shadow-amber-500/25"
          : "bg-[#bbada0] dark:bg-[#4a4458] text-white"
      }`}
    >
      <span className="text-[10px] font-bold tracking-widest uppercase opacity-80">
        {label}
      </span>
      <motion.span
        key={value}
        initial={{ scale: 1.3, opacity: 0.7 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ type: "spring", stiffness: 300, damping: 20 }}
        className="text-lg sm:text-xl font-extrabold tabular-nums"
      >
        {value.toLocaleString()}
      </motion.span>
    </div>
  );
}
