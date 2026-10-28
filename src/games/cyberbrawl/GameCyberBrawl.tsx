'use client';

import React, { useEffect, useState, useMemo } from 'react';
import { useCyberBrawl } from './useCyberBrawl';
import { RoundPhase } from './engine/types';

export function GameCyberBrawl() {
  const {
    canvasRef,
    hud,
    initEngine,
    rematch,
    toggleDebug,
  } = useCyberBrawl();

  // Damage ghost trails (delayed red bars)
  const [ghostP1Health, setGhostP1Health] = useState(hud.p1Health);
  const [ghostP2Health, setGhostP2Health] = useState(hud.p2Health);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const containerRef = React.useRef<HTMLDivElement>(null);

  // If health increases (rematch/heal), immediately update ghost bars during render
  if (hud.p1Health > ghostP1Health) {
    setGhostP1Health(hud.p1Health);
  }
  if (hud.p2Health > ghostP2Health) {
    setGhostP2Health(hud.p2Health);
  }

  // Initialize engine on mount once canvas is ready
  useEffect(() => {
    initEngine();
  }, [initEngine]);

  // Handle ghost health decay for Player 1 (Classic fighting game damage trail)
  useEffect(() => {
    if (hud.p1Health < ghostP1Health) {
      const timer = setTimeout(() => {
        setGhostP1Health(hud.p1Health);
      }, 400);
      return () => clearTimeout(timer);
    }
  }, [hud.p1Health, ghostP1Health]);

  // Handle ghost health decay for Player 2
  useEffect(() => {
    if (hud.p2Health < ghostP2Health) {
      const timer = setTimeout(() => {
        setGhostP2Health(hud.p2Health);
      }, 400);
      return () => clearTimeout(timer);
    }
  }, [hud.p2Health, ghostP2Health]);

  // Health percentages
  const p1HealthPct = Math.max(0, Math.min(100, (hud.p1Health / (hud.p1MaxHealth || 100)) * 100));
  const p1GhostPct = Math.max(0, Math.min(100, (ghostP1Health / (hud.p1MaxHealth || 100)) * 100));
  const p2HealthPct = Math.max(0, Math.min(100, (hud.p2Health / (hud.p2MaxHealth || 100)) * 100));
  const p2GhostPct = Math.max(0, Math.min(100, (ghostP2Health / (hud.p2MaxHealth || 100)) * 100));

  // Gauge colors based on remaining health
  const getHealthGradient = (pct: number, isP1: boolean) => {
    if (pct > 50) {
      return isP1
        ? 'from-emerald-500 via-teal-400 to-cyan-400'
        : 'from-cyan-400 via-teal-400 to-emerald-500';
    }
    if (pct > 25) {
      return isP1
        ? 'from-amber-500 via-yellow-400 to-amber-300'
        : 'from-amber-300 via-yellow-400 to-amber-500';
    }
    return isP1
      ? 'from-red-600 via-rose-500 to-red-400 animate-pulse'
      : 'from-red-400 via-rose-500 to-red-600 animate-pulse';
  };

  // Fullscreen toggle handler
  const handleToggleFullscreen = () => {
    if (!containerRef.current) return;
    if (!document.fullscreenElement) {
      containerRef.current.requestFullscreen().catch(() => {});
      setIsFullscreen(true);
    } else {
      document.exitFullscreen().catch(() => {});
      setIsFullscreen(false);
    }
  };

  useEffect(() => {
    const onFsChange = () => setIsFullscreen(!!document.fullscreenElement);
    document.addEventListener('fullscreenchange', onFsChange);
    return () => document.removeEventListener('fullscreenchange', onFsChange);
  }, []);

  const roundTitle = useMemo(() => {
    if (hud.roundNumber === 3) return 'FINAL ROUND';
    return `ROUND ${hud.roundNumber}`;
  }, [hud.roundNumber]);

  return (
    <div
      ref={containerRef}
      className="relative mx-auto flex w-full max-w-5xl flex-col items-center select-none bg-slate-950 p-2 sm:p-4 rounded-2xl border border-slate-800 shadow-2xl text-slate-100"
    >
      {/* ─── RETRO ARCADE HUD HEADER ─────────────────────────────────────── */}
      <div className="relative mb-3 flex w-full flex-col gap-2">
        {/* Top Meta Bar */}
        <div className="flex items-center justify-between px-2 text-xs font-mono tracking-wider text-slate-400">
          <div className="flex items-center gap-2">
            <span className="inline-block h-2.5 w-2.5 rounded-full bg-cyan-400 animate-ping" />
            <span className="font-bold text-cyan-400 uppercase">Cyber Brawl</span>
            <span className="text-slate-600">|</span>
            <span className="hidden sm:inline">60 TICKS/SEC • FIXED ACCUMULATOR</span>
          </div>
          <div className="flex items-center gap-2 sm:gap-4">
            <button
              onClick={toggleDebug}
              id="btn-toggle-hitboxes"
              type="button"
              className={`rounded px-2.5 py-1 font-mono text-xs font-semibold uppercase tracking-wider transition-all border ${
                hud.debugMode
                  ? 'border-cyan-400 bg-cyan-950/80 text-cyan-300 shadow-[0_0_12px_rgba(0,240,255,0.4)]'
                  : 'border-slate-700 bg-slate-900 text-slate-400 hover:border-slate-500 hover:text-white'
              }`}
            >
              [Tab] Debug {hud.debugMode ? 'ON' : 'OFF'}
            </button>
            <button
              onClick={rematch}
              id="btn-quick-reset"
              type="button"
              className="rounded border border-slate-700 bg-slate-900 px-2.5 py-1 font-mono text-xs font-semibold uppercase tracking-wider text-slate-400 hover:border-amber-400 hover:text-amber-300 transition-all"
            >
              Reset Match
            </button>
            <button
              onClick={handleToggleFullscreen}
              id="btn-fullscreen"
              type="button"
              className="hidden sm:inline-block rounded border border-slate-700 bg-slate-900 px-2 py-1 font-mono text-xs text-slate-400 hover:text-white transition-all"
            >
              {isFullscreen ? 'Exit Full' : 'Fullscreen'}
            </button>
          </div>
        </div>

        {/* ─── ARCADE HEALTH GAUGES & TIMER ────────────────────────────────── */}
        <div className="grid grid-cols-[1fr_auto_1fr] items-center gap-2 sm:gap-4 rounded-xl border border-slate-800/80 bg-gradient-to-b from-slate-900/90 via-slate-950 to-slate-950 p-2 sm:p-3 shadow-inner">
          {/* PLAYER 1 HEALTH SECTION */}
          <div className="flex flex-col gap-1">
            <div className="flex items-center justify-between text-xs sm:text-sm font-black tracking-wider">
              <div className="flex items-center gap-2">
                <span className="rounded bg-rose-500/20 px-1.5 py-0.5 font-mono text-[10px] font-black text-rose-400 border border-rose-500/30">
                  1P
                </span>
                <span className="text-rose-400 drop-shadow-[0_0_8px_rgba(244,63,94,0.6)]">
                  CYBER BRAWLER
                </span>
              </div>
              {/* Round Wins */}
              <div className="flex items-center gap-1.5">
                {[0, 1].map((idx) => (
                  <span
                    key={idx}
                    className={`inline-block h-3 w-3 rotate-45 border transition-all ${
                      hud.wins[0] > idx
                        ? 'border-yellow-300 bg-yellow-400 shadow-[0_0_10px_rgba(250,204,21,0.8)]'
                        : 'border-slate-700 bg-slate-900'
                    }`}
                    title={`P1 Round ${idx + 1}`}
                  />
                ))}
              </div>
            </div>

            {/* Health Bar (Depletes right-to-left towards outer edge) */}
            <div className="relative h-5 sm:h-7 w-full overflow-hidden rounded-md border-2 border-slate-700 bg-slate-950 shadow-inner">
              {/* Red Damage Trail (Ghost Bar) */}
              <div
                className="absolute inset-y-0 right-0 bg-red-600/80 transition-all duration-500 ease-out"
                style={{ width: `${p1GhostPct}%` }}
              />
              {/* Active Health Gauge */}
              <div
                className={`absolute inset-y-0 right-0 bg-gradient-to-l ${getHealthGradient(
                  p1HealthPct,
                  true
                )} transition-all duration-150 ease-out`}
                style={{ width: `${p1HealthPct}%` }}
              />
              {/* Overlay HP Numbers & Scanlines */}
              <div className="absolute inset-0 flex items-center justify-start pl-2 pointer-events-none">
                <span className="font-mono text-[11px] sm:text-xs font-black text-white/90 drop-shadow-[0_1px_2px_rgba(0,0,0,0.9)]">
                  {Math.round(hud.p1Health)} / {hud.p1MaxHealth}
                </span>
              </div>
              {/* Segmented notches overlay */}
              <div className="absolute inset-0 flex justify-between pointer-events-none opacity-20">
                <div className="border-r border-black w-1/4 h-full" />
                <div className="border-r border-black w-1/4 h-full" />
                <div className="border-r border-black w-1/4 h-full" />
              </div>
            </div>
          </div>

          {/* CENTER 99-SECOND ARCADE TIMER */}
          <div className="flex flex-col items-center justify-center px-1 sm:px-3">
            <span className="text-[10px] sm:text-xs font-mono font-bold tracking-widest text-slate-400 uppercase">
              {roundTitle}
            </span>
            <div
              className={`flex h-12 w-14 sm:h-14 sm:w-16 items-center justify-center rounded-lg border-2 bg-slate-950 font-mono text-2xl sm:text-3xl font-black shadow-lg transition-all ${
                hud.timerSeconds <= 15
                  ? 'border-red-500 text-red-500 shadow-[0_0_16px_rgba(239,68,68,0.6)] animate-pulse'
                  : 'border-amber-400/80 text-amber-400 shadow-[0_0_12px_rgba(251,191,36,0.3)]'
              }`}
            >
              {hud.timerSeconds.toString().padStart(2, '0')}
            </div>
          </div>

          {/* PLAYER 2 HEALTH SECTION */}
          <div className="flex flex-col gap-1">
            <div className="flex items-center justify-between text-xs sm:text-sm font-black tracking-wider">
              {/* Round Wins */}
              <div className="flex items-center gap-1.5">
                {[0, 1].map((idx) => (
                  <span
                    key={idx}
                    className={`inline-block h-3 w-3 rotate-45 border transition-all ${
                      hud.wins[1] > idx
                        ? 'border-yellow-300 bg-yellow-400 shadow-[0_0_10px_rgba(250,204,21,0.8)]'
                        : 'border-slate-700 bg-slate-900'
                    }`}
                    title={`P2 Round ${idx + 1}`}
                  />
                ))}
              </div>
              <div className="flex items-center gap-2">
                <span className="text-cyan-400 drop-shadow-[0_0_8px_rgba(6,182,212,0.6)]">
                  MECHA STRIKER
                </span>
                <span className="rounded bg-cyan-500/20 px-1.5 py-0.5 font-mono text-[10px] font-black text-cyan-400 border border-cyan-500/30">
                  2P
                </span>
              </div>
            </div>

            {/* Health Bar (Depletes left-to-right towards outer edge) */}
            <div className="relative h-5 sm:h-7 w-full overflow-hidden rounded-md border-2 border-slate-700 bg-slate-950 shadow-inner">
              {/* Red Damage Trail (Ghost Bar) */}
              <div
                className="absolute inset-y-0 left-0 bg-red-600/80 transition-all duration-500 ease-out"
                style={{ width: `${p2GhostPct}%` }}
              />
              {/* Active Health Gauge */}
              <div
                className={`absolute inset-y-0 left-0 bg-gradient-to-r ${getHealthGradient(
                  p2HealthPct,
                  false
                )} transition-all duration-150 ease-out`}
                style={{ width: `${p2HealthPct}%` }}
              />
              {/* Overlay HP Numbers & Scanlines */}
              <div className="absolute inset-0 flex items-center justify-end pr-2 pointer-events-none">
                <span className="font-mono text-[11px] sm:text-xs font-black text-white/90 drop-shadow-[0_1px_2px_rgba(0,0,0,0.9)]">
                  {Math.round(hud.p2Health)} / {hud.p2MaxHealth}
                </span>
              </div>
              {/* Segmented notches overlay */}
              <div className="absolute inset-0 flex justify-between pointer-events-none opacity-20">
                <div className="border-r border-black w-1/4 h-full" />
                <div className="border-r border-black w-1/4 h-full" />
                <div className="border-r border-black w-1/4 h-full" />
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* ─── CANVAS VIEWPORT ─────────────────────────────────────────────── */}
      <div className="relative w-full overflow-hidden rounded-xl border-2 border-slate-700/80 bg-black shadow-[0_0_30px_rgba(0,0,0,0.8)] aspect-[16/9] flex items-center justify-center">
        <canvas
          ref={canvasRef}
          id="cyberbrawl-canvas"
          className="h-full w-full object-contain focus:outline-none"
          tabIndex={0}
        />

        {/* CRT Scanline & Vignette Effect */}
        <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_center,transparent_60%,rgba(0,0,0,0.6)_100%)]" />

        {/* KO / ROUND END BANNER OVERLAY */}
        {hud.phase === RoundPhase.KO && (
          <div className="pointer-events-none absolute inset-0 flex items-center justify-center bg-black/40 backdrop-blur-[2px] animate-fade-in">
            <div className="flex flex-col items-center">
              <span className="font-black text-6xl sm:text-8xl tracking-widest text-transparent bg-clip-text bg-gradient-to-b from-amber-200 via-rose-500 to-red-600 drop-shadow-[0_0_30px_rgba(244,63,94,0.8)] animate-bounce">
                K. O. !
              </span>
              <span className="font-mono text-sm sm:text-lg font-bold uppercase tracking-widest text-white/90 mt-2">
                {hud.roundWinner === 0
                  ? 'PLAYER 1 WINS THE ROUND'
                  : hud.roundWinner === 1
                  ? 'PLAYER 2 WINS THE ROUND'
                  : 'DOUBLE K.O.!'}
              </span>
            </div>
          </div>
        )}

        {/* MATCH OVER / VICTORY MODAL OVERLAY */}
        {(hud.phase === RoundPhase.MATCH_OVER || hud.matchWinner !== null) && (
          <div className="absolute inset-0 z-20 flex flex-col items-center justify-center bg-slate-950/85 backdrop-blur-sm p-6 text-center">
            <div className="relative flex max-w-md flex-col items-center rounded-2xl border-2 border-cyan-500/40 bg-slate-900/95 p-6 sm:p-8 shadow-[0_0_50px_rgba(0,240,255,0.3)]">
              <span className="mb-1 font-mono text-xs font-bold tracking-widest text-cyan-400 uppercase">
                Arcade Championship
              </span>
              <h2 className="mb-2 font-black text-3xl sm:text-4xl text-transparent bg-clip-text bg-gradient-to-r from-amber-300 via-rose-400 to-cyan-300">
                {hud.matchWinner === 0
                  ? 'PLAYER 1 VICTORIOUS!'
                  : hud.matchWinner === 1
                  ? 'PLAYER 2 VICTORIOUS!'
                  : 'DRAW MATCH!'}
              </h2>
              <p className="mb-6 font-mono text-sm text-slate-300">
                Final Score: P1 ({hud.wins[0]}) — P2 ({hud.wins[1]})
              </p>

              <div className="flex flex-wrap items-center justify-center gap-3">
                <button
                  onClick={rematch}
                  id="btn-modal-rematch"
                  type="button"
                  className="rounded-xl bg-gradient-to-r from-rose-500 to-amber-500 px-6 py-3 font-mono font-bold text-sm uppercase tracking-wider text-white shadow-lg hover:from-rose-400 hover:to-amber-400 hover:scale-105 active:scale-95 transition-all"
                >
                  Play Again / Rematch
                </button>
                <button
                  onClick={toggleDebug}
                  id="btn-modal-debug"
                  type="button"
                  className="rounded-xl border border-slate-700 bg-slate-800 px-4 py-3 font-mono font-semibold text-sm text-slate-300 hover:border-slate-500 hover:text-white transition-all"
                >
                  Hitbox Mode: {hud.debugMode ? 'ON' : 'OFF'}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* ─── RETRO ARCADE CONTROLS REFERENCE ─────────────────────────────── */}
      <div className="mt-3 grid w-full grid-cols-1 md:grid-cols-2 gap-2 sm:gap-3">
        {/* PLAYER 1 CONTROLS */}
        <div className="rounded-xl border border-rose-500/30 bg-gradient-to-r from-rose-950/30 via-slate-900 to-slate-900 p-3">
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-2">
              <span className="rounded bg-rose-500/20 px-2 py-0.5 font-mono text-xs font-black text-rose-400 border border-rose-500/30">
                PLAYER 1
              </span>
              <span className="font-semibold text-xs text-rose-300">CYBER BRAWLER</span>
            </div>
            <span className="text-[10px] font-mono text-slate-400">WASD + F/G</span>
          </div>

          <div className="grid grid-cols-2 gap-2 text-xs font-mono">
            <div className="flex items-center gap-1.5 text-slate-300">
              <div className="flex gap-1">
                <kbd className="rounded bg-slate-800 border border-slate-700 px-1.5 py-0.5 text-amber-300 font-bold">W</kbd>
                <kbd className="rounded bg-slate-800 border border-slate-700 px-1.5 py-0.5 text-amber-300 font-bold">A</kbd>
                <kbd className="rounded bg-slate-800 border border-slate-700 px-1.5 py-0.5 text-amber-300 font-bold">S</kbd>
                <kbd className="rounded bg-slate-800 border border-slate-700 px-1.5 py-0.5 text-amber-300 font-bold">D</kbd>
              </div>
              <span className="text-slate-400 text-[11px]">Jump/Move/Crouch</span>
            </div>

            <div className="flex items-center gap-1.5 text-slate-300">
              <div className="flex gap-1">
                <kbd className="rounded bg-rose-900/60 border border-rose-600 px-2 py-0.5 text-rose-300 font-black">F</kbd>
                <kbd className="rounded bg-rose-900/60 border border-rose-600 px-2 py-0.5 text-rose-300 font-black">G</kbd>
              </div>
              <span className="text-slate-400 text-[11px]">Punch (8) / Kick (14)</span>
            </div>
          </div>
        </div>

        {/* PLAYER 2 CONTROLS */}
        <div className="rounded-xl border border-cyan-500/30 bg-gradient-to-r from-slate-900 via-slate-900 to-cyan-950/30 p-3">
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-2">
              <span className="rounded bg-cyan-500/20 px-2 py-0.5 font-mono text-xs font-black text-cyan-400 border border-cyan-500/30">
                PLAYER 2
              </span>
              <span className="font-semibold text-xs text-cyan-300">MECHA STRIKER</span>
            </div>
            <span className="text-[10px] font-mono text-slate-400">ARROWS + K/L</span>
          </div>

          <div className="grid grid-cols-2 gap-2 text-xs font-mono">
            <div className="flex items-center gap-1.5 text-slate-300">
              <div className="flex gap-1">
                <kbd className="rounded bg-slate-800 border border-slate-700 px-1.5 py-0.5 text-amber-300 font-bold">↑</kbd>
                <kbd className="rounded bg-slate-800 border border-slate-700 px-1.5 py-0.5 text-amber-300 font-bold">←</kbd>
                <kbd className="rounded bg-slate-800 border border-slate-700 px-1.5 py-0.5 text-amber-300 font-bold">↓</kbd>
                <kbd className="rounded bg-slate-800 border border-slate-700 px-1.5 py-0.5 text-amber-300 font-bold">→</kbd>
              </div>
              <span className="text-slate-400 text-[11px]">Jump/Move/Crouch</span>
            </div>

            <div className="flex items-center gap-1.5 text-slate-300">
              <div className="flex gap-1">
                <kbd className="rounded bg-cyan-900/60 border border-cyan-600 px-2 py-0.5 text-cyan-300 font-black">K</kbd>
                <kbd className="rounded bg-cyan-900/60 border border-cyan-600 px-2 py-0.5 text-cyan-300 font-black">L</kbd>
              </div>
              <span className="text-slate-400 text-[11px]">Punch (8) / Kick (14)</span>
            </div>
          </div>
        </div>
      </div>

      {/* ─── DEBUG COLLISION COLOR LEGEND ────────────────────────────────── */}
      <div className="mt-2 flex flex-wrap items-center justify-center gap-4 text-[11px] font-mono text-slate-400">
        <span className="text-slate-500 font-semibold">DEBUG HITBOXES [Tab]:</span>
        <div className="flex items-center gap-1.5">
          <span className="inline-block h-2.5 w-2.5 rounded-sm bg-blue-500 border border-blue-400" />
          <span>Pushbox (Physics)</span>
        </div>
        <div className="flex items-center gap-1.5">
          <span className="inline-block h-2.5 w-2.5 rounded-sm bg-emerald-500 border border-emerald-400" />
          <span>Hurtbox (Vulnerable)</span>
        </div>
        <div className="flex items-center gap-1.5">
          <span className="inline-block h-2.5 w-2.5 rounded-sm bg-red-500 border border-red-400" />
          <span>Hitbox (Active Attack)</span>
        </div>
      </div>
    </div>
  );
}
