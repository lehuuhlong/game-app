"use client";

import React, { useEffect, useRef, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useAuth } from "@/components/auth";
import { LoginModal } from "@/components/auth/LoginModal";
import { useWordChain } from "./useWordChain";
import { HeadToHeadBadge } from "@/components/shared/HeadToHeadBadge";
import { GameLobby1v1 } from "@/components/shared";

export function GameWordChain() {
  const { user } = useAuth();
  const [showLogin, setShowLogin] = useState(false);

  const {
    screen,
    language,
    setLanguage,
    joinError,
    setJoinError,
    roomId,
    copied,
    statusMsg,
    createRoom,
    joinRoom,
    copyRoomCode,
    chain,
    currentTurnPlayerId,
    players,
    isMyTurn,
    myPlayerId,
    nextStartHint,
    wordInput,
    setWordInput,
    rejectMsg,
    isSubmitting,
    submitWord,
    timeLeft,
    timerPercent,
    timerColor,
    winnerMsg,
    leaveRoom,
    requestRematch,
  } = useWordChain(user?.username);

  const chatEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Auto-scroll chat
  useEffect(() => {
    const timer = setTimeout(() => {
      if (chatEndRef.current) {
        chatEndRef.current.scrollIntoView({ behavior: "smooth", block: "end" });
      }
    }, 100);
    return () => clearTimeout(timer);
  }, [chain]);

  // Focus input on turn
  useEffect(() => {
    if (isMyTurn && inputRef.current) {
      inputRef.current.focus();
    }
  }, [isMyTurn]);

  useEffect(() => {
    if (rejectMsg && inputRef.current) {
      inputRef.current.focus();
    }
  }, [rejectMsg]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    submitWord(wordInput);
  };

  const onProtectedCreateRoom = () => {
    if (!user) {
      setShowLogin(true);
      return;
    }
    createRoom();
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
    joinRoom(code);
  };

  const renderWordWithHighlight = (word: string, connector: string, isLastInChain: boolean) => {
    if (!connector) return word;

    const lowerWord = word.toLowerCase();
    const lowerConnector = connector.toLowerCase();

    if (isLastInChain) {
      if (lowerWord.endsWith(lowerConnector)) {
        const idx = lowerWord.lastIndexOf(lowerConnector);
        return (
          <>
            {word.slice(0, idx)}
            <span className="text-emerald-400 font-bold">{word.slice(idx)}</span>
          </>
        );
      }
    }

    if (lowerWord.endsWith(lowerConnector)) {
      const idx = lowerWord.lastIndexOf(lowerConnector);
      return (
        <>
          {word.slice(0, idx)}
          <span className="text-emerald-400 font-bold">{word.slice(idx)}</span>
        </>
      );
    }

    return word;
  };

  return (
    <>
      {showLogin && (
        <LoginModal
          title="Enter your username"
          subtitle="You need a username to play online Word Chain"
          onSuccess={() => setShowLogin(false)}
          onClose={() => setShowLogin(false)}
        />
      )}

      <div className="flex flex-col items-center gap-6 mx-auto max-w-4xl h-[calc(100vh-8rem)]">
        {/* Header */}
        <div className="w-full text-center sm:text-left shrink-0">
          <h1 className="text-3xl sm:text-4xl font-extrabold text-foreground">
            Word <span className="text-gradient">Chain</span>
          </h1>
          <p className="text-sm text-foreground-secondary mt-0.5">
            Connect words. 20 seconds per turn. Don&apos;t run out of time!
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
            onLeaveRoom={leaveRoom}
            createRoomExtra={
              <div className="space-y-2">
                <label className="text-sm font-medium text-foreground-secondary block">
                  Select Language
                </label>
                <div className="flex bg-background border border-border rounded-xl p-1">
                  <button
                    type="button"
                    onClick={() => setLanguage("en")}
                    className={`flex-1 py-2 text-sm font-semibold rounded-lg transition-colors ${
                      language === "en"
                        ? "bg-surface shadow-sm text-foreground"
                        : "text-foreground-muted hover:text-foreground"
                    }`}
                  >
                    🇬🇧 English
                  </button>
                  <button
                    type="button"
                    onClick={() => setLanguage("vi")}
                    className={`flex-1 py-2 text-sm font-semibold rounded-lg transition-colors ${
                      language === "vi"
                        ? "bg-surface shadow-sm text-foreground"
                        : "text-foreground-muted hover:text-foreground"
                    }`}
                  >
                    🇻🇳 Tiếng Việt
                  </button>
                </div>
              </div>
            }
            waitingExtra={
              <p className="text-xs text-foreground-muted">
                Language: {language === "en" ? "English" : "Vietnamese"}
              </p>
            }
          />
        )}

        {/* ── PLAYING / FINISHED ─────────────────────────────────── */}
        {(screen === "playing" || screen === "finished") && (
          <div className="w-full flex-1 flex flex-col lg:flex-row gap-6 min-h-0">
            {/* Chat/Game Area */}
            <div className="flex-1 flex flex-col w-full bg-surface border border-border rounded-2xl overflow-hidden shadow-sm relative">
              {/* Chain Display */}
              <div className="flex-1 overflow-y-auto p-4 space-y-3 scroll-smooth">
                {chain.length === 0 ? (
                  <div className="h-full flex flex-col items-center justify-center text-foreground-muted opacity-60">
                    <svg
                      width="48"
                      height="48"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="1"
                      strokeLinecap="round"
                      className="mb-4"
                    >
                      <path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71" />
                      <path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71" />
                    </svg>
                    <p className="font-medium text-lg text-foreground-secondary">
                      Chain is empty
                    </p>
                    <p className="text-sm mt-1 text-center">
                      {isMyTurn
                        ? "You're up! Type any valid word to start."
                        : "Waiting for opponent to start..."}
                    </p>
                  </div>
                ) : (
                  <div className="flex flex-col gap-2">
                    {chain.map((entry, idx) => {
                      const isMe = entry.playerId === myPlayerId;
                      const isLast = idx === chain.length - 1;

                      return (
                        <motion.div
                          initial={{ opacity: 0, y: 10, scale: 0.95 }}
                          animate={{ opacity: 1, y: 0, scale: 1 }}
                          key={idx}
                          className={`flex flex-col ${
                            isMe ? "items-end" : "items-start"
                          } max-w-[80%] ${isMe ? "self-end" : "self-start"}`}
                        >
                          <span className="text-[10px] text-foreground-muted mb-0.5 px-1">
                            {entry.username}
                          </span>
                          <div
                            className={`px-4 py-2.5 rounded-2xl text-[15px] shadow-sm ${
                              isMe
                                ? "bg-accent text-white rounded-tr-sm"
                                : "bg-background border border-border text-foreground rounded-tl-sm"
                            }`}
                          >
                            {renderWordWithHighlight(entry.word, entry.connector, isLast)}
                          </div>
                        </motion.div>
                      );
                    })}
                    <div ref={chatEndRef} />
                  </div>
                )}
              </div>

              {/* Input Area */}
              {screen === "playing" && (
                <div className="p-3 border-t border-border bg-background">
                  {rejectMsg && (
                    <motion.div
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      className="mb-2 text-xs font-medium text-red-500 bg-red-500/10 px-3 py-1.5 rounded-lg border border-red-500/20"
                    >
                      {rejectMsg}
                    </motion.div>
                  )}

                  {nextStartHint && isMyTurn && !rejectMsg && (
                    <motion.div
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      className="mb-2 text-xs font-medium text-foreground-secondary px-2 flex items-center gap-1.5"
                    >
                      <svg
                        width="12"
                        height="12"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="2"
                        strokeLinecap="round"
                      >
                        <circle cx="12" cy="12" r="10" />
                        <path d="M12 16v-4" />
                        <path d="M12 8h.01" />
                      </svg>
                      Word must start with{" "}
                      <span className="font-bold text-accent uppercase tracking-widest px-1 bg-accent/10 rounded">
                        &quot;{nextStartHint}&quot;
                      </span>
                    </motion.div>
                  )}

                  <form onSubmit={handleSubmit} className="flex gap-2 relative">
                    <input
                      ref={inputRef}
                      type="text"
                      value={wordInput}
                      onChange={(e) => setWordInput(e.target.value)}
                      disabled={!isMyTurn || isSubmitting}
                      placeholder={
                        isMyTurn
                          ? chain.length === 0
                            ? "Type a starting word..."
                            : `Word starting with "${nextStartHint}"...`
                          : "Opponent is typing..."
                      }
                      className="flex-1 rounded-xl border border-border bg-surface px-4 py-3 text-sm text-foreground placeholder:text-foreground-muted focus:border-accent focus:outline-none disabled:opacity-50 disabled:bg-surface-hover transition-colors"
                      autoComplete="off"
                      autoFocus
                    />
                    <button
                      type="submit"
                      disabled={!isMyTurn || !wordInput.trim() || isSubmitting}
                      className="rounded-xl bg-accent px-5 font-semibold text-white hover:bg-accent-hover transition-colors disabled:opacity-50 flex items-center justify-center min-w-[80px]"
                    >
                      {isSubmitting ? (
                        <div className="h-5 w-5 rounded-full border-2 border-white/30 border-t-white animate-spin" />
                      ) : (
                        "Send"
                      )}
                    </button>
                  </form>
                </div>
              )}

              {/* Game Over Overlay */}
              <AnimatePresence>
                {screen === "finished" && (
                  <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    className="absolute inset-0 flex items-center justify-center bg-background/75 backdrop-blur-[2px] rounded-xl z-10"
                  >
                    <div className="text-center space-y-4 p-8">
                      <p className="text-3xl font-extrabold text-foreground">{winnerMsg}</p>
                      <div className="flex gap-3 justify-center">
                        <button
                          onClick={requestRematch}
                          disabled={players.length < 2}
                          className={`rounded-xl px-6 py-2.5 text-sm font-bold transition-all ${
                            players.length < 2
                              ? "bg-surface-hover text-foreground-muted cursor-not-allowed"
                              : "bg-gradient-to-r from-emerald-500 to-green-600 text-white hover:from-emerald-600 hover:to-green-700"
                          }`}
                        >
                          {players.length < 2 ? "Waiting for opponent..." : "Rematch"}
                        </button>
                        <button
                          onClick={leaveRoom}
                          className="rounded-xl border border-border px-6 py-2.5 text-sm font-semibold text-foreground-secondary hover:bg-surface-hover transition-all"
                        >
                          Leave
                        </button>
                      </div>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>

            {/* Side panel */}
            <div className="w-full lg:w-64 shrink-0 space-y-4">
              {/* Timer */}
              {chain.length > 0 && screen === "playing" && (
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
              {chain.length === 0 && screen === "playing" && (
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
                      gameType="wordchain"
                      compact
                    />
                  </div>
                )}

                {players.map((p) => {
                  const isTurn = p.id === currentTurnPlayerId && screen === "playing";
                  const isMe = p.id === myPlayerId;
                  return (
                    <div
                      key={p.id}
                      className={`flex items-center gap-3 rounded-lg px-3 py-2 transition-all ${
                        isTurn
                          ? "bg-accent/10 border border-accent/30"
                          : "bg-background"
                      }`}
                    >
                      <div
                        className={`h-2.5 w-2.5 rounded-full ${
                          isTurn ? "bg-accent animate-pulse" : "bg-foreground-muted"
                        }`}
                      />
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-semibold text-foreground truncate">
                          {p.username}{" "}
                          {isMe && (
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

              <div className="rounded-xl border border-border bg-surface p-4">
                <p className="text-xs text-foreground-muted uppercase tracking-wider mb-1">
                  Chain Length
                </p>
                <p className="text-2xl font-extrabold text-foreground">{chain.length}</p>
              </div>

              <button
                onClick={leaveRoom}
                className="w-full rounded-xl border border-border py-2 text-sm text-foreground-muted hover:border-red-400 hover:text-red-400 transition-all"
              >
                Leave Room
              </button>
            </div>
          </div>
        )}
      </div>
    </>
  );
}
