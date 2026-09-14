"use client";

import { useCallback, useRef, useState } from "react";
import Matter from "matter-js";
import {
  BALL_CONFIGS,
  CUE_BALL_LABEL,
  EIGHT_BALL_LABEL,
  POCKET_LABEL_PREFIX,
  type BallType,
} from "./constants";

const { Events, Composite } = Matter;

// ─── Types ──────────────────────────────────────────────────────────────────

export type PlayerGroup = "solid" | "stripe" | null; // null = not yet assigned

export interface PlayerState {
  group: PlayerGroup;
  pottedBalls: number[]; // ball numbers potted by this player
}

export type GameResult =
  | { type: "ongoing" }
  | { type: "win"; winner: 1 | 2; reason: string }
  | { type: "foul"; message: string };

export interface TurnSummary {
  pottedThisTurn: number[];     // ball numbers potted during this shot
  cueBallPotted: boolean;       // scratch
  eightBallPotted: boolean;
  legalPot: boolean;            // at least one ball of the current player's group potted
  foul: boolean;
  switchTurn: boolean;          // whether to switch to the other player
  gameResult: GameResult;
  message: string;
}

export interface RulesState {
  player1: PlayerState;
  player2: PlayerState;
  currentPlayer: 1 | 2;
  isBreakShot: boolean;        // true on the very first shot
  groupsAssigned: boolean;     // whether solids/stripes have been assigned
  gameOver: boolean;
  winner: 1 | 2 | null;
  winReason: string;
  foulMessage: string;
  turnMessage: string;
  ballInHand: boolean;         // true when player can place cue ball freely anywhere
}

const INITIAL_RULES_STATE: RulesState = {
  player1: { group: null, pottedBalls: [] },
  player2: { group: null, pottedBalls: [] },
  currentPlayer: 1,
  isBreakShot: true,
  groupsAssigned: false,
  gameOver: false,
  winner: null,
  winReason: "",
  foulMessage: "",
  turnMessage: "",
  ballInHand: false,
};

// ─── Helpers ────────────────────────────────────────────────────────────────

function getBallNumber(label: string): number {
  const match = label.match(/ball-(\d+)/);
  return match ? parseInt(match[1], 10) : -1;
}

function getBallType(ballNumber: number): BallType {
  if (ballNumber === 0) return "cue";
  if (ballNumber === 8) return "eight";
  if (ballNumber >= 1 && ballNumber <= 7) return "solid";
  if (ballNumber >= 9 && ballNumber <= 15) return "stripe";
  return "cue"; // fallback
}

function isPocket(label: string): boolean {
  return label.startsWith(POCKET_LABEL_PREFIX);
}

function isBall(label: string): boolean {
  return label.startsWith("ball-");
}

// ─── The Hook ───────────────────────────────────────────────────────────────

export function useBilliardsRules() {
  const [rulesState, setRulesState] = useState<RulesState>({ ...INITIAL_RULES_STATE });
  const rulesRef = useRef<RulesState>({ ...INITIAL_RULES_STATE });

  // Track potted balls during the current shot (accumulated via collision events)
  const pottedThisShotRef = useRef<number[]>([]);
  // Track first ball touched by the cue ball in the current shot
  const firstContactBallRef = useRef<number | null>(null);
  const collisionCleanupRef = useRef<(() => void) | null>(null);

  // ── Sync ref with state ──────────────────────────────────────────────────

  const updateState = useCallback((updater: (prev: RulesState) => RulesState) => {
    setRulesState((prev) => {
      const next = updater(prev);
      rulesRef.current = next;
      return next;
    });
  }, []);

  // ── Start listening to collision events ─────────────────────────────────

  const startCollisionDetection = useCallback(
    (
      engine: Matter.Engine,
      removeBall: (ball: Matter.Body, pocketPos?: { x: number; y: number }) => void
    ) => {
      const handler = (event: Matter.IEventCollision<Matter.Engine>) => {
        for (const pair of event.pairs) {
          const { bodyA, bodyB } = pair;
          const labelA = bodyA.label;
          const labelB = bodyB.label;

          // 1. Detect first object ball touched by cue ball
          if (firstContactBallRef.current === null) {
            if (labelA === CUE_BALL_LABEL && isBall(labelB) && labelB !== CUE_BALL_LABEL) {
              firstContactBallRef.current = getBallNumber(labelB);
            } else if (labelB === CUE_BALL_LABEL && isBall(labelA) && labelA !== CUE_BALL_LABEL) {
              firstContactBallRef.current = getBallNumber(labelA);
            }
          }

          // 2. Pocket collisions (ball into pocket sensor)
          let ballBody: Matter.Body | null = null;
          let pocketBody: Matter.Body | null = null;

          if (isPocket(labelA) && isBall(labelB)) {
            ballBody = bodyB;
            pocketBody = bodyA;
          } else if (isPocket(labelB) && isBall(labelA)) {
            ballBody = bodyA;
            pocketBody = bodyB;
          }

          if (!ballBody || !pocketBody) continue;

          // CRITICAL: If Ball in Hand is currently active and this is the cue ball,
          // IGNORE pocket collisions! The player is positioning/dragging it, it must NEVER be pocketed!
          if (rulesRef.current.ballInHand && ballBody.label === CUE_BALL_LABEL) {
            continue;
          }

          const ballNumber = getBallNumber(ballBody.label);
          if (ballNumber < 0) continue;

          // Avoid double-detection: check if already potted this shot
          if (pottedThisShotRef.current.includes(ballNumber)) continue;
          pottedThisShotRef.current.push(ballNumber);

          // Remove the ball from the physics world (with target pocket position for animation)
          removeBall(ballBody, { x: pocketBody.position.x, y: pocketBody.position.y });
        }
      };

      Events.on(engine, "collisionStart", handler);

      // Store cleanup function
      collisionCleanupRef.current = () => {
        Events.off(engine, "collisionStart", handler);
      };
    },
    []
  );

  // ── Stop collision detection ────────────────────────────────────────────

  const stopCollisionDetection = useCallback(() => {
    if (collisionCleanupRef.current) {
      collisionCleanupRef.current();
      collisionCleanupRef.current = null;
    }
  }, []);

  // ── Called when a shot starts (before applying force) ───────────────────

  const onShotStart = useCallback(() => {
    pottedThisShotRef.current = [];
    firstContactBallRef.current = null;
    updateState((prev) => ({
      ...prev,
      foulMessage: "",
      turnMessage: "",
    }));
  }, [updateState]);

  // ── Called when all balls have stopped after a shot ─────────────────────
  // This is the core rules evaluation function.

  const evaluateShot = useCallback(
    (respotCueBall: () => Matter.Body | undefined): TurnSummary => {
      const potted = pottedThisShotRef.current;
      const rules = rulesRef.current;

      const cueBallPotted = potted.includes(0);
      const eightBallPotted = potted.includes(8);
      const objectBallsPotted = potted.filter((n) => n !== 0 && n !== 8);
      const solidsPotted = objectBallsPotted.filter((n) => n >= 1 && n <= 7);
      const stripesPotted = objectBallsPotted.filter((n) => n >= 9 && n <= 15);

      let switchTurn = false;
      let foul = false;
      let message = "";
      let gameResult: GameResult = { type: "ongoing" };

      const currentPlayer = rules.currentPlayer;
      const currentPlayerState = currentPlayer === 1 ? rules.player1 : rules.player2;
      const opponentPlayerState = currentPlayer === 1 ? rules.player2 : rules.player1;

      // ── 1. Handle 8-ball potted ──────────────────────────────────────
      if (eightBallPotted) {
        if (rules.isBreakShot) {
          // 8-ball on break: respot the 8-ball (special rule — no win/loss)
          // For simplicity, we'll treat it as a foul: opponent gets ball-in-hand
          foul = true;
          message = "8-ball potted on break! Foul — opponent gets ball-in-hand.";
          switchTurn = true;
          // Note: in a real implementation we'd respot the 8-ball, but for MVP
          // we'll keep it potted and treat it as a loss
          gameResult = {
            type: "win",
            winner: currentPlayer === 1 ? 2 : 1,
            reason: `Player ${currentPlayer} potted the 8-ball on break!`,
          };
        } else if (!rules.groupsAssigned) {
          // Groups not yet assigned and 8-ball potted — loss
          gameResult = {
            type: "win",
            winner: currentPlayer === 1 ? 2 : 1,
            reason: `Player ${currentPlayer} potted the 8-ball too early!`,
          };
        } else {
          // Check if the player has cleared all their balls
          const totalPotted = currentPlayerState.pottedBalls.length +
            (currentPlayerState.group === "solid" ? solidsPotted.length : stripesPotted.length);
          const requiredCount = 7; // must pot all 7 balls of their group

          if (totalPotted >= requiredCount) {
            // Legal 8-ball pot — WINNER!
            if (cueBallPotted) {
              // Scratch on 8-ball = loss
              gameResult = {
                type: "win",
                winner: currentPlayer === 1 ? 2 : 1,
                reason: `Player ${currentPlayer} scratched while potting the 8-ball!`,
              };
            } else {
              gameResult = {
                type: "win",
                winner: currentPlayer,
                reason: `Player ${currentPlayer} legally potted the 8-ball!`,
              };
            }
          } else {
            // Potted 8-ball before clearing all their balls — LOSS
            gameResult = {
              type: "win",
              winner: currentPlayer === 1 ? 2 : 1,
              reason: `Player ${currentPlayer} potted the 8-ball before clearing their group!`,
            };
          }
        }
      }

      // ── 2. Handle cue ball scratch (if game not already over) ────────
      if (cueBallPotted && gameResult.type === "ongoing") {
        foul = true;
        switchTurn = true;
        message = "Scratch! Cue ball potted. Opponent gets ball in hand.";
        // Respot the cue ball so it can be moved via ball-in-hand
        respotCueBall();
      }

      // ── 2.5 Handle first-contact foul (required ball rule) ───────────
      // After break, cue ball MUST touch the player's assigned ball type first
      if (!rules.isBreakShot && gameResult.type === "ongoing" && !foul) {
        const fc = firstContactBallRef.current;
        const playerGroup = currentPlayer === 1 ? rules.player1.group : rules.player2.group;

        if (fc === null) {
          // Cue ball completely missed all object balls
          foul = true;
          switchTurn = true;
          message = `Foul! Player ${currentPlayer} missed all balls. Opponent gets ball in hand.`;
        } else if (playerGroup !== null) {
          const myPotted = currentPlayer === 1 ? rules.player1.pottedBalls : rules.player2.pottedBalls;
          const myRemaining = 7 - myPotted.length;
          const isSolid = fc >= 1 && fc <= 7;
          const isStripe = fc >= 9 && fc <= 15;

          if (myRemaining > 0) {
            const hitCorrect = playerGroup === "solid" ? isSolid : isStripe;
            if (!hitCorrect) {
              foul = true;
              switchTurn = true;
              const wrongType = fc === 8 ? "8-ball" : isSolid ? "Solid" : "Stripe";
              const neededType = playerGroup === "solid" ? "Solids" : "Stripes";
              message = `Foul! Hit a ${wrongType} ball first (needed ${neededType}). Opponent gets ball in hand.`;
            }
          } else {
            // Player cleared all their balls — must hit the 8-ball first!
            if (fc !== 8) {
              foul = true;
              switchTurn = true;
              message = `Foul! Must hit the 8-ball first. Opponent gets ball in hand.`;
            }
          }
        } else {
          // Groups not assigned yet (open table) — cannot hit the 8-ball first
          if (fc === 8) {
            foul = true;
            switchTurn = true;
            message = "Foul! Cannot hit the 8-ball first on an open table. Opponent gets ball in hand.";
          }
        }
      }

      // ── 3. Assign groups if not yet assigned ─────────────────────────
      let newGroupsAssigned = rules.groupsAssigned;
      let p1Group = rules.player1.group;
      let p2Group = rules.player2.group;

      if (!rules.groupsAssigned && !rules.isBreakShot && gameResult.type === "ongoing" && !foul) {
        // First legal pot after the break determines groups
        if (solidsPotted.length > 0 && stripesPotted.length === 0) {
          p1Group = currentPlayer === 1 ? "solid" : "stripe";
          p2Group = currentPlayer === 1 ? "stripe" : "solid";
          newGroupsAssigned = true;
          message = `Player ${currentPlayer} potted a solid — Player 1: Solids, Player 2: Stripes!`;
        } else if (stripesPotted.length > 0 && solidsPotted.length === 0) {
          p1Group = currentPlayer === 1 ? "stripe" : "solid";
          p2Group = currentPlayer === 1 ? "solid" : "stripe";
          newGroupsAssigned = true;
          message = `Player ${currentPlayer} potted a stripe — Player 1: ${p1Group === "solid" ? "Solids" : "Stripes"}, Player 2: ${p2Group === "solid" ? "Solids" : "Stripes"}!`;
        } else if (solidsPotted.length > 0 && stripesPotted.length > 0) {
          // Potted both types — assign based on majority, or first potted type
          p1Group = currentPlayer === 1 ? "solid" : "stripe";
          p2Group = currentPlayer === 1 ? "stripe" : "solid";
          newGroupsAssigned = true;
          message = `Groups assigned — Player 1: ${p1Group === "solid" ? "Solids" : "Stripes"}, Player 2: ${p2Group === "solid" ? "Solids" : "Stripes"}!`;
        }
      }

      // ── 4. Determine turn switching (if not already decided) ─────────
      if (gameResult.type === "ongoing" && !foul) {
        if (rules.isBreakShot) {
          // On break: if you pot at least one ball, keep your turn
          if (objectBallsPotted.length > 0) {
            message = message || `Nice break! Player ${currentPlayer} potted ${objectBallsPotted.length} ball(s). Continue!`;
            switchTurn = false;
          } else {
            message = "No balls potted on break. Switching turns.";
            switchTurn = true;
          }
        } else if (newGroupsAssigned || rules.groupsAssigned) {
          const playerGroup = currentPlayer === 1 ? p1Group : p2Group;
          const myPotted = playerGroup === "solid" ? solidsPotted : stripesPotted;
          const opponentPotted = playerGroup === "solid" ? stripesPotted : solidsPotted;

          if (myPotted.length > 0) {
            // Potted at least one of their own — keep turn
            switchTurn = false;
            message = message || `Player ${currentPlayer} potted ${myPotted.length} ball(s). Continue!`;
            if (opponentPotted.length > 0) {
              // Also potted opponent's ball — they benefit but you keep turn
              message += ` (Also potted ${opponentPotted.length} opponent ball(s))`;
            }
          } else if (opponentPotted.length > 0) {
            // Only potted opponent's balls
            switchTurn = true;
            message = `Player ${currentPlayer} potted opponent's ball(s). Switching turns.`;
          } else {
            // Potted nothing
            switchTurn = true;
            message = "No balls potted. Switching turns.";
          }
        } else {
          // Groups not assigned, not break — if potted something, keep turn
          if (objectBallsPotted.length > 0) {
            switchTurn = false;
            message = message || `Player ${currentPlayer} potted a ball. Continue!`;
          } else {
            switchTurn = true;
            message = "No balls potted. Switching turns.";
          }
        }
      }

      // ── 5. Update player potted ball arrays ──────────────────────────
      const p1Potted = [...rules.player1.pottedBalls];
      const p2Potted = [...rules.player2.pottedBalls];

      for (const ballNum of objectBallsPotted) {
        const ballType = getBallType(ballNum);
        if (newGroupsAssigned) {
          if (ballType === "solid" && p1Group === "solid") p1Potted.push(ballNum);
          else if (ballType === "solid" && p2Group === "solid") p2Potted.push(ballNum);
          else if (ballType === "stripe" && p1Group === "stripe") p1Potted.push(ballNum);
          else if (ballType === "stripe" && p2Group === "stripe") p2Potted.push(ballNum);
        }
      }

      // ── 6. Determine next player ─────────────────────────────────────
      const nextPlayer: 1 | 2 = switchTurn
        ? (currentPlayer === 1 ? 2 : 1)
        : currentPlayer;

      // ── 7. Commit the new rules state ────────────────────────────────
      const isGameOver = gameResult.type === "win";
      const winnerResult = gameResult.type === "win" ? gameResult.winner : null;
      const winReason = gameResult.type === "win" ? gameResult.reason : "";

      updateState(() => ({
        player1: { group: p1Group, pottedBalls: p1Potted },
        player2: { group: p2Group, pottedBalls: p2Potted },
        currentPlayer: nextPlayer,
        isBreakShot: false,
        groupsAssigned: newGroupsAssigned,
        gameOver: isGameOver,
        winner: winnerResult,
        winReason,
        foulMessage: foul ? message : "",
        turnMessage: message,
        ballInHand: foul && !isGameOver, // award ball in hand on foul
      }));

      // Reset potted tracker for next shot
      pottedThisShotRef.current = [];

      return {
        pottedThisTurn: potted,
        cueBallPotted,
        eightBallPotted,
        legalPot: objectBallsPotted.length > 0 && !foul,
        foul,
        switchTurn,
        gameResult,
        message,
      };
    },
    [updateState]
  );

  // ── Toggle ball in hand manually (e.g. after confirming placement) ──────

  const setBallInHand = useCallback((active: boolean) => {
    updateState((prev) => ({ ...prev, ballInHand: active }));
  }, [updateState]);

  // ── Reset rules for a new game ──────────────────────────────────────────

  const resetRules = useCallback(() => {
    const fresh = { ...INITIAL_RULES_STATE };
    rulesRef.current = fresh;
    setRulesState(fresh);
    pottedThisShotRef.current = [];
    firstContactBallRef.current = null;
  }, []);

  return {
    rulesState,
    rulesRef,
    onShotStart,
    evaluateShot,
    resetRules,
    setBallInHand,
    startCollisionDetection,
    stopCollisionDetection,
  };
}
