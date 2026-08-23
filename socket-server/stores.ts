/**
 * In-memory game state stores.
 *
 * Central registry for all room and game state Maps.
 * Each game handler imports only the stores it needs.
 */

import type {
  Room,
  CaroGameState,
  WordChainGameState,
  BattleshipGameState,
  MonopolyGameState,
  ChessGameState,
} from "../shared/types";

// ── Room registry ──────────────────────────────────────────────────
export const rooms = new Map<string, Room>();

// ── Per-game state stores ──────────────────────────────────────────
export const caroStates = new Map<string, CaroGameState>();
export const wcStates = new Map<string, WordChainGameState>();
export const bsStates = new Map<string, BattleshipGameState>();
export const mpStates = new Map<string, MonopolyGameState>();
export const chessStates = new Map<string, ChessGameState>();

// ── Word Chain timers (server-authoritative) ───────────────────────
export const wcTimers = new Map<string, ReturnType<typeof setTimeout>>();

// ── Utility: typed IO ──────────────────────────────────────────────
import { Server as SocketIOServer } from "socket.io";
import type {
  ClientToServerEvents,
  ServerToClientEvents,
  InterServerEvents,
  SocketData,
} from "../shared/types";

export type GameIO = SocketIOServer<
  ClientToServerEvents,
  ServerToClientEvents,
  InterServerEvents,
  SocketData
>;

export type GameSocket = import("socket.io").Socket<
  ClientToServerEvents,
  ServerToClientEvents,
  InterServerEvents,
  SocketData
>;

/**
 * Delete all state for a room across all stores.
 */
export function purgeRoomState(roomId: string): void {
  rooms.delete(roomId);
  caroStates.delete(roomId);
  wcStates.delete(roomId);
  bsStates.delete(roomId);
  mpStates.delete(roomId);
  chessStates.delete(roomId);

  const wcTimer = wcTimers.get(roomId);
  if (wcTimer) {
    clearTimeout(wcTimer);
    wcTimers.delete(roomId);
  }
}
