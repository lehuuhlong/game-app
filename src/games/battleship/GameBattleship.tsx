'use client';

import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useAuth } from '@/components/auth';
import { LoginModal } from '@/components/auth/LoginModal';
import { useBattleship, SHIPS_CONFIG } from './useBattleship';
import { Grid } from './Grid';

export function GameBattleship() {
  const { user } = useAuth();
  const [roomIdInput, setRoomIdInput] = useState('');
  const [showLogin, setShowLogin] = useState(false);

  // Note: Normally we'd get roomId from URL or parent, but for now let's handle lobby here
  // similar to how GameWordChain does it.
  const [gameStarted, setGameStarted] = useState(false);
  const [activeRoomId, setActiveRoomId] = useState<string | null>(null);

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
    restart
  } = useBattleship(activeRoomId || '', user?.username || '');

  const isMyTurn = currentTurnPlayerId === playerId;
  const currentShip = SHIPS_CONFIG[currentShipIndex];

  const handleCreateRoom = () => {
    if (!user) {
      setShowLogin(true);
      return;
    }
    const id = Math.random().toString(36).substring(2, 8).toUpperCase();
    setActiveRoomId(id);
    setGameStarted(true);
  };

  const handleJoinRoom = () => {
    if (!user) {
      setShowLogin(true);
      return;
    }
    if (roomIdInput.length === 6) {
      setActiveRoomId(roomIdInput.toUpperCase());
      // setGameStarted(true);
    }
  };

  if (!gameStarted || !activeRoomId) {
    return (
      <div className="flex flex-col items-center gap-6 max-w-md mx-auto mt-12">
        <div className="text-center space-y-2">
          <h1 className="text-4xl font-black text-foreground tracking-tighter italic">
            BATTLE<span className="text-sky-500">SHIP</span>
          </h1>
          <p className="text-foreground-secondary text-sm">Strategic naval warfare</p>
        </div>

        <div className="w-full bg-surface border border-border p-6 rounded-2xl shadow-xl space-y-6">
          <div className="space-y-3">
            <h2 className="text-lg font-bold text-foreground">Create Game -- <span className="text-sky-500">Coming soon</span></h2>
            <button
              onClick={handleCreateRoom}
              disabled={true}
              className="w-full py-3 bg-gradient-to-r from-sky-500 to-blue-600 text-white font-bold rounded-xl shadow-lg shadow-sky-500/20 hover:scale-[1.02] active:scale-[0.98] disabled:opacity-50 transition-all"
            >
              Start New Fleet
            </button>
          </div>

          <div className="relative">
            <div className="absolute inset-0 flex items-center"><span className="w-full border-t border-border" /></div>
            <div className="relative flex justify-center text-xs uppercase"><span className="bg-surface px-2 text-foreground-muted">Or join existing</span></div>
          </div>

          <div className="space-y-3">
            <input
              type="text"
              placeholder="ENTER ROOM CODE"
              value={roomIdInput}
              onChange={(e) => setRoomIdInput(e.target.value.toUpperCase())}
              className="w-full bg-background border border-border px-4 py-3 rounded-xl text-center font-mono font-bold tracking-widest focus:outline-none focus:ring-2 focus:ring-sky-500/50"
              maxLength={6}
            />
            <button
              onClick={handleJoinRoom}
              disabled={roomIdInput.length !== 6}
              className="w-full py-3 bg-surface-hover border border-border text-foreground font-bold rounded-xl hover:bg-background transition-colors disabled:opacity-50"
            >
              Join Battle
            </button>
          </div>
        </div>

        {showLogin && <LoginModal onClose={() => setShowLogin(false)} onSuccess={() => setShowLogin(false)} />}
      </div>
    );
  }

  // ── LOADING / WAITING ────────────────────────────────────────────────
  if (!room || room.players.length < 2) {
    return (
      <div className="flex flex-col items-center justify-center gap-6 mt-20">
        <div className="relative">
          <div className="w-20 h-20 border-4 border-sky-500/20 border-t-sky-500 rounded-full animate-spin" />
          <div className="absolute inset-0 flex items-center justify-center text-xl">⚓</div>
        </div>
        <div className="text-center space-y-2">
          <h2 className="text-2xl font-bold text-foreground tracking-tight">Waiting for Enemy</h2>
          <p className="text-foreground-secondary">Share this code with your opponent:</p>
          <div className="bg-surface border border-border px-6 py-3 rounded-xl inline-block mt-2">
            <span className="text-3xl font-black text-sky-500 font-mono tracking-[0.2em]">{activeRoomId}</span>
          </div>
        </div>
        <button onClick={() => setGameStarted(false)} className="text-sm text-foreground-muted hover:text-red-500 underline transition-colors">Cancel</button>
      </div>
    );
  }

  return (
    <div className="flex flex-col items-center gap-8 w-full max-w-6xl mx-auto px-4 pb-12">
      {/* Header Info */}
      <div className="w-full flex flex-col md:flex-row items-center justify-between gap-4 bg-surface/50 border border-border p-4 rounded-2xl backdrop-blur-sm">
        <div className="flex items-center gap-4">
          <div className="h-10 w-10 bg-sky-500/10 rounded-xl flex items-center justify-center text-xl">🛥️</div>
          <div>
            <h2 className="font-bold text-foreground">Battleship</h2>
            <p className="text-xs text-foreground-secondary font-mono uppercase tracking-wider">Room: {activeRoomId}</p>
          </div>
        </div>

        <div className="flex items-center gap-8">
          {room.players.map(p => (
            <div key={p.id} className="flex flex-col items-center">
              <span className={`text-xs uppercase tracking-widest font-bold ${currentTurnPlayerId === p.id ? 'text-sky-500' : 'text-foreground-muted'}`}>
                {p.id === playerId ? 'YOU' : 'ENEMY'}
              </span>
              <span className="text-sm font-black">{p.username}</span>
            </div>
          ))}
        </div>

        <div className="px-4 py-2 bg-background border border-border rounded-lg text-sm font-bold uppercase tracking-widest">
          {phase === 'placement' ? 'Placement Phase' : phase === 'battle' ? (isMyTurn ? 'Your Turn' : 'Enemy Turn') : 'Game Over'}
        </div>
      </div>

      <div className="w-full flex flex-col lg:flex-row items-center lg:items-start justify-center gap-12">
        {/* LEFT BOARD: Placement or Own Grid */}
        <div className="flex flex-col gap-4">
          <h3 className="text-center font-bold text-foreground-muted uppercase tracking-widest text-xs">Your Fleet</h3>
          <Grid 
            ships={phase === 'placement' ? placedShips : (myState?.ships || [])}
            shots={enemyShots}
            showShips={true}
            disabled={phase !== 'placement'}
            onCellClick={handlePlaceShip}
          />

          {phase === 'placement' && (
            <div className="bg-surface border border-border p-5 rounded-2xl space-y-4">
              <div className="flex items-center justify-between">
                <span className="text-sm font-bold text-foreground">Next Ship:</span>
                <span className="px-2 py-1 bg-sky-500/10 text-sky-500 text-xs font-black rounded uppercase">
                  {currentShip ? `${currentShip.label} (${currentShip.length})` : 'All Placed'}
                </span>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <button
                  onClick={rotateShip}
                  className="py-2 bg-background border border-border rounded-lg text-xs font-bold hover:bg-surface-hover transition-colors"
                >
                  ROTATE ({isVertical ? 'VERTICAL' : 'HORIZONTAL'})
                </button>
                <button
                  onClick={resetPlacement}
                  className="py-2 bg-background border border-border rounded-lg text-xs font-bold hover:bg-red-500/10 hover:text-red-500 transition-colors"
                >
                  RESET
                </button>
              </div>

              <button
                onClick={readyUp}
                disabled={placedShips.length !== SHIPS_CONFIG.length || myState?.ready}
                className="w-full py-3 bg-sky-500 text-white font-bold rounded-xl shadow-lg shadow-sky-500/20 disabled:opacity-50 disabled:grayscale transition-all"
              >
                {myState?.ready ? 'WAITING FOR ENEMY...' : 'LOCK FLEET'}
              </button>
            </div>
          )}
        </div>

        {/* RIGHT BOARD: Enemy Water */}
        {phase !== 'placement' && (
          <motion.div 
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            className="flex flex-col gap-4"
          >
            <h3 className="text-center font-bold text-foreground-muted uppercase tracking-widest text-xs">Enemy Waters</h3>
            <Grid 
              shots={myState?.shots || []}
              onCellClick={fire}
              activeTurn={isMyTurn}
              disabled={!isMyTurn || phase === 'finished'}
            />
            
            <div className="bg-surface/30 border border-border p-4 rounded-xl text-center">
              <p className="text-xs text-foreground-muted italic">
                {isMyTurn ? "Select a coordinate to fire upon the enemy fleet." : "Brace for impact! Enemy is targeting your fleet..."}
              </p>
            </div>
          </motion.div>
        )}
      </div>

      {/* RESULT OVERLAY */}
      <AnimatePresence>
        {phase === 'finished' && winner && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="fixed inset-0 z-50 flex items-center justify-center bg-background/80 backdrop-blur-md p-4"
          >
            <motion.div
              initial={{ scale: 0.9, y: 20 }}
              animate={{ scale: 1, y: 0 }}
              className="bg-surface border border-border p-10 rounded-3xl shadow-2xl max-w-sm w-full text-center space-y-6"
            >
              <div className="text-6xl">{winner.id === playerId ? '🏆' : '💥'}</div>
              <div>
                <h2 className="text-3xl font-black text-foreground tracking-tighter">
                  {winner.id === playerId ? 'VICTORY!' : 'DEFEAT!'}
                </h2>
                <p className="text-foreground-secondary mt-1">
                  {winner.id === playerId ? 'You have obliterated the enemy fleet.' : `${winner.name} has sunken your entire fleet.`}
                </p>
              </div>
              <button
                onClick={restart}
                className="w-full py-4 bg-sky-500 text-white font-bold rounded-2xl shadow-xl shadow-sky-500/20 hover:scale-105 transition-all"
              >
                PLAY AGAIN
              </button>
              <button onClick={() => setGameStarted(false)} className="text-sm text-foreground-muted hover:text-foreground">Back to Lobby</button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {error && (
        <div className="fixed bottom-8 left-1/2 -translate-x-1/2 px-6 py-3 bg-red-500 text-white rounded-full shadow-lg font-bold text-sm animate-bounce">
          {error}
        </div>
      )}
    </div>
  );
}
