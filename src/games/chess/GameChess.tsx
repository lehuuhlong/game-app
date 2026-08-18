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
    <div className="min-h-[calc(100vh-4rem)] flex flex-col items-center justify-center p-3 sm:p-6 text-slate-100 relative">
      {/* ── LOBBY SCREEN ────────────────────────────────────────── */}
      {screen === "lobby" && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="w-full max-w-md bg-slate-900/90 border border-slate-800/80 rounded-2xl p-6 sm:p-8 shadow-2xl backdrop-blur-xl space-y-6"
        >
          <div className="text-center space-y-2">
            <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-gradient-to-tr from-amber-500/20 to-amber-400/10 border border-amber-500/30 text-3xl shadow-lg mb-2">
              ♟️
            </div>
            <h1 className="text-2xl sm:text-3xl font-extrabold bg-gradient-to-r from-amber-200 via-slate-100 to-amber-300 bg-clip-text text-transparent">
              Chess Multiplayer
            </h1>
            <p className="text-sm text-slate-400">
              Real-time 2-player grandmaster chess with FEN synchronization
            </p>
          </div>

          {/* Action Buttons */}
          <div className="space-y-4 pt-2">
            <button
              onClick={handleCreateRoom}
              className="w-full py-3.5 px-4 bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-slate-950 font-bold rounded-xl shadow-lg shadow-amber-500/20 transition-all hover:scale-[1.02] active:scale-[0.98] flex items-center justify-center gap-2"
            >
              <span>👑</span>
              <span>Create New Game</span>
            </button>

            <div className="relative flex items-center justify-center">
              <div className="border-t border-slate-800 w-full" />
              <span className="bg-slate-900 px-3 text-xs uppercase tracking-wider text-slate-500 font-semibold absolute">
                Or Join Room
              </span>
            </div>

            <div className="space-y-2">
              <div className="flex gap-2">
                <input
                  type="text"
                  value={joinInput}
                  onChange={(e) => setJoinInput(e.target.value.toUpperCase())}
                  placeholder="ENTER 6-DIGIT CODE"
                  maxLength={8}
                  className="flex-1 bg-slate-950/80 border border-slate-800 focus:border-amber-500/60 focus:ring-2 focus:ring-amber-500/20 rounded-xl px-4 py-3 text-center font-mono font-bold tracking-widest text-slate-100 placeholder:text-slate-600 outline-none uppercase transition-all"
                  onKeyDown={(e) => e.key === "Enter" && handleJoinRoom()}
                />
                <button
                  onClick={handleJoinRoom}
                  className="py-3 px-5 bg-slate-800 hover:bg-slate-700 text-slate-200 font-bold rounded-xl border border-slate-700 transition-all hover:scale-[1.02] active:scale-[0.98]"
                >
                  Join
                </button>
              </div>

              {joinError && (
                <p className="text-xs text-red-400 text-center font-medium bg-red-950/40 border border-red-500/30 rounded-lg p-2">
                  {joinError}
                </p>
              )}
            </div>
          </div>

          {/* Quick Rules / Features Card */}
          <div className="p-4 bg-slate-950/50 border border-slate-800/60 rounded-xl space-y-2 text-xs text-slate-400">
            <div className="font-semibold text-slate-300 flex items-center gap-1.5">
              <span>⚡</span>
              <span>Match Details:</span>
            </div>
            <ul className="list-disc list-inside space-y-1 text-slate-400 pl-1">
              <li>Standard Chess rules validated via chess.js</li>
              <li>Board automatically flips to match your color</li>
              <li>60-second turn timer per move</li>
              <li>Server-authoritative checkmate & draw detection</li>
            </ul>
          </div>
        </motion.div>
      )}

      {/* ── WAITING SCREEN ──────────────────────────────────────── */}
      {screen === "waiting" && (
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          className="w-full max-w-md bg-slate-900/90 border border-slate-800 rounded-2xl p-6 sm:p-8 shadow-2xl backdrop-blur-xl text-center space-y-6"
        >
          <div className="relative mx-auto w-16 h-16 flex items-center justify-center">
            <div className="absolute inset-0 rounded-full bg-amber-500/20 animate-ping" />
            <div className="w-14 h-14 rounded-full bg-gradient-to-tr from-amber-500 to-amber-600 flex items-center justify-center text-2xl shadow-lg text-slate-950 font-bold">
              ♟️
            </div>
          </div>

          <div className="space-y-1">
            <h2 className="text-xl font-bold text-slate-100">Room Created!</h2>
            <p className="text-xs text-slate-400">{statusMsg}</p>
          </div>

          {/* Room Code Display */}
          <div className="p-4 bg-slate-950/80 border border-slate-800 rounded-xl space-y-2">
            <span className="text-xs uppercase tracking-wider text-slate-500 font-semibold">
              Share Room Code
            </span>
            <div className="flex items-center justify-center gap-3">
              <span className="text-3xl font-mono font-extrabold tracking-widest text-amber-400 select-all">
                {roomId}
              </span>
            </div>
          </div>

          <div className="space-y-3">
            <button
              onClick={handleCopyCode}
              className="w-full py-3 px-4 bg-slate-800 hover:bg-slate-700 text-slate-200 font-semibold rounded-xl border border-slate-700 transition-all flex items-center justify-center gap-2"
            >
              <span>{copied ? "✓" : "📋"}</span>
              <span>{copied ? "Copied to Clipboard!" : "Copy Code"}</span>
            </button>

            <button
              onClick={leaveRoom}
              className="w-full py-2.5 px-4 text-xs font-semibold text-slate-400 hover:text-slate-200 hover:bg-slate-800/40 rounded-xl transition-colors"
            >
              Cancel & Leave
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

            {/* Check Warning Banner */}
            {gameState?.isCheck && !gameState?.isCheckmate && (
              <motion.div
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                className="w-full max-w-[540px] px-4 py-2 bg-gradient-to-r from-red-950/80 via-red-900/60 to-red-950/80 border border-red-500/50 rounded-xl text-center shadow-lg"
              >
                <span className="text-xs font-bold text-red-300 uppercase tracking-wider animate-pulse flex items-center justify-center gap-1.5">
                  <span>⚠️</span>
                  <span>
                    {isMyTurn ? "Check! Your King is in danger!" : "Check on opponent!"}
                  </span>
                </span>
              </motion.div>
            )}

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
          <div className="lg:col-span-4 flex flex-col space-y-4 w-full max-w-[540px] lg:max-w-none mx-auto lg:h-[580px]">
            {/* Turn Status Banner */}
            <div
              className={`p-4 rounded-xl border text-center transition-all ${
                isMyTurn
                  ? "bg-emerald-950/40 border-emerald-500/50 text-emerald-300 shadow-md shadow-emerald-950/30"
                  : "bg-slate-900/80 border-slate-800 text-slate-400"
              }`}
            >
              <div className="text-xs uppercase tracking-wider font-semibold text-slate-400">
                Current Status
              </div>
              <div className="text-base font-bold mt-1">
                {isMyTurn ? (
                  <span className="flex items-center justify-center gap-1.5 text-emerald-400">
                    <span className="inline-block w-2.5 h-2.5 rounded-full bg-emerald-400 animate-ping" />
                    Your Turn — Make a Move
                  </span>
                ) : (
                  <span>Waiting for Opponent...</span>
                )}
              </div>
            </div>

            {/* Move History */}
            <div className="flex-1 min-h-[160px]">
              <MoveHistory moves={gameState?.moveHistory || []} />
            </div>

            {/* Actions Bar */}
            <div className="grid grid-cols-2 gap-3 pt-2">
              <button
                onClick={() => setShowResignConfirm(true)}
                disabled={screen === "finished"}
                className="py-2.5 px-4 bg-slate-800/80 hover:bg-red-950/60 hover:text-red-300 hover:border-red-500/40 text-slate-400 font-semibold rounded-xl border border-slate-700 transition-all text-xs flex items-center justify-center gap-1.5 disabled:opacity-40 disabled:pointer-events-none"
              >
                <span>🏳️</span>
                <span>Resign</span>
              </button>

              <button
                onClick={leaveRoom}
                className="py-2.5 px-4 bg-slate-800/80 hover:bg-slate-700 text-slate-300 font-semibold rounded-xl border border-slate-700 transition-all text-xs flex items-center justify-center gap-1.5"
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
            className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm"
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="bg-slate-900 border border-slate-800 rounded-2xl p-6 max-w-sm w-full space-y-4 text-center shadow-2xl"
            >
              <div className="text-4xl">🏳️</div>
              <h3 className="text-lg font-bold text-slate-100">
                Resign the match?
              </h3>
              <p className="text-xs text-slate-400">
                Resigning will concede the victory to your opponent immediately.
              </p>
              <div className="grid grid-cols-2 gap-3 pt-2">
                <button
                  onClick={() => setShowResignConfirm(false)}
                  className="py-2.5 px-4 bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold rounded-xl"
                >
                  Cancel
                </button>
                <button
                  onClick={handleConfirmResign}
                  className="py-2.5 px-4 bg-red-600 hover:bg-red-500 text-white text-xs font-semibold rounded-xl shadow-lg shadow-red-600/30"
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
            className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/85 backdrop-blur-md"
          >
            <motion.div
              initial={{ scale: 0.85, y: 20 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.85, y: 20 }}
              className="bg-gradient-to-b from-slate-900 to-slate-950 border border-slate-800 rounded-2xl p-6 sm:p-8 max-w-md w-full text-center space-y-6 shadow-2xl"
            >
              <div className="text-5xl">
                {isWinner ? "🏆" : isDrawGame ? "🤝" : "💔"}
              </div>

              <div className="space-y-1">
                <h2
                  className={`text-2xl font-extrabold ${
                    isWinner
                      ? "text-amber-400"
                      : isDrawGame
                      ? "text-slate-300"
                      : "text-red-400"
                  }`}
                >
                  {isWinner
                    ? "Victory!"
                    : isDrawGame
                    ? "Draw Game"
                    : "Defeat"}
                </h2>
                <p className="text-sm text-slate-300 font-medium max-w-xs mx-auto">
                  {formatEndReason(endReason, !!isWinner, !!isDrawGame)}
                </p>
              </div>

              {/* Match Result Details Card */}
              <div className="p-4 bg-slate-950/60 border border-slate-800/80 rounded-xl text-xs space-y-2 text-slate-400">
                <div className="flex justify-between">
                  <span>White Player:</span>
                  <span className="font-semibold text-slate-200">
                    {whitePlayer?.username || "Player 1"}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span>Black Player:</span>
                  <span className="font-semibold text-slate-200">
                    {blackPlayer?.username || "Player 2"}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span>Total Moves:</span>
                  <span className="font-semibold text-slate-200">
                    {gameState?.moveHistory.length || 0}
                  </span>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="space-y-3 pt-2">
                <button
                  onClick={rematch}
                  className="w-full py-3.5 px-4 bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-slate-950 font-bold rounded-xl shadow-lg shadow-amber-500/20 transition-all hover:scale-[1.02] active:scale-[0.98] flex items-center justify-center gap-2"
                >
                  <span>🔄</span>
                  <span>Rematch (Switch Colors)</span>
                </button>

                <button
                  onClick={leaveRoom}
                  className="w-full py-3 px-4 bg-slate-800 hover:bg-slate-700 text-slate-200 font-semibold rounded-xl border border-slate-700 transition-all text-xs"
                >
                  Back to Lobby
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Auth Modal */}
      {showLogin && <LoginModal onClose={() => setShowLogin(false)} />}
    </div>
  );
}
