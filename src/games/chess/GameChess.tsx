"use client";

import React, { useState, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useAuth } from "@/components/auth";
import { LoginModal } from "@/components/auth/LoginModal";
import { useChess } from "./useChess";
import { ChessBoard } from "./ChessBoard";
import { PlayerCard } from "./PlayerCard";
import { MoveHistory } from "./MoveHistory";
import { HeadToHeadBadge, GameLobby1v1 } from "@/components/shared";

function formatEndReason(
  reason: string | null,
  isWinner: boolean,
  isDraw: boolean
): string {
  switch (reason) {
    case "checkmate":
      return isWinner
        ? "🏆 Victory by Checkmate! You delivered checkmate."
        : "💥 Defeat by Checkmate — Your King was checkmated.";
    case "stalemate":
      return "🤝 Draw by Stalemate — No legal moves available.";
    case "threefold":
      return "🤝 Draw by Threefold Repetition — Position repeated 3 times.";
    case "insufficient":
      return "🤝 Draw by Insufficient Material — Neither side has mating material.";
    case "resignation":
      return isWinner
        ? "🏆 Victory — Opponent resigned from the match."
        : "🏳️ Defeat — You resigned from the match.";
    case "timeout":
      return isWinner
        ? "⌛ Victory on Time — Opponent ran out of time."
        : "⌛ Defeat on Time — Turn timer expired.";
    case "disconnect":
      return isWinner
        ? "🏃 Victory — Opponent disconnected from the match."
        : "🚪 Defeat — You disconnected from the match.";
    case "draw":
      return "🤝 The match ended in a draw.";
    default:
      return isWinner
        ? "🏆 You won the game!"
        : isDraw
        ? "🤝 The game ended in a draw."
        : "😔 Opponent won the game.";
  }
}

export function GameChess() {
  const { user } = useAuth();
  const [showLogin, setShowLogin] = useState(false);
  const [joinInput, setJoinInput] = useState("");
  const [copied, setCopied] = useState(false);
  const [showResignConfirm, setShowResignConfirm] = useState(false);

  const {
    screen,
    room,
    roomId,
    playerId,
    myColor,
    myInfo,
    opponentInfo,
    orientation,
    isMyTurn,
    fen,
    gameState,
    lastMove,
    capturedPieces,
    winner,
    endReason,
    error,
    joinError,
    statusMsg,
    whiteTime,
    blackTime,
    myTime,
    opponentTime,
    timeLeft,
    timerActive,
    createRoom,
    joinRoom,
    leaveRoom,
    onPieceDrop,
    getPossibleMoves,
    resign,
    rematch,
  } = useChess(user?.username || "Guest");

  const handleCreateRoom = useCallback(() => {
    if (!user) {
      setShowLogin(true);
      return;
    }
    createRoom();
  }, [user, createRoom]);

  const handleJoinRoom = useCallback(() => {
    if (!user) {
      setShowLogin(true);
      return;
    }
    joinRoom(joinInput);
  }, [user, joinInput, joinRoom]);

  const handleCopyCode = useCallback(() => {
    if (!roomId) return;
    navigator.clipboard.writeText(roomId);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }, [roomId]);

  const handleConfirmResign = useCallback(() => {
    setShowResignConfirm(false);
    resign();
  }, [resign]);

  // Determine opponent player info & my info
  const whitePlayer = gameState?.whitePlayer;
  const blackPlayer = gameState?.blackPlayer;
  const isWhite = myColor === "w";

  // Check if I won or lost
  const isWinner = winner && myColor && winner === myColor;
  const isLoser = winner && myColor && winner !== "draw" && winner !== myColor;
  const isDrawGame = winner === "draw";

  return (
    <>
      {showLogin && (
        <LoginModal
          title="Enter your username"
          subtitle="You need a username to play online Chess"
          onSuccess={() => setShowLogin(false)}
          onClose={() => setShowLogin(false)}
        />
      )}

      <div className="flex flex-col items-center gap-6 mx-auto max-w-5xl">
        {/* Header */}
        <div className="w-full text-center sm:text-left">
          <h1 className="text-3xl sm:text-4xl font-extrabold text-foreground">Chess</h1>
          <p className="text-sm text-foreground-secondary mt-0.5">
            Standard rules • Online 2-player multiplayer • 15:00 clock per player
          </p>
        </div>

        {/* ── LOBBY / WAITING ─────────────────────────────────────── */}
        {(screen === "lobby" || screen === "waiting") && (
          <GameLobby1v1
            screen={screen}
            roomId={roomId}
            players={room?.players || []}
            statusMsg={statusMsg || "Waiting for opponent..."}
            joinError={joinError}
            copied={copied}
            onCreateRoom={handleCreateRoom}
            onJoinRoom={(code) => {
              if (!user) {
                setShowLogin(true);
                return;
              }
              joinRoom(code);
            }}
            onCopyRoomCode={handleCopyCode}
            onLeaveRoom={leaveRoom}
            renderPlayerExtra={(_p, i) => (
              <span
                className={`text-xs font-bold ${
                  i === 0 ? "text-amber-500" : "text-slate-500"
                }`}
              >
                ({i === 0 ? "White ⚪" : "Black ⚫"})
              </span>
            )}
          />
        )}

        {/* ── PLAYING & FINISHED SCREENS ──────────────────────────── */}
        {(screen === "playing" || screen === "finished") && (
          <div className="w-full max-w-5xl grid grid-cols-1 lg:grid-cols-12 gap-5 items-start">
            {/* Main Left/Center Board Column */}
            <div className="lg:col-span-8 flex flex-col items-center space-y-3 w-full">
              {/* Rival Badge if 2 players */}
              {user?.username && (
                <div className="w-full max-w-[540px] flex justify-between items-center px-1">
                  <span className="text-xs font-bold uppercase tracking-wider text-foreground-muted">Room: {roomId}</span>
                  <HeadToHeadBadge
                    player1={user.username}
                    player2={
                      isWhite
                        ? blackPlayer?.username || opponentInfo?.username || ""
                        : whitePlayer?.username || opponentInfo?.username || ""
                    }
                    gameType="chess"
                    compact
                  />
                </div>
              )}

              {/* Top: Opponent Card */}
              <div className="w-full max-w-[540px]">
                <PlayerCard
                  username={
                    isWhite
                      ? blackPlayer?.username || opponentInfo?.username || "Opponent"
                      : whitePlayer?.username || opponentInfo?.username || "Opponent"
                  }
                  color={isWhite ? "b" : "w"}
                  isCurrentTurn={gameState?.currentTurn === (isWhite ? "b" : "w")}
                  isMe={false}
                  capturedPieces={
                    isWhite
                      ? capturedPieces.capturedByBlack
                      : capturedPieces.capturedByWhite
                  }
                  timeLeft={opponentTime}
                  timerActive={timerActive}
                />
              </div>

              {/* Interactive Chessboard */}
              <ChessBoard
                fen={fen}
                orientation={orientation}
                isMyTurn={isMyTurn}
                myColor={myColor}
                lastMove={lastMove}
                onPieceDrop={onPieceDrop}
                getPossibleMoves={getPossibleMoves}
                disabled={screen === "finished"}
              />

              {/* Bottom: Local Player Card */}
              <div className="w-full max-w-[540px]">
                <PlayerCard
                  username={myInfo?.username || user?.username || "You"}
                  avatarUrl={user?.avatarUrl || null}
                  color={myColor || "w"}
                  isCurrentTurn={isMyTurn}
                  isMe={true}
                  capturedPieces={
                    isWhite
                      ? capturedPieces.capturedByWhite
                      : capturedPieces.capturedByBlack
                  }
                  timeLeft={myTime}
                  timerActive={timerActive}
                />
              </div>
            </div>

            {/* Right Column: Move History & Match Controls */}
            <div className="lg:col-span-4 flex flex-col space-y-4 w-full max-w-[540px] lg:max-w-none mx-auto self-stretch">
              {/* Turn Status Banner / Game Over Result Card */}
              {screen === "finished" ? (
                <motion.div
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className={`p-5 rounded-2xl border text-center space-y-4 shadow-md ${
                    isWinner
                      ? "border-emerald-500/40 bg-emerald-500/10 dark:bg-emerald-950/30"
                      : isDrawGame
                      ? "border-border bg-surface"
                      : "border-rose-500/40 bg-rose-500/10 dark:bg-rose-950/30"
                  }`}
                >
                  <div className="text-4xl">
                    {isWinner ? "🏆" : isDrawGame ? "🤝" : "💔"}
                  </div>
                  <div>
                    <h2
                      className={`text-2xl font-extrabold ${
                        isWinner
                          ? "text-emerald-600 dark:text-emerald-400"
                          : isDrawGame
                          ? "text-foreground"
                          : "text-rose-600 dark:text-rose-400"
                      }`}
                    >
                      {isWinner ? "Victory!" : isDrawGame ? "Draw Game" : "Defeat"}
                    </h2>
                    <p className="text-xs text-foreground-secondary font-medium mt-1.5 leading-relaxed">
                      {formatEndReason(endReason, !!isWinner, !!isDrawGame)}
                    </p>
                  </div>

                  {/* Match Result Details Card */}
                  <div className="p-3 bg-surface/80 dark:bg-black/20 border border-border rounded-xl text-xs space-y-1.5 text-foreground-secondary text-left">
                    <div className="flex justify-between">
                      <span>White Player:</span>
                      <span className="font-semibold text-foreground">
                        {whitePlayer?.username || "Player 1"}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span>Black Player:</span>
                      <span className="font-semibold text-foreground">
                        {blackPlayer?.username || "Player 2"}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span>Total Moves:</span>
                      <span className="font-semibold text-foreground">
                        {gameState?.moveHistory.length || 0}
                      </span>
                    </div>
                  </div>

                  {/* Action Buttons */}
                  <div className="space-y-2 pt-1">
                    <button
                      onClick={rematch}
                      className="w-full py-3 px-4 bg-gradient-to-r from-sky-500 to-blue-600 hover:from-sky-600 hover:to-blue-700 text-white font-bold rounded-xl shadow-md transition-all hover:scale-[1.02] active:scale-[0.98] text-xs flex items-center justify-center gap-2"
                    >
                      <span>🔄</span>
                      <span>Rematch (Switch Colors)</span>
                    </button>

                    <button
                      onClick={leaveRoom}
                      className="w-full py-2.5 px-4 bg-surface hover:bg-surface-hover text-foreground font-semibold rounded-xl border border-border transition-all text-xs flex items-center justify-center gap-1.5"
                    >
                      <span>🚪</span>
                      <span>Back to Lobby</span>
                    </button>
                  </div>
                </motion.div>
              ) : (
                <div
                  className={`p-4 rounded-2xl border text-center transition-all ${
                    gameState?.isCheck && !gameState?.isCheckmate && isMyTurn
                      ? "bg-red-500/10 border-red-500/40 text-red-600 dark:text-red-400 shadow-sm"
                      : isMyTurn
                      ? "bg-emerald-500/10 border-emerald-500/40 text-emerald-600 dark:text-emerald-400 shadow-sm"
                      : "bg-surface border-border text-foreground-secondary"
                  }`}
                >
                  <div className="text-xs uppercase tracking-wider font-semibold text-foreground-muted">
                    Current Status
                  </div>
                  <div className="text-base font-bold mt-1">
                    {isMyTurn ? (
                      gameState?.isCheck && !gameState?.isCheckmate ? (
                        <span className="flex items-center justify-center gap-2 text-red-600 dark:text-red-400">
                          <span className="inline-block w-2.5 h-2.5 rounded-full bg-red-500 animate-ping" />
                          Your Turn — In Check! ⚠️
                        </span>
                      ) : (
                        <span className="flex items-center justify-center gap-2 text-emerald-600 dark:text-emerald-400">
                          <span className="inline-block w-2.5 h-2.5 rounded-full bg-emerald-500 animate-ping" />
                          Your Turn — Make a Move
                        </span>
                      )
                    ) : gameState?.isCheck && !gameState?.isCheckmate ? (
                      <span className="text-foreground-secondary flex items-center justify-center gap-1.5">
                        Waiting for Opponent (In Check ⚠️)
                      </span>
                    ) : (
                      <span className="text-foreground-secondary">
                        Waiting for Opponent...
                      </span>
                    )}
                  </div>
                </div>
              )}

              {/* Move History */}
              <div className="flex-1 min-h-[180px]">
                <MoveHistory moves={gameState?.moveHistory || []} />
              </div>

              {/* Actions Bar (Playing Only) */}
              {screen === "playing" && (
                <div className="grid grid-cols-2 gap-3 pt-1">
                  <button
                    onClick={() => setShowResignConfirm(true)}
                    className="py-2.5 px-4 bg-surface hover:bg-red-500/10 hover:text-red-600 dark:hover:text-red-400 hover:border-red-500/40 text-foreground-secondary font-semibold rounded-xl border border-border transition-all text-xs flex items-center justify-center gap-1.5 shadow-sm"
                  >
                    <span>🏳️</span>
                    <span>Resign</span>
                  </button>

                  <button
                    onClick={leaveRoom}
                    className="py-2.5 px-4 bg-surface hover:bg-surface-hover text-foreground font-semibold rounded-xl border border-border transition-all text-xs flex items-center justify-center gap-1.5 shadow-sm"
                  >
                    <span>🚪</span>
                    <span>Leave Game</span>
                  </button>
                </div>
              )}
            </div>
          </div>
        )}

        {/* ── RESIGN CONFIRMATION MODAL ───────────────────────────── */}
        <AnimatePresence>
          {showResignConfirm && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm"
            >
              <motion.div
                initial={{ scale: 0.9, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                exit={{ scale: 0.9, opacity: 0 }}
                className="bg-surface border border-border rounded-2xl p-6 max-w-sm w-full space-y-4 text-center shadow-2xl"
              >
                <div className="text-4xl">🏳️</div>
                <h3 className="text-lg font-bold text-foreground">
                  Resign the match?
                </h3>
                <p className="text-xs text-foreground-secondary">
                  Resigning will concede the victory to your opponent immediately.
                </p>
                <div className="grid grid-cols-2 gap-3 pt-2">
                  <button
                    onClick={() => setShowResignConfirm(false)}
                    className="py-2.5 px-4 bg-surface hover:bg-surface-hover border border-border text-foreground text-xs font-semibold rounded-xl transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleConfirmResign}
                    className="py-2.5 px-4 bg-red-600 hover:bg-red-700 text-white text-xs font-semibold rounded-xl shadow-lg shadow-red-600/30 transition-all"
                  >
                    Yes, Resign
                  </button>
                </div>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </>
  );
}
