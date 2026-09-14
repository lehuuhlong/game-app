"use client";

import { BallSphere } from "./BallSphere";
import type { PlayerState } from "../useBilliardsRules";

interface PottedBallsTrayProps {
  player1: PlayerState;
  player2: PlayerState;
  currentPlayer: 1 | 2;
  gameOver: boolean;
  winner: 1 | 2 | null;
  width?: number;
}

const SOLID_NUMBERS = [1, 2, 3, 4, 5, 6, 7];
const STRIPE_NUMBERS = [9, 10, 11, 12, 13, 14, 15];

export function PottedBallsTray({
  player1,
  player2,
  currentPlayer,
  gameOver,
  winner,
  width,
}: PottedBallsTrayProps) {
  const totalPotted = player1.pottedBalls.length + player2.pottedBalls.length;

  const p1GroupText =
    player1.group === "solid" ? "Solids" : player1.group === "stripe" ? "Stripes" : "Open Table";
  const p2GroupText =
    player2.group === "solid" ? "Solids" : player2.group === "stripe" ? "Stripes" : "Open Table";

  const p1Count = player1.pottedBalls.filter((n) => n !== 8).length;
  const p2Count = player2.pottedBalls.filter((n) => n !== 8).length;

  // Has either player cleared their group and is now on the 8-ball?
  const p1OnEight = player1.group !== null && p1Count >= 7;
  const p2OnEight = player2.group !== null && p2Count >= 7;
  const isEightPotted = player1.pottedBalls.includes(8) || player2.pottedBalls.includes(8);

  const getTargetBalls = (group: "solid" | "stripe" | null): number[] => {
    if (group === "solid") return SOLID_NUMBERS;
    if (group === "stripe") return STRIPE_NUMBERS;
    return [1, 2, 3, 4, 5, 6, 7]; // default placeholder rack
  };

  const p1Targets = getTargetBalls(player1.group);
  const p2Targets = getTargetBalls(player2.group);

  return (
    <header
      className="w-full flex items-center justify-between gap-2 sm:gap-4 rounded-2xl border border-border/80 bg-surface/95 dark:bg-slate-900/95 px-3 sm:px-5 py-2.5 shadow-xl backdrop-blur-md select-none transition-all"
      style={{ maxWidth: width ? Math.max(width, 700) : "100%" }}
      aria-label="Player scoreboard and potted balls rack"
    >
      {/* ── PLAYER 1 (Left Side) ─────────────────────────────────── */}
      <div
        className={`flex items-center gap-2.5 sm:gap-3.5 px-2.5 sm:px-3.5 py-1.5 rounded-xl border transition-all ${
          currentPlayer === 1 && !gameOver
            ? "border-blue-500/60 bg-blue-500/10 shadow-md shadow-blue-500/10 ring-1 ring-blue-500/40"
            : winner === 1
            ? "border-emerald-500/60 bg-emerald-500/10"
            : "border-transparent bg-background/40"
        }`}
      >
        {/* Avatar badge */}
        <div className="relative">
          <div
            className={`w-8 h-8 rounded-full flex items-center justify-center font-black text-xs transition-transform ${
              currentPlayer === 1 && !gameOver
                ? "bg-gradient-to-tr from-blue-600 to-sky-400 text-white shadow-md shadow-blue-500/30 scale-105"
                : "bg-slate-800 text-slate-300 border border-slate-700"
            }`}
          >
            P1
          </div>
          {currentPlayer === 1 && !gameOver && (
            <span className="absolute -top-1 -right-1 flex h-2.5 w-2.5">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-sky-400 opacity-75" />
              <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-sky-500" />
            </span>
          )}
        </div>

        {/* Player info & ball rack */}
        <div className="flex flex-col gap-1">
          <div className="flex items-center gap-2">
            <span className="text-xs font-black tracking-tight text-foreground">
              Player 1
            </span>
            <span
              className={`px-1.5 py-0.2 text-[9px] font-black uppercase tracking-wider rounded border ${
                player1.group === "solid"
                  ? "bg-amber-500/15 text-amber-300 border-amber-500/30"
                  : player1.group === "stripe"
                  ? "bg-blue-500/15 text-blue-300 border-blue-500/30"
                  : "bg-slate-800 text-slate-400 border-slate-700"
              }`}
            >
              {p1GroupText}
            </span>
            {currentPlayer === 1 && !gameOver && (
              <span className="rounded bg-sky-500/20 px-1.5 py-0.2 text-[9px] font-black uppercase tracking-wider text-sky-300 border border-sky-500/30 animate-pulse">
                Turn
              </span>
            )}
            <span className="font-mono text-[11px] font-extrabold text-foreground-secondary ml-auto">
              {p1Count}/7
            </span>
          </div>

          {/* 7 Target ball sockets */}
          <div className="flex items-center gap-1 sm:gap-1.5">
            {p1Targets.map((num) => {
              const isPotted = player1.pottedBalls.includes(num);
              return isPotted ? (
                <BallSphere key={num} number={num} size={22} />
              ) : (
                <div
                  key={num}
                  className="w-[22px] h-[22px] rounded-full border border-slate-700/60 bg-slate-800/40 shadow-inner flex items-center justify-center opacity-40 transition-all hover:opacity-60"
                  title={`Ball ${num} (${player1.group || "target"})`}
                >
                  <span className="text-[8px] font-black text-slate-400 select-none">
                    {player1.group ? num : "•"}
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* ── CENTER: 8-Ball Target & Match Status ─────────────────── */}
      <div className="flex flex-col items-center justify-center px-2 py-1 shrink-0">
        <div className="relative">
          <BallSphere
            number={8}
            size={28}
            glow={p1OnEight || p2OnEight || isEightPotted}
          />
          {(p1OnEight || p2OnEight) && !isEightPotted && !gameOver && (
            <span className="absolute -top-1.5 -right-2 px-1 py-0.2 text-[7px] font-black uppercase rounded bg-amber-500 text-black animate-bounce shadow-xs">
              Target
            </span>
          )}
        </div>
        <span className="text-[9px] font-black uppercase tracking-wider text-foreground mt-0.5">
          8-Ball
        </span>
        <span className="text-[8px] font-mono text-foreground-muted">
          {totalPotted}/15 Sunk
        </span>
      </div>

      {/* ── PLAYER 2 (Right Side) ────────────────────────────────── */}
      <div
        className={`flex items-center gap-2.5 sm:gap-3.5 px-2.5 sm:px-3.5 py-1.5 rounded-xl border transition-all text-right ${
          currentPlayer === 2 && !gameOver
            ? "border-rose-500/60 bg-rose-500/10 shadow-md shadow-rose-500/10 ring-1 ring-rose-500/40"
            : winner === 2
            ? "border-emerald-500/60 bg-emerald-500/10"
            : "border-transparent bg-background/40"
        }`}
      >
        {/* Player info & ball rack */}
        <div className="flex flex-col gap-1 items-end">
          <div className="flex items-center gap-2">
            <span className="font-mono text-[11px] font-extrabold text-foreground-secondary mr-auto">
              {p2Count}/7
            </span>
            {currentPlayer === 2 && !gameOver && (
              <span className="rounded bg-rose-500/20 px-1.5 py-0.2 text-[9px] font-black uppercase tracking-wider text-rose-300 border border-rose-500/30 animate-pulse">
                Turn
              </span>
            )}
            <span
              className={`px-1.5 py-0.2 text-[9px] font-black uppercase tracking-wider rounded border ${
                player2.group === "solid"
                  ? "bg-amber-500/15 text-amber-300 border-amber-500/30"
                  : player2.group === "stripe"
                  ? "bg-blue-500/15 text-blue-300 border-blue-500/30"
                  : "bg-slate-800 text-slate-400 border-slate-700"
              }`}
            >
              {p2GroupText}
            </span>
            <span className="text-xs font-black tracking-tight text-foreground">
              Player 2
            </span>
          </div>

          {/* 7 Target ball sockets */}
          <div className="flex items-center gap-1 sm:gap-1.5 flex-row-reverse">
            {p2Targets.map((num) => {
              const isPotted = player2.pottedBalls.includes(num);
              return isPotted ? (
                <BallSphere key={num} number={num} size={22} />
              ) : (
                <div
                  key={num}
                  className="w-[22px] h-[22px] rounded-full border border-slate-700/60 bg-slate-800/40 shadow-inner flex items-center justify-center opacity-40 transition-all hover:opacity-60"
                  title={`Ball ${num} (${player2.group || "target"})`}
                >
                  <span className="text-[8px] font-black text-slate-400 select-none">
                    {player2.group ? num : "•"}
                  </span>
                </div>
              );
            })}
          </div>
        </div>

        {/* Avatar badge */}
        <div className="relative">
          <div
            className={`w-8 h-8 rounded-full flex items-center justify-center font-black text-xs transition-transform ${
              currentPlayer === 2 && !gameOver
                ? "bg-gradient-to-tr from-rose-600 to-pink-400 text-white shadow-md shadow-rose-500/30 scale-105"
                : "bg-slate-800 text-slate-300 border border-slate-700"
            }`}
          >
            P2
          </div>
          {currentPlayer === 2 && !gameOver && (
            <span className="absolute -top-1 -left-1 flex h-2.5 w-2.5">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-rose-400 opacity-75" />
              <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-rose-500" />
            </span>
          )}
        </div>
      </div>
    </header>
  );
}
