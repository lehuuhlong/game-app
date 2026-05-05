"use client";

import { useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useAuth } from "@/components/auth";
import { LoginModal } from "@/components/auth/LoginModal";
import { useWordChain } from "./useWordChain";

export function GameWordChain() {
  const { user } = useAuth();
  const {
    screen,
    language,
    setLanguage,
    joinInput,
    setJoinInput,
    joinError,
    roomId,
    copied,
    statusMsg,
    createRoom,
    joinRoom,
    copyRoomCode,
    chain,
    currentTurnPlayerId,
    players,
    gameLanguage,
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
    didIWin,
    leaveRoom,
    requestRematch,
  } = useWordChain();

  const chatEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Auto-scroll chat
  useEffect(() => {
    if (chatEndRef.current) {
      chatEndRef.current.scrollIntoView({ behavior: "smooth" });
    }
  }, [chain]);

  // Focus input on turn
  useEffect(() => {
    if (isMyTurn && inputRef.current) {
      inputRef.current.focus();
    }
  }, [isMyTurn]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    submitWord(wordInput);
  };

  const renderWordWithHighlight = (word: string, connector: string, isLastInChain: boolean) => {
    if (!connector) return word;

    const lowerWord = word.toLowerCase();
    const lowerConnector = connector.toLowerCase();

    // If it's the last word in the chain, highlight the END of the word (the connector for the NEXT player)
    if (isLastInChain) {
      if (lowerWord.endsWith(lowerConnector)) {
        const idx = lowerWord.lastIndexOf(lowerConnector);
        return (
          <>
            {word.slice(0, idx)}
            <span className="text-green-400 font-bold">{word.slice(idx)}</span>
          </>
        );
      }
    } 
    // For other words (or if it's not the very last one), we usually want to highlight the START of the word 
    // to show how it connected to the previous one. BUT, the connector stored in the entry is what it PROVIDES to the next.
    // So actually, highlighting the connector it PROVIDES is consistent.
    
    // Let's just highlight the provided connector at the end.
    if (lowerWord.endsWith(lowerConnector)) {
      const idx = lowerWord.lastIndexOf(lowerConnector);
      return (
        <>
          {word.slice(0, idx)}
          <span className="text-green-500 font-bold">{word.slice(idx)}</span>
        </>
      );
    }

    return word;
  };

  return (
    <>
      {!user && (
        <LoginModal
          title="Enter your username"
          subtitle="You need a username to play online Word Chain"
          onSuccess={() => {}}
          onClose={() => {}}
        />
      )}

      <div className="flex flex-col items-center gap-6 mx-auto max-w-4xl h-[calc(100vh-8rem)]">
        {/* Header */}
        <div className="w-full text-center sm:text-left shrink-0">
          <h1 className="text-3xl sm:text-4xl font-extrabold text-foreground">Word Chain</h1>
          <p className="text-sm text-foreground-secondary mt-0.5">
            Connect words. 20 seconds per turn. Don't run out of time!
          </p>
        </div>

        {/* ── LOBBY ─────────────────────────────────────────────── */}
        {screen === "lobby" && (
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            className="w-full max-w-md mx-auto space-y-4 mt-8"
          >
            <div className="rounded-2xl border border-border bg-surface p-6 space-y-4">
              <h2 className="text-lg font-bold text-foreground">Create a Room</h2>
              
              <div className="space-y-2">
                <label className="text-sm font-medium text-foreground-secondary block">Select Language</label>
                <div className="flex bg-background border border-border rounded-xl p-1">
                  <button
                    onClick={() => setLanguage("en")}
                    className={`flex-1 py-2 text-sm font-semibold rounded-lg transition-colors ${
                      language === "en" ? "bg-surface shadow-sm text-foreground" : "text-foreground-muted hover:text-foreground"
                    }`}
                  >
                    🇬🇧 English
                  </button>
                  <button
                    onClick={() => setLanguage("vi")}
                    className={`flex-1 py-2 text-sm font-semibold rounded-lg transition-colors ${
                      language === "vi" ? "bg-surface shadow-sm text-foreground" : "text-foreground-muted hover:text-foreground"
                    }`}
                  >
                    🇻🇳 Tiếng Việt
                  </button>
                </div>
              </div>

              <p className="text-sm text-foreground-secondary">Start a new game and share the room code with your friend.</p>
              <button 
                onClick={() => user && createRoom(user.username)} 
                disabled={!user}
                className="w-full rounded-xl bg-gradient-to-r from-emerald-500 to-green-600 py-3 text-sm font-bold text-white hover:from-emerald-600 hover:to-green-700 hover:-translate-y-0.5 transition-all shadow-lg disabled:opacity-50 disabled:hover:-translate-y-0"
              >
                Create Room
              </button>
            </div>

            <div className="rounded-2xl border border-border bg-surface p-6 space-y-3">
              <h2 className="text-lg font-bold text-foreground">Join a Room</h2>
              <div className="flex gap-2">
                <input
                  type="text"
                  value={joinInput}
                  onChange={(e) => setJoinInput(e.target.value.toUpperCase())}
                  onKeyDown={(e) => e.key === "Enter" && user && joinRoom(user.username)}
                  placeholder="Room code..."
                  maxLength={6}
                  className="flex-1 rounded-xl border border-border bg-background px-4 py-2.5 text-sm text-foreground placeholder:text-foreground-muted focus:border-accent focus:outline-none uppercase font-mono tracking-widest"
                />
                <button 
                  onClick={() => user && joinRoom(user.username)} 
                  disabled={!user || !joinInput.trim()}
                  className="rounded-xl bg-surface-hover border border-border px-4 py-2.5 text-sm font-semibold text-foreground hover:bg-accent hover:text-white hover:border-accent transition-all disabled:opacity-50"
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
          <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} className="w-full max-w-md mx-auto text-center mt-8">
            <div className="rounded-2xl border border-border bg-surface p-8 space-y-5">
              <div className="h-12 w-12 rounded-full border-4 border-accent border-t-transparent animate-spin mx-auto" />
              <h2 className="text-xl font-bold text-foreground">{statusMsg}</h2>

              <div className="rounded-xl bg-background border border-border p-5 relative">
                <p className="text-xs text-foreground-muted mb-1">Room Code</p>
                <div className="flex items-center justify-center gap-3">
                  <p className="text-4xl font-extrabold text-accent font-mono tracking-widest">{roomId}</p>
                  <button
                    onClick={copyRoomCode}
                    className="p-2 rounded-lg bg-surface hover:bg-surface-hover text-foreground-secondary hover:text-foreground transition-colors border border-border"
                    title="Copy Room Code"
                  >
                    {copied ? (
                      <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-green-500"><polyline points="20 6 9 17 4 12"></polyline></svg>
                    ) : (
                      <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path></svg>
                    )}
                  </button>
                </div>
                <p className="text-xs text-foreground-muted mt-2">Language: {language === "en" ? "English" : "Vietnamese"}</p>
              </div>

              <div className="space-y-1 text-sm text-foreground-secondary">
                {players.map((p, i) => (
                  <div key={p.id} className="flex items-center justify-center gap-2">
                    <div className="h-2 w-2 rounded-full bg-green-500" />
                    <span>{p.username}</span>
                  </div>
                ))}
              </div>

              <button onClick={leaveRoom} className="text-sm text-foreground-muted hover:text-red-500 transition-colors underline">Cancel</button>
            </div>
          </motion.div>
        )}

        {/* ── PLAYING / FINISHED ─────────────────────────────────── */}
        {(screen === "playing" || screen === "finished") && (
          <div className="w-full flex flex-col lg:flex-row items-start gap-6">
            
            {/* Chat/Game Area */}
            <div className="flex-1 flex flex-col w-full bg-surface border border-border rounded-2xl overflow-hidden shadow-sm relative min-h-[500px]">
              
              {/* Chain Display */}
              <div className="flex-1 overflow-y-auto p-4 space-y-3 scroll-smooth min-h-[400px]">
                {chain.length === 0 ? (
                  <div className="h-full flex flex-col items-center justify-center text-foreground-muted opacity-60">
                    <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1" strokeLinecap="round" className="mb-4">
                      <path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71" />
                      <path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71" />
                    </svg>
                    <p className="font-medium text-lg text-foreground-secondary">Chain is empty</p>
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
                          className={`flex flex-col ${isMe ? "items-end" : "items-start"} max-w-[80%] ${isMe ? "self-end" : "self-start"}`}
                        >
                          <span className="text-[10px] text-foreground-muted mb-0.5 px-1">{entry.username}</span>
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
                      initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
                      className="mb-2 text-xs font-medium text-red-500 bg-red-500/10 px-3 py-1.5 rounded-lg border border-red-500/20"
                    >
                      {rejectMsg}
                    </motion.div>
                  )}
                  
                  {nextStartHint && isMyTurn && !rejectMsg && (
                    <motion.div 
                      initial={{ opacity: 0 }} animate={{ opacity: 1 }}
                      className="mb-2 text-xs font-medium text-foreground-secondary px-2 flex items-center gap-1.5"
                    >
                      <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><circle cx="12" cy="12" r="10"/><path d="M12 16v-4"/><path d="M12 8h.01"/></svg>
                      Word must start with <span className="font-bold text-accent uppercase tracking-widest px-1 bg-accent/10 rounded">"{nextStartHint}"</span>
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
                          ? (chain.length === 0 ? "Type a starting word..." : `Word starting with "${nextStartHint}"...`)
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
                        <button onClick={leaveRoom} className="rounded-xl border border-border px-6 py-2.5 text-sm font-semibold text-foreground-secondary hover:bg-surface-hover transition-all">
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
                <div className={`rounded-xl border p-4 text-center transition-all ${
                  isMyTurn ? "border-accent/50 bg-accent/5" : "border-border bg-surface"
                }`}>
                  <p className="text-xs text-foreground-muted uppercase tracking-wider mb-2">
                    {isMyTurn ? "Your turn" : "Opponent's turn"}
                  </p>
                  <p className={`text-4xl font-extrabold tabular-nums ${timeLeft <= 5 ? "text-red-500 animate-pulse" : "text-foreground"}`}>
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
                  <span className="text-xs font-semibold text-foreground-muted uppercase tracking-wider">Room</span>
                  <span className="font-mono font-bold text-accent text-sm">{roomId}</span>
                </div>

                {players.map((p, i) => {
                  const isTurn = p.id === currentTurnPlayerId && screen === "playing";
                  const isMe = p.id === myPlayerId;
                  return (
                    <div key={p.id} className={`flex items-center gap-3 rounded-lg px-3 py-2 transition-all ${isTurn ? "bg-accent/10 border border-accent/30" : "bg-background"}`}>
                      <div className={`h-2.5 w-2.5 rounded-full ${isTurn ? "bg-accent animate-pulse" : "bg-foreground-muted"}`} />
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-semibold text-foreground truncate">
                          {p.username} {isMe && <span className="text-xs text-foreground-muted font-normal">(you)</span>}
                        </p>
                      </div>
                    </div>
                  );
                })}
              </div>

              <div className="rounded-xl border border-border bg-surface p-4">
                <p className="text-xs text-foreground-muted uppercase tracking-wider mb-1">Chain Length</p>
                <p className="text-2xl font-extrabold text-foreground">{chain.length}</p>
              </div>

              <button onClick={leaveRoom} className="w-full rounded-xl border border-border py-2 text-sm text-foreground-muted hover:border-red-400 hover:text-red-400 transition-all">
                Leave Room
              </button>
            </div>
          </div>
        )}
      </div>
    </>
  );
}
