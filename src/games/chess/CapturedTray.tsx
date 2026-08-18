"use client";

import React from "react";

interface CapturedTrayProps {
  pieces: string[]; // e.g. ["p", "p", "n", "q"] (lowercase = black pieces captured by white; uppercase = white pieces captured by black)
  color: "white" | "black"; // which tray side this represents
}

const PIECE_SYMBOLS: Record<string, string> = {
  p: "♟",
  r: "♜",
  n: "♞",
  b: "♝",
  q: "♛",
  k: "♚",
  P: "♙",
  R: "♖",
  N: "♘",
  B: "♗",
  Q: "♕",
  K: "♔",
};

const PIECE_VALUES: Record<string, number> = {
  p: 1,
  n: 3,
  b: 3,
  r: 5,
  q: 9,
  P: 1,
  N: 3,
  B: 3,
  R: 5,
  Q: 9,
};

export function CapturedTray({ pieces }: CapturedTrayProps) {
  if (!pieces || pieces.length === 0) {
    return <div className="h-6 flex items-center text-xs text-slate-500 italic">No captures</div>;
  }

  // Count piece values
  const totalValue = pieces.reduce((sum, p) => sum + (PIECE_VALUES[p] || 0), 0);

  return (
    <div className="flex items-center gap-1 flex-wrap min-h-[24px]">
      <div className="flex items-center -space-x-1">
        {pieces.map((p, idx) => (
          <span
            key={`${p}-${idx}`}
            className="text-lg leading-none select-none transition-transform hover:scale-125 drop-shadow"
            title={`Captured ${p.toUpperCase()}`}
          >
            {PIECE_SYMBOLS[p] || p}
          </span>
        ))}
      </div>
      {totalValue > 0 && (
        <span className="text-[11px] font-semibold text-slate-400 ml-1">
          +{totalValue}
        </span>
      )}
    </div>
  );
}
