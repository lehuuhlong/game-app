"use client";

import { useCallback, useEffect, useRef } from "react";
import Matter from "matter-js";
import {
  TABLE_WIDTH,
  TABLE_HEIGHT,
  CUSHION_WIDTH,
  POCKET_RADIUS,
  BALL_RADIUS,
  BALL_FRICTION,
  BALL_FRICTION_AIR,
  BALL_FRICTION_STATIC,
  BALL_RESTITUTION,
  BALL_DENSITY,
  CUE_BALL_RESTITUTION,
  CUSHION_RESTITUTION,
  CUSHION_FRICTION,
  FIXED_TIMESTEP,
  VELOCITY_THRESHOLD,
  POCKET_POSITIONS,
  BALL_CONFIGS,
  RACK_BALL_ORDER,
  getRackPositions,
  CUE_BALL_START_X,
  CUE_BALL_START_Y,
  PLAY_LEFT,
  PLAY_TOP,
  PLAY_RIGHT,
  PLAY_BOTTOM,
  POCKET_LABEL_PREFIX,
} from "./constants";

const { Engine, World, Bodies, Body, Runner, Events, Composite } = Matter;

// ─── Types ──────────────────────────────────────────────────────────────────

export interface PhysicsEngine {
  engine: Matter.Engine;
  runner: Matter.Runner;
  balls: Matter.Body[];
  cueBall: Matter.Body;
  pockets: Matter.Body[];
  cushions: Matter.Body[];
}

// ─── Pocket bodies (sensors) ────────────────────────────────────────────────

function createPockets(): Matter.Body[] {
  return POCKET_POSITIONS.map((p) =>
    Bodies.circle(p.x, p.y, POCKET_RADIUS, {
      isStatic: true,
      isSensor: true, // sensor = no physical collision, only detection
      label: p.id,
      render: {
        fillStyle: "#000000",
      },
    })
  );
}

// ─── Cushion bodies ─────────────────────────────────────────────────────────
// We create 6 cushion segments (not 4 rectangles) so that they have openings
// at pocket locations. Each long rail is split in 2 by the side pocket.

function createCushions(): Matter.Body[] {
  const cushions: Matter.Body[] = [];
  const cw = CUSHION_WIDTH;
  const pocketGap = POCKET_RADIUS * 1.8; // gap in the rail at pocket mouth

  const cushionOpts = {
    isStatic: true,
    restitution: CUSHION_RESTITUTION,
    friction: CUSHION_FRICTION,
    render: { fillStyle: "#2d5a1e" },
    label: "cushion",
  } as const;

  // Top rail: split into left and right segments by side pocket (pocket-mt)
  // Left segment: from left pocket edge to middle pocket
  const topLeftLen = TABLE_WIDTH / 2 - PLAY_LEFT - pocketGap;
  cushions.push(
    Bodies.rectangle(
      PLAY_LEFT + pocketGap / 2 + topLeftLen / 2,
      PLAY_TOP - cw / 2,
      topLeftLen,
      cw,
      cushionOpts
    )
  );
  // Right segment
  const topRightLen = TABLE_WIDTH / 2 - PLAY_LEFT - pocketGap;
  cushions.push(
    Bodies.rectangle(
      TABLE_WIDTH / 2 + pocketGap / 2 + topRightLen / 2,
      PLAY_TOP - cw / 2,
      topRightLen,
      cw,
      cushionOpts
    )
  );

  // Bottom rail: split into left and right segments by side pocket (pocket-mb)
  cushions.push(
    Bodies.rectangle(
      PLAY_LEFT + pocketGap / 2 + topLeftLen / 2,
      PLAY_BOTTOM + cw / 2,
      topLeftLen,
      cw,
      cushionOpts
    )
  );
  cushions.push(
    Bodies.rectangle(
      TABLE_WIDTH / 2 + pocketGap / 2 + topRightLen / 2,
      PLAY_BOTTOM + cw / 2,
      topRightLen,
      cw,
      cushionOpts
    )
  );

  // Left rail (full height between corner pockets)
  const sideLen = PLAY_BOTTOM - PLAY_TOP - pocketGap * 2;
  cushions.push(
    Bodies.rectangle(
      PLAY_LEFT - cw / 2,
      TABLE_HEIGHT / 2,
      cw,
      sideLen,
      cushionOpts
    )
  );

  // Right rail
  cushions.push(
    Bodies.rectangle(
      PLAY_RIGHT + cw / 2,
      TABLE_HEIGHT / 2,
      cw,
      sideLen,
      cushionOpts
    )
  );

  // ── Outer perimeter enclosure walls (100px thick barriers behind cushions) ──
  // Top outer wall
  cushions.push(
    Bodies.rectangle(TABLE_WIDTH / 2, -50, TABLE_WIDTH + 300, 100, cushionOpts)
  );
  // Bottom outer wall
  cushions.push(
    Bodies.rectangle(TABLE_WIDTH / 2, TABLE_HEIGHT + 50, TABLE_WIDTH + 300, 100, cushionOpts)
  );
  // Left outer wall
  cushions.push(
    Bodies.rectangle(-50, TABLE_HEIGHT / 2, 100, TABLE_HEIGHT + 300, cushionOpts)
  );
  // Right outer wall
  cushions.push(
    Bodies.rectangle(TABLE_WIDTH + 50, TABLE_HEIGHT / 2, 100, TABLE_HEIGHT + 300, cushionOpts)
  );

  // ── Corner pocket backstops (angled 45° corner bumpers behind pockets) ─────
  const cornerBackstopSize = 65;
  // Top-Left
  cushions.push(
    Bodies.rectangle(10, 10, cornerBackstopSize, 25, {
      ...cushionOpts,
      angle: Math.PI / 4,
    })
  );
  // Top-Right
  cushions.push(
    Bodies.rectangle(TABLE_WIDTH - 10, 10, cornerBackstopSize, 25, {
      ...cushionOpts,
      angle: -Math.PI / 4,
    })
  );
  // Bottom-Left
  cushions.push(
    Bodies.rectangle(10, TABLE_HEIGHT - 10, cornerBackstopSize, 25, {
      ...cushionOpts,
      angle: -Math.PI / 4,
    })
  );
  // Bottom-Right
  cushions.push(
    Bodies.rectangle(TABLE_WIDTH - 10, TABLE_HEIGHT - 10, cornerBackstopSize, 25, {
      ...cushionOpts,
      angle: Math.PI / 4,
    })
  );

  // ── Side pocket backstops ──────────────────────────────────────────────────
  cushions.push(
    Bodies.rectangle(TABLE_WIDTH / 2, 5, 55, 20, cushionOpts)
  );
  cushions.push(
    Bodies.rectangle(TABLE_WIDTH / 2, TABLE_HEIGHT - 5, 55, 20, cushionOpts)
  );

  return cushions;
}

// ─── Ball creation ──────────────────────────────────────────────────────────

function createBalls(): { balls: Matter.Body[]; cueBall: Matter.Body } {
  const rackPositions = getRackPositions();
  const balls: Matter.Body[] = [];

  // Create the 15 object balls in rack formation
  for (let i = 0; i < 15; i++) {
    const ballNumber = RACK_BALL_ORDER[i];
    const config = BALL_CONFIGS[ballNumber];
    const pos = rackPositions[i];

    const ball = Bodies.circle(pos.x, pos.y, BALL_RADIUS, {
      restitution: BALL_RESTITUTION,
      friction: BALL_FRICTION,
      frictionAir: BALL_FRICTION_AIR,
      frictionStatic: BALL_FRICTION_STATIC,
      density: BALL_DENSITY,
      label: config.label,
      render: {
        fillStyle: config.color,
      },
    });
    balls.push(ball);
  }

  // Create the cue ball
  const cueBall = Bodies.circle(CUE_BALL_START_X, CUE_BALL_START_Y, BALL_RADIUS, {
    restitution: CUE_BALL_RESTITUTION,
    friction: BALL_FRICTION,
    frictionAir: BALL_FRICTION_AIR,
    frictionStatic: BALL_FRICTION_STATIC,
    density: BALL_DENSITY,
    label: BALL_CONFIGS[0].label, // "ball-0"
    render: {
      fillStyle: "#FFFFFF",
    },
  });
  balls.push(cueBall);

  return { balls, cueBall };
}

// ─── Check if all balls are stopped ─────────────────────────────────────────

export function areAllBallsStopped(balls: Matter.Body[]): boolean {
  for (const ball of balls) {
    const speed = Math.sqrt(
      ball.velocity.x * ball.velocity.x + ball.velocity.y * ball.velocity.y
    );
    if (speed > VELOCITY_THRESHOLD) {
      return false;
    }
  }
  return true;
}

// ─── Fully stop all balls (snap tiny velocities to zero) ────────────────────

export function snapAllBallsToStop(balls: Matter.Body[]) {
  for (const ball of balls) {
    const speed = Math.sqrt(
      ball.velocity.x * ball.velocity.x + ball.velocity.y * ball.velocity.y
    );
    if (speed < VELOCITY_THRESHOLD * 3) {
      Body.setVelocity(ball, { x: 0, y: 0 });
      Body.setAngularVelocity(ball, 0);
    }
  }
}

// ─── Containment and Velocity Guard ─────────────────────────────────────────
// Clamps max speed and guarantees balls never tunnel through cushions or escape table
const MAX_BALL_SPEED = 50; // generous velocity ceiling for explosive break shots

function clampAndContainBalls(balls: Matter.Body[]) {
  const minX = PLAY_LEFT;
  const maxX = PLAY_RIGHT;
  const minY = PLAY_TOP;
  const maxY = PLAY_BOTTOM;

  for (const ball of balls) {
    const vx = ball.velocity.x;
    const vy = ball.velocity.y;
    const speedSq = vx * vx + vy * vy;

    // 1. Cap terminal velocity if extreme spike
    if (speedSq > MAX_BALL_SPEED * MAX_BALL_SPEED) {
      const speed = Math.sqrt(speedSq);
      const scale = MAX_BALL_SPEED / speed;
      Body.setVelocity(ball, { x: vx * scale, y: vy * scale });
    }

    // 2. Check if near any pocket opening
    const bx = ball.position.x;
    const by = ball.position.y;
    const nearPocket = POCKET_POSITIONS.some((p) => {
      const dx = bx - p.x;
      const dy = by - p.y;
      return dx * dx + dy * dy < POCKET_RADIUS * POCKET_RADIUS * 2.2;
    });

    if (!nearPocket) {
      // 3. Table containment guard: ball must stay strictly within cushions.
      // Only reflect velocity if the ball is moving TOWARD the cushion (prevents over-damping on consecutive sub-steps)
      const r = BALL_RADIUS;
      let clamped = false;
      let newX = bx;
      let newY = by;
      let newVx = ball.velocity.x;
      let newVy = ball.velocity.y;

      if (bx < minX + r) {
        newX = minX + r;
        if (newVx < 0) newVx = -newVx * 0.82;
        clamped = true;
      } else if (bx > maxX - r) {
        newX = maxX - r;
        if (newVx > 0) newVx = -newVx * 0.82;
        clamped = true;
      }

      if (by < minY + r) {
        newY = minY + r;
        if (newVy < 0) newVy = -newVy * 0.82;
        clamped = true;
      } else if (by > maxY - r) {
        newY = maxY - r;
        if (newVy > 0) newVy = -newVy * 0.82;
        clamped = true;
      }

      if (clamped) {
        Body.setPosition(ball, { x: newX, y: newY });
        Body.setVelocity(ball, { x: newVx, y: newVy });
      }
    } else {
      // Near pocket: prevent flying outside table perimeter
      let clampedPocket = false;
      let px = bx;
      let py = by;
      if (bx < 4) {
        px = 4;
        clampedPocket = true;
      } else if (bx > TABLE_WIDTH - 4) {
        px = TABLE_WIDTH - 4;
        clampedPocket = true;
      }
      if (by < 4) {
        py = 4;
        clampedPocket = true;
      } else if (by > TABLE_HEIGHT - 4) {
        py = TABLE_HEIGHT - 4;
        clampedPocket = true;
      }
      if (clampedPocket) {
        Body.setPosition(ball, { x: px, y: py });
      }
    }
  }
}

// ─── The Hook ───────────────────────────────────────────────────────────────

export function usePhysicsEngine() {
  const engineRef = useRef<Matter.Engine | null>(null);
  const runnerRef = useRef<Matter.Runner | null>(null);
  const ballsRef = useRef<Matter.Body[]>([]);
  const cueBallRef = useRef<Matter.Body | null>(null);
  const pocketsRef = useRef<Matter.Body[]>([]);
  const cushionsRef = useRef<Matter.Body[]>([]);
  const rafIdRef = useRef<number>(0);
  const lastTimeRef = useRef<number>(0);
  const accumulatorRef = useRef<number>(0);

  // ─── Initialize engine ──────────────────────────────────────────────────

  const init = useCallback(() => {
    // Create high-precision engine (top-down view)
    const engine = Engine.create({
      gravity: { x: 0, y: 0 },
      positionIterations: 12, // default 6 -> 12 for high-speed collision accuracy
      velocityIterations: 10, // default 4 -> 10
      constraintIterations: 4,
    });

    // Create all physics bodies
    const pockets = createPockets();
    const cushions = createCushions();
    const { balls, cueBall } = createBalls();

    // Add everything to the world
    Composite.add(engine.world, [...pockets, ...cushions, ...balls]);

    // Store refs
    engineRef.current = engine;
    ballsRef.current = balls;
    cueBallRef.current = cueBall;
    pocketsRef.current = pockets;
    cushionsRef.current = cushions;

    return { engine, balls, cueBall, pockets, cushions };
  }, []);

  // ─── Fixed-timestep game loop with Substepping ─────────────────────────
  // Uses 4 sub-steps per 60Hz frame (240Hz physics resolution).
  // Ensures balls never tunnel through cushions even at maximum velocity.

  const startLoop = useCallback(() => {
    const engine = engineRef.current;
    if (!engine) return;

    lastTimeRef.current = performance.now();
    accumulatorRef.current = 0;

    const SUB_STEPS = 4;
    const subDt = FIXED_TIMESTEP / SUB_STEPS;

    const loop = (timestamp: number) => {
      const delta = timestamp - lastTimeRef.current;
      lastTimeRef.current = timestamp;

      // Cap the delta to prevent spiral of death on tab switch
      const clampedDelta = Math.min(delta, 100);
      accumulatorRef.current += clampedDelta;

      // Process fixed timestep updates with substepping
      while (accumulatorRef.current >= FIXED_TIMESTEP) {
        for (let s = 0; s < SUB_STEPS; s++) {
          Engine.update(engine, subDt);
          clampAndContainBalls(ballsRef.current);
        }
        accumulatorRef.current -= FIXED_TIMESTEP;
      }

      rafIdRef.current = requestAnimationFrame(loop);
    };

    rafIdRef.current = requestAnimationFrame(loop);
  }, []);

  const stopLoop = useCallback(() => {
    if (rafIdRef.current) {
      cancelAnimationFrame(rafIdRef.current);
      rafIdRef.current = 0;
    }
  }, []);

  // ─── Cleanup ────────────────────────────────────────────────────────────

  const cleanup = useCallback(() => {
    stopLoop();
    if (engineRef.current) {
      World.clear(engineRef.current.world, false);
      Engine.clear(engineRef.current);
      engineRef.current = null;
    }
    ballsRef.current = [];
    cueBallRef.current = null;
    pocketsRef.current = [];
    cushionsRef.current = [];
  }, [stopLoop]);

  // ─── Reset balls to initial positions ─────────────────────────────────

  const resetBalls = useCallback(() => {
    const engine = engineRef.current;
    if (!engine) return;

    // Remove existing balls from world
    for (const ball of ballsRef.current) {
      Composite.remove(engine.world, ball);
    }

    // Recreate balls
    const { balls, cueBall } = createBalls();
    Composite.add(engine.world, balls);

    ballsRef.current = balls;
    cueBallRef.current = cueBall;

    return { balls, cueBall };
  }, []);

  // ─── Respot cue ball (after scratch/foul) ─────────────────────────────

  const respotCueBall = useCallback(() => {
    const engine = engineRef.current;
    if (!engine) return;
    const cueBall = cueBallRef.current;

    // Determine an unoccupied spot starting from standard break position
    let spawnX = CUE_BALL_START_X;
    let spawnY = CUE_BALL_START_Y;
    const isOccupied = (x: number, y: number) =>
      ballsRef.current.some(
        (b) =>
          b.label !== BALL_CONFIGS[0].label &&
          Math.hypot(b.position.x - x, b.position.y - y) < BALL_RADIUS * 2 + 4
      );

    let attempts = 0;
    while (isOccupied(spawnX, spawnY) && attempts < 25) {
      spawnX += (attempts % 2 === 0 ? 1 : -1) * (BALL_RADIUS * 2.2);
      attempts++;
    }

    // Check if the cue ball was removed (potted) from world or active list
    const existsInWorld = cueBall ? Composite.get(engine.world, cueBall.id, "body") : null;
    const existsInBalls = cueBall ? ballsRef.current.some((b) => b.id === cueBall.id) : false;

    if (!cueBall || !existsInWorld || !existsInBalls) {
      const newCueBall = Bodies.circle(spawnX, spawnY, BALL_RADIUS, {
        restitution: CUE_BALL_RESTITUTION,
        friction: BALL_FRICTION,
        frictionAir: BALL_FRICTION_AIR,
        frictionStatic: BALL_FRICTION_STATIC,
        density: BALL_DENSITY,
        label: BALL_CONFIGS[0].label,
        render: { fillStyle: "#FFFFFF" },
      });
      Composite.add(engine.world, newCueBall);
      // Replace or add in balls array
      ballsRef.current = [
        ...ballsRef.current.filter((b) => b.label !== BALL_CONFIGS[0].label),
        newCueBall,
      ];
      cueBallRef.current = newCueBall;
      return newCueBall;
    }

    // Otherwise just reset its position and velocity to the safe spawn point
    Body.setPosition(cueBall, { x: spawnX, y: spawnY });
    Body.setVelocity(cueBall, { x: 0, y: 0 });
    Body.setAngularVelocity(cueBall, 0);
    return cueBall;
  }, []);

  // ─── Remove a ball from the world (potted) ───────────────────────────

  const removeBall = useCallback((ball: Matter.Body) => {
    const engine = engineRef.current;
    if (!engine) return;
    // Instantly zero out velocity so it can't interact with anything
    Body.setVelocity(ball, { x: 0, y: 0 });
    Body.setAngularVelocity(ball, 0);
    // Remove from physics simulation
    Composite.remove(engine.world, ball);
    // Remove from active balls array so it's no longer rendered or counted
    ballsRef.current = ballsRef.current.filter((b) => b.id !== ball.id);
  }, []);

  // ─── Get ball config by label ─────────────────────────────────────────

  const getBallNumber = useCallback((label: string): number => {
    const match = label.match(/ball-(\d+)/);
    return match ? parseInt(match[1], 10) : -1;
  }, []);

  return {
    engineRef,
    ballsRef,
    cueBallRef,
    pocketsRef,
    cushionsRef,
    init,
    startLoop,
    stopLoop,
    cleanup,
    resetBalls,
    respotCueBall,
    removeBall,
    getBallNumber,
    areAllBallsStopped: () => areAllBallsStopped(ballsRef.current),
    snapAllBallsToStop: () => snapAllBallsToStop(ballsRef.current),
  };
}
