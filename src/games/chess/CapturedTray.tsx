"use client";

import React from "react";

interface CapturedTrayProps {
  pieces: string[]; // e.g. ["p", "p", "n", "q"]
  color: "white" | "black";
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
    return (
      <div className="h-5 flex items-center text-xs text-foreground-muted italic">
        No captures yet
      </div>
    );
  }

  // Count piece values
  const totalValue = pieces.reduce((sum, p) => sum + (PIECE_VALUES[p] || 0), 0);

  return (
    <div className="flex items-center gap-1 flex-wrap min-h-[20px] mt-0.5">
      <div className="flex items-center -space-x-0.5">
        {pieces.map((p, idx) => (
          <span
            key={`${p}-${idx}`}
            className="text-base leading-none select-none transition-transform hover:scale-125 text-foreground drop-shadow-sm"
            title={`Captured ${p.toUpperCase()}`}
          >
            {PIECE_SYMBOLS[p] || p}
          </span>
        ))}
      </div>
      {totalValue > 0 && (
        <span className="text-xs font-mono font-bold px-1.5 py-0.5 rounded bg-accent/10 text-accent border border-accent/20 ml-1">
          +{totalValue}
        </span>
      )}
    </div>
  );
}
