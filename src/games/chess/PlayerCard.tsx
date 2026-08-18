"use client";

import React from "react";
import { motion } from "framer-motion";
import { CapturedTray } from "./CapturedTray";
import type { ChessColor } from "@/types/socket";

interface PlayerCardProps {
  username: string;
  color: ChessColor; // "w" | "b"
  isCurrentTurn: boolean;
  isMe: boolean;
  capturedPieces: string[];
  timeLeft: number;
  timerActive: boolean;
}

export function PlayerCard({
  username,
  color,
  isCurrentTurn,
  isMe,
  capturedPieces,
  timeLeft,
  timerActive,
}: PlayerCardProps) {
  const isWhite = color === "w";
  const timerColor =
    timeLeft <= 10
      ? "text-red-400 border-red-500/50 bg-red-950/40 animate-pulse"
      : timeLeft <= 20
      ? "text-amber-400 border-amber-500/50 bg-amber-950/40"
      : "text-emerald-400 border-emerald-500/40 bg-emerald-950/30";

  return (
    <div
      className={`relative flex items-center justify-between gap-3 p-3 rounded-xl border transition-all duration-300 ${
        isCurrentTurn
          ? "bg-slate-800/95 border-emerald-500/60 shadow-[0_0_20px_rgba(16,185,129,0.18)]"
          : "bg-slate-900/80 border-slate-800/80"
      }`}
    >
      {/* Left: Avatar & Name & Badge */}
      <div className="flex items-center gap-3 min-w-0">
        <div className="relative">
          <div
            className={`w-10 h-10 rounded-full flex items-center justify-center font-bold text-base shadow-inner border-2 ${
              isWhite
                ? "bg-gradient-to-tr from-slate-200 to-white text-slate-900 border-amber-200/80 shadow-white/20"
                : "bg-gradient-to-tr from-slate-950 to-slate-800 text-slate-100 border-slate-700 shadow-black/40"
            }`}
          >
            {isWhite ? "♔" : "♚"}
          </div>
          {isCurrentTurn && (
            <motion.div
              layoutId="turn-dot"
              className="absolute -top-1 -right-1 w-3.5 h-3.5 rounded-full bg-emerald-400 border-2 border-slate-900 shadow-sm"
              animate={{ scale: [1, 1.2, 1] }}
              transition={{ repeat: Infinity, duration: 1.5 }}
            />
          )}
        </div>

        <div className="flex flex-col min-w-0">
          <div className="flex items-center gap-2">
            <span className="font-semibold text-slate-100 text-sm truncate max-w-[140px] sm:max-w-[200px]">
              {username}
            </span>
            {isMe && (
              <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-blue-500/20 text-blue-400 border border-blue-500/30 uppercase tracking-wider">
                You
              </span>
            )}
            <span
              className={`px-1.5 py-0.5 rounded text-[10px] font-semibold border ${
                isWhite
                  ? "bg-slate-100/10 text-slate-200 border-slate-400/30"
                  : "bg-slate-950/60 text-slate-400 border-slate-800"
              }`}
            >
              {isWhite ? "White" : "Black"}
            </span>
          </div>

          {/* Captured pieces */}
          <CapturedTray pieces={capturedPieces} color={isWhite ? "white" : "black"} />
        </div>
      </div>

      {/* Right: Turn indicator / Countdown timer */}
      <div className="flex items-center gap-2 shrink-0">
        {isCurrentTurn ? (
          <div
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg border font-mono font-bold text-sm tabular-nums shadow-sm transition-colors ${timerColor}`}
          >
            <span className="text-xs">⏱</span>
            <span>{timeLeft}s</span>
          </div>
        ) : (
          <span className="text-xs text-slate-500 font-medium px-2 py-1">Waiting</span>
        )}
      </div>
    </div>
  );
}
