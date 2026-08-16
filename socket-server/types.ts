/**
 * Game types for the standalone Socket.io server.
 * (Duplicate of src/types/socket.ts — kept separate to avoid Next.js dependency)
 */

export type GameType = "2048" | "caro" | "wordchain" | "battleship" | "monopoly";

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

// ── Battleship types ──────────────────────────────────────────────

export type BattleshipPhase = "placement" | "battle" | "finished";
export type ShipType = "carrier" | "battleship" | "cruiser" | "submarine" | "destroyer";

export interface ShipPlacement {
  type: ShipType;
  x: number;
  y: number;
  vertical: boolean;
  hits: number; // to track sinking
  length: number;
}

export interface BattleshipPlayerState {
  playerId: string;
  ready: boolean;
  ships: ShipPlacement[]; // Hidden from opponent
  shots: { x: number; y: number; result: "hit" | "miss" | "sunk" }[]; 
}

export interface BattleshipGameState {
  phase: BattleshipPhase;
  players: Record<string, BattleshipPlayerState>;
  currentTurnPlayerId: string | null;
  winner: string | null;
}

// ── Monopoly types ──────────────────────────────────────────────

export type MonopolySpaceType =
  | "go"
  | "property"
  | "beach"
  | "jail"
  | "chance"
  | "world_cup"
  | "world_tour"
  | "tax";

export type MonopolyColorGroup =
  | "brown"
  | "light_blue"
  | "pink"
  | "orange"
  | "red"
  | "yellow"
  | "green"
  | "dark_blue"
  | "beach"
  | null;

export interface MonopolyBoardSpace {
  index: number;
  name: string;
  type: MonopolySpaceType;
  colorGroup: MonopolyColorGroup;
  price: number | null;
  baseRent: number | null;
  /** Rent with houses: [1house, 2houses, 3houses, 4houses, hotel] */
  rentScale?: number[];
}

export type MonopolyTokenColor = "red" | "blue" | "green" | "yellow";

export interface MonopolyPlayerState {
  playerId: string;
  username: string;
  tokenColor: MonopolyTokenColor;
  position: number;          // 0-31
  balance: number;           // starts $3000
  ownedProperties: number[]; // space indices
  houseLevels: Record<number, number>; // spaceIndex → level (0-4)
  visitCounts: Record<number, number>; // spaceIndex → number of times landed on own property
  inJail: boolean;
  jailTurns: number;         // turns spent in jail
  isActive: boolean;         // false if disconnected/bankrupt
  doublesCount: number;      // consecutive doubles this turn
}

export interface MonopolyEventLog {
  message: string;
  timestamp: number;
}

export interface MonopolyPendingDebt {
  amount: number;
  creditorId: string | null;
  creditorName: string;
  spaceName: string;
  type: "rent" | "tax" | "fine" | "bail";
}

export interface MonopolyGameState {
  players: MonopolyPlayerState[];
  currentTurnPlayerId: string;
  turnPhase: "roll" | "action" | "debt" | "world_tour" | "end";
  lastDice: [number, number] | null;
  rollCount?: number;
  eventLog: MonopolyEventLog[];
  winner: string | null;
  pendingDebt?: MonopolyPendingDebt | null;
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

  // Battleship
  bs_ready: (data: { roomId: string; ships: ShipPlacement[] }) => void;
  bs_fire: (data: { roomId: string; x: number; y: number }) => void;

  // Monopoly
  mp_roll_dice: (data: { roomId: string }) => void;
  mp_buy_property: (data: { roomId: string }) => void;
  mp_end_turn: (data: { roomId: string }) => void;
  mp_start_game: (data: { roomId: string }) => void;
  mp_upgrade_property: (data: { roomId: string; targetLevel: number }) => void;
  mp_sell_property: (data: { roomId: string; spaceIndex: number }) => void;
  mp_pay_debt: (data: { roomId: string }) => void;
  mp_declare_bankruptcy: (data: { roomId: string }) => void;
  mp_world_tour_travel: (data: { roomId: string; targetSpaceIndex: number }) => void;
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

  // Battleship
  bs_game_state: (data: { 
    room: Room; 
    phase: BattleshipPhase;
    currentTurnPlayerId: string | null;
    myState: BattleshipPlayerState;
    enemyShots: { x: number; y: number; result: "hit" | "miss" | "sunk" }[];
    winner: string | null;
  }) => void;
  bs_fire_result: (data: {
    x: number;
    y: number;
    result: "hit" | "miss" | "sunk";
    shipType?: ShipType;
    nextTurnPlayerId: string;
    firedBy: string;
  }) => void;
  bs_game_over: (data: { winnerId: string; winnerName: string; enemyShips?: ShipPlacement[] }) => void;

  // Monopoly
  mp_game_started: (data: { room: Room; gameState: MonopolyGameState }) => void;
  mp_game_update: (data: { gameState: MonopolyGameState }) => void;
  mp_dice_rolled: (data: { playerId: string; username: string; dice: [number, number]; diceTotal: number; isDoubles: boolean }) => void;
  mp_monopoly_completed: (data: { playerId: string; username: string; tokenColor: MonopolyTokenColor; colorGroup: string; propertyNames: string[] }) => void;
  mp_offer_buy: (data: { spaceIndex: number; spaceName: string; price: number }) => void;
  mp_offer_upgrade: (data: { spaceIndex: number; spaceName: string; currentLevel: number; upgradeCost: number; maxLevel: number; costs: number[] }) => void;
  mp_game_over: (data: { winnerId: string; winnerName: string; gameState: MonopolyGameState }) => void;
}

export interface InterServerEvents {
  ping: () => void;
}

export interface SocketData {
  username: string;
  currentRoom: string | null;
}
