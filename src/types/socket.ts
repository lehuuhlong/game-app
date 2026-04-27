/**
 * Shared Socket.io type definitions.
 *
 * These types are used on both the client and the server to ensure
 * type-safe event emission and handling.
 */

// ── Common ────────────────────────────────────────────────────────

export interface Player {
  id: string;
  username: string;
  socketId: string;
}

export interface Room {
  id: string;
  gameType: GameType;
  players: Player[];
  status: "waiting" | "playing" | "finished";
  createdAt: Date;
}

export type GameType = "2048" | "caro";

// ── Caro-specific ────────────────────────────────────────────────

export interface CaroMove {
  roomId: string;
  x: number;
  y: number;
  player: "X" | "O";
}

export interface CaroGameState {
  board: (string | null)[][];
  currentTurn: "X" | "O";
  winner: "X" | "O" | "draw" | null;
  moveHistory: CaroMove[];
}

// ── Socket Event Maps ────────────────────────────────────────────

/** Events the client can emit to the server */
export interface ClientToServerEvents {
  join_room: (data: { roomId: string; gameType: GameType; username: string }) => void;
  leave_room: (data: { roomId: string }) => void;
  make_move: (data: CaroMove) => void;
  restart_game: (data: { roomId: string }) => void;
  timeout_turn: (data: { roomId: string; losingPlayer: "X" | "O" }) => void;
}

/** Events the server can emit to clients */
export interface ServerToClientEvents {
  room_joined: (data: { room: Room; playerId: string }) => void;
  player_joined: (data: { player: Player; room: Room }) => void;
  player_left: (data: { playerId: string; room: Room }) => void;
  game_started: (data: { room: Room; gameState: CaroGameState }) => void;
  move_made: (data: { move: CaroMove; gameState: CaroGameState }) => void;
  game_over: (data: { winner: string | null; gameState: CaroGameState }) => void;
  error: (data: { message: string }) => void;
}

/** Internal server-to-server events (for scaling with Redis adapter later) */
export interface InterServerEvents {
  ping: () => void;
}

/** Per-socket custom data */
export interface SocketData {
  username: string;
  currentRoom: string | null;
}
