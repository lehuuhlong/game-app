'use client';

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useAuth } from '@/components/auth';
import { LoginModal } from '@/components/auth/LoginModal';
import { useBattleship, SHIPS_CONFIG } from './useBattleship';
import { Grid } from './Grid';
import { SHIP_COLORS } from './types';
import { HeadToHeadBadge } from '@/components/shared/HeadToHeadBadge';

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
    endReason,
    error,
    placedShips,
    isVertical,
    handlePlaceShip,
    placeNextAvailableShip,
    rotatePlacedShip,
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
    joinError: hookJoinError,
    moveShip,
  } = useBattleship(user?.username || '');

  const isMyTurn = currentTurnPlayerId === playerId;
  const opponent = room?.players.find(p => p.id !== playerId);
  const allShipsPlaced = placedShips.length === SHIPS_CONFIG.length;

  const handleShipDrop = useCallback((shipType: string, x: number, y: number, offsetX: number, offsetY: number) => {
    const targetX = Math.max(0, Math.min(9, x - offsetX));
    const targetY = Math.max(0, Math.min(9, y - offsetY));
    
    const isUnplaced = !placedShips.some(s => s.type === shipType);
    if (isUnplaced) {
      handlePlaceShip(shipType, targetX, targetY, isVertical);
    } else {
      moveShip(shipType as any, targetX, targetY);
    }
  }, [placedShips, isVertical, handlePlaceShip, moveShip]);

  // Handle Space to rotate
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.code === 'Space' && phase === 'placement' && !myState?.ready) {
        e.preventDefault();
        rotateShip();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [phase, myState?.ready, rotateShip]);

  // ── Screen transitions (reactive, driven by hook state) ─────────

  // lobby → waiting: fires as soon as server confirms room_joined
  useEffect(() => {
    if (room && playerId && screenRef.current === 'lobby') {
      setScreen('waiting');
    }
  }, [room, playerId, setScreen]);

  // waiting → playing: fires when 2nd player joins
  useEffect(() => {
    if (room && room.players.length >= 2 && screenRef.current === 'waiting') {
      setScreen('playing');
    }
  }, [room, setScreen]);

  // playing → finished
  useEffect(() => {
    if (phase === 'finished' && winner) {
      setScreen('finished');
    }
  }, [phase, winner, setScreen]);

  // finished → playing (Rematch initiated by either player)
  useEffect(() => {
    if (phase === 'placement' && screenRef.current === 'finished') {
      setScreen('playing');
    }
  }, [phase, setScreen]);

  // Status message
  useEffect(() => {
    if (room) {
      setStatusMsg(room.players.length < 2 ? 'Waiting for opponent...' : '2/2 players connected');
    }
  }, [room?.players.length]);

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
              {(joinError || hookJoinError) && <p className="text-sm text-red-500">{joinError || hookJoinError}</p>}
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
                  <div className="flex items-center gap-2">
                    <p className="text-xs text-foreground-secondary font-mono uppercase tracking-wider">Room: {roomId}</p>
                    {user?.username && opponent?.username && (
                      <HeadToHeadBadge
                        player1={user.username}
                        player2={opponent.username}
                        gameType="battleship"
                        compact
                      />
                    )}
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-8">
                {room?.players.map(p => (
                  <div key={p.id} className={`flex flex-col items-center px-4 py-2 rounded-xl transition-all ${
                    currentTurnPlayerId === p.id && phase === 'battle' 
                      ? p.id === playerId
                        ? 'bg-emerald-500/10 border border-emerald-500/30'
                        : 'bg-red-500/10 border border-red-500/30' 
                      : ''
                  }`}>
                    <span className={`text-xs uppercase tracking-widest font-bold ${
                      currentTurnPlayerId === p.id && phase === 'battle'
                        ? p.id === playerId
                          ? 'text-emerald-400'
                          : 'text-red-400'
                        : 'text-foreground-muted'
                    }`}>
                      {p.id === playerId ? 'YOU' : 'ENEMY'}
                    </span>
                    <span className="text-sm font-black">{p.username}</span>
                  </div>
                ))}
              </div>

              <div className={`px-4 py-2 rounded-xl text-sm font-bold uppercase tracking-widest border transition-all ${
                phase === 'placement' 
                  ? 'bg-amber-500/10 border-amber-500/30 text-amber-500'
                  : phase === 'battle'
                    ? isMyTurn 
                      ? 'bg-emerald-500/15 border-emerald-500/40 text-emerald-400 shadow-[0_0_15px_rgba(16,185,129,0.3)] animate-pulse'
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
                        <p className="text-foreground-secondary mt-1 font-medium">
                          {winner.id === playerId
                            ? endReason === 'disconnect'
                              ? '🏃 Opponent left the match — You win!'
                              : '🏆 You have obliterated the entire enemy fleet!'
                            : endReason === 'disconnect'
                            ? '🚪 You left the match.'
                            : `💥 ${winner.name} has sunken your entire fleet.`}
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
              <div className="flex flex-col gap-4 w-full max-w-[390px]">
                <h3 className="text-center font-bold text-foreground-muted uppercase tracking-widest text-xs flex items-center justify-center gap-2">
                  <span>🛡️</span> Your Fleet
                </h3>
                <Grid
                  ships={phase === 'placement' ? placedShips : (myState?.ships || [])}
                  shots={enemyShots}
                  showShips={true}
                  disabled={phase !== 'placement' || myState?.ready}
                  onCellClick={placeNextAvailableShip}
                  onCellContextMenu={(x, y) => {
                    const ship = placedShips.find(s => {
                      if (s.vertical) return s.x === x && y >= s.y && y < s.y + s.length;
                      return y === s.y && x >= s.x && x < s.x + s.length;
                    });
                    if (ship) {
                      rotatePlacedShip(ship.type);
                    } else {
                      rotateShip();
                    }
                  }}
                  onShipDrop={handleShipDrop}
                  isOwnBoard={true}
                />

                {/* Ship Status in Battle Phase — computed from enemyShots for realtime accuracy */}
                {phase !== 'placement' && myState?.ships && (() => {
                  // Count hits per ship from enemyShots (updates immediately via bs_fire_result)
                  const shipsWithLiveHits = myState.ships.map((ship) => {
                    const hitCount = enemyShots.filter((shot) => {
                      if (shot.result === 'miss') return false;
                      if (ship.vertical) {
                        return shot.x === ship.x && shot.y >= ship.y && shot.y < ship.y + ship.length;
                      } else {
                        return shot.y === ship.y && shot.x >= ship.x && shot.x < ship.x + ship.length;
                      }
                    }).length;
                    return { ...ship, liveHits: hitCount };
                  });

                  return (
                    <div className="bg-surface border border-border p-4 rounded-2xl space-y-3 shadow-sm">
                      <div className="flex items-center justify-between">
                        <p className="text-xs font-bold text-foreground-muted uppercase tracking-wider">Fleet Status</p>
                        <span className="text-xs font-bold text-sky-400">
                          {shipsWithLiveHits.filter(s => s.liveHits < s.length).length}/{shipsWithLiveHits.length} afloat
                        </span>
                      </div>
                      <div className="grid grid-cols-1 gap-1.5">
                        {shipsWithLiveHits.map((ship) => {
                          const isSunk = ship.liveHits >= ship.length;
                          const label = SHIPS_CONFIG.find(s => s.type === ship.type)?.label || (ship.type.charAt(0).toUpperCase() + ship.type.slice(1));
                          return (
                            <div
                              key={ship.type}
                              className={`flex items-center justify-between px-3.5 py-2.5 rounded-xl text-xs transition-all ${
                                isSunk
                                  ? 'bg-red-500/10 border border-red-500/20 text-red-400'
                                  : 'bg-background border border-border text-foreground'
                              }`}
                            >
                              <span className="font-bold">
                                {label}
                              </span>
                              <div className="flex items-center gap-1.5">
                                <div className="flex gap-1">
                                  {Array.from({ length: ship.length }).map((_, i) => (
                                    <div
                                      key={i}
                                      className={`w-3 h-3 rounded-full border transition-all ${
                                        i < ship.liveHits
                                          ? 'bg-red-500 border-red-600 shadow-[0_0_4px_rgba(239,68,68,0.4)]'
                                          : 'bg-emerald-500/30 border-emerald-500/40'
                                      }`}
                                    />
                                  ))}
                                </div>
                                {isSunk && <span className="text-xs ml-1">💀</span>}
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  );
                })()}
              </div>
              {/* RIGHT: Placement Controls OR Enemy Waters */}
              {phase === 'placement' ? (
                <div className="flex flex-col w-full max-w-sm">
                  {/* Placement Controls */}
                  <motion.div
                    initial={{ opacity: 0, x: 20 }}
                    animate={{ opacity: 1, x: 0 }}
                    className="bg-surface border border-border p-5 rounded-2xl space-y-4 shadow-xl"
                  >
                    {/* Orientation & Tips */}
                    <div className="bg-sky-500/5 border border-sky-500/20 rounded-xl p-3.5 mb-2">
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-xs font-bold text-foreground">Placement Direction:</span>
                        <span className={`px-2 py-1 rounded-md border text-[10px] font-bold uppercase tracking-wider ${isVertical ? 'bg-indigo-500/10 border-indigo-500/20 text-indigo-400' : 'bg-amber-500/10 border-amber-500/20 text-amber-400'}`}>
                          {isVertical ? '↕️ Vertical' : '↔️ Horizontal'}
                        </span>
                      </div>
                      <p className="text-[11px] text-foreground-muted leading-relaxed">
                        💡 <strong className="text-foreground">Tip:</strong> Press <kbd className="px-1.5 py-0.5 bg-surface border border-border rounded font-mono shadow-sm mx-0.5">Space</kbd> or <strong className="text-foreground">Right-Click</strong> on the board to rotate ship orientation.
                      </p>
                    </div>

                    {/* Unplaced Ships List */}
                    <div className="space-y-3">
                      <div className="flex items-center justify-between">
                        <p className="text-xs font-bold text-foreground-muted uppercase tracking-wider">Unplaced Ships</p>
                        <span className="text-[10px] text-foreground-muted">Drag to board or click board</span>
                      </div>
                      
                      <div className="flex flex-col gap-3 min-h-[160px]">
                        {SHIPS_CONFIG.filter(s => !placedShips.some(ps => ps.type === s.type)).map((ship) => {
                          const colors = SHIP_COLORS[ship.type as keyof typeof SHIP_COLORS];
                          return (
                            <div 
                              key={ship.type}
                              draggable={!myState?.ready}
                              onDragStart={(e) => {
                                e.dataTransfer.setData('shipType', ship.type);
                                e.dataTransfer.setData('offsetX', '0');
                                e.dataTransfer.setData('offsetY', '0');
                              }}
                              className={`flex items-center justify-between bg-surface border border-border rounded-xl px-4 py-3 ${!myState?.ready ? 'cursor-grab active:cursor-grabbing hover:bg-surface-hover hover:-translate-y-0.5' : ''} transition-all shadow-sm`}
                            >
                              <div className="flex flex-col">
                                <span className="text-sm font-bold text-foreground">{ship.label}</span>
                                <span className="text-xs text-foreground-muted">Size: {ship.length}</span>
                              </div>
                              {/* Preview of ship */}
                              <div className="flex flex-row gap-0.5">
                                {Array.from({ length: ship.length }).map((_, i) => (
                                  <div key={i} className={`w-5 h-5 rounded-sm shadow-inner opacity-80 ${colors?.bg || 'bg-slate-500'}`} />
                                ))}
                              </div>
                            </div>
                          );
                        })}
                        {allShipsPlaced && (
                          <div className="flex-1 flex flex-col items-center justify-center text-center p-4 border border-dashed border-border rounded-xl text-foreground-muted bg-green-500/5">
                            <span className="text-2xl mb-2">✅</span>
                            <span className="text-sm font-bold text-green-500">All ships placed!</span>
                          </div>
                        )}
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-3 pt-2">
                      <button
                        onClick={rotateShip}
                        disabled={allShipsPlaced}
                        className="py-2.5 bg-background border border-border rounded-xl text-xs font-bold hover:bg-surface-hover transition-all disabled:opacity-40 flex items-center justify-center gap-1.5 shadow-sm"
                      >
                        <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="1 4 1 10 7 10"></polyline><path d="M3.51 15a9 9 0 1 0 2.13-9.36L1 10"></path></svg>
                        ROTATE ({isVertical ? 'V' : 'H'})
                      </button>
                      <button
                        onClick={resetPlacement}
                        disabled={myState?.ready}
                        className="py-2.5 bg-background border border-border rounded-xl text-xs font-bold hover:bg-red-500/10 hover:text-red-500 hover:border-red-500/30 transition-all flex items-center justify-center gap-1.5 disabled:opacity-40 shadow-sm"
                      >
                        <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 6h18"></path><path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6"></path></svg>
                        RESET
                      </button>
                    </div>

                    <button
                      onClick={readyUp}
                      disabled={!allShipsPlaced || myState?.ready}
                      className={`w-full py-3.5 font-bold rounded-xl shadow-lg transition-all mt-2 ${
                        allShipsPlaced && !myState?.ready
                          ? 'bg-gradient-to-r from-green-500 to-emerald-600 text-white shadow-green-500/20 hover:-translate-y-0.5 ring-2 ring-green-500/30 ring-offset-2 ring-offset-background'
                          : 'bg-surface-hover text-foreground-muted border border-border'
                      }`}
                    >
                      {myState?.ready ? '⏳ WAITING FOR ENEMY...' : allShipsPlaced ? '✅ LOCK FLEET & READY' : `Place ${SHIPS_CONFIG.length - placedShips.length} more ship(s)`}
                    </button>
                  </motion.div>
                </div>
              ) : (
                <motion.div
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  className="flex flex-col gap-4 w-full max-w-[390px]"
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

                  {/* Enemy Fleet Tracker */}
                  <div className="bg-surface border border-border p-4 rounded-2xl space-y-3 shadow-sm">
                    <div className="flex items-center justify-between">
                      <p className="text-xs font-bold text-foreground-muted uppercase tracking-wider">Enemy Fleet</p>
                      <span className="text-xs font-bold text-sky-400">
                        {SHIPS_CONFIG.length - enemySunkTypes.length}/{SHIPS_CONFIG.length} remaining
                      </span>
                    </div>
                    <div className="grid grid-cols-1 gap-1.5">
                      {SHIPS_CONFIG.map((ship) => {
                        const isSunk = enemySunkTypes.includes(ship.type);
                        return (
                          <div
                            key={ship.type}
                            className={`flex items-center justify-between px-3.5 py-2.5 rounded-xl text-xs transition-all ${
                              isSunk
                                ? 'bg-red-500/10 border border-red-500/20 text-red-400'
                                : 'bg-background border border-border text-foreground'
                            }`}
                          >
                            <span className="font-bold">
                              {ship.label}
                            </span>
                            <div className="flex items-center gap-1.5">
                              <div className={`flex gap-1 ${isSunk ? 'opacity-40' : ''}`}>
                                {Array.from({ length: ship.length }).map((_, i) => (
                                  <div
                                    key={i}
                                    className={`w-3 h-3 rounded-full border transition-all ${
                                      isSunk
                                        ? 'bg-red-500/60 border-red-600/50 shadow-[0_0_4px_rgba(239,68,68,0.4)]'
                                        : 'bg-slate-500/30 border-slate-500/40'
                                    }`}
                                  />
                                ))}
                              </div>
                              {isSunk && <span className="text-xs ml-1">💀</span>}
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
      </div>
    </>
  );
}
