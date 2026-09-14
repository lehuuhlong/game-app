"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { usePhysicsEngine } from "./usePhysicsEngine";
import { useCanvasRenderer } from "./useCanvasRenderer";
import { useAiming } from "./useAiming";
import { useBilliardsRules } from "./useBilliardsRules";
import { useBallInHand } from "./useBallInHand";
import { TABLE_WIDTH, TABLE_HEIGHT, BALL_CONFIGS } from "./constants";
import { CueStickPowerGauge } from "./components/CueStickPowerGauge";
import { PottedBallsTray } from "./components/PottedBallsTray";

// ─── Types ──────────────────────────────────────────────────────────────────

export type GamePhase = "idle" | "aiming" | "shooting";

// ─── Ball color helper ──────────────────────────────────────────────────────

function getBallColor(num: number): string {
  const cfg = BALL_CONFIGS[num];
  if (!cfg) return "#888";
  return cfg.stripeColor || cfg.color;
}

// ─── Component ──────────────────────────────────────────────────────────────

export function GameBilliards() {
  const containerRef = useRef<HTMLDivElement>(null);
  const [canvasScale, setCanvasScale] = useState(1);
  const [phase, setPhase] = useState<GamePhase>("idle");
  const mountedRef = useRef(false);
  const phaseRef = useRef<GamePhase>("idle");
  const ballStopCheckRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const [foulFlash, setFoulFlash] = useState(false);
  const [aimPower, setAimPower] = useState(0);
  const [isAiming, setIsAiming] = useState(false);

  const handleAimChange = useCallback((power: number, dragging: boolean) => {
    setAimPower(power);
    setIsAiming(dragging);
  }, []);

  // Physics engine
  const {
    engineRef,
    ballsRef,
    cueBallRef,
    pocketsRef,
    init: initPhysics,
    startLoop: startPhysicsLoop,
    stopLoop: stopPhysicsLoop,
    cleanup: cleanupPhysics,
    areAllBallsStopped,
    snapAllBallsToStop,
    resetBalls,
    respotCueBall,
    removeBall,
  } = usePhysicsEngine();

  // Canvas renderer
  const {
    canvasRef,
    startRenderLoop,
    stopRenderLoop,
    addSinkingBall,
    clearSinkingBalls,
  } = useCanvasRenderer();

  // Game rules
  const {
    rulesState,
    rulesRef,
    onShotStart,
    evaluateShot,
    resetRules,
    setBallInHand,
    startCollisionDetection,
    stopCollisionDetection,
  } = useBilliardsRules();

  // Ball in Hand hook (freely reposition cue ball anywhere on table after scratch / foul)
  const {
    isDragging: isPlacingBall,
    isValid: isPlacementValid,
    confirmPlacement,
  } = useBallInHand({
    canvasRef,
    cueBallRef,
    ballsRef,
    active: rulesState.ballInHand,
    onConfirm: () => setBallInHand(false),
  });

  // Ball in Hand render state ref for the 60fps render loop
  const ballInHandRenderStateRef = useRef({
    active: false,
    isValid: true,
    isDragging: false,
  });
  useEffect(() => {
    ballInHandRenderStateRef.current = {
      active: rulesState.ballInHand,
      isValid: isPlacementValid,
      isDragging: isPlacingBall,
    };
  }, [rulesState.ballInHand, isPlacementValid, isPlacingBall]);

  // Space or Enter shortcut to confirm ball in hand placement
  useEffect(() => {
    if (!rulesState.ballInHand) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Enter" || e.key === " ") {
        e.preventDefault();
        if (isPlacementValid) {
          confirmPlacement();
        }
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [rulesState.ballInHand, isPlacementValid, confirmPlacement]);

  // Keep phaseRef in sync
  useEffect(() => {
    phaseRef.current = phase;
  }, [phase]);

  // ── Aiming hook ──────────────────────────────────────────────────────────

  const canAim = useCallback(() => {
    return (
      phaseRef.current === "aiming" &&
      areAllBallsStopped() &&
      !rulesState.gameOver &&
      !rulesState.ballInHand
    );
  }, [areAllBallsStopped, rulesState.gameOver, rulesState.ballInHand]);

  const onShot = useCallback(() => {
    setPhase("shooting");
    phaseRef.current = "shooting";
    onShotStart();

    // Start polling for all balls to stop
    if (ballStopCheckRef.current) clearInterval(ballStopCheckRef.current);
    ballStopCheckRef.current = setInterval(() => {
      if (areAllBallsStopped()) {
        if (ballStopCheckRef.current) {
          clearInterval(ballStopCheckRef.current);
          ballStopCheckRef.current = null;
        }
        snapAllBallsToStop();

        // Evaluate the shot via game rules
        const result = evaluateShot(respotCueBall);

        // Flash foul indicator
        if (result.foul) {
          setFoulFlash(true);
          setTimeout(() => setFoulFlash(false), 2000);
        }

        // Transition phase
        if (result.gameResult.type === "win") {
          setPhase("idle"); // game over — show overlay
          phaseRef.current = "idle";
        } else {
          setPhase("aiming");
          phaseRef.current = "aiming";
        }
      }
    }, 200);
  }, [areAllBallsStopped, snapAllBallsToStop, onShotStart, evaluateShot, respotCueBall]);

  const {
    getAimState,
    attachListeners,
    detachListeners,
  } = useAiming(canvasRef, cueBallRef, canAim, onShot, handleAimChange);

  // ── Responsive canvas scaling ────────────────────────────────────────────

  useEffect(() => {
    function handleResize() {
      if (!containerRef.current) return;
      const containerW = containerRef.current.clientWidth;
      // Account for left cue power gauge (~76px) + right potted tray (~136px) + gaps (~32px)
      const sidePanelsW = containerW >= 1200 ? 244 : containerW >= 960 ? 210 : 170;
      const availableW = containerW - sidePanelsW;
      const scale = Math.min(1, Math.max(0.35, availableW / TABLE_WIDTH));
      setCanvasScale(scale);
    }
    handleResize();
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  const handleRemoveBall = useCallback(
    (ball: Matter.Body, pocketPos?: { x: number; y: number }) => {
      if (pocketPos) {
        addSinkingBall(ball.label, ball.position, pocketPos);
      }
      removeBall(ball);
    },
    [addSinkingBall, removeBall]
  );

  // ── Initialize everything on mount ───────────────────────────────────────

  useEffect(() => {
    if (mountedRef.current) return;
    mountedRef.current = true;

    const { engine } = initPhysics();
    startPhysicsLoop();
    startRenderLoop(
      () => ballsRef.current.filter((b) => b.parent === b),
      () => getAimState(),
      () => ballInHandRenderStateRef.current
    );
    attachListeners();

    // Start collision detection for pocket events
    startCollisionDetection(engine, handleRemoveBall);

    setPhase("aiming");
    phaseRef.current = "aiming";

    return () => {
      stopCollisionDetection();
      detachListeners();
      stopRenderLoop();
      stopPhysicsLoop();
      cleanupPhysics();
      if (ballStopCheckRef.current) {
        clearInterval(ballStopCheckRef.current);
        ballStopCheckRef.current = null;
      }
      mountedRef.current = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ── Restart game ─────────────────────────────────────────────────────────

  const handleRestart = useCallback(() => {
    if (ballStopCheckRef.current) {
      clearInterval(ballStopCheckRef.current);
      ballStopCheckRef.current = null;
    }

    // Stop old collision detection
    stopCollisionDetection();
    clearSinkingBalls();

    const result = resetBalls();
    if (result) {
      resetRules();
      setPhase("aiming");
      phaseRef.current = "aiming";
      setFoulFlash(false);
      setAimPower(0);
      setIsAiming(false);

      // Restart collision detection with the (same) engine
      if (engineRef.current) {
        startCollisionDetection(engineRef.current, handleRemoveBall);
      }
    }
  }, [resetBalls, resetRules, stopCollisionDetection, clearSinkingBalls, startCollisionDetection, engineRef, handleRemoveBall]);

  // ── Derived display values ───────────────────────────────────────────────

  const { currentPlayer, player1, player2, groupsAssigned, gameOver, winner, winReason, turnMessage, foulMessage, isBreakShot } = rulesState;

  return (
    <div className="flex flex-col items-center gap-4">
      {/* ── Header ──────────────────────────────────────────────── */}
      <div className="w-full flex items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-foreground tracking-tight">
            🎱 8 Ball Pool
          </h1>
          <p className="text-xs sm:text-sm text-foreground-secondary mt-0.5">
            Classic 8-ball billiards — local 2-player. Pot your balls, then sink the 8.
          </p>
        </div>

        {/* Action button */}
        <button
          type="button"
          onClick={handleRestart}
          className="flex items-center gap-2 px-3.5 py-2 rounded-xl border border-border bg-surface text-xs sm:text-sm font-semibold text-foreground-secondary hover:bg-surface-hover hover:text-foreground transition-all hover:-translate-y-0.5 shadow-xs shrink-0"
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
            <polyline points="1 4 1 10 7 10" />
            <path d="M3.51 15a9 9 0 1 0 2.13-9.36L1 10" />
          </svg>
          New Game
        </button>
      </div>

      {/* ── Single Unified Status / Turn Banner ─────────────────── */}
      <div className="w-full min-h-[44px] flex items-center justify-center">
        {rulesState.ballInHand ? (
          <div className="w-full max-w-[820px] flex flex-wrap items-center justify-between gap-3 px-4 py-2 rounded-2xl border border-amber-500/40 bg-gradient-to-r from-amber-500/15 via-slate-900/90 to-amber-500/15 backdrop-blur-md shadow-lg shadow-amber-500/10">
            <div className="flex items-center gap-2.5">
              <span className="text-xl select-none animate-bounce" aria-hidden="true">
                🖐️
              </span>
              <div>
                <div className="flex items-center gap-2">
                  <span className="text-xs font-black uppercase tracking-wider text-amber-300">
                    Ball in Hand (Bi trong tay) — Người chơi {currentPlayer}
                  </span>
                  <span
                    className={`px-2 py-0.5 rounded-full text-[10px] font-bold border ${
                      isPlacementValid
                        ? "bg-emerald-500/20 text-emerald-300 border-emerald-500/40"
                        : "bg-red-500/20 text-red-400 border-red-500/40 animate-pulse"
                    }`}
                  >
                    {isPlacementValid ? "✓ Vị trí hợp lệ" : "✕ Trùng bi / Trong lỗ"}
                  </span>
                </div>
                <p className="text-xs text-slate-300">
                  {isPlacingBall
                    ? isPlacementValid
                      ? "Thả chuột/ngón tay để đặt bi tại đây."
                      : "Di chuyển ra vùng nỉ trống, không trùng bi khác."
                    : "Kéo thả bi trắng hoặc bấm vào bàn cờ để điều chỉnh vị trí."}
                </p>
              </div>
            </div>

            <button
              type="button"
              onClick={confirmPlacement}
              disabled={!isPlacementValid}
              className={`flex items-center gap-2 px-4 py-1.5 rounded-xl text-xs font-bold transition-all shadow-md ${
                isPlacementValid
                  ? "bg-gradient-to-r from-emerald-500 to-green-600 text-white hover:from-emerald-400 hover:to-green-500 active:scale-95 shadow-emerald-500/25 cursor-pointer ring-2 ring-emerald-400/30"
                  : "bg-slate-800 text-slate-500 border border-slate-700 cursor-not-allowed opacity-60"
              }`}
              title={isPlacementValid ? "Xác nhận vị trí (phím Space hoặc Enter)" : "Vị trí không hợp lệ"}
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                <polyline points="20 6 9 17 4 12" />
              </svg>
              {isPlacementValid ? "Xác nhận vị trí" : "Vị trí không hợp lệ"}
            </button>
          </div>
        ) : foulFlash && foulMessage ? (
          <div className="px-4 py-1.5 rounded-full border border-red-500/30 bg-red-500/15 text-red-400 text-xs font-semibold text-center animate-pulse shadow-xs">
            ⚠️ {foulMessage}
          </div>
        ) : turnMessage && !gameOver && phase === "aiming" ? (
          <div className="px-4 py-1.5 rounded-full border border-amber-500/30 bg-amber-500/10 text-amber-300 text-xs font-medium text-center shadow-xs">
            {turnMessage}
          </div>
        ) : (
          <div className="flex items-center gap-2 text-xs text-foreground-muted">
            <span className={`inline-block w-2 h-2 rounded-full ${
              gameOver
                ? "bg-emerald-400"
                : phase === "shooting"
                ? "bg-amber-400"
                : "bg-emerald-400"
            } animate-pulse`} />
            <span className="font-medium">
              {gameOver
                ? `🏆 Player ${winner} wins! — ${winReason}`
                : phase === "shooting"
                ? "Balls in motion..."
                : isBreakShot
                ? "Break shot — Drag cue ball to aim and strike"
                : "Click & drag cue ball to aim and strike"}
            </span>
          </div>
        )}
      </div>

      {/* ── Billiard Arena (Left Cue Power + Center Table + Right Potted Tray) ── */}
      <div
        ref={containerRef}
        className="w-full flex items-center justify-center gap-3 sm:gap-4 lg:gap-5"
      >
        {/* ── LEFT: Vertical Cue Stick Power Gauge ── */}
        <CueStickPowerGauge
          power={aimPower}
          isAiming={isAiming}
          height={Math.round(TABLE_HEIGHT * canvasScale)}
        />

        {/* ── CENTER: Billiards Canvas Table ── */}
        <div
          className="relative rounded-2xl overflow-hidden shadow-2xl shrink-0"
          style={{
            width: TABLE_WIDTH * canvasScale,
            height: TABLE_HEIGHT * canvasScale,
            boxShadow:
              "0 14px 48px rgba(0,0,0,0.55), 0 0 0 4px #3d2010, 0 0 0 6px rgba(120, 53, 15, 0.35)",
          }}
        >
          <canvas
            ref={canvasRef}
            width={TABLE_WIDTH}
            height={TABLE_HEIGHT}
            className={`block touch-none select-none ${
              rulesState.ballInHand
                ? isPlacingBall
                  ? "cursor-grabbing"
                  : "cursor-grab"
                : "cursor-crosshair"
            }`}
            style={{
              width: TABLE_WIDTH * canvasScale,
              height: TABLE_HEIGHT * canvasScale,
            }}
            aria-label="8 Ball Pool game table"
          />

          {/* Game Over Overlay */}
          {gameOver && (
            <div className="pointer-events-none absolute inset-0 flex items-center justify-center bg-black/60 backdrop-blur-[4px] p-6 z-20">
              <div className="pointer-events-auto w-full max-w-[380px] rounded-3xl border border-white/20 bg-slate-950/95 p-8 text-center text-white shadow-2xl backdrop-blur-md">
                <div className="text-6xl mb-3" aria-hidden="true">
                  🏆
                </div>
                <div className="text-xs font-bold uppercase tracking-[0.2em] text-emerald-400">
                  Game Over
                </div>
                <h2 className="mt-2 text-3xl font-black tracking-tight">
                  Player {winner} Wins!
                </h2>
                <p className="mt-2 text-sm leading-relaxed text-slate-300">
                  {winReason}
                </p>

                {/* Final score summary */}
                <div className="mt-4 flex justify-center gap-4">
                  <div className="rounded-lg border border-white/10 bg-white/5 px-4 py-2">
                    <div className="text-xs uppercase tracking-wider text-slate-400">P1 Potted</div>
                    <div className="text-xl font-black">{player1.pottedBalls.length}</div>
                  </div>
                  <div className="rounded-lg border border-white/10 bg-white/5 px-4 py-2">
                    <div className="text-xs uppercase tracking-wider text-slate-400">P2 Potted</div>
                    <div className="text-xl font-black">{player2.pottedBalls.length}</div>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={handleRestart}
                  className="mt-6 flex w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-emerald-400 to-green-600 px-5 py-3 text-sm font-black text-white shadow-lg shadow-emerald-600/25 transition-all hover:scale-[1.02] hover:from-emerald-300 hover:to-green-500 active:scale-[0.98]"
                >
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
                    <polyline points="1 4 1 10 7 10" />
                    <path d="M3.51 15a9 9 0 1 0 2.13-9.36L1 10" />
                  </svg>
                  Play Again
                </button>
              </div>
            </div>
          )}
        </div>

        {/* ── RIGHT: Pocketed Balls Tray ── */}
        <PottedBallsTray
          player1={player1}
          player2={player2}
          currentPlayer={currentPlayer}
          gameOver={gameOver}
          winner={winner}
          height={Math.round(TABLE_HEIGHT * canvasScale)}
        />
      </div>
    </div>
  );
}
