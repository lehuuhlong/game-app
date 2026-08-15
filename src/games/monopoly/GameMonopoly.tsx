'use client';

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useAuth } from '@/components/auth';
import { LoginModal } from '@/components/auth/LoginModal';
import { useMonopoly } from './useMonopoly';
import { MonopolyBoard } from './MonopolyBoard';
import { TOKEN_STYLES } from './boardData';

type Screen = 'lobby' | 'waiting' | 'playing' | 'finished';

export function GameMonopoly() {
  const { user } = useAuth();
  const [showLogin, setShowLogin] = useState(false);
  const [screenState, setScreenState] = useState<Screen>('lobby');
  const screenRef = useRef<Screen>('lobby');
  const screen = screenState;
  const setScreen = useCallback((s: Screen) => {
    screenRef.current = s;
    setScreenState(s);
  }, []);

  const [joinInput, setJoinInput] = useState('');
  const [joinError, setJoinError] = useState('');
  const [copied, setCopied] = useState(false);
  const [statusMsg, setStatusMsg] = useState('Waiting for players...');
  const [roomId, setRoomId] = useState('');

  const {
    room,
    playerId,
    gameState,
    error,
    buyOffer,
    upgradeOffer,
    winner,
    joinRoom: hookJoinRoom,
    leaveRoom,
    startGame,
    rollDice,
    buyProperty,
    upgradeProperty,
    endTurn,
    restart,
    joinError: hookJoinError,
  } = useMonopoly(user?.username || '');

  // ── Screen transitions ──────────────────────────────────────────

  // lobby → waiting
  useEffect(() => {
    if (room && playerId && screenRef.current === 'lobby') {
      setScreen('waiting');
    }
  }, [room, playerId, setScreen]);

  // waiting → playing (when game starts)
  useEffect(() => {
    if (gameState && !winner && screenRef.current === 'waiting') {
      setScreen('playing');
    }
  }, [gameState, winner, setScreen]);

  // playing → finished
  useEffect(() => {
    if (winner && screenRef.current === 'playing') {
      setScreen('finished');
    }
  }, [winner, setScreen]);

  // finished → playing (rematch)
  useEffect(() => {
    if (gameState && !winner && screenRef.current === 'finished') {
      setScreen('playing');
    }
  }, [gameState, winner, setScreen]);

  // Status message
  useEffect(() => {
    if (room) {
      const count = room.players.length;
      setStatusMsg(
        count < 2
          ? `${count}/4 players — waiting for more...`
          : `${count}/4 players — host can start!`
      );
    }
  }, [room?.players.length]);

  // Hook join errors
  useEffect(() => {
    if (hookJoinError) {
      setJoinError(hookJoinError);
    }
  }, [hookJoinError]);

  // ── Actions ───────────────────────────────────────────────────

  const isHost = room?.players[0]?.socketId === (room?.players.find(
    p => p.id === playerId
  )?.socketId);

  const handleCreateRoom = () => {
    if (!user) { setShowLogin(true); return; }
    const newId = Math.random().toString(36).slice(2, 8).toUpperCase();
    setRoomId(newId);
    setJoinError('');
    hookJoinRoom(newId, 'create');
  };

  const handleJoinRoom = () => {
    if (!user) { setShowLogin(true); return; }
    const id = joinInput.trim().toUpperCase();
    if (!id) { setJoinError('Please enter a room code.'); return; }
    setJoinError('');
    setRoomId(id);
    hookJoinRoom(id, 'join');
  };

  const handleLeaveRoom = () => {
    leaveRoom(roomId);
    setScreen('lobby');
    setRoomId('');
    setJoinInput('');
    setJoinError('');
    setStatusMsg('Waiting for players...');
  };

  const handleCopyCode = async () => {
    try {
      await navigator.clipboard.writeText(roomId);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      /* Clipboard not available */
    }
  };

  const handleRematch = () => {
    restart();
  };

  // Player token list styling order
  const tokenColorsArray = ['red', 'blue', 'green', 'yellow'];

  return (
    <>
      {showLogin && (
        <LoginModal
          title="Enter your username"
          subtitle="You need a username to play Monopoly"
          onSuccess={() => setShowLogin(false)}
          onClose={() => setShowLogin(false)}
        />
      )}

      <div className={`flex flex-col items-center mx-auto max-w-7xl px-2 ${
        screen === 'playing' || screen === 'finished' ? 'gap-1 pb-1' : 'gap-6 pb-12'
      }`}>
        {/* Main Header (Shown on lobby/waiting) */}
        {screen !== 'playing' && screen !== 'finished' && (
          <div className="w-full text-center sm:text-left">
            <h1 className="text-3xl sm:text-4xl font-black text-slate-900 dark:text-slate-100 tracking-tight">
              Mono<span className="bg-gradient-to-r from-amber-500 via-red-500 to-amber-400 bg-clip-text text-transparent">poly</span>
            </h1>
            <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-400 mt-1 font-medium">
              Real-time multiplayer property trading — 2 to 4 players
            </p>
          </div>
        )}

        <AnimatePresence mode="wait">
          {/* ── LOBBY SCREEN ───────────────────────────────────────── */}
          {screen === 'lobby' && (
            <motion.div
              key="lobby"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className="w-full max-w-md mx-auto"
            >
              <div className="p-6 rounded-3xl border border-slate-200 dark:border-amber-500/20 bg-white/95 dark:bg-slate-900/90 backdrop-blur-2xl shadow-xl dark:shadow-2xl dark:shadow-slate-950/60 space-y-6">
                <div className="text-center space-y-1.5">
                  <div className="text-5xl drop-shadow-md mb-2">🎩</div>
                  <h2 className="text-xl font-black tracking-wide text-slate-900 dark:text-slate-100">
                    Monopoly Lobby
                  </h2>
                  <p className="text-xs text-slate-500 dark:text-slate-400">
                    Create a match or join your friends with a code
                  </p>
                </div>

                {/* Create Room Button */}
                <motion.button
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  onClick={handleCreateRoom}
                  className="w-full py-3.5 px-4 bg-gradient-to-r from-amber-500 via-amber-400 to-yellow-500 text-slate-950 font-black rounded-2xl shadow-xl shadow-amber-500/20 border border-amber-300 hover:shadow-amber-500/40 transition-all text-sm tracking-wide cursor-pointer"
                >
                  🏠 CREATE NEW ROOM
                </motion.button>

                {/* Divider */}
                <div className="flex items-center gap-3">
                  <div className="flex-1 h-px bg-slate-200 dark:bg-slate-800" />
                  <span className="text-xs font-semibold text-slate-400 dark:text-slate-500 uppercase tracking-widest">or join code</span>
                  <div className="flex-1 h-px bg-slate-200 dark:bg-slate-800" />
                </div>

                {/* Join Room Form */}
                <div className="flex gap-2.5">
                  <input
                    type="text"
                    value={joinInput}
                    onChange={(e) => setJoinInput(e.target.value.toUpperCase())}
                    onKeyDown={(e) => e.key === 'Enter' && handleJoinRoom()}
                    placeholder="ROOM CODE"
                    className="flex-1 px-4 py-3 rounded-2xl border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-950/80 text-amber-700 dark:text-amber-300 placeholder:text-slate-400 dark:placeholder:text-slate-600 text-sm font-mono font-bold tracking-[0.25em] focus:outline-none focus:border-amber-400 focus:ring-2 focus:ring-amber-400/20"
                    maxLength={8}
                  />
                  <motion.button
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                    onClick={handleJoinRoom}
                    className="px-6 py-3 bg-slate-800 hover:bg-slate-700 text-white dark:bg-slate-800 dark:hover:bg-slate-700 dark:text-slate-100 font-bold rounded-2xl transition-colors text-sm cursor-pointer shadow-sm"
                  >
                    Join
                  </motion.button>
                </div>

                {/* Error Banner */}
                <AnimatePresence>
                  {joinError && (
                    <motion.div
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: 'auto' }}
                      exit={{ opacity: 0, height: 0 }}
                      className="text-xs text-rose-600 dark:text-rose-400 text-center font-bold bg-rose-50 dark:bg-rose-950/50 border border-rose-200 dark:border-rose-800/40 py-2 rounded-xl"
                    >
                      ⚠️ {joinError}
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            </motion.div>
          )}

          {/* ── WAITING SCREEN ─────────────────────────────────────── */}
          {screen === 'waiting' && (
            <motion.div
              key="waiting"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className="w-full max-w-md mx-auto"
            >
              <div className="p-6 rounded-3xl border border-slate-200 dark:border-amber-500/20 bg-white/95 dark:bg-slate-900/90 backdrop-blur-2xl shadow-xl dark:shadow-2xl dark:shadow-slate-950/60 space-y-6">
                {/* Room code section */}
                <div className="text-center bg-slate-50 dark:bg-slate-950/60 p-4 rounded-2xl border border-slate-200 dark:border-slate-800">
                  <div className="text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-widest mb-1">
                    SHARE ROOM CODE WITH FRIENDS
                  </div>
                  <div className="flex items-center justify-center gap-3">
                    <span className="text-3xl sm:text-4xl font-black tracking-[0.25em] text-amber-600 dark:text-amber-400 font-mono drop-shadow">
                      {roomId}
                    </span>
                    <motion.button
                      whileTap={{ scale: 0.9 }}
                      onClick={handleCopyCode}
                      className="p-2 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 border border-slate-200 dark:border-slate-700 transition-colors cursor-pointer"
                      title="Copy code"
                    >
                      {copied ? (
                        <span className="text-emerald-600 dark:text-emerald-400 text-xs font-bold">COPIED!</span>
                      ) : (
                        <span className="text-sm">📋</span>
                      )}
                    </motion.button>
                  </div>
                </div>

                {/* Status indicator */}
                <div className="text-center text-xs font-semibold text-slate-600 dark:text-slate-300 animate-pulse bg-slate-100 dark:bg-slate-800/50 py-1.5 rounded-full border border-slate-200 dark:border-slate-700/50">
                  ⏳ {statusMsg}
                </div>

                {/* Players list */}
                <div className="space-y-2.5">
                  {room?.players.map((p, i) => {
                    const colorKey = tokenColorsArray[i % tokenColorsArray.length];
                    const tokenStyle = TOKEN_STYLES[colorKey];
                    return (
                      <div
                        key={p.id}
                        className="flex items-center gap-3 px-4 py-3 rounded-2xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950/70"
                      >
                        <div className={`w-4 h-4 rounded-full ${tokenStyle.bg} ring-2 ${tokenStyle.ring} ${tokenStyle.glow} shadow-md`} />
                        <span className="text-sm font-bold text-slate-800 dark:text-slate-100 flex-1">
                          {p.username}
                        </span>
                        {i === 0 && (
                          <span className="text-[9px] px-2 py-0.5 bg-amber-100 dark:bg-amber-500/20 text-amber-800 dark:text-amber-300 border border-amber-300 dark:border-amber-500/30 rounded-full font-black">
                            HOST
                          </span>
                        )}
                        {p.id === playerId && (
                          <span className="text-[9px] px-2 py-0.5 bg-emerald-100 dark:bg-emerald-500/20 text-emerald-800 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-500/30 rounded-full font-black">
                            YOU
                          </span>
                        )}
                      </div>
                    );
                  })}

                  {/* Empty player slots */}
                  {Array.from({ length: 4 - (room?.players.length || 0) }).map((_, i) => (
                    <div
                      key={`empty-${i}`}
                      className="flex items-center gap-3 px-4 py-3 rounded-2xl border border-dashed border-slate-300 dark:border-slate-800 text-slate-400 dark:text-slate-600 bg-slate-50/50 dark:bg-slate-950/30"
                    >
                      <div className="w-4 h-4 rounded-full bg-slate-300 dark:bg-slate-800" />
                      <span className="text-xs italic font-medium">Waiting for player slot {room?.players.length ? room.players.length + i + 1 : i + 1}...</span>
                    </div>
                  ))}
                </div>

                {/* Host Control / Leave Buttons */}
                <div className="flex gap-2.5 pt-2">
                  <motion.button
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                    onClick={handleLeaveRoom}
                    className="flex-1 py-3 px-4 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 border border-slate-300 dark:border-slate-700 text-slate-700 dark:text-slate-300 font-bold rounded-2xl transition-colors text-xs tracking-wider cursor-pointer"
                  >
                    LEAVE
                  </motion.button>

                  {isHost && (room?.players.length ?? 0) >= 2 && (
                    <motion.button
                      whileHover={{ scale: 1.02 }}
                      whileTap={{ scale: 0.98 }}
                      onClick={startGame}
                      className="flex-1 py-3 px-4 bg-gradient-to-r from-emerald-500 via-teal-400 to-emerald-500 text-slate-950 font-black rounded-2xl shadow-xl shadow-emerald-500/20 border border-emerald-300 hover:shadow-emerald-500/40 transition-all text-xs tracking-wider cursor-pointer"
                    >
                      🎮 START GAME ({room?.players.length}/4)
                    </motion.button>
                  )}
                </div>
              </div>
            </motion.div>
          )}

          {/* ── PLAYING / FINISHED SCREEN ───────────────────────────── */}
          {(screen === 'playing' || screen === 'finished') && (
            <motion.div
              key="playing"
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="w-full"
            >
              {/* Main Monopoly Board Component */}
              <MonopolyBoard
                gameState={gameState}
                playerId={playerId}
                room={room}
                roomId={roomId}
                onRollDice={rollDice}
                onBuyProperty={buyProperty}
                onUpgradeProperty={upgradeProperty}
                onEndTurn={endTurn}
                onLeaveRoom={handleLeaveRoom}
                onRematch={handleRematch}
                isFinished={screen === 'finished'}
                buyOffer={buyOffer}
                upgradeOffer={upgradeOffer}
              />
            </motion.div>
          )}
        </AnimatePresence>

        {/* Global Error Notification Toast */}
        <AnimatePresence>
          {error && (
            <motion.div
              initial={{ opacity: 0, y: 50 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 50 }}
              className="fixed bottom-6 left-1/2 -translate-x-1/2 px-5 py-2.5 bg-rose-600 text-white text-xs font-bold rounded-2xl shadow-2xl border border-rose-400 z-50 flex items-center gap-2"
            >
              <span>⚠️</span> {error}
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </>
  );
}
