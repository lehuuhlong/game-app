"use client";

import { BallSphere } from "./BallSphere";
import type { PlayerState } from "../useBilliardsRules";

interface PottedBallsTrayProps {
  player1: PlayerState;
  player2: PlayerState;
  currentPlayer: 1 | 2;
  gameOver: boolean;
  winner: 1 | 2 | null;
  height?: number;
}

export function PottedBallsTray({
  player1,
  player2,
  currentPlayer,
  gameOver,
  winner,
  height = 500,
}: PottedBallsTrayProps) {
  const totalPotted = player1.pottedBalls.length + player2.pottedBalls.length;

  const p1GroupText =
    player1.group === "solid" ? "Solids" : player1.group === "stripe" ? "Stripes" : "Open";
  const p2GroupText =
    player2.group === "solid" ? "Solids" : player2.group === "stripe" ? "Stripes" : "Open";

  // Check 8-ball status: is it in player1 or player2's potted list?
  const isEightPotted = player1.pottedBalls.includes(8) || player2.pottedBalls.includes(8);

  return (
    <aside
      className="shrink-0 flex flex-col justify-between rounded-2xl border border-border/80 bg-surface/95 dark:bg-slate-900/95 p-3 shadow-xl backdrop-blur-md select-none transition-all w-28 sm:w-32 lg:w-36 overflow-hidden"
      style={{ height }}
      aria-label="Pocketed billiard balls tray"
    >
      {/* ── Top: Header & Total Count ────────────────────────────── */}
      <div className="flex items-center justify-between border-b border-border/60 pb-2">
        <div className="flex items-center gap-1.5">
          <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
          <span className="text-[10px] font-black uppercase tracking-widest text-foreground-muted">
            Pocketed
          </span>
        </div>
        <span className="font-mono text-xs font-black text-foreground-secondary">
          {totalPotted}/15
        </span>
      </div>

      {/* ── Middle: Player 1 & Player 2 Ball Sockets ─────────────── */}
      <div className="flex-1 flex flex-col justify-around py-1 gap-2 overflow-y-auto custom-scrollbar">
        {/* ── PLAYER 1 COMPARTMENT ── */}
        <div
          className={`rounded-xl border p-2 transition-all ${
            currentPlayer === 1 && !gameOver
              ? "border-blue-500/50 bg-blue-500/10 shadow-sm ring-1 ring-blue-500/30"
              : winner === 1
              ? "border-emerald-500/50 bg-emerald-500/10"
              : "border-border/60 bg-background/50"
          }`}
        >
          <div className="flex items-center justify-between mb-1.5">
            <div className="flex items-center gap-1.5">
              <span className="text-[10px] font-black uppercase tracking-wider text-blue-400">
                P1 • {p1GroupText}
              </span>
              {currentPlayer === 1 && !gameOver && (
                <span className="rounded bg-blue-500/20 px-1 py-0.2 text-[8px] font-black uppercase tracking-wider text-blue-400 border border-blue-500/30 animate-pulse">
                  Turn
                </span>
              )}
            </div>
            <span className="font-mono text-[10px] font-bold text-foreground-muted">
              {player1.pottedBalls.filter((n: number) => n !== 8).length}/7
            </span>
          </div>

          {/* Sunk balls grid (wells) */}
          <div className="grid grid-cols-3 gap-1.5 justify-items-center">
            {player1.pottedBalls.length === 0 ? (
              <div className="col-span-3 py-2 text-center text-[10px] font-medium text-foreground-muted/60 italic">
                Waiting...
              </div>
            ) : (
              player1.pottedBalls.map((num: number) => (
                <BallSphere key={num} number={num} size={24} />
              ))
            )}
          </div>
        </div>

        {/* Subtle separator */}
        <div className="h-px bg-border/50 w-full" />

        {/* ── PLAYER 2 COMPARTMENT ── */}
        <div
          className={`rounded-xl border p-2 transition-all ${
            currentPlayer === 2 && !gameOver
              ? "border-rose-500/50 bg-rose-500/10 shadow-sm ring-1 ring-rose-500/30"
              : winner === 2
              ? "border-emerald-500/50 bg-emerald-500/10"
              : "border-border/60 bg-background/50"
          }`}
        >
          <div className="flex items-center justify-between mb-1.5">
            <div className="flex items-center gap-1.5">
              <span className="text-[10px] font-black uppercase tracking-wider text-rose-400">
                P2 • {p2GroupText}
              </span>
              {currentPlayer === 2 && !gameOver && (
                <span className="rounded bg-rose-500/20 px-1 py-0.2 text-[8px] font-black uppercase tracking-wider text-rose-400 border border-rose-500/30 animate-pulse">
                  Turn
                </span>
              )}
            </div>
            <span className="font-mono text-[10px] font-bold text-foreground-muted">
              {player2.pottedBalls.filter((n: number) => n !== 8).length}/7
            </span>
          </div>

          {/* Sunk balls grid (wells) */}
          <div className="grid grid-cols-3 gap-1.5 justify-items-center">
            {player2.pottedBalls.length === 0 ? (
              <div className="col-span-3 py-2 text-center text-[10px] font-medium text-foreground-muted/60 italic">
                Waiting...
              </div>
            ) : (
              player2.pottedBalls.map((num: number) => (
                <BallSphere key={num} number={num} size={24} />
              ))
            )}
          </div>
        </div>
      </div>

      {/* ── Bottom: 8-Ball Target Status ─────────────────────────── */}
      <div className="border-t border-border/60 pt-2 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <BallSphere number={8} size={24} glow={isEightPotted} />
          <div className="flex flex-col">
            <span className="text-[9px] font-black uppercase tracking-wider text-foreground">
              8-Ball
            </span>
            <span className="text-[8px] font-medium text-foreground-muted">
              {isEightPotted ? (gameOver ? "Potted!" : "Foul!") : "Final Target"}
            </span>
          </div>
        </div>
      </div>
    </aside>
  );
}
