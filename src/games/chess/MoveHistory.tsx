"use client";

import React, { useEffect, useRef } from "react";
import type { ChessMoveRecord } from "@/types/socket";

interface MoveHistoryProps {
  moves: ChessMoveRecord[];
}

export function MoveHistory({ moves }: MoveHistoryProps) {
  const containerRef = useRef<HTMLDivElement>(null);

  // Group moves into pairs (White move, Black move)
  const pairedMoves = React.useMemo(() => {
    const pairs: { moveNumber: number; white?: string; black?: string }[] = [];
    for (let i = 0; i < moves.length; i += 2) {
      pairs.push({
        moveNumber: Math.floor(i / 2) + 1,
        white: moves[i]?.san,
        black: moves[i + 1]?.san,
      });
    }
    return pairs;
  }, [moves]);

  // Scroll to bottom on new move
  useEffect(() => {
    if (containerRef.current) {
      containerRef.current.scrollTop = containerRef.current.scrollHeight;
    }
  }, [moves.length]);

  return (
    <div className="flex flex-col h-full bg-surface border border-border rounded-2xl overflow-hidden shadow-sm">
      <div className="px-4 py-3 bg-surface-hover/70 border-b border-border flex items-center justify-between">
        <h3 className="text-xs font-bold text-foreground uppercase tracking-wider flex items-center gap-1.5">
          <span>📜</span>
          <span>Move History</span>
        </h3>
        <span className="text-[11px] font-medium text-foreground-muted">
          {moves.length} {moves.length === 1 ? "move" : "moves"}
        </span>
      </div>

      <div
        ref={containerRef}
        className="flex-1 overflow-y-auto p-2 text-xs font-mono min-h-[120px] max-h-[220px] lg:max-h-none"
      >
        {pairedMoves.length === 0 ? (
          <div className="h-full flex items-center justify-center text-foreground-muted italic py-6">
            Moves will appear here
          </div>
        ) : (
          <div className="space-y-0.5">
            {pairedMoves.map((pair) => (
              <div
                key={pair.moveNumber}
                className="flex items-center py-1 px-2.5 rounded-lg hover:bg-surface-hover text-foreground transition-colors"
              >
                <span className="w-10 text-foreground-muted font-medium">
                  {pair.moveNumber}.
                </span>
                <span className="flex-1 font-semibold text-foreground">
                  {pair.white || ""}
                </span>
                <span className="flex-1 font-semibold text-foreground-secondary">
                  {pair.black || ""}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
