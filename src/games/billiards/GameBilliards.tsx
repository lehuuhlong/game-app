"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Matter from "matter-js";
import { usePhysicsEngine } from "./usePhysicsEngine";
import { useCanvasRenderer } from "./useCanvasRenderer";
import { useAiming, type ShotPayload } from "./useAiming";
import { useBilliardsRules } from "./useBilliardsRules";
import { useBallInHand } from "./useBallInHand";
import { TABLE_WIDTH, TABLE_HEIGHT, BALL_CONFIGS, MAX_FORCE } from "./constants";
import { CueStickPowerGauge } from "./components/CueStickPowerGauge";
import { PottedBallsTray } from "./components/PottedBallsTray";
import { BilliardsLobby } from "./components/BilliardsLobby";
import { useBilliardsMultiplayer } from "./useBilliardsMultiplayer";
import { useAuth } from "@/components/auth/AuthProvider";
import { LoginModal } from "@/components/auth/LoginModal";
import { HeadToHeadBadge } from "@/components/shared/HeadToHeadBadge";

const { Body } = Matter;

// ─── Types ──────────────────────────────────────────────────────────────────

export type GamePhase = "idle" | "aiming" | "shooting";

export function GameBilliards() {
  const { user } = useAuth();
  const [showLogin, setShowLogin] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const [canvasScale, setCanvasScale] = useState(1);
  const [phase, setPhase] = useState<GamePhase>("idle");
  const mountedRef = useRef(false);
  const phaseRef = useRef<GamePhase>("idle");
  const ballStopCheckRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const [foulFlash, setFoulFlash] = useState(false);
  const [aimPower, setAimPower] = useState(0);
  const [isAiming, setIsAiming] = useState(false);
  const [copiedRoomCode, setCopiedRoomCode] = useState(false);
  const lastAimEmitRef = useRef<number>(0);
  const lastPhysicsTickEmitRef = useRef<number>(0);
  const matchSavedRef = useRef(false);

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
    syncSettledBalls,
    setOnTick,
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
    syncRulesState,
    startCollisionDetection,
    stopCollisionDetection,
  } = useBilliardsRules();

  // ── Restart local state ──────────────────────────────────────────────────
  const handleRestartLocal = useCallback(() => {
    if (ballStopCheckRef.current) {
      clearInterval(ballStopCheckRef.current);
      ballStopCheckRef.current = null;
    }

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
      matchSavedRef.current = false;

      if (engineRef.current) {
        startCollisionDetection(engineRef.current, handleRemoveBall);
      }
    }
  }, [resetBalls, resetRules, stopCollisionDetection, clearSinkingBalls, startCollisionDetection, engineRef]);

  // ── Multiplayer Hook ─────────────────────────────────────────────────────
  const multiplayer = useBilliardsMultiplayer({
    onRemoteAim: (data) => {
      setRemoteAim({
        aimDir: data.aimDir,
        power: data.power,
        isDragging: data.power > 0.001,
      });
    },
    onRemoteShoot: (data) => {
      setRemoteAim(null);

      // 1. Pre-align ball coordinates from shooter so trajectories match identically
      if (data.initialBalls && data.initialBalls.length > 0) {
        for (const bData of data.initialBalls) {
          const body = ballsRef.current.find((b) => b.label === `ball-${bData.id}`);
          if (body) {
            Body.setPosition(body, { x: bData.x, y: bData.y });
            Body.setVelocity(body, { x: 0, y: 0 });
          }
        }
      }
      if (data.cueBallPos && cueBallRef.current) {
        Body.setPosition(cueBallRef.current, data.cueBallPos);
        Body.setVelocity(cueBallRef.current, { x: 0, y: 0 });
      }

      // 2. Apply impulse
      const cueBall = cueBallRef.current;
      if (cueBall) {
        const forceMagnitude = data.power * MAX_FORCE;
        Body.applyForce(cueBall, cueBall.position, {
          x: data.aimDir.x * forceMagnitude,
          y: data.aimDir.y * forceMagnitude,
        });
      }
      setPhase("shooting");
      phaseRef.current = "shooting";
      onShotStart();
      waitForBallsToStop(false);
    },
    onRemoteSyncPhysics: (data) => {
      // If we are the non-shooter, mirror the shooter's physics in real time
      if (multiplayer.mode === "online" && !multiplayer.isMyTurn(rulesState.currentPlayer)) {
        if (data.sunkBall) {
          const ball = ballsRef.current.find(
            (b) => b.label === `ball-${data.sunkBall!.id}`
          );
          if (ball) {
            addSinkingBall(ball.label, ball.position, {
              x: data.sunkBall.pocketX,
              y: data.sunkBall.pocketY,
            });
            removeBall(ball);
          }
        }
        for (const bData of data.balls) {
          const body = ballsRef.current.find((b) => b.label === `ball-${bData.id}`);
          if (body) {
            Body.setPosition(body, { x: bData.x, y: bData.y });
            Body.setVelocity(body, { x: bData.vx, y: bData.vy });
          }
        }
      }
    },
    onRemoteSettled: (data) => {
      syncSettledBalls(data.balls);
      syncRulesState({
        currentPlayer: data.currentPlayer,
        player1: {
          group: data.assignedTypes[1],
          pottedBalls: data.pottedHistory[1],
        },
        player2: {
          group: data.assignedTypes[2],
          pottedBalls: data.pottedHistory[2],
        },
        groupsAssigned: Boolean(data.assignedTypes[1] || data.assignedTypes[2]),
        gameOver: data.winner !== null,
        winner: data.winner,
        ballInHand: data.ballInHand,
        turnMessage: data.statusMessage,
        foulMessage: data.fouled ? data.statusMessage : "",
      });

      if (data.fouled) {
        setFoulFlash(true);
        setTimeout(() => setFoulFlash(false), 2000);
      }

      if (data.winner !== null) {
        setPhase("idle");
        phaseRef.current = "idle";
      } else {
        setPhase("aiming");
        phaseRef.current = "aiming";
      }
    },
    onRemoteBallInHandMove: (data) => {
      if (cueBallRef.current) {
        Body.setPosition(cueBallRef.current, { x: data.x, y: data.y });
        Body.setVelocity(cueBallRef.current, { x: 0, y: 0 });
      }
    },
    onRemoteBallInHandConfirm: (data) => {
      if (cueBallRef.current) {
        Body.setPosition(cueBallRef.current, { x: data.x, y: data.y });
        Body.setVelocity(cueBallRef.current, { x: 0, y: 0 });
      }
      setBallInHand(false);
    },
    onGameStarted: () => {
      handleRestartLocal();
      setPhase("aiming");
      phaseRef.current = "aiming";
    },
    onGameRestarted: () => {
      handleRestartLocal();
    },
  });

  // ── Ball removal in pockets ──────────────────────────────────────────────
  const handleRemoveBall = useCallback(
    (ball: Matter.Body, pocketPos?: { x: number; y: number }) => {
      if (pocketPos) {
        addSinkingBall(ball.label, ball.position, pocketPos);

        // If online shooter, broadcast this sinking ball immediately to opponent
        if (multiplayer.mode === "online" && multiplayer.isMyTurn(rulesState.currentPlayer)) {
          multiplayer.sendPhysicsTick({
            balls: ballsRef.current
              .filter((b) => b.parent === b && b !== ball)
              .map((b) => ({
                id: Number(b.label.replace("ball-", "")),
                x: Math.round(b.position.x * 10) / 10,
                y: Math.round(b.position.y * 10) / 10,
                vx: Math.round(b.velocity.x * 100) / 100,
                vy: Math.round(b.velocity.y * 100) / 100,
              })),
            sunkBall: {
              id: Number(ball.label.replace("ball-", "")),
              pocketX: pocketPos.x,
              pocketY: pocketPos.y,
            },
          });
        }
      }
      removeBall(ball);
    },
    [addSinkingBall, removeBall, multiplayer, rulesState.currentPlayer, ballsRef]
  );

  // ── Waiting for balls to settle ──────────────────────────────────────────
  const waitForBallsToStop = useCallback(
    (isShooter: boolean) => {
      if (ballStopCheckRef.current) clearInterval(ballStopCheckRef.current);
      ballStopCheckRef.current = setInterval(() => {
        if (areAllBallsStopped()) {
          if (ballStopCheckRef.current) {
            clearInterval(ballStopCheckRef.current);
            ballStopCheckRef.current = null;
          }
          snapAllBallsToStop();

          if (isShooter) {
            const result = evaluateShot(respotCueBall);

            if (result.foul) {
              setFoulFlash(true);
              setTimeout(() => setFoulFlash(false), 2000);
            }

            if (result.gameResult.type === "win") {
              setPhase("idle");
              phaseRef.current = "idle";
            } else {
              setPhase("aiming");
              phaseRef.current = "aiming";
            }

            // Sync with opponent if online
            if (multiplayer.mode === "online") {
              const allBallData = BALL_CONFIGS.map((cfg) => {
                const b = ballsRef.current.find((item) => item.label === cfg.label);
                return {
                  id: cfg.number,
                  x: b ? b.position.x : -100,
                  y: b ? b.position.y : -100,
                  vx: 0,
                  vy: 0,
                  isPotted: !b,
                };
              });

              multiplayer.sendSettled({
                balls: allBallData,
                currentPlayer: rulesRef.current.currentPlayer,
                assignedTypes: {
                  1: rulesRef.current.player1.group,
                  2: rulesRef.current.player2.group,
                },
                pottedHistory: {
                  1: rulesRef.current.player1.pottedBalls,
                  2: rulesRef.current.player2.pottedBalls,
                },
                winner: rulesRef.current.winner,
                ballInHand: rulesRef.current.ballInHand,
                fouled: Boolean(result.foul),
                statusMessage: result.message,
              });
            }
          }
        }
      }, 200);
    },
    [areAllBallsStopped, snapAllBallsToStop, evaluateShot, respotCueBall, multiplayer, ballsRef, rulesRef]
  );

  // ── Ball in Hand hook ────────────────────────────────────────────────────
  const handleBallInHandMove = useCallback(
    (pos: { x: number; y: number }) => {
      if (multiplayer.mode === "online" && multiplayer.isMyTurn(rulesState.currentPlayer)) {
        multiplayer.sendBallInHandMove(pos);
      }
    },
    [multiplayer, rulesState.currentPlayer]
  );

  const handleBallInHandConfirm = useCallback(
    (pos?: { x: number; y: number }) => {
      setBallInHand(false);
      if (multiplayer.mode === "online" && multiplayer.isMyTurn(rulesState.currentPlayer) && pos) {
        multiplayer.sendBallInHandConfirm(pos);
      }
    },
    [multiplayer, rulesState.currentPlayer, setBallInHand]
  );

  const {
    isDragging: isPlacingBall,
    isValid: isPlacementValid,
    confirmPlacement,
  } = useBallInHand({
    canvasRef,
    cueBallRef,
    ballsRef,
    active: rulesState.ballInHand,
    enabled: multiplayer.isMyTurn(rulesState.currentPlayer),
    onConfirm: handleBallInHandConfirm,
    onMove: handleBallInHandMove,
    respotCueBall,
  });

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

  // Space or Enter shortcut for ball in hand
  useEffect(() => {
    if (!rulesState.ballInHand || !multiplayer.isMyTurn(rulesState.currentPlayer)) return;
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
  }, [rulesState.ballInHand, isPlacementValid, confirmPlacement, multiplayer, rulesState.currentPlayer]);

  useEffect(() => {
    phaseRef.current = phase;
  }, [phase]);

  // ── Aiming Hook ──────────────────────────────────────────────────────────
  const canAim = useCallback(() => {
    return (
      phaseRef.current === "aiming" &&
      areAllBallsStopped() &&
      !rulesState.gameOver &&
      !rulesState.ballInHand &&
      multiplayer.isMyTurn(rulesState.currentPlayer)
    );
  }, [areAllBallsStopped, rulesState.gameOver, rulesState.ballInHand, multiplayer, rulesState.currentPlayer]);

  const handleAimChange = useCallback(
    (power: number, dragging: boolean, aimDir?: { x: number; y: number }) => {
      setAimPower(power);
      setIsAiming(dragging);

      if (multiplayer.mode === "online" && multiplayer.isMyTurn(rulesState.currentPlayer)) {
        const now = Date.now();
        if (!dragging) {
          multiplayer.sendAim({ cueAngle: 0, aimDir: { x: 1, y: 0 }, power: 0 });
        } else if (now - lastAimEmitRef.current > 40) {
          lastAimEmitRef.current = now;
          multiplayer.sendAim({
            cueAngle: 0,
            aimDir: aimDir || { x: 1, y: 0 },
            power,
          });
        }
      }
    },
    [multiplayer, rulesState.currentPlayer]
  );

  const onShot = useCallback(
    (payload: ShotPayload) => {
      setPhase("shooting");
      phaseRef.current = "shooting";
      onShotStart();

      if (multiplayer.mode === "online" && multiplayer.isMyTurn(rulesState.currentPlayer)) {
        const initialBalls = ballsRef.current
          .filter((b) => b.parent === b)
          .map((b) => ({
            id: Number(b.label.replace("ball-", "")),
            x: Math.round(b.position.x * 10) / 10,
            y: Math.round(b.position.y * 10) / 10,
          }));

        multiplayer.sendShoot({
          cueAngle: 0,
          aimDir: payload.aimDir,
          power: payload.power,
          cueBallPos: cueBallRef.current
            ? { x: cueBallRef.current.position.x, y: cueBallRef.current.position.y }
            : undefined,
          initialBalls,
        });
      }

      waitForBallsToStop(true);
    },
    [onShotStart, multiplayer, rulesState.currentPlayer, waitForBallsToStop, ballsRef, cueBallRef]
  );

  const {
    getAimState,
    setRemoteAim,
    setGaugePower,
    triggerGaugeShot,
    attachListeners,
    detachListeners,
  } = useAiming(canvasRef, cueBallRef, canAim, onShot, handleAimChange);

  // ── Attach canvas listeners & recalculate scale when entering playing screen ────
  useEffect(() => {
    if (multiplayer.screen === "playing") {
      attachListeners();
      function handleResize() {
        if (!containerRef.current) return;
        const containerW = containerRef.current.clientWidth;
        const sidePanelsW = containerW >= 960 ? 100 : 80;
        const availableW = containerW - sidePanelsW;
        const scale = Math.min(1, Math.max(0.35, availableW / TABLE_WIDTH));
        setCanvasScale(scale);
      }
      handleResize();
      window.addEventListener("resize", handleResize);
      return () => {
        detachListeners();
        window.removeEventListener("resize", handleResize);
      };
    }
  }, [multiplayer.screen, attachListeners, detachListeners]);

  // ── Physics tick streaming from active shooter to opponent ───────────────
  useEffect(() => {
    setOnTick(() => {
      if (
        phaseRef.current === "shooting" &&
        multiplayer.mode === "online" &&
        multiplayer.isMyTurn(rulesState.currentPlayer)
      ) {
        const now = performance.now();
        if (now - lastPhysicsTickEmitRef.current >= 33) {
          lastPhysicsTickEmitRef.current = now;
          const ballsData = ballsRef.current
            .filter((b) => b.parent === b)
            .map((b) => ({
              id: Number(b.label.replace("ball-", "")),
              x: Math.round(b.position.x * 10) / 10,
              y: Math.round(b.position.y * 10) / 10,
              vx: Math.round(b.velocity.x * 100) / 100,
              vy: Math.round(b.velocity.y * 100) / 100,
            }));
          multiplayer.sendPhysicsTick({ balls: ballsData });
        }
      }
    });
    return () => {
      setOnTick(null);
    };
  }, [setOnTick, multiplayer, rulesState.currentPlayer, ballsRef]);

  // ── Init on mount ────────────────────────────────────────────────────────
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

  // ── Record match when game ends ──────────────────────────────────────────
  useEffect(() => {
    if (rulesState.gameOver && rulesState.winner && !matchSavedRef.current) {
      matchSavedRef.current = true;
      const p1Name = multiplayer.mode === "online"
        ? (multiplayer.room?.players[0]?.username || "Player 1")
        : (user?.username || "Player 1");
      const p2Name = multiplayer.mode === "online"
        ? (multiplayer.room?.players[1]?.username || "Player 2")
        : "Player 2";

      const p1Won = rulesState.winner === 1;

      fetch("/api/matches", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          gameType: "billiards",
          players: [
            {
              username: p1Name,
              result: p1Won ? "win" : "loss",
              score: rulesState.player1.pottedBalls.length,
            },
            {
              username: p2Name,
              result: !p1Won ? "win" : "loss",
              score: rulesState.player2.pottedBalls.length,
            },
          ],
          duration: 0,
          gameData: {
            reason: rulesState.winReason,
            winner: rulesState.winner,
            mode: multiplayer.mode,
          },
        }),
      }).catch(() => {});
    }
  }, [rulesState.gameOver, rulesState.winner, rulesState.winReason, rulesState.player1.pottedBalls.length, rulesState.player2.pottedBalls.length, multiplayer.mode, multiplayer.room, user]);

  const handleRestart = useCallback(() => {
    if (multiplayer.mode === "online") {
      multiplayer.restartOnlineGame();
    } else {
      handleRestartLocal();
    }
  }, [multiplayer, handleRestartLocal]);

  const handleCopyCode = async () => {
    if (!multiplayer.roomId) return;
    try {
      await navigator.clipboard.writeText(multiplayer.roomId);
      setCopiedRoomCode(true);
      setTimeout(() => setCopiedRoomCode(false), 2000);
    } catch {}
  };

  const handleCreateRoom = useCallback(() => {
    if (!user) {
      setShowLogin(true);
      return;
    }
    multiplayer.createRoom(user.username);
  }, [user, multiplayer]);

  const handleJoinRoom = useCallback(
    (code: string) => {
      if (!user) {
        setShowLogin(true);
        return;
      }
      multiplayer.joinRoom(code, user.username);
    },
    [user, multiplayer]
  );

  const { currentPlayer, player1, player2, gameOver, winner, winReason, turnMessage, foulMessage, isBreakShot } = rulesState;

  const player1DisplayName =
    multiplayer.mode === "online"
      ? multiplayer.room?.players[0]?.username || "Player 1"
      : user?.username || "Player 1";

  const player2DisplayName =
    multiplayer.mode === "online"
      ? multiplayer.room?.players[1]?.username || "Player 2"
      : "Player 2";

  const isCurrentTurnMine = multiplayer.isMyTurn(currentPlayer);

  // If in lobby or waiting screen, render the lobby UI
  if (multiplayer.screen === "lobby" || multiplayer.screen === "waiting") {
    return (
      <>
        {showLogin && (
          <LoginModal
            title="Enter your username"
            subtitle="You need a username to play online 8 Ball Pool"
            onSuccess={() => setShowLogin(false)}
            onClose={() => setShowLogin(false)}
          />
        )}

        <div className="flex flex-col items-center gap-6 py-6 mx-auto max-w-5xl">
          <div className="w-full text-center sm:text-left">
            <h1 className="text-3xl sm:text-4xl font-extrabold text-foreground">
              🎱 8 Ball Pool
            </h1>
            <p className="text-sm text-foreground-secondary mt-0.5">
              Classic 8-ball billiards • Online 2-player multiplayer & local pass & play
            </p>
          </div>

          <BilliardsLobby
            mode={multiplayer.mode}
            screen={multiplayer.screen}
            roomId={multiplayer.roomId}
            room={multiplayer.room}
            statusMsg={multiplayer.statusMsg}
            error={multiplayer.error}
            joinError={multiplayer.joinError}
            onCreateRoom={handleCreateRoom}
            onJoinRoom={handleJoinRoom}
            onLeaveRoom={multiplayer.leaveRoom}
            onSelectLocalMode={multiplayer.startLocalGame}
          />
        </div>
      </>
    );
  }

  return (
    <>
      {showLogin && (
        <LoginModal
          title="Enter your username"
          subtitle="You need a username to play online 8 Ball Pool"
          onSuccess={() => setShowLogin(false)}
          onClose={() => setShowLogin(false)}
        />
      )}

      <div className="flex flex-col items-center gap-4">
      {/* ── Header ──────────────────────────────────────────────── */}
      <div className="w-full flex items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-3">
            <h1 className="text-2xl sm:text-3xl font-extrabold text-foreground tracking-tight">
              🎱 8 Ball Pool
            </h1>
            {multiplayer.mode === "online" ? (
              <span className="flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold bg-emerald-500/15 text-emerald-400 border border-emerald-500/30">
                <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping inline-block" />
                Room: {multiplayer.roomId}
              </span>
            ) : (
              <span className="px-2.5 py-1 rounded-full text-xs font-bold bg-surface text-foreground-secondary border border-border">
                Local Pass & Play
              </span>
            )}
          </div>
          <p className="text-xs sm:text-sm text-foreground-secondary mt-0.5">
            {multiplayer.mode === "online"
              ? `Playing as ${multiplayer.myPlayerNum === 1 ? "Player 1 (Host)" : "Player 2 (Guest)"} vs ${multiplayer.opponent?.username || "Opponent"}`
              : "Classic 8-ball billiards — local 2-player. Pot your balls, then sink the 8."}
          </p>
        </div>

        {/* Action buttons */}
        <div className="flex items-center gap-2">
          {multiplayer.mode === "online" && user?.username && multiplayer.opponent?.username && (
            <HeadToHeadBadge
              player1={user.username}
              player2={multiplayer.opponent.username}
              gameType="billiards"
              compact
            />
          )}
          {multiplayer.mode === "online" ? (
            <>
              <button
                type="button"
                onClick={handleCopyCode}
                className="flex items-center gap-1.5 px-3 py-2 rounded-xl border border-border bg-surface text-xs font-semibold text-foreground-secondary hover:bg-surface-hover hover:text-foreground transition-all cursor-pointer"
                title="Copy room code"
              >
                {copiedRoomCode ? "✓ Copied" : `📋 ${multiplayer.roomId}`}
              </button>
              <button
                type="button"
                onClick={multiplayer.leaveRoom}
                className="flex items-center gap-1.5 px-3 py-2 rounded-xl border border-border bg-surface text-xs font-semibold text-red-400 hover:bg-red-500/10 hover:border-red-500/30 transition-all cursor-pointer"
              >
                Leave
              </button>
            </>
          ) : (
            <button
              type="button"
              onClick={() => multiplayer.switchMode("online")}
              className="flex items-center gap-1.5 px-3 py-2 rounded-xl border border-emerald-500/40 bg-emerald-500/10 text-xs font-bold text-emerald-300 hover:bg-emerald-500/20 transition-all cursor-pointer shadow-xs"
            >
              🌐 Play Online
            </button>
          )}

          <button
            type="button"
            onClick={handleRestart}
            className="flex items-center gap-2 px-3.5 py-2 rounded-xl border border-border bg-surface text-xs sm:text-sm font-semibold text-foreground-secondary hover:bg-surface-hover hover:text-foreground transition-all hover:-translate-y-0.5 shadow-xs shrink-0 cursor-pointer"
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
              <polyline points="1 4 1 10 7 10" />
              <path d="M3.51 15a9 9 0 1 0 2.13-9.36L1 10" />
            </svg>
            {multiplayer.mode === "online" ? "Rematch" : "New Game"}
          </button>
        </div>
      </div>

      {/* ── TOP: Player Scoreboard & Potted Balls Bar ── */}
      <PottedBallsTray
        player1={player1}
        player2={player2}
        currentPlayer={currentPlayer}
        gameOver={gameOver}
        winner={winner}
        width={Math.round(TABLE_WIDTH * canvasScale) + 84}
        player1Name={player1DisplayName}
        player2Name={player2DisplayName}
        myPlayerNum={multiplayer.mode === "online" ? multiplayer.myPlayerNum : null}
      />

      {/* ── Billiard Arena (Left Cue Power + Center Table) ── */}
      <div
        ref={containerRef}
        className="w-full flex items-center justify-center gap-3 sm:gap-4 lg:gap-5"
      >
        {/* ── LEFT: Vertical Cue Stick Power Gauge ── */}
        <CueStickPowerGauge
          power={aimPower}
          isAiming={isAiming}
          height={Math.round(TABLE_HEIGHT * canvasScale)}
          disabled={!isCurrentTurnMine || phase !== "aiming" || rulesState.gameOver || rulesState.ballInHand}
          onPowerChange={setGaugePower}
          onRelease={triggerGaugeShot}
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
                  : isCurrentTurnMine
                  ? "cursor-grab"
                  : "cursor-not-allowed"
                : isCurrentTurnMine
                ? "cursor-crosshair"
                : "cursor-default"
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
                  {multiplayer.mode === "online"
                    ? winner === multiplayer.myPlayerNum
                      ? "You Won!"
                      : `${winner === 1 ? player1DisplayName : player2DisplayName} Won!`
                    : `Player ${winner} Wins!`}
                </h2>
                <p className="mt-2 text-sm leading-relaxed text-slate-300">
                  {winReason}
                </p>

                {/* Final score summary */}
                <div className="mt-4 flex justify-center gap-4">
                  <div className="rounded-lg border border-white/10 bg-white/5 px-4 py-2">
                    <div className="text-xs uppercase tracking-wider text-slate-400">
                      {player1DisplayName}
                    </div>
                    <div className="text-xl font-black">{player1.pottedBalls.length}</div>
                  </div>
                  <div className="rounded-lg border border-white/10 bg-white/5 px-4 py-2">
                    <div className="text-xs uppercase tracking-wider text-slate-400">
                      {player2DisplayName}
                    </div>
                    <div className="text-xl font-black">{player2.pottedBalls.length}</div>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={handleRestart}
                  className="mt-6 flex w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-emerald-400 to-green-600 px-5 py-3 text-sm font-black text-white shadow-lg shadow-emerald-600/25 transition-all hover:scale-[1.02] hover:from-emerald-300 hover:to-green-500 active:scale-[0.98] cursor-pointer"
                >
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
                    <polyline points="1 4 1 10 7 10" />
                    <path d="M3.51 15a9 9 0 1 0 2.13-9.36L1 10" />
                  </svg>
                  Play Again
                </button>

                {multiplayer.mode === "online" && (
                  <button
                    type="button"
                    onClick={multiplayer.leaveRoom}
                    className="mt-2.5 flex w-full items-center justify-center gap-2 rounded-xl border border-border bg-surface px-5 py-2.5 text-xs font-bold text-foreground hover:bg-surface-hover transition-all cursor-pointer"
                  >
                    🚪 Back to Lobby
                  </button>
                )}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* ── Bottom Single Unified Status / Turn Banner (in English) ── */}
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
                    Ball in Hand — {multiplayer.mode === "online" ? (isCurrentTurnMine ? "Your Turn" : `${currentPlayer === 1 ? player1DisplayName : player2DisplayName}'s Turn`) : `Player ${currentPlayer}`}
                  </span>
                  <span
                    className={`px-2 py-0.5 rounded-full text-[10px] font-bold border ${
                      isPlacementValid
                        ? "bg-emerald-500/20 text-emerald-300 border-emerald-500/40"
                        : "bg-red-500/20 text-red-400 border-red-500/40 animate-pulse"
                    }`}
                  >
                    {isPlacementValid ? "✓ Legal Position" : "✕ Overlapping Ball or Pocket"}
                  </span>
                </div>
                <p className="text-xs text-slate-300">
                  {isCurrentTurnMine
                    ? isPlacingBall
                      ? isPlacementValid
                        ? "Release pointer to place cue ball here."
                        : "Move to open felt, cannot overlap other balls."
                      : "Drag cue ball or click anywhere on the felt to reposition."
                    : "Opponent is repositioning the cue ball..."}
                </p>
              </div>
            </div>

            {isCurrentTurnMine && (
              <button
                type="button"
                onClick={confirmPlacement}
                disabled={!isPlacementValid}
                className={`flex items-center gap-2 px-4 py-1.5 rounded-xl text-xs font-bold transition-all shadow-md ${
                  isPlacementValid
                    ? "bg-gradient-to-r from-emerald-500 to-green-600 text-white hover:from-emerald-400 hover:to-green-500 active:scale-95 shadow-emerald-500/25 cursor-pointer ring-2 ring-emerald-400/30"
                    : "bg-slate-800 text-slate-500 border border-slate-700 cursor-not-allowed opacity-60"
                }`}
                title={isPlacementValid ? "Confirm placement (Space or Enter)" : "Invalid placement position"}
              >
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                  <polyline points="20 6 9 17 4 12" />
                </svg>
                {isPlacementValid ? "Confirm Placement" : "Invalid Position"}
              </button>
            )}
          </div>
        ) : foulFlash && foulMessage ? (
          <div className="px-4 py-1.5 rounded-full border border-red-500/30 bg-red-500/15 text-red-400 text-xs font-semibold text-center animate-pulse shadow-xs">
            ⚠️ {foulMessage}
          </div>
        ) : turnMessage && !gameOver && phase === "aiming" ? (
          <div className="px-4 py-1.5 rounded-full border border-amber-500/30 bg-amber-500/10 text-amber-300 text-xs font-medium text-center shadow-xs">
            {multiplayer.mode === "online"
              ? isCurrentTurnMine
                ? `👉 Your Turn (${turnMessage})`
                : `⏳ Opponent's Turn (${turnMessage})`
              : turnMessage}
          </div>
        ) : (
          <div className="flex items-center gap-2 text-xs text-foreground-muted">
            <span className={`inline-block w-2 h-2 rounded-full ${
              gameOver
                ? "bg-emerald-400"
                : phase === "shooting"
                ? "bg-amber-400"
                : isCurrentTurnMine
                ? "bg-emerald-400"
                : "bg-blue-400"
            } animate-pulse`} />
            <span className="font-medium">
              {gameOver
                ? `🏆 ${multiplayer.mode === "online" ? (winner === multiplayer.myPlayerNum ? "You won!" : "Opponent won!") : `Player ${winner} wins!`} — ${winReason}`
                : phase === "shooting"
                ? "Balls in motion..."
                : multiplayer.mode === "online"
                ? isCurrentTurnMine
                  ? isBreakShot
                    ? "Your Turn — Break shot: Drag cue ball to aim and strike"
                    : "Your Turn — Click & drag cue ball to aim and strike"
                  : `Waiting for ${currentPlayer === 1 ? player1DisplayName : player2DisplayName} to strike...`
                : isBreakShot
                ? "Break shot — Drag cue ball to aim and strike"
                : "Click & drag cue ball to aim and strike"}
            </span>
          </div>
        )}
      </div>
    </div>
    </>
  );
}
