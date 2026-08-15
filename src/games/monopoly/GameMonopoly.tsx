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
    sellProperty,
    payDebt,
    declareBankruptcy,
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
          {/* ── LOBBY SCREEN (Synchronized with Caro / Battleship / Word Chain) ── */}
          {screen === 'lobby' && (
            <motion.div
              key="lobby"
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -16 }}
              className="w-full max-w-md mx-auto space-y-4"
            >
              <div className="rounded-2xl border border-border bg-surface p-6 space-y-4">
                <h2 className="text-lg font-bold text-foreground">Create a Room</h2>
                <p className="text-sm text-foreground-secondary">Start a new game and share the room code with your friends.</p>
                <button
                  onClick={handleCreateRoom}
                  className="w-full rounded-xl bg-gradient-to-r from-sky-500 to-blue-600 py-3 text-sm font-bold text-white hover:from-sky-600 hover:to-blue-700 hover:-translate-y-0.5 transition-all shadow-lg cursor-pointer"
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
                    onKeyDown={(e) => e.key === 'Enter' && handleJoinRoom()}
                    placeholder="Room code..."
                    maxLength={6}
                    className="flex-1 rounded-xl border border-border bg-background px-4 py-2.5 text-sm text-foreground placeholder:text-foreground-muted focus:border-accent focus:outline-none uppercase font-mono tracking-widest"
                  />
                  <button
                    onClick={handleJoinRoom}
                    className="rounded-xl bg-surface-hover border border-border px-4 py-2.5 text-sm font-semibold text-foreground hover:bg-accent hover:text-white hover:border-accent transition-all cursor-pointer"
                  >
                    Join
                  </button>
                </div>
                {(joinError || hookJoinError) && (
                  <p className="text-sm text-red-500">{joinError || hookJoinError}</p>
                )}
              </div>
            </motion.div>
          )}

          {/* ── WAITING SCREEN (Synchronized with Caro / Battleship / Word Chain) ── */}
          {screen === 'waiting' && (
            <motion.div
              key="waiting"
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="w-full max-w-md mx-auto text-center"
            >
              <div className="rounded-2xl border border-border bg-surface p-8 space-y-5 shadow-sm">
                <div className="h-12 w-12 rounded-full border-4 border-sky-500 border-t-transparent animate-spin mx-auto" />
                <h2 className="text-xl font-bold text-foreground">{statusMsg}</h2>

                <div className="rounded-xl bg-background border border-border p-5 relative">
                  <p className="text-xs text-foreground-muted mb-1">Room Code</p>
                  <div className="flex items-center justify-center gap-3">
                    <p className="text-4xl font-extrabold text-sky-500 font-mono tracking-widest">{roomId}</p>
                    <button
                      onClick={handleCopyCode}
                      className="p-2 rounded-lg bg-surface hover:bg-surface-hover text-foreground-secondary hover:text-foreground transition-colors border border-border cursor-pointer"
                      title="Copy Room Code"
                    >
                      {copied ? (
                        <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-green-500"><polyline points="20 6 9 17 4 12"></polyline></svg>
                      ) : (
                        <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path></svg>
                      )}
                    </button>
                  </div>
                  <p className="text-xs text-foreground-muted mt-2">Share with your friend</p>
                </div>

                <div className="space-y-1.5 text-sm text-foreground-secondary">
                  {room?.players.map((p, i) => (
                    <div key={p.id} className="flex items-center justify-center gap-2">
                      <div className="h-2 w-2 rounded-full bg-green-500" />
                      <span className="font-medium text-foreground">{p.username}</span>
                      {p.id === playerId && <span className="text-xs text-foreground-muted">(you)</span>}
                      {i === 0 && <span className="text-xs text-amber-500 font-bold">(host)</span>}
                    </div>
                  ))}
                </div>

                {isHost && (room?.players.length ?? 0) >= 2 && (
                  <motion.button
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                    onClick={startGame}
                    className="w-full rounded-xl bg-gradient-to-r from-sky-500 to-blue-600 py-3 text-sm font-bold text-white hover:from-sky-600 hover:to-blue-700 hover:-translate-y-0.5 transition-all shadow-lg cursor-pointer"
                  >
                    Start Game ({room?.players.length}/4)
                  </motion.button>
                )}

                <div>
                  <button
                    onClick={handleLeaveRoom}
                    className="text-sm text-foreground-muted hover:text-red-500 transition-colors underline cursor-pointer"
                  >
                    Cancel
                  </button>
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
                onSellProperty={sellProperty}
                onPayDebt={payDebt}
                onDeclareBankruptcy={declareBankruptcy}
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
      </div>
    </>
  );
}
