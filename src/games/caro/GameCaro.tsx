"use client";

import React, { useState } from "react";
import { motion } from "framer-motion";
import { CaroBoard } from "./CaroBoard";
import { LoginModal } from "@/components/auth/LoginModal";
import { useAuth } from "@/components/auth";
import { HeadToHeadBadge } from "@/components/shared/HeadToHeadBadge";
import { GameLobby1v1 } from "@/components/shared";
import {
  useCaroOnline,
  CARO_GRID_SIZE,
  CARO_TURN_SECONDS,
} from "./useCaroOnline";
import type { Player } from "./types";

export function GameCaro() {
  const { user } = useAuth();
  const [showLogin, setShowLogin] = useState(false);

  const caro = useCaroOnline({ username: user?.username || "" });
  const {
    screen,
    roomId,
    players,
    joinError,
    setJoinError,
    statusMsg,
    copied,
    copyRoomCode,
    board,
    currentTurn,
    mySymbol,
    isMyTurn,
    winningCells,
    lastMove,
    moveCount,
    handleCellClick,
    timeLeft,
    timerPercent,
    timerColor,
    timerActive,
    winnerMsg,
    handleCreateRoom,
    handleJoinRoom,
    handleLeaveRoom,
    handleRematch,
  } = caro;

  const onProtectedCreateRoom = () => {
    if (!user) {
      setShowLogin(true);
      return;
    }
    handleCreateRoom();
  };

  const onProtectedJoinRoom = (code: string) => {
    if (!user) {
      setShowLogin(true);
      return;
    }
    if (!code) {
      setJoinError("Please enter a room code.");
      return;
    }
    setJoinError(null);
    handleJoinRoom(code);
  };

  return (
    <>
      {showLogin && (
        <LoginModal
          title="Enter your username"
          subtitle="You need a username to play online Caro"
          onSuccess={() => setShowLogin(false)}
          onClose={() => setShowLogin(false)}
        />
      )}

      <div className="flex flex-col items-center gap-6 mx-auto max-w-5xl">
        {/* Header */}
        <div className="w-full text-center sm:text-left">
          <h1 className="text-3xl sm:text-4xl font-extrabold text-foreground">Caro</h1>
          <p className="text-sm text-foreground-secondary mt-0.5">
            5 in a row to win — online multiplayer • {CARO_TURN_SECONDS}s per turn
          </p>
        </div>

        {/* ── LOBBY / WAITING ─────────────────────────────────────── */}
        {(screen === "lobby" || screen === "waiting") && (
          <GameLobby1v1
            screen={screen}
            roomId={roomId}
            players={players}
            statusMsg={statusMsg}
            joinError={joinError}
            copied={copied}
            onCreateRoom={onProtectedCreateRoom}
            onJoinRoom={onProtectedJoinRoom}
            onCopyRoomCode={copyRoomCode}
            onLeaveRoom={handleLeaveRoom}
            renderPlayerExtra={(_p, i) => (
              <span
                className={`text-xs font-bold ${
                  i === 0 ? "text-red-400" : "text-blue-400"
                }`}
              >
                ({i === 0 ? "X" : "O"})
              </span>
            )}
          />
        )}

        {/* ── PLAYING / FINISHED ─────────────────────────────────── */}
        {(screen === "playing" || screen === "finished") && (
          <div className="w-full flex flex-col lg:flex-row items-start gap-6">
            {/* Board (Always completely visible!) */}
            <div className="flex-1 flex justify-center relative">
              <CaroBoard
                board={board}
                gridSize={CARO_GRID_SIZE}
                winningCells={winningCells}
                lastMove={
                  lastMove
                    ? {
                        row: lastMove.row,
                        col: lastMove.col,
                        player: currentTurn === "X" ? "O" : "X",
                        moveNumber: moveCount,
                      }
                    : null
                }
                onCellClick={handleCellClick}
                disabled={!isMyTurn || screen === "finished"}
              />
            </div>

            {/* Side panel */}
            <div className="w-full lg:w-72 shrink-0 space-y-4">
              {/* Game Over / Result Card inside Side Panel */}
              {screen === "finished" && (
                <motion.div
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className={`rounded-2xl border p-5 text-center space-y-4 shadow-md ${
                    winnerMsg.includes("win") || winnerMsg.includes("🏆")
                      ? "border-emerald-500/40 bg-emerald-500/10 dark:bg-emerald-950/30"
                      : winnerMsg.includes("draw") || winnerMsg.includes("🤝")
                      ? "border-border bg-surface"
                      : "border-rose-500/40 bg-rose-500/10 dark:bg-rose-950/30"
                  }`}
                >
                  <div className="text-4xl">
                    {winnerMsg.includes("win") || winnerMsg.includes("🏆")
                      ? "🏆"
                      : winnerMsg.includes("draw") || winnerMsg.includes("🤝")
                      ? "🤝"
                      : "💔"}
                  </div>
                  <div>
                    <h3
                      className={`text-xl font-extrabold ${
                        winnerMsg.includes("win") || winnerMsg.includes("🏆")
                          ? "text-emerald-600 dark:text-emerald-400"
                          : winnerMsg.includes("draw") || winnerMsg.includes("🤝")
                          ? "text-foreground"
                          : "text-rose-600 dark:text-rose-400"
                      }`}
                    >
                      {winnerMsg.includes("win") || winnerMsg.includes("🏆")
                        ? "Victory!"
                        : winnerMsg.includes("draw") || winnerMsg.includes("🤝")
                        ? "Draw Game"
                        : "Defeat"}
                    </h3>
                    <p className="text-sm font-medium text-foreground-secondary mt-1">
                      {winnerMsg}
                    </p>
                  </div>

                  <div className="flex flex-col gap-2 pt-1">
                    <button
                      onClick={handleRematch}
                      disabled={players.length < 2}
                      className={`w-full rounded-xl py-3 text-sm font-bold transition-all shadow-md ${
                        players.length < 2
                          ? "bg-surface-hover text-foreground-muted cursor-not-allowed border border-border"
                          : "bg-gradient-to-r from-sky-500 to-blue-600 text-white hover:from-sky-600 hover:to-blue-700 hover:scale-[1.02] active:scale-[0.98]"
                      }`}
                    >
                      {players.length < 2 ? "Waiting for opponent..." : "🔄 Rematch"}
                    </button>
                    <button
                      onClick={handleLeaveRoom}
                      className="w-full rounded-xl border border-border bg-surface hover:bg-surface-hover py-2.5 text-xs font-semibold text-foreground-secondary transition-all"
                    >
                      Leave Room
                    </button>
                  </div>
                </motion.div>
              )}

              {/* Timer */}
              {timerActive && screen === "playing" && (
                <div
                  className={`rounded-xl border p-4 text-center transition-all ${
                    isMyTurn ? "border-accent/50 bg-accent/5" : "border-border bg-surface"
                  }`}
                >
                  <p className="text-xs text-foreground-muted uppercase tracking-wider mb-2">
                    {isMyTurn ? "Your turn" : "Opponent's turn"}
                  </p>
                  <p
                    className={`text-4xl font-extrabold tabular-nums ${
                      timeLeft <= 5 ? "text-red-500 animate-pulse" : "text-foreground"
                    }`}
                  >
                    {timeLeft}s
                  </p>
                  <div className="mt-2 h-1.5 rounded-full bg-border overflow-hidden">
                    <motion.div
                      className={`h-full rounded-full transition-colors ${timerColor}`}
                      style={{ width: `${timerPercent}%` }}
                      transition={{ duration: 0.5 }}
                    />
                  </div>
                </div>
              )}

              {/* Waiting for first move */}
              {!timerActive && screen === "playing" && (
                <div className="rounded-xl border border-border bg-surface p-4 text-center">
                  <p className="text-sm text-foreground-muted">
                    {isMyTurn ? "🎯 Make the first move!" : "⏳ Waiting for first move..."}
                  </p>
                </div>
              )}

              {/* Room + players */}
              <div className="rounded-xl border border-border bg-surface p-4 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-semibold text-foreground-muted uppercase tracking-wider">
                    Room
                  </span>
                  <span className="font-mono font-bold text-accent text-sm">{roomId}</span>
                </div>

                {user?.username && players.length >= 2 && (
                  <div className="pt-1 pb-1 flex justify-center">
                    <HeadToHeadBadge
                      player1={user.username}
                      player2={
                        players.find((p) => p.username !== user.username)?.username || ""
                      }
                      gameType="caro"
                      compact
                    />
                  </div>
                )}

                {players.map((p, i) => {
                  const symbol: Player = i === 0 ? "X" : "O";
                  const isMySymbol = symbol === mySymbol;
                  const isTurn = currentTurn === symbol && screen === "playing";
                  return (
                    <div
                      key={p.id}
                      className={`flex items-center gap-3 rounded-lg px-3 py-2 transition-all ${
                        isTurn
                          ? "bg-accent/10 border border-accent/30"
                          : "bg-background"
                      }`}
                    >
                      <span
                        className={`text-lg font-extrabold ${
                          symbol === "X" ? "text-red-400" : "text-blue-400"
                        }`}
                      >
                        {symbol}
                      </span>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-semibold text-foreground truncate">
                          {p.username}{" "}
                          {isMySymbol && (
                            <span className="text-xs text-foreground-muted font-normal">
                              (you)
                            </span>
                          )}
                        </p>
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Moves Counter */}
              <div className="rounded-xl border border-border bg-surface p-4">
                <p className="text-xs text-foreground-muted uppercase tracking-wider mb-1">
                  Moves
                </p>
                <p className="text-2xl font-extrabold text-foreground">{moveCount}</p>
              </div>

              {screen === "playing" && (
                <button
                  onClick={handleLeaveRoom}
                  className="w-full rounded-xl border border-border py-2 text-sm text-foreground-muted hover:border-red-400 hover:text-red-400 transition-all"
                >
                  Leave Room
                </button>
              )}
            </div>
          </div>
        )}
      </div>
    </>
  );
}
