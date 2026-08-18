"use client";

import React, { useState, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useAuth } from "@/components/auth";
import { LoginModal } from "@/components/auth/LoginModal";
import { useChess } from "./useChess";
import { ChessBoard } from "./ChessBoard";
import { PlayerCard } from "./PlayerCard";
import { MoveHistory } from "./MoveHistory";

function formatEndReason(
  reason: string | null,
  isWinner: boolean,
  isDraw: boolean
): string {
  switch (reason) {
    case "checkmate":
      return isWinner
        ? "Victory by Checkmate! You delivered checkmate."
        : "Defeat by Checkmate — Your King was checkmated.";
    case "stalemate":
      return "Draw by Stalemate — No legal moves available and not in check.";
    case "threefold":
      return "Draw by Threefold Repetition — Same board position occurred 3 times.";
    case "insufficient":
      return "Draw by Insufficient Material — Neither side has enough material to checkmate.";
    case "resignation":
      return isWinner
        ? "Victory — Opponent resigned from the match."
        : "Defeat — You resigned from the match.";
    case "timeout":
      return isWinner
        ? "Victory on Time — Opponent ran out of time."
        : "Defeat on Time — Your turn timer expired.";
    case "disconnect":
      return isWinner
        ? "Victory — Opponent disconnected from the match."
        : "Defeat — Disconnected from the match.";
    case "draw":
      return "Draw — The match ended in a draw.";
    default:
      return isWinner
        ? "You won the game!"
        : isDraw
        ? "The game ended in a draw."
        : "Opponent won the game.";
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
            Standard rules • Online 2-player multiplayer • 60s per turn
          </p>
        </div>

        {/* ── LOBBY ─────────────────────────────────────────────── */}
        {screen === "lobby" && (
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            className="w-full max-w-md mx-auto space-y-4"
          >
            <div className="rounded-2xl border border-border bg-surface p-6 space-y-4 shadow-sm">
              <h2 className="text-lg font-bold text-foreground">Create a Room</h2>
              <p className="text-sm text-foreground-secondary">
                Start a new game and share the room code with your friend.
              </p>
              <button
                onClick={handleCreateRoom}
                className="w-full rounded-xl bg-gradient-to-r from-sky-500 to-blue-600 py-3 text-sm font-bold text-white hover:from-sky-600 hover:to-blue-700 hover:-translate-y-0.5 transition-all shadow-lg shadow-accent/25"
              >
                Create Room
              </button>
            </div>

            <div className="rounded-2xl border border-border bg-surface p-6 space-y-3 shadow-sm">
              <h2 className="text-lg font-bold text-foreground">Join a Room</h2>
              <div className="flex gap-2">
                <input
                  type="text"
                  value={joinInput}
                  onChange={(e) => setJoinInput(e.target.value.toUpperCase())}
                  onKeyDown={(e) => e.key === "Enter" && handleJoinRoom()}
                  placeholder="Room code..."
                  maxLength={6}
                  className="flex-1 rounded-xl border border-border bg-background px-4 py-2.5 text-sm text-foreground placeholder:text-foreground-muted focus:border-accent focus:outline-none uppercase font-mono tracking-widest"
                />
                <button
                  onClick={handleJoinRoom}
                  className="rounded-xl bg-surface-hover border border-border px-4 py-2.5 text-sm font-semibold text-foreground hover:bg-accent hover:text-white hover:border-accent transition-all"
                >
                  Join
                </button>
              </div>
              {joinError && <p className="text-sm text-red-500">{joinError}</p>}
            </div>
          </motion.div>
        )}

        {/* ── WAITING ─────────────────────────────────────────────── */}
        {screen === "waiting" && (
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="w-full max-w-md mx-auto text-center"
          >
            <div className="rounded-2xl border border-border bg-surface p-8 space-y-5 shadow-sm">
              <div className="h-12 w-12 rounded-full border-4 border-accent border-t-transparent animate-spin mx-auto" />
              <h2 className="text-xl font-bold text-foreground">
                {statusMsg || "Waiting for opponent..."}
              </h2>

              <div className="rounded-xl bg-background border border-border p-5 relative">
                <p className="text-xs text-foreground-muted mb-1">Room Code</p>
                <div className="flex items-center justify-center gap-3">
                  <p className="text-4xl font-extrabold text-accent font-mono tracking-widest">
                    {roomId}
                  </p>
                  <button
                    onClick={handleCopyCode}
                    className="p-2 rounded-lg bg-surface hover:bg-surface-hover text-foreground-secondary hover:text-foreground transition-colors border border-border shadow-sm"
                    title="Copy Room Code"
                  >
                    {copied ? (
                      <svg
                        xmlns="http://www.w3.org/2000/svg"
                        width="20"
                        height="20"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="2"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        className="text-green-500"
                      >
                        <polyline points="20 6 9 17 4 12"></polyline>
                      </svg>
                    ) : (
                      <svg
                        xmlns="http://www.w3.org/2000/svg"
                        width="20"
                        height="20"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="2"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      >
                        <rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect>
                        <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path>
                      </svg>
                    )}
                  </button>
                </div>
                <p className="text-xs text-foreground-muted mt-2">
                  Share with your friend
                </p>
              </div>

              <div className="space-y-1 text-sm text-foreground-secondary">
                {room?.players.map((p, i) => (
                  <div key={p.id} className="flex items-center justify-center gap-2">
                    <div className="h-2 w-2 rounded-full bg-green-500" />
                    <span className="font-semibold text-foreground">{p.username}</span>
                    <span
                      className={`text-xs font-bold ${
                        i === 0 ? "text-amber-500" : "text-slate-500"
                      }`}
                    >
                      ({i === 0 ? "White ⚪" : "Black ⚫"})
                    </span>
                  </div>
                ))}
              </div>

              <button
                onClick={leaveRoom}
                className="text-sm text-foreground-muted hover:text-red-500 transition-colors underline"
              >
                Cancel
              </button>
            </div>
          </motion.div>
        )}

        {/* ── PLAYING & FINISHED SCREENS ──────────────────────────── */}
        {(screen === "playing" || screen === "finished") && (
          <div className="w-full max-w-5xl grid grid-cols-1 lg:grid-cols-12 gap-5 items-start">
            {/* Main Left/Center Board Column */}
            <div className="lg:col-span-8 flex flex-col items-center space-y-3 w-full">
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
                  timeLeft={timeLeft}
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
                  timeLeft={timeLeft}
                  timerActive={timerActive}
                />
              </div>
            </div>

            {/* Right Column: Move History & Match Controls */}
            <div className="lg:col-span-4 flex flex-col space-y-4 w-full max-w-[540px] lg:max-w-none mx-auto self-stretch">
              {/* Turn Status Banner */}
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

              {/* Move History */}
              <div className="flex-1 min-h-[180px]">
                <MoveHistory moves={gameState?.moveHistory || []} />
              </div>

              {/* Actions Bar */}
              <div className="grid grid-cols-2 gap-3 pt-1">
                <button
                  onClick={() => setShowResignConfirm(true)}
                  disabled={screen === "finished"}
                  className="py-2.5 px-4 bg-surface hover:bg-red-500/10 hover:text-red-600 dark:hover:text-red-400 hover:border-red-500/40 text-foreground-secondary font-semibold rounded-xl border border-border transition-all text-xs flex items-center justify-center gap-1.5 disabled:opacity-40 disabled:pointer-events-none shadow-sm"
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

        {/* ── GAME OVER MODAL ─────────────────────────────────────── */}
        <AnimatePresence>
          {screen === "finished" && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm"
            >
              <motion.div
                initial={{ scale: 0.85, y: 20 }}
                animate={{ scale: 1, y: 0 }}
                exit={{ scale: 0.85, y: 20 }}
                className="bg-surface border border-border rounded-2xl p-6 sm:p-8 max-w-md w-full text-center space-y-6 shadow-2xl"
              >
                <div className="text-5xl">
                  {isWinner ? "🏆" : isDrawGame ? "🤝" : "💔"}
                </div>

                <div className="space-y-1">
                  <h2
                    className={`text-2xl font-extrabold ${
                      isWinner
                        ? "text-amber-500"
                        : isDrawGame
                        ? "text-foreground"
                        : "text-red-500"
                    }`}
                  >
                    {isWinner
                      ? "Victory!"
                      : isDrawGame
                      ? "Draw Game"
                      : "Defeat"}
                  </h2>
                  <p className="text-sm text-foreground-secondary font-medium max-w-xs mx-auto">
                    {formatEndReason(endReason, !!isWinner, !!isDrawGame)}
                  </p>
                </div>

                {/* Match Result Details Card */}
                <div className="p-4 bg-surface-hover/80 border border-border rounded-xl text-xs space-y-2 text-foreground-secondary">
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
                <div className="space-y-3 pt-2">
                  <button
                    onClick={rematch}
                    className="w-full py-3.5 px-4 bg-gradient-to-r from-sky-500 to-blue-600 hover:from-sky-600 hover:to-blue-700 text-white font-bold rounded-xl shadow-lg shadow-accent/25 transition-all hover:scale-[1.02] active:scale-[0.98] flex items-center justify-center gap-2"
                  >
                    <span>🔄</span>
                    <span>Rematch (Switch Colors)</span>
                  </button>

                  <button
                    onClick={leaveRoom}
                    className="w-full py-3 px-4 bg-surface hover:bg-surface-hover text-foreground font-semibold rounded-xl border border-border transition-all text-xs"
                  >
                    Back to Lobby
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
