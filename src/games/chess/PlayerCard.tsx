"use client";

import React from "react";
import { motion } from "framer-motion";
import { CapturedTray } from "./CapturedTray";
import type { ChessColor } from "@/types/socket";

interface PlayerCardProps {
  username: string;
  avatarUrl?: string | null;
  color: ChessColor; // "w" | "b"
  isCurrentTurn: boolean;
  isMe: boolean;
  capturedPieces: string[];
  timeLeft: number;
  timerActive: boolean;
}

export function PlayerCard({
  username,
  avatarUrl,
  color,
  isCurrentTurn,
  isMe,
  capturedPieces,
  timeLeft,
  timerActive,
}: PlayerCardProps) {
  const isWhite = color === "w";
  const initial = username ? username[0].toUpperCase() : "P";

  // Dynamic timer badge styling
  const timerStyle =
    timeLeft <= 10
      ? "text-red-600 dark:text-red-400 border-red-500/50 bg-red-500/10 animate-pulse font-bold"
      : timeLeft <= 20
      ? "text-amber-600 dark:text-amber-400 border-amber-500/50 bg-amber-500/10 font-bold"
      : "text-emerald-600 dark:text-emerald-400 border-emerald-500/40 bg-emerald-500/10 font-bold";

  return (
    <div
      className={`relative flex items-center justify-between gap-3 p-3 rounded-2xl border transition-all duration-300 shadow-sm ${
        isCurrentTurn
          ? "bg-surface border-emerald-500 shadow-md ring-2 ring-emerald-500/20"
          : "bg-surface border-border"
      }`}
    >
      {/* Left: Avatar & Name & Badges */}
      <div className="flex items-center gap-3 min-w-0">
        <div className="relative shrink-0">
          {avatarUrl ? (
            <img
              src={avatarUrl}
              alt={username}
              className={`h-11 w-11 rounded-full object-cover shadow-md ring-2 ${
                isCurrentTurn ? "ring-emerald-500" : "ring-border"
              }`}
            />
          ) : (
            <div
              className={`h-11 w-11 rounded-full flex items-center justify-center font-bold text-white shadow-md text-base ${
                isWhite
                  ? "bg-gradient-to-br from-amber-400 to-amber-600"
                  : "bg-gradient-to-br from-slate-700 to-slate-900"
              }`}
            >
              {initial}
            </div>
          )}

          {/* Piece Color Indicator Badge on Avatar */}
          <div
            className={`absolute -bottom-1 -right-1 w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold shadow-md border ${
              isWhite
                ? "bg-white text-slate-900 border-amber-300"
                : "bg-slate-900 text-white border-slate-700"
            }`}
            title={isWhite ? "White Pieces" : "Black Pieces"}
          >
            {isWhite ? "⚪" : "⚫"}
          </div>

          {/* Active Turn Pulsing Indicator */}
          {isCurrentTurn && (
            <span className="absolute -top-1 -right-1 flex h-3.5 w-3.5 pointer-events-none">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
              <span className="relative inline-flex rounded-full h-3.5 w-3.5 bg-emerald-500 border-2 border-surface shadow-sm" />
            </span>
          )}
        </div>

        <div className="flex flex-col min-w-0">
          <div className="flex items-center gap-1.5 flex-wrap">
            <span className="font-bold text-foreground text-sm truncate max-w-[130px] sm:max-w-[200px]">
              {username}
            </span>
            {isMe && (
              <span className="px-1.5 py-0.5 rounded-full text-[10px] font-bold bg-accent/15 text-accent border border-accent/30 uppercase tracking-wider">
                You
              </span>
            )}
            <span className="px-2 py-0.5 rounded-full text-[10px] font-medium bg-surface-hover text-foreground-secondary border border-border">
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
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl border font-mono text-sm tabular-nums shadow-sm transition-colors ${timerStyle}`}
          >
            <span className="text-xs">⏱</span>
            <span>{timeLeft}s</span>
          </div>
        ) : (
          <span className="text-xs text-foreground-muted font-medium px-2 py-1">
            Waiting
          </span>
        )}
      </div>
    </div>
  );
}
