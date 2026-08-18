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
    <div className="flex flex-col h-full bg-slate-900/90 border border-slate-800 rounded-xl overflow-hidden shadow-lg">
      <div className="px-3.5 py-2.5 bg-slate-800/60 border-b border-slate-800 flex items-center justify-between">
        <h3 className="text-xs font-semibold text-slate-300 uppercase tracking-wider flex items-center gap-1.5">
          <span>📜</span>
          <span>Move History</span>
        </h3>
        <span className="text-[11px] font-medium text-slate-500">
          {moves.length} {moves.length === 1 ? "move" : "moves"}
        </span>
      </div>

      <div
        ref={containerRef}
        className="flex-1 overflow-y-auto p-2 text-xs font-mono scrollbar-thin scrollbar-thumb-slate-700 scrollbar-track-transparent min-h-[120px] max-h-[220px] lg:max-h-none"
      >
        {pairedMoves.length === 0 ? (
          <div className="h-full flex items-center justify-center text-slate-600 italic py-6">
            Moves will appear here
          </div>
        ) : (
          <div className="space-y-0.5">
            {pairedMoves.map((pair) => (
              <div
                key={pair.moveNumber}
                className="flex items-center py-1 px-2 rounded hover:bg-slate-800/40 text-slate-300 transition-colors"
              >
                <span className="w-10 text-slate-500 font-medium">
                  {pair.moveNumber}.
                </span>
                <span className="flex-1 font-semibold text-slate-200">
                  {pair.white || ""}
                </span>
                <span className="flex-1 font-semibold text-slate-400">
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
