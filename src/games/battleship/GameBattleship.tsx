'use client';

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useAuth } from '@/components/auth';
import { LoginModal } from '@/components/auth/LoginModal';
import { useBattleship, SHIPS_CONFIG } from './useBattleship';
import { Grid } from './Grid';

type Screen = 'lobby' | 'waiting' | 'playing' | 'finished';

export function GameBattleship() {
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
  const [statusMsg, setStatusMsg] = useState('Waiting for opponent...');
  const [roomId, setRoomId] = useState('');

  const {
    room,
    playerId,
    phase,
    myState,
    enemyShots,
    currentTurnPlayerId,
    winner,
    error,
    placedShips,
    currentShipIndex,
    isVertical,
    handlePlaceShip,
    rotateShip,
    resetPlacement,
    readyUp,
    fire,
    restart,
    leaveRoom,
    joinRoom: hookJoinRoom,
    sunkEnemyShips,
    enemySunkTypes,
    revealedEnemyShips,
    localShots,
  } = useBattleship(user?.username || '');

  const isMyTurn = currentTurnPlayerId === playerId;
  const currentShip = SHIPS_CONFIG[currentShipIndex];
  const allShipsPlaced = placedShips.length === SHIPS_CONFIG.length;

  // Sync hook state with screen
  useEffect(() => {
    if (room && room.players.length >= 2 && screenRef.current === 'waiting') {
      // Two players connected — move to playing
      setScreen('playing');
    }
  }, [room, setScreen]);

  useEffect(() => {
    if (phase === 'finished' && winner) {
      setScreen('finished');
    }
  }, [phase, winner, setScreen]);

  // Listen for player count changes while waiting
  useEffect(() => {
    if (room) {
      if (room.players.length < 2) {
        setStatusMsg('Waiting for opponent...');
      } else {
        setStatusMsg('2/2 players connected');
      }
    }
  }, [room?.players.length]);

  const handleCreateRoom = () => {
    if (!user) { setShowLogin(true); return; }
    const newId = Math.random().toString(36).slice(2, 8).toUpperCase();
    setRoomId(newId);
    hookJoinRoom(newId, 'create');
    setScreen('waiting');
  };

  const handleJoinRoom = () => {
    if (!user) { setShowLogin(true); return; }
    const id = joinInput.trim().toUpperCase();
    if (!id) { setJoinError('Please enter a room code.'); return; }
    setJoinError('');
    setRoomId(id);
    hookJoinRoom(id, 'join');
    setScreen('waiting');
  };

  const handleLeaveRoom = () => {
    leaveRoom(roomId);
    setScreen('lobby');
    setRoomId('');
    setJoinInput('');
    setJoinError('');
    setStatusMsg('Waiting for opponent...');
  };

  const handleRematch = () => {
    restart();
    setScreen('playing');
  };

  // Ships remaining count
  const getShipsRemaining = () => {
    if (!myState?.ships) return SHIPS_CONFIG.length;
    return myState.ships.filter(s => s.hits < s.length).length;
  };

  return (
    <>
      {showLogin && (
        <LoginModal
          title="Enter your username"
          subtitle="You need a username to play Battleship"
          onSuccess={() => setShowLogin(false)}
          onClose={() => setShowLogin(false)}
        />
      )}

      <div className="flex flex-col items-center gap-6 mx-auto max-w-6xl px-4 pb-12">
        {/* Header */}
        <div className="w-full text-center sm:text-left">
          <h1 className="text-3xl sm:text-4xl font-extrabold text-foreground">
            Battle<span className="text-sky-500">ship</span>
          </h1>
          <p className="text-sm text-foreground-secondary mt-0.5">
            Strategic naval warfare — sink all enemy ships to win
          </p>
        </div>

        {/* ── LOBBY ─────────────────────────────────────────────── */}
        {screen === 'lobby' && (
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            className="w-full max-w-md mx-auto space-y-4"
          >
            <div className="rounded-2xl border border-border bg-surface p-6 space-y-4">
              <h2 className="text-lg font-bold text-foreground">Create a Room</h2>
              <p className="text-sm text-foreground-secondary">Start a new game and share the room code with your friend.</p>
              <button
                onClick={handleCreateRoom}
                className="w-full rounded-xl bg-gradient-to-r from-sky-500 to-blue-600 py-3 text-sm font-bold text-white hover:from-sky-600 hover:to-blue-700 hover:-translate-y-0.5 transition-all shadow-lg"
              >
                🚢 Create Room
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
        {screen === 'waiting' && (
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="w-full max-w-md mx-auto text-center"
          >
            <div className="rounded-2xl border border-border bg-surface p-8 space-y-5">
              <div className="h-12 w-12 rounded-full border-4 border-sky-500 border-t-transparent animate-spin mx-auto" />
              <h2 className="text-xl font-bold text-foreground">{statusMsg}</h2>

              <div className="rounded-xl bg-background border border-border p-5 relative">
                <p className="text-xs text-foreground-muted mb-1">Room Code</p>
                <div className="flex items-center justify-center gap-3">
                  <p className="text-4xl font-extrabold text-sky-500 font-mono tracking-widest">{roomId}</p>
                  <button
                    onClick={() => {
                      navigator.clipboard.writeText(roomId);
                      setCopied(true);
                      setTimeout(() => setCopied(false), 2000);
                    }}
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
                <p className="text-xs text-foreground-muted mt-2">Share with your friend</p>
              </div>

              <div className="space-y-1 text-sm text-foreground-secondary">
                {room?.players.map((p) => (
                  <div key={p.id} className="flex items-center justify-center gap-2">
                    <div className="h-2 w-2 rounded-full bg-green-500" />
                    <span>{p.username}</span>
                    {p.id === playerId && <span className="text-xs text-foreground-muted">(you)</span>}
                  </div>
                ))}
              </div>

              <button onClick={handleLeaveRoom} className="text-sm text-foreground-muted hover:text-red-500 transition-colors underline">
                Cancel
              </button>
            </div>
          </motion.div>
        )}

        {/* ── PLAYING / FINISHED ─────────────────────────────────── */}
        {(screen === 'playing' || screen === 'finished') && (
          <div className="w-full flex flex-col items-center gap-8">
            {/* Top Bar */}
            <div className="w-full flex flex-col md:flex-row items-center justify-between gap-4 bg-surface/50 border border-border p-4 rounded-2xl backdrop-blur-sm">
              <div className="flex items-center gap-4">
                <div className="h-10 w-10 bg-sky-500/10 rounded-xl flex items-center justify-center text-xl">⚓</div>
                <div>
                  <h2 className="font-bold text-foreground">Battleship</h2>
                  <p className="text-xs text-foreground-secondary font-mono uppercase tracking-wider">Room: {roomId}</p>
                </div>
              </div>

              <div className="flex items-center gap-8">
                {room?.players.map(p => (
                  <div key={p.id} className={`flex flex-col items-center px-4 py-2 rounded-xl transition-all ${
                    currentTurnPlayerId === p.id && phase === 'battle' 
                      ? 'bg-sky-500/10 border border-sky-500/30' 
                      : ''
                  }`}>
                    <span className={`text-xs uppercase tracking-widest font-bold ${
                      currentTurnPlayerId === p.id && phase === 'battle' ? 'text-sky-500' : 'text-foreground-muted'
                    }`}>
                      {p.id === playerId ? 'YOU' : 'ENEMY'}
                    </span>
                    <span className="text-sm font-black">{p.username}</span>
                  </div>
                ))}
              </div>

              <div className={`px-4 py-2 rounded-lg text-sm font-bold uppercase tracking-widest border ${
                phase === 'placement' 
                  ? 'bg-amber-500/10 border-amber-500/30 text-amber-500'
                  : phase === 'battle'
                    ? isMyTurn 
                      ? 'bg-sky-500/10 border-sky-500/30 text-sky-500'
                      : 'bg-red-500/10 border-red-500/30 text-red-400'
                    : 'bg-surface border-border text-foreground-muted'
              }`}>
                {phase === 'placement' ? '🔧 Placement' : phase === 'battle' ? (isMyTurn ? '🎯 Your Turn' : '💣 Enemy Turn') : '🏁 Game Over'}
              </div>
            </div>

            {/* GAME OVER BANNER */}
            <AnimatePresence>
              {screen === 'finished' && winner && (
                <motion.div
                  initial={{ opacity: 0, height: 0, y: -20 }}
                  animate={{ opacity: 1, height: 'auto', y: 0 }}
                  exit={{ opacity: 0, height: 0 }}
                  className="w-full overflow-hidden"
                >
                  <div className={`w-full flex flex-col md:flex-row items-center justify-between p-6 rounded-2xl border shadow-xl relative mt-2 mb-6 ${
                    winner.id === playerId
                      ? 'bg-gradient-to-r from-green-500/10 to-emerald-500/10 border-green-500/30'
                      : 'bg-gradient-to-r from-red-500/10 to-rose-500/10 border-red-500/30'
                  }`}>
                    <div className="flex items-center gap-6 relative z-10">
                      <div className="text-5xl">{winner.id === playerId ? '🏆' : '💥'}</div>
                      <div>
                        <h2 className={`text-3xl font-black tracking-tighter ${
                          winner.id === playerId ? 'text-green-500' : 'text-red-500'
                        }`}>
                          {winner.id === playerId ? 'VICTORY!' : 'DEFEAT!'}
                        </h2>
                        <p className="text-foreground-secondary mt-1">
                          {winner.id === playerId
                            ? 'You have obliterated the enemy fleet.'
                            : `${winner.name} has sunken your entire fleet.`}
                        </p>
                      </div>
                    </div>

                    <div className="flex gap-3 mt-6 md:mt-0 relative z-10 w-full md:w-auto">
                      <button
                        onClick={handleRematch}
                        disabled={!room || room.players.length < 2}
                        className={`px-8 py-3 font-bold rounded-xl shadow-lg transition-all flex-1 md:flex-none ${
                          room && room.players.length >= 2
                            ? 'bg-gradient-to-r from-sky-500 to-blue-600 text-white shadow-sky-500/20 hover:-translate-y-0.5'
                            : 'bg-surface-hover text-foreground-muted cursor-not-allowed'
                        }`}
                      >
                        {room && room.players.length >= 2 ? 'PLAY AGAIN' : 'Waiting for opponent...'}
                      </button>
                    </div>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

            {/* Boards */}
            <div className="w-full flex flex-col lg:flex-row items-center lg:items-start justify-center gap-12">
              {/* LEFT: Your Fleet */}
              <div className="flex flex-col gap-4">
                <h3 className="text-center font-bold text-foreground-muted uppercase tracking-widest text-xs flex items-center justify-center gap-2">
                  <span>🛡️</span> Your Fleet
                </h3>
                <Grid
                  ships={phase === 'placement' ? placedShips : (myState?.ships || [])}
                  shots={enemyShots}
                  showShips={true}
                  disabled={phase !== 'placement'}
                  onCellClick={handlePlaceShip}
                  isOwnBoard={true}
                />

                {/* Placement Controls */}
                {phase === 'placement' && (
                  <motion.div
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="bg-surface border border-border p-5 rounded-2xl space-y-4"
                  >
                    {/* Ship Queue */}
                    <div className="space-y-2">
                      <p className="text-xs font-bold text-foreground-muted uppercase tracking-wider">Ship Queue</p>
                      <div className="flex flex-wrap gap-2">
                        {SHIPS_CONFIG.map((ship, idx) => {
                          const isPlaced = idx < currentShipIndex;
                          const isCurrent = idx === currentShipIndex;
                          return (
                            <div
                              key={ship.type}
                              className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-bold transition-all ${
                                isPlaced
                                  ? 'bg-green-500/10 text-green-500 border border-green-500/20'
                                  : isCurrent
                                    ? 'bg-sky-500/10 text-sky-500 border border-sky-500/30 ring-1 ring-sky-500/30'
                                    : 'bg-background text-foreground-muted border border-border'
                              }`}
                            >
                              {isPlaced ? '✓' : ''}
                              <span>{ship.label}</span>
                              <span className="opacity-60">({ship.length})</span>
                            </div>
                          );
                        })}
                      </div>
                    </div>

                    {/* Current Ship Indicator */}
                    {currentShip && (
                      <div className="flex items-center justify-between bg-sky-500/5 border border-sky-500/20 rounded-xl px-4 py-3">
                        <div className="flex items-center gap-2">
                          <span className="text-lg">🚢</span>
                          <div>
                            <p className="text-sm font-bold text-foreground">{currentShip.label}</p>
                            <p className="text-xs text-foreground-muted">Size: {currentShip.length} cells • {isVertical ? 'Vertical' : 'Horizontal'}</p>
                          </div>
                        </div>
                        {/* Preview of ship size */}
                        <div className={`flex ${isVertical ? 'flex-col' : 'flex-row'} gap-0.5`}>
                          {Array.from({ length: currentShip.length }).map((_, i) => (
                            <div key={i} className="w-4 h-4 bg-sky-500/40 rounded-sm border border-sky-500/50" />
                          ))}
                        </div>
                      </div>
                    )}

                    <div className="grid grid-cols-2 gap-3">
                      <button
                        onClick={rotateShip}
                        disabled={allShipsPlaced}
                        className="py-2.5 bg-background border border-border rounded-xl text-xs font-bold hover:bg-surface-hover transition-all disabled:opacity-40 flex items-center justify-center gap-1.5"
                      >
                        <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="1 4 1 10 7 10"></polyline><path d="M3.51 15a9 9 0 1 0 2.13-9.36L1 10"></path></svg>
                        ROTATE ({isVertical ? 'V' : 'H'})
                      </button>
                      <button
                        onClick={resetPlacement}
                        className="py-2.5 bg-background border border-border rounded-xl text-xs font-bold hover:bg-red-500/10 hover:text-red-500 hover:border-red-500/30 transition-all flex items-center justify-center gap-1.5"
                      >
                        <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 6h18"></path><path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6"></path></svg>
                        RESET
                      </button>
                    </div>

                    <button
                      onClick={readyUp}
                      disabled={!allShipsPlaced || myState?.ready}
                      className={`w-full py-3 font-bold rounded-xl shadow-lg transition-all ${
                        allShipsPlaced && !myState?.ready
                          ? 'bg-gradient-to-r from-green-500 to-emerald-600 text-white shadow-green-500/20 hover:-translate-y-0.5'
                          : 'bg-surface-hover text-foreground-muted border border-border'
                      }`}
                    >
                      {myState?.ready ? '⏳ WAITING FOR ENEMY...' : allShipsPlaced ? '✅ LOCK FLEET & READY' : `Place ${SHIPS_CONFIG.length - placedShips.length} more ship(s)`}
                    </button>
                  </motion.div>
                )}

                {/* Ship Status in Battle Phase */}
                {phase !== 'placement' && myState?.ships && (
                  <div className="bg-surface border border-border p-4 rounded-xl space-y-2">
                    <p className="text-xs font-bold text-foreground-muted uppercase tracking-wider">Fleet Status</p>
                    <div className="grid grid-cols-1 gap-1.5">
                      {myState.ships.map((ship) => {
                        const isSunk = ship.hits >= ship.length;
                        return (
                          <div
                            key={ship.type}
                            className={`flex items-center justify-between px-3 py-1.5 rounded-lg text-xs transition-all ${
                              isSunk
                                ? 'bg-red-500/10 text-red-400 line-through'
                                : 'bg-background text-foreground'
                            }`}
                          >
                            <span className="font-bold">{ship.type.charAt(0).toUpperCase() + ship.type.slice(1)}</span>
                            <div className="flex gap-0.5">
                              {Array.from({ length: ship.length }).map((_, i) => (
                                <div
                                  key={i}
                                  className={`w-3 h-3 rounded-sm border ${
                                    i < ship.hits
                                      ? 'bg-red-500 border-red-600'
                                      : 'bg-green-500/30 border-green-500/40'
                                  }`}
                                />
                              ))}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}
              </div>

              {/* RIGHT: Enemy Waters */}
              {phase !== 'placement' && (
                <motion.div
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  className="flex flex-col gap-4"
                >
                  <h3 className="text-center font-bold text-foreground-muted uppercase tracking-widest text-xs flex items-center justify-center gap-2">
                    <span>🎯</span> Enemy Waters
                  </h3>
                  <Grid
                    shots={localShots}
                    onCellClick={fire}
                    activeTurn={isMyTurn}
                    disabled={!isMyTurn || phase === 'finished'}
                    isOwnBoard={false}
                    revealedShips={revealedEnemyShips.length > 0 ? revealedEnemyShips : sunkEnemyShips}
                  />

                  <div className={`border p-4 rounded-xl text-center transition-all ${
                    isMyTurn && phase === 'battle'
                      ? 'bg-sky-500/5 border-sky-500/20'
                      : 'bg-surface/30 border-border'
                  }`}>
                    <p className="text-xs text-foreground-muted italic">
                      {phase === 'finished' 
                        ? '🏁 Game over!'
                        : isMyTurn 
                          ? '🎯 Select a coordinate to fire upon the enemy fleet.' 
                          : '💣 Brace for impact! Enemy is targeting your fleet...'
                      }
                    </p>
                  </div>

                  {/* Shot Stats */}
                  {myState?.shots && myState.shots.length > 0 && (
                    <div className="bg-surface border border-border p-4 rounded-xl">
                      <div className="flex items-center justify-around text-center">
                        <div>
                          <p className="text-lg font-black text-sky-500">{myState.shots.filter(s => s.result !== 'miss').length}</p>
                          <p className="text-[10px] text-foreground-muted uppercase tracking-wider">Hits</p>
                        </div>
                        <div className="w-px h-8 bg-border" />
                        <div>
                          <p className="text-lg font-black text-foreground-muted">{myState.shots.filter(s => s.result === 'miss').length}</p>
                          <p className="text-[10px] text-foreground-muted uppercase tracking-wider">Misses</p>
                        </div>
                        <div className="w-px h-8 bg-border" />
                        <div>
                          <p className="text-lg font-black text-red-500">{enemySunkTypes.length}</p>
                          <p className="text-[10px] text-foreground-muted uppercase tracking-wider">Sunk</p>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Enemy Fleet Tracker */}
                  <div className="bg-surface border border-border p-4 rounded-xl space-y-2">
                    <div className="flex items-center justify-between">
                      <p className="text-xs font-bold text-foreground-muted uppercase tracking-wider">Enemy Fleet</p>
                      <span className="text-xs font-bold text-sky-500">
                        {SHIPS_CONFIG.length - enemySunkTypes.length}/{SHIPS_CONFIG.length} remaining
                      </span>
                    </div>
                    <div className="grid grid-cols-1 gap-1.5">
                      {SHIPS_CONFIG.map((ship) => {
                        const isSunk = enemySunkTypes.includes(ship.type);
                        return (
                          <div
                            key={ship.type}
                            className={`flex items-center justify-between px-3 py-2 rounded-lg text-xs transition-all ${
                              isSunk
                                ? 'bg-red-500/10 border border-red-500/20'
                                : 'bg-background border border-border'
                            }`}
                          >
                            <span className={`font-bold ${isSunk ? 'text-red-400 line-through' : 'text-foreground'}`}>
                              {ship.label}
                            </span>
                            <div className="flex items-center gap-2">
                              <div className={`flex gap-0.5 ${isSunk ? 'opacity-40' : ''}`}>
                                {Array.from({ length: ship.length }).map((_, i) => (
                                  <div
                                    key={i}
                                    className={`w-3 h-3 rounded-sm border ${
                                      isSunk
                                        ? 'bg-red-500/60 border-red-600/50'
                                        : 'bg-slate-500/30 border-slate-500/40'
                                    }`}
                                  />
                                ))}
                              </div>
                              {isSunk && <span className="text-[10px]">💀</span>}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                </motion.div>
              )}
            </div>

            {/* Leave button */}
            <button
              onClick={handleLeaveRoom}
              className="rounded-xl border border-border px-6 py-2 text-sm text-foreground-muted hover:border-red-400 hover:text-red-400 transition-all"
            >
              Leave Room
            </button>

          </div>
        )}

        {/* Error toast */}
        <AnimatePresence>
          {error && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 20 }}
              className="fixed bottom-8 left-1/2 -translate-x-1/2 px-6 py-3 bg-red-500 text-white rounded-full shadow-lg font-bold text-sm z-50"
            >
              {error}
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </>
  );
}
