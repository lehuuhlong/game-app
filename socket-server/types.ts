/**
 * Game types for the standalone Socket.io server.
 * (Duplicate of src/types/socket.ts — kept separate to avoid Next.js dependency)
 */

export type GameType = "2048" | "caro" | "wordchain";

export type WordChainLanguage = "en" | "vi";

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
  /** Word Chain only — selected language for the room */
  language?: WordChainLanguage;
}

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

// ── Word Chain types ────────────────────────────────────────────────

export interface WordChainEntry {
  word: string;
  playerId: string;
  username: string;
  /** The connecting segment (last letter for EN, last syllable for VI) */
  connector: string;
}

export interface WordChainGameState {
  language: WordChainLanguage;
  /** Ordered list of submitted words */
  chain: WordChainEntry[];
  /** Set of used words (lowercased) for duplicate checking */
  usedWords: string[];
  /** Player ID whose turn it is */
  currentTurnPlayerId: string;
  /** Unix timestamp when the current turn started */
  turnStartedAt: number;
  /** Turn duration in seconds */
  turnDuration: number;
  /** Winner player ID (null while playing) */
  winner: string | null;
  /** Reason the game ended */
  endReason: "timeout" | "invalid" | "disconnect" | "forfeit" | null;
}

// ── Socket Event Maps ───────────────────────────────────────────────

export interface ClientToServerEvents {
  // Shared
  join_room: (data: {
    roomId: string;
    gameType: GameType;
    username: string;
    action?: "create" | "join";
    language?: WordChainLanguage;
  }) => void;
  leave_room: (data: { roomId: string }) => void;
  restart_game: (data: { roomId: string }) => void;

  // Caro
  make_move: (data: CaroMove) => void;
  timeout_turn: (data: { roomId: string; losingPlayer: "X" | "O" }) => void;

  // Word Chain
  wc_submit_word: (data: { roomId: string; word: string }) => void;
  wc_timeout: (data: { roomId: string }) => void;
}

export interface ServerToClientEvents {
  // Shared
  room_joined: (data: { room: Room; playerId: string }) => void;
  player_joined: (data: { player: Player; room: Room }) => void;
  player_left: (data: { playerId: string; room: Room }) => void;
  error: (data: { message: string }) => void;
  online_players_count: (count: number) => void;

  // Caro
  game_started: (data: { room: Room; gameState: CaroGameState }) => void;
  move_made: (data: { move: CaroMove; gameState: CaroGameState }) => void;
  game_over: (data: { winner: string | null; gameState: CaroGameState }) => void;

  // Word Chain
  wc_game_started: (data: { room: Room; gameState: WordChainGameState }) => void;
  wc_word_accepted: (data: { entry: WordChainEntry; gameState: WordChainGameState }) => void;
  wc_word_rejected: (data: { word: string; reason: string }) => void;
  wc_turn_changed: (data: { currentTurnPlayerId: string; turnStartedAt: number }) => void;
  wc_game_over: (data: {
    winnerId: string;
    winnerName: string;
    loserId: string;
    loserName: string;
    reason: "timeout" | "invalid" | "disconnect" | "forfeit";
    gameState: WordChainGameState;
  }) => void;
}

export interface InterServerEvents {
  ping: () => void;
}

export interface SocketData {
  username: string;
  currentRoom: string | null;
}
