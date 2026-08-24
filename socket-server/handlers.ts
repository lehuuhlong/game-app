import { Server as SocketIOServer } from "socket.io";
import fs from "fs";
import path from "path";
import { Chess } from "chess.js";
import type {
  ClientToServerEvents,
  ServerToClientEvents,
  InterServerEvents,
  SocketData,
  Room,
  CaroGameState,
  WordChainGameState,
  WordChainLanguage,
  WordChainEntry,
  BattleshipGameState,
  ShipType,
  MonopolyGameState,
  MonopolyPlayerState,
  MonopolyTokenColor,
  ChessGameState,
  ChessMove,
  ChessMoveRecord,
  ChessColor,
  Player,
} from "./types";
import { MONOPOLY_BOARD, getSaleValue } from "./src/data/monopoly-board";

type GameIO = SocketIOServer<
  ClientToServerEvents,
  ServerToClientEvents,
  InterServerEvents,
  SocketData
>;

// ── In-memory stores ──────────────────────────────────────────────
const rooms = new Map<string, Room>();
const caroStates = new Map<string, CaroGameState>();
const wcStates = new Map<string, WordChainGameState>();
const bsStates = new Map<string, BattleshipGameState>();
const mpStates = new Map<string, MonopolyGameState>();
const chessStates = new Map<string, ChessGameState>();

// Timers for Word Chain turns (server-authoritative)
const wcTimers = new Map<string, ReturnType<typeof setTimeout>>();

const CARO_GRID_SIZE = 25;
const WC_TURN_DURATION = 20; // seconds

// ── Caro helpers ──────────────────────────────────────────────────

function createInitialCaroState(): CaroGameState {
  return {
    board: Array.from({ length: CARO_GRID_SIZE }, () =>
      Array(CARO_GRID_SIZE).fill(null)
    ),
    currentTurn: "X",
    winner: null,
    moveHistory: [],
  };
}

// ── Chess helpers ─────────────────────────────────────────────────

const DEFAULT_CHESS_FEN = "rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1";
const CHESS_TOTAL_TIME = 30 * 60; // 1800 seconds (30 minutes per player)

function createInitialChessState(p1: Player, p2: Player): ChessGameState {
  return {
    fen: DEFAULT_CHESS_FEN,
    currentTurn: "w",
    whitePlayer: { id: p1.id, username: p1.username, color: "w" },
    blackPlayer: { id: p2.id, username: p2.username, color: "b" },
    whiteTime: CHESS_TOTAL_TIME,
    blackTime: CHESS_TOTAL_TIME,
    lastMoveTimestamp: Date.now(),
    moveHistory: [],
    isCheck: false,
    isCheckmate: false,
    isDraw: false,
    isStalemate: false,
    isThreefoldRepetition: false,
    isInsufficientMaterial: false,
    winner: null,
    endReason: null,
  };
}

function handleChessMove(
  socket: import("socket.io").Socket<
    ClientToServerEvents,
    ServerToClientEvents,
    InterServerEvents,
    SocketData
  >,
  io: GameIO,
  move: ChessMove
) {
  const room = rooms.get(move.roomId);
  if (!room || room.status !== "playing" || room.gameType !== "chess") return;

  const gameState = chessStates.get(move.roomId);
  if (!gameState) return;

  let player = room.players.find((p) => p.socketId === socket.id);
  if (!player && socket.data.username) {
    player = room.players.find((p) => p.username === socket.data.username);
    if (player) {
      player.socketId = socket.id;
    }
  }
  if (!player) return;

  // Verify it is this player's turn
  const expectedPlayer =
    gameState.currentTurn === "w"
      ? gameState.whitePlayer
      : gameState.blackPlayer;

  if (player.id !== expectedPlayer.id && player.username !== expectedPlayer.username) {
    socket.emit("error", { message: "Not your turn." });
    return;
  }

  // Deduct elapsed time from current turn player's clock
  const now = Date.now();
  const elapsed = Math.max(
    0,
    Math.floor((now - (gameState.lastMoveTimestamp || now)) / 1000)
  );

  if (gameState.currentTurn === "w") {
    gameState.whiteTime = Math.max(0, gameState.whiteTime - elapsed);
    if (gameState.whiteTime <= 0) {
      room.status = "finished";
      gameState.winner = "b";
      gameState.endReason = "timeout";
      io.to(move.roomId).emit("chess_game_update", {
        gameState: { ...gameState },
      });
      io.to(move.roomId).emit("chess_game_over", {
        winner: "b",
        reason: "timeout",
        gameState: { ...gameState },
      });
      return;
    }
  } else {
    gameState.blackTime = Math.max(0, gameState.blackTime - elapsed);
    if (gameState.blackTime <= 0) {
      room.status = "finished";
      gameState.winner = "w";
      gameState.endReason = "timeout";
      io.to(move.roomId).emit("chess_game_update", {
        gameState: { ...gameState },
      });
      io.to(move.roomId).emit("chess_game_over", {
        winner: "w",
        reason: "timeout",
        gameState: { ...gameState },
      });
      return;
    }
  }

  try {
    const chess = new Chess(gameState.fen);
    const result = chess.move({
      from: move.from,
      to: move.to,
      promotion: move.promotion || "q",
    });

    if (!result) {
      socket.emit("error", { message: "Invalid move." });
      return;
    }

    const newFen = chess.fen();
    const isCheck = chess.isCheck();
    const isCheckmate = chess.isCheckmate();
    const isStalemate = chess.isStalemate();
    const isThreefold = chess.isThreefoldRepetition();
    const isInsufficient = chess.isInsufficientMaterial();
    const isDraw = chess.isDraw();

    const moveRecord: ChessMoveRecord = {
      from: result.from,
      to: result.to,
      san: result.san,
      color: result.color as ChessColor,
      captured: result.captured,
      promotion: result.promotion,
      fen: newFen,
    };

    gameState.fen = newFen;
    gameState.currentTurn = chess.turn() as ChessColor;
    gameState.lastMoveTimestamp = now;
    gameState.moveHistory.push(moveRecord);
    gameState.isCheck = isCheck;
    gameState.isCheckmate = isCheckmate;
    gameState.isStalemate = isStalemate;
    gameState.isThreefoldRepetition = isThreefold;
    gameState.isInsufficientMaterial = isInsufficient;
    gameState.isDraw = isDraw;

    if (isCheckmate) {
      room.status = "finished";
      gameState.winner = result.color as ChessColor;
      gameState.endReason = "checkmate";
      io.to(move.roomId).emit("chess_game_update", {
        gameState: { ...gameState },
        lastMove: moveRecord,
      });
      io.to(move.roomId).emit("chess_game_over", {
        winner: gameState.winner,
        reason: "checkmate",
        gameState: { ...gameState },
      });
      console.log(`♟️ Checkmate in room ${move.roomId}! Winner: ${gameState.winner}`);
    } else if (isDraw) {
      room.status = "finished";
      gameState.winner = "draw";
      gameState.endReason = isStalemate
        ? "stalemate"
        : isThreefold
        ? "threefold"
        : isInsufficient
        ? "insufficient"
        : "draw";
      io.to(move.roomId).emit("chess_game_update", {
        gameState: { ...gameState },
        lastMove: moveRecord,
      });
      io.to(move.roomId).emit("chess_game_over", {
        winner: "draw",
        reason: gameState.endReason,
        gameState: { ...gameState },
      });
      console.log(`♟️ Draw in room ${move.roomId} (${gameState.endReason})`);
    } else {
      io.to(move.roomId).emit("chess_game_update", {
        gameState: { ...gameState },
        lastMove: moveRecord,
      });
    }
  } catch (err: any) {
    socket.emit("error", { message: err?.message || "Invalid move." });
  }
}

// ── Word Chain helpers ────────────────────────────────────────────

/**
 * Get the "connector" from a word — the segment the next word must start with.
 *  - English: last letter   ("apple" → "e")
 *  - Vietnamese: last syllable/word ("bóng đá" → "đá")
 */
function getConnector(word: string, language: WordChainLanguage): string {
  const trimmed = word.trim().toLowerCase();
  if (language === "vi") {
    const parts = trimmed.split(/\s+/);
    return parts[parts.length - 1];
  }
  return trimmed[trimmed.length - 1];
}

/**
 * Check if `word` validly chains from the previous connector.
 *  - English: word must START with the connector letter
 *  - Vietnamese: word must START with the connector syllable
 */
function isValidChain(
  word: string,
  connector: string,
  language: WordChainLanguage
): boolean {
  const lower = word.trim().toLowerCase();
  if (language === "vi") {
    const firstSyllable = lower.split(/\s+/)[0];
    return firstSyllable === connector;
  }
  return lower[0] === connector;
}

/**
 * Validate an English word against the Free Dictionary API.
 * Returns true if the API responds with 200 (word exists).
 */
async function validateEnglishWord(word: string): Promise<boolean> {
  try {
    const res = await fetch(
      `https://api.dictionaryapi.dev/api/v2/entries/en/${encodeURIComponent(
        word.trim().toLowerCase()
      )}`
    );
    return res.status === 200;
  } catch {
    // If the API is unreachable, allow the word (graceful degradation)
    console.warn(`⚠ Dictionary API unreachable for "${word}", allowing.`);
    return true;
  }
}

/**
 * Load Vietnamese dictionary into a global Set for O(1) lookups.
 * It attempts to read from src/data/vietnamese-words.txt to avoid API rate limits.
 */
let vietnameseDictionary = new Set<string>();

try {
  const dictPath = path.join(process.cwd(), "src", "data", "vietnamese-words.txt");
  if (fs.existsSync(dictPath)) {
    const fileContent = fs.readFileSync(dictPath, "utf-8");
    fileContent.split(/\r?\n/).forEach((line) => {
      // Normalize: lower case and replace underscores with spaces just in case
      const normalized = line.trim().toLowerCase().replace(/_/g, " ");
      if (normalized) {
        vietnameseDictionary.add(normalized);
      }
    });
    console.log(`✅ Loaded ${vietnameseDictionary.size} Vietnamese words from local dictionary.`);
  } else {
    console.warn(`⚠ Local dictionary not found at ${dictPath}. Using fallback mock dataset.`);
    vietnameseDictionary = new Set([
      "bóng đá", "đá cầu", "cầu lông", "lông vũ", "vũ trụ",
      "trụ sở", "sở thích", "thích hợp", "hợp tác", "tác phẩm",
      "phẩm chất", "chất lượng", "lượng tử", "tử tế", "tế bào",
      "bào chữa", "chữa bệnh", "bệnh viện", "viện trợ", "trợ giúp",
      "giúp đỡ", "đỡ đần", "công việc", "việc làm", "làm việc",
      "học sinh", "sinh viên", "viên chức", "chức năng", "năng lực",
      "lực lượng", "lượng giá", "giá trị", "trị liệu", "liệu pháp",
      "pháp luật", "luật sư", "sư phạm", "phạm vi", "vi phạm",
      "gia đình", "đình công", "công nghệ", "nghệ thuật", "thuật toán",
      "toán học", "học hỏi", "hỏi han", "han rỉ", "rỉ sét",
      "hạnh phúc", "phúc lợi", "lợi ích", "ích kỷ", "kỷ niệm",
      "niệm phật", "phật giáo", "giáo dục", "dục vọng", "vọng cổ",
      "cổ đại", "đại học", "học viện", "viện sĩ", "sĩ quan",
      "quan tâm", "tâm lý", "lý tưởng", "tưởng tượng", "tượng hình",
    ]);
  }
} catch (error) {
  console.error("Failed to load Vietnamese dictionary:", error);
}

async function validateVietnameseWord(word: string): Promise<boolean> {
  const lower = word.trim().toLowerCase().replace(/_/g, " ");
  // Optional: check if it's at least 2 syllables (compound word) for your game rules
  if (lower.split(/\s+/).length < 2) return false;
  return vietnameseDictionary.has(lower);
}

function createInitialWCState(
  language: WordChainLanguage,
  firstPlayerId: string
): WordChainGameState {
  return {
    language,
    chain: [],
    usedWords: [],
    currentTurnPlayerId: firstPlayerId,
    turnStartedAt: Date.now(),
    turnDuration: WC_TURN_DURATION,
    winner: null,
    endReason: null,
  };
}

// ── Battleship helpers ────────────────────────────────────────────

function createInitialBSState(p1Id: string, p2Id: string): BattleshipGameState {
  return {
    phase: "placement",
    players: {
      [p1Id]: { playerId: p1Id, ready: false, ships: [], shots: [] },
      [p2Id]: { playerId: p2Id, ready: false, ships: [], shots: [] },
    },
    currentTurnPlayerId: null,
    winner: null,
  };
}

function broadcastBSGameState(roomId: string, io: GameIO) {
  const room = rooms.get(roomId);
  const state = bsStates.get(roomId);
  if (!room || !state) return;

  room.players.forEach((p) => {
    const other = room.players.find((x) => x.id !== p.id);
    if (!other) return;
    io.to(p.socketId).emit("bs_game_state", {
      room,
      phase: state.phase,
      currentTurnPlayerId: state.currentTurnPlayerId,
      myState: state.players[p.id],
      enemyShots: state.players[other.id].shots,
      winner: state.winner,
    });
  });
}

// ── Monopoly helpers ──────────────────────────────────────────────

const MONOPOLY_TOKEN_COLORS: MonopolyTokenColor[] = ["red", "blue", "green", "yellow"];
const MONOPOLY_STARTING_BALANCE = 2500;
const MONOPOLY_MIN_PLAYERS = 2;
const MONOPOLY_MAX_PLAYERS = 4;

function createInitialMonopolyState(
  players: { id: string; username: string }[]
): MonopolyGameState {
  const mpPlayers: MonopolyPlayerState[] = players.map((p, i) => ({
    playerId: p.id,
    username: p.username,
    tokenColor: MONOPOLY_TOKEN_COLORS[i],
    position: 0,
    balance: MONOPOLY_STARTING_BALANCE,
    ownedProperties: [] as number[],
    houseLevels: {} as Record<number, number>,
    visitCounts: {} as Record<number, number>,
    celebratedMonopolies: [] as string[],
    inJail: false,
    jailTurns: 0,
    isActive: true,
    doublesCount: 0,
  }));

  return {
    players: mpPlayers,
    currentTurnPlayerId: players[0].id,
    turnPhase: "roll",
    lastDice: null,
    rollCount: 0,
    pendingDebt: null,
    worldCupSpaceIndex: null,
    blackoutSpaces: [] as number[],
    shieldedSpaces: [] as number[],
    pendingChanceTarget: null,
    lastChanceEvent: null,
    winner: null,
    eventLog: [
      { message: "🎩 Monopoly game started! Good luck!", timestamp: Date.now() },
      { message: `🎲 ${players[0].username}'s turn — roll the dice!`, timestamp: Date.now() },
    ],
  };
}

/**
 * Get the next active player after the given player.
 * Skips inactive (disconnected/bankrupt) players.
 */
function getNextActivePlayer(
  state: MonopolyGameState,
  currentPlayerId: string
): string | null {
  const activePlayers = state.players.filter((p) => p.isActive);
  if (activePlayers.length <= 1) return null;

  const currentIndex = activePlayers.findIndex((p) => p.playerId === currentPlayerId);
  if (currentIndex === -1) {
    return activePlayers[0]?.playerId ?? null;
  }
  return activePlayers[(currentIndex + 1) % activePlayers.length].playerId;
}

/**
 * Helper to check if a color group is fully owned by a single player.
 */
function isColorGroupMonopolized(
  colorGroup: string,
  player: MonopolyPlayerState
): boolean {
  const groupSpaces = MONOPOLY_BOARD.filter((s) => s.colorGroup === colorGroup);
  if (groupSpaces.length === 0) return false;
  return groupSpaces.every((s) => player.ownedProperties.includes(s.index));
}

/**
 * Check if the player just completed a full color set (monopoly) and broadcast celebration event.
 */
function checkAndNotifyMonopolyCompleted(
  state: MonopolyGameState,
  mpPlayer: MonopolyPlayerState,
  spaceIndex: number,
  io: GameIO,
  roomId: string
) {
  const space = MONOPOLY_BOARD[spaceIndex];
  if (!space || !space.colorGroup) return;

  const colorGroup = space.colorGroup;
  if (!mpPlayer.celebratedMonopolies) {
    mpPlayer.celebratedMonopolies = [];
  }

  if (
    !mpPlayer.celebratedMonopolies.includes(colorGroup) &&
    isColorGroupMonopolized(colorGroup, mpPlayer)
  ) {
    mpPlayer.celebratedMonopolies.push(colorGroup);
    const groupName = colorGroup.replace("_", " ").toUpperCase();
    const propNames = MONOPOLY_BOARD
      .filter((s) => s.colorGroup === colorGroup)
      .map((s) => s.name);

    mpLog(
      state,
      `👑🌟 MONOPOLY! ${mpPlayer.username} completed the ${groupName} Color Set! Rent on all properties increased 1.5×! 🌟👑`
    );

    io.to(roomId).emit("mp_monopoly_completed", {
      playerId: mpPlayer.playerId,
      username: mpPlayer.username,
      tokenColor: mpPlayer.tokenColor,
      colorGroup,
      propertyNames: propNames,
    });
  }
}

/**
 * Calculate rent for a space, considering beaches (doubles per owned),
 * house levels, 1.5× full color monopoly bonus, and 2× World Cup host city bonus.
 */
function calculateRent(
  spaceIndex: number,
  state: MonopolyGameState,
  diceTotal: number
): number {
  const space = MONOPOLY_BOARD[spaceIndex];
  if (!space) return 0;

  // Find the owner
  const owner = state.players.find((p) =>
    p.isActive && p.ownedProperties.includes(spaceIndex)
  );
  if (!owner) return 0;

  // Blackout rule: If property has power cut, rent is $0!
  if (state.blackoutSpaces && state.blackoutSpaces.includes(spaceIndex)) {
    return 0;
  }

  let baseRentAmount = 0;

  if (space.type === "beach") {
    // Scaling beach resort rent: 1=$50, 2=$120, 3=$250, 4=$500
    const beachIndices = MONOPOLY_BOARD
      .filter((s) => s.type === "beach")
      .map((s) => s.index);
    const ownedCount = beachIndices.filter((i) =>
      owner.ownedProperties.includes(i)
    ).length;
    const BEACH_RENT_SCALE = [50, 120, 250, 500];
    baseRentAmount = BEACH_RENT_SCALE[Math.min(ownedCount, BEACH_RENT_SCALE.length) - 1] ?? 50;
  } else {
    // Regular property — check house level for scaled rent
    const houseLevel = owner.houseLevels[spaceIndex] ?? 0;
    if (houseLevel > 0 && space.rentScale && space.rentScale.length >= houseLevel) {
      baseRentAmount = space.rentScale[houseLevel - 1];
    } else {
      baseRentAmount = space.baseRent ?? 0;
    }
  }

  let finalRent = baseRentAmount;

  // Full color group monopoly rule: Rent is increased by 1.5×
  if (space.colorGroup && isColorGroupMonopolized(space.colorGroup, owner)) {
    finalRent = Math.round(finalRent * 1.5);
  }

  // World Cup Host City rule: Rent is doubled (2×)
  if (state.worldCupSpaceIndex === spaceIndex) {
    finalRent = Math.round(finalRent * 2);
  }

  return finalRent;
}

/** Tax amounts for tax spaces. */
const TAX_AMOUNTS: Record<number, number> = {
  30: 200, // Tax
};

/**
 * Add an event log entry to the game state (capped at 50).
 */
function mpLog(state: MonopolyGameState, message: string): void {
  state.eventLog.push({ message, timestamp: Date.now() });
  if (state.eventLog.length > 50) {
    state.eventLog = state.eventLog.slice(-50);
  } 
}

/**
 * Check if there's a winner (only 1 active player remaining).
 */
function checkMonopolyWinner(state: MonopolyGameState): string | null {
  const activePlayers = state.players.filter((p) => p.isActive);
  if (activePlayers.length === 1) {
    return activePlayers[0].playerId;
  }
  return null;
}

/**
 * Check if a space index is a valid target destination for World Tour.
 * Disallows 4 main corners (0, 8, 16, 24) and chance and tax spaces.
 */
function isWorldTourTargetValid(spaceIndex: number): boolean {
  if (spaceIndex < 0 || spaceIndex >= MONOPOLY_BOARD.length) {
    return false;
  }
  // 4 corners cannot be targeted: START (0), Lost Island (8), World Cup (16), World Tour (24)
  if (spaceIndex === 0 || spaceIndex === 8 || spaceIndex === 16 || spaceIndex === 24) {
    return false;
  }
  const space = MONOPOLY_BOARD[spaceIndex];
  if (!space) return false;
  // Chance and Tax cannot be targeted
  if (space.type === "chance" || space.type === "tax") {
    return false;
  }
  return true;
}

/**
 * Advance Monopoly turn to the next active player.
 * Checks for game over if only 1 active player remains.
 */
function advanceMonopolyTurn(
  state: MonopolyGameState,
  currentPlayerId: string,
  room: Room,
  io: GameIO,
  roomId: string
): void {
  const player = state.players.find((p) => p.playerId === currentPlayerId);
  if (player) {
    player.doublesCount = 0;
  }

  // 1. Check if only 1 active player remains -> that remaining player is the winner!
  const activePlayers = state.players.filter((p) => p.isActive);
  if (activePlayers.length <= 1) {
    const winner = activePlayers[0] || state.players.reduce((prev, curr) => (curr.balance > prev.balance ? curr : prev), state.players[0]);
    if (winner) {
      room.status = "finished";
      state.winner = winner.playerId;
      state.turnPhase = "end";
      mpLog(state, `🏆 ${winner.username} wins the game!`);
      io.to(roomId).emit("mp_game_update", { gameState: { ...state } });
      io.to(roomId).emit("mp_game_over", {
        winnerId: winner.playerId,
        winnerName: winner.username,
        reason: "win",
        gameState: { ...state },
      });
      return;
    }
  }

  const nextPlayerId = getNextActivePlayer(state, currentPlayerId);
  if (!nextPlayerId) {
    const winnerId = checkMonopolyWinner(state);
    if (winnerId) {
      const winner = state.players.find((p) => p.playerId === winnerId);
      room.status = "finished";
      state.winner = winnerId;
      state.turnPhase = "end";
      mpLog(state, `🏆 ${winner?.username || "Unknown"} wins the game!`);
      io.to(roomId).emit("mp_game_update", { gameState: { ...state } });
      io.to(roomId).emit("mp_game_over", {
        winnerId,
        winnerName: winner?.username || "Unknown",
        reason: "win",
        gameState: { ...state },
      });
    }
    return;
  }

  state.currentTurnPlayerId = nextPlayerId;
  const nextPlayer = state.players.find((p) => p.playerId === nextPlayerId);

  // If next player is at World Tour (and not in jail), start turn in 'world_tour' phase
  if (nextPlayer && nextPlayer.position === 24 && !nextPlayer.inJail) {
    state.turnPhase = "world_tour";
    mpLog(state, `✈️ ${nextPlayer.username} is at World Tour! Select any destination on the board to travel!`);
  } else {
    state.turnPhase = "roll";
    mpLog(state, `🎲 ${nextPlayer?.username || "Unknown"}'s turn — roll the dice!`);
  }

  io.to(roomId).emit("mp_game_update", { gameState: { ...state } });
}

/**
 * Resolve what happens when a player lands on a space.
 * Returns true if the player should be offered to buy (turn stays in 'action').
 */
function resolveSpace(
  state: MonopolyGameState,
  player: typeof state.players[0],
  diceTotal: number,
  io: GameIO,
  roomId: string
): boolean {
  const space = MONOPOLY_BOARD[player.position];
  if (!space) return false;

  // World Tour (Space 24) — player stays here and flies next turn
  if (space.type === "world_tour") {
    mpLog(state, `✈️ ${player.username} arrived at World Tour! On their next turn, they can fly directly to any destination!`);
    return false;
  }

  // World Cup (Space 16) — host selection
  if (space.type === "world_cup") {
    if (player.ownedProperties.length > 0) {
      state.turnPhase = "world_cup";
      mpLog(
        state,
        `🏆 ${player.username} landed on World Cup! Select one of your properties on the board to host World Cup (2× Rent)!`
      );
      return true; // Stays in turn so player can select an on-board property
    } else {
      mpLog(
        state,
        `🏆 ${player.username} landed on World Cup but has no properties to host.`
      );
      return false; // Auto-pass
    }
  }

  // Lost Island / Jail (landing directly on space 8)
  if (space.type === "jail") {
    player.inJail = true;
    player.jailTurns = 0;
    player.doublesCount = 0;
    mpLog(state, `🏝️ ${player.username} landed on Lost Island and is now trapped!`);
    return false;
  }

  // Tax
  if (space.type === "tax") {
    const taxAmount = TAX_AMOUNTS[player.position] ?? 0;
    if (player.balance < taxAmount) {
      const totalAssetValue = player.ownedProperties.reduce((sum, idx) => {
        const sp = MONOPOLY_BOARD[idx];
        const hl = player.houseLevels[idx] ?? 0;
        return sum + getSaleValue(sp?.price ?? 0, hl);
      }, 0);

      if (player.balance + totalAssetValue >= taxAmount) {
        state.turnPhase = "debt";
        state.pendingDebt = {
          amount: taxAmount,
          creditorId: null,
          creditorName: "Bank",
          spaceName: space.name,
          type: "tax",
        };
        mpLog(state, `⚠️ ${player.username} owes $${taxAmount} in ${space.name} (has $${player.balance}). Sell properties to pay!`);
        return false;
      } else {
        player.balance = 0;
        player.isActive = false;
        player.ownedProperties = [];
        player.houseLevels = {};
        mpLog(state, `💀 ${player.username} cannot afford $${taxAmount} tax and went bankrupt!`);
        return false;
      }
    } else {
      player.balance -= taxAmount;
      mpLog(state, `💰 ${player.username} paid $${taxAmount} in ${space.name}.`);
      return false;
    }
  }

  // Chance space
  if (space.type === "chance") {
    if (!state.shieldedSpaces) state.shieldedSpaces = [];
    if (!state.blackoutSpaces) state.blackoutSpaces = [];

    const opponents = state.players.filter((p) => p.isActive && p.playerId !== player.playerId);
    const opponentProperties = opponents
      .flatMap((p) => p.ownedProperties)
      .filter((idx) => !state.shieldedSpaces?.includes(idx));
    const playerProperties = player.ownedProperties.filter((idx) => !state.shieldedSpaces?.includes(idx));

    // Weighted candidate pool prioritizing interactive gameplay
    const candidateCards: string[] = [];

    // If opponents have unshielded properties, heavily feature attack cards
    if (opponentProperties.length > 0) {
      candidateCards.push("demolish", "demolish", "blackout", "blackout");
      const hasHouses = opponents.some((o) =>
        opponentProperties.some((idx) => (o.houseLevels[idx] ?? 0) > 0)
      );
      if (hasHouses) {
        candidateCards.push("downgrade", "downgrade");
      }
    }

    // If player has unshielded properties, feature defense shield
    if (playerProperties.length > 0) {
      candidateCards.push("shield", "shield", "shield");
    }

    // Always include flight, jail, and cash cards
    candidateCards.push(
      "flight",
      "jail",
      "dividend",
      "lottery",
      "inheritance",
      "consultancy",
      "medical",
      "speeding",
      "renovation"
    );
    if (!player.inJail) {
      candidateCards.push("jail");
    }

    const chosenCard = candidateCards[Math.floor(Math.random() * candidateCards.length)];

    if (chosenCard === "demolish") {
      const targetable = opponents
        .flatMap((p) => p.ownedProperties)
        .filter((idx) => !state.shieldedSpaces?.includes(idx));

      if (targetable.length > 0) {
        state.turnPhase = "chance_target";
        state.pendingChanceTarget = {
          type: "demolish",
          title: "💣 DEMOLISH CITY",
          description: "Click an opponent's highlighted city on the board to demolish it!",
        };
        state.lastChanceEvent = {
          title: "💣 DEMOLISH CARD!",
          description: `${player.username} drew Demolish City card!`,
          icon: "💣",
          timestamp: Date.now(),
        };
        mpLog(state, `❓💣 ${player.username} drew Demolish City card! Choosing a target...`);
        return false;
      } else {
        player.balance += 200;
        state.lastChanceEvent = {
          title: "💣 DEMOLISH BONUS",
          description: `No opponent cities to demolish — collected $200 bonus!`,
          icon: "💰",
          timestamp: Date.now(),
        };
        mpLog(state, `❓💣 ${player.username} drew Demolish City card (No valid targets — received $200 bonus).`);
        return false;
      }
    }

    if (chosenCard === "blackout") {
      const targetable = opponents
        .flatMap((p) => p.ownedProperties)
        .filter((idx) => !state.shieldedSpaces?.includes(idx) && !state.blackoutSpaces?.includes(idx));

      if (targetable.length > 0) {
        state.turnPhase = "chance_target";
        state.pendingChanceTarget = {
          type: "blackout",
          title: "⚡ CITY BLACKOUT",
          description: "Click an opponent's city to cut power (Rent becomes $0)!",
        };
        state.lastChanceEvent = {
          title: "⚡ BLACKOUT CARD!",
          description: `${player.username} drew City Blackout card!`,
          icon: "⚡",
          timestamp: Date.now(),
        };
        mpLog(state, `❓⚡ ${player.username} drew City Blackout card! Choosing a target...`);
        return false;
      } else {
        player.balance += 150;
        state.lastChanceEvent = {
          title: "⚡ BLACKOUT BONUS",
          description: `No opponent cities for blackout — collected $150 bonus!`,
          icon: "💰",
          timestamp: Date.now(),
        };
        mpLog(state, `❓⚡ ${player.username} drew City Blackout card (No valid targets — received $150 bonus).`);
        return false;
      }
    }

    if (chosenCard === "downgrade") {
      const targetable = opponents
        .flatMap((p) => p.ownedProperties)
        .filter((idx) => {
          const owner = opponents.find((o) => o.ownedProperties.includes(idx));
          const lvl = owner?.houseLevels[idx] ?? 0;
          return lvl > 0 && !state.shieldedSpaces?.includes(idx);
        });

      if (targetable.length > 0) {
        state.turnPhase = "chance_target";
        state.pendingChanceTarget = {
          type: "downgrade",
          title: "🔨 DOWNGRADE BUILDING",
          description: "Click an opponent's city with houses to downgrade by 1 level!",
        };
        state.lastChanceEvent = {
          title: "🔨 DOWNGRADE CARD!",
          description: `${player.username} drew Downgrade Building card!`,
          icon: "🔨",
          timestamp: Date.now(),
        };
        mpLog(state, `❓🔨 ${player.username} drew Downgrade Building card! Choosing a target...`);
        return false;
      } else {
        player.balance += 150;
        state.lastChanceEvent = {
          title: "🔨 DOWNGRADE BONUS",
          description: `No opponent buildings to downgrade — collected $150 bonus!`,
          icon: "💰",
          timestamp: Date.now(),
        };
        mpLog(state, `❓🔨 ${player.username} drew Downgrade Building card (No valid targets — received $150 bonus).`);
        return false;
      }
    }

    if (chosenCard === "shield") {
      const targetable = player.ownedProperties.filter((idx) => !state.shieldedSpaces?.includes(idx));

      if (targetable.length > 0) {
        state.turnPhase = "chance_target";
        state.pendingChanceTarget = {
          type: "shield",
          title: "🛡️ ASSET SHIELD",
          description: "Click 1 of your cities to protect with an Energy Shield!",
        };
        state.lastChanceEvent = {
          title: "🛡️ ASSET SHIELD CARD!",
          description: `${player.username} drew Asset Shield card!`,
          icon: "🛡️",
          timestamp: Date.now(),
        };
        mpLog(state, `❓🛡️ ${player.username} drew Asset Shield card! Choosing a city to protect...`);
        return false;
      } else {
        player.balance += 200;
        state.lastChanceEvent = {
          title: "🛡️ SHIELD BONUS",
          description: `No owned cities to shield — collected $200 bonus!`,
          icon: "💰",
          timestamp: Date.now(),
        };
        mpLog(state, `❓🛡️ ${player.username} drew Asset Shield card (No owned cities — received $200 bonus).`);
        return false;
      }
    }

    if (chosenCard === "flight") {
      player.position = 24; // World Tour
      state.turnPhase = "world_tour";
      state.lastChanceEvent = {
        title: "✈️ FREE FLIGHT TICKET!",
        description: `${player.username} got a Free World Tour Flight ticket!`,
        icon: "✈️",
        timestamp: Date.now(),
      };
      mpLog(state, `❓✈️ ${player.username} drew Free Flight Ticket — warped to World Tour!`);
      return false;
    }

    if (chosenCard === "jail") {
      player.position = 8;
      player.inJail = true;
      player.jailTurns = 0;
      player.doublesCount = 0;
      state.lastChanceEvent = {
        title: "🏝️ LOST AT SEA!",
        description: `A sudden typhoon swept ${player.username} to Lost Island!`,
        icon: "🏝️",
        timestamp: Date.now(),
      };
      mpLog(state, `❓🏝️ ${player.username} drew Lost at Sea — sent to Lost Island!`);
      return false;
    }

    // Cash events
    const cashEventsMap: Record<string, { title: string; desc: string; icon: string; amount: number }> = {
      dividend: { title: "💰 TECH STOCK DIVIDEND", desc: "Overseas tech stocks skyrocketed! Collect $200", icon: "💰", amount: 200 },
      lottery: { title: "🏆 GRAND LOTTERY", desc: "Won the mega lottery jackpot! Collect $300", icon: "🏆", amount: 300 },
      inheritance: { title: "🎁 FAMILY INHERITANCE", desc: "Received an inheritance from abroad! Collect $250", icon: "🎁", amount: 250 },
      consultancy: { title: "💼 CONSULTANCY DEAL", desc: "Signed a corporate advising contract! Collect $150", icon: "💼", amount: 150 },
      medical: { title: "🏥 MEDICAL & CLINIC BILLS", desc: "Emergency dental and health checkup fees. Pay $150", icon: "🏥", amount: -150 },
      speeding: { title: "🚗 SPEEDING TICKET", desc: "Caught speeding in a sports car. Pay $100", icon: "🚗", amount: -100 },
      renovation: { title: "🛠️ CITY RENOVATION TAX", desc: "Municipal street & infrastructure fee. Pay $120", icon: "🛠️", amount: -120 },
    };

    const cashEv = cashEventsMap[chosenCard] || { title: "💰 SURPRISE BONUS", desc: "Collect $100", icon: "💰", amount: 100 };
    state.lastChanceEvent = {
      title: cashEv.title,
      description: cashEv.desc,
      icon: cashEv.icon,
      timestamp: Date.now(),
    };
    mpLog(state, `❓ ${player.username}: ${cashEv.title} — ${cashEv.desc}`);

    if (cashEv.amount < 0) {
      const penalty = Math.abs(cashEv.amount);
      if (player.balance < penalty) {
        const totalAssetValue = player.ownedProperties.reduce((sum, idx) => {
          const sp = MONOPOLY_BOARD[idx];
          const hl = player.houseLevels[idx] ?? 0;
          return sum + getSaleValue(sp?.price ?? 0, hl);
        }, 0);

        if (player.balance + totalAssetValue >= penalty) {
          state.turnPhase = "debt";
          state.pendingDebt = {
            amount: penalty,
            creditorId: null,
            creditorName: "Bank",
            spaceName: "Chance Card Fine",
            type: "fine",
          };
          mpLog(state, `⚠️ ${player.username} owes $${penalty} for fine (has $${player.balance}). Sell properties to pay!`);
          return false;
        } else {
          player.balance = 0;
          player.isActive = false;
          player.ownedProperties = [];
          player.houseLevels = {};
          mpLog(state, `💀 ${player.username} went bankrupt!`);
          return false;
        }
      } else {
        player.balance -= penalty;
      }
    } else {
      player.balance += cashEv.amount;
    }
    return false;
  }

  // Purchasable space (property, beach)
  if (space.type === "property" || space.type === "beach") {
    // Check if owned by anyone
    const owner = state.players.find((p) =>
      p.isActive && p.ownedProperties.includes(player.position)
    );

    if (owner && owner.playerId !== player.playerId) {
      // Pay rent to owner
      const rent = calculateRent(player.position, state, diceTotal);
      const houseLevel = owner.houseLevels[player.position] ?? 0;
      const levelStr = houseLevel > 0 ? ` (Lv.${houseLevel})` : "";

      if (player.balance < rent) {
        const totalAssetValue = player.ownedProperties.reduce((sum, idx) => {
          const sp = MONOPOLY_BOARD[idx];
          const hl = player.houseLevels[idx] ?? 0;
          return sum + getSaleValue(sp?.price ?? 0, hl);
        }, 0);

        if (player.balance + totalAssetValue >= rent) {
          state.turnPhase = "debt";
          state.pendingDebt = {
            amount: rent,
            creditorId: owner.playerId,
            creditorName: owner.username,
            spaceName: space.name,
            type: "rent",
          };
          mpLog(state, `⚠️ ${player.username} owes $${rent} rent to ${owner.username} for ${space.name}${levelStr} (has $${player.balance}). Sell properties to pay!`);
          return false;
        } else {
          // Bankrupt even after total liquidation
          owner.balance += player.balance;
          player.balance = 0;
          player.isActive = false;
          player.ownedProperties = [];
          player.houseLevels = {};
          mpLog(state, `💀 ${player.username} cannot afford $${rent} rent and went bankrupt! All remaining cash given to ${owner.username}.`);
          return false;
        }
      } else {
        player.balance -= rent;
        owner.balance += rent;
        mpLog(state, `💸 ${player.username} paid $${rent} rent to ${owner.username} for ${space.name}${levelStr}.`);
        return false;
      }
    }

    if (owner && owner.playerId === player.playerId) {
      // Landing on own property — restore power if in blackout
      if (state.blackoutSpaces && state.blackoutSpaces.includes(player.position)) {
        state.blackoutSpaces = state.blackoutSpaces.filter((idx) => idx !== player.position);
        mpLog(state, `💡 Power restored in ${space.name}! Rent is active again.`);
        state.lastChanceEvent = {
          title: "💡 POWER RESTORED!",
          description: `${player.username} visited ${space.name} — power restored!`,
          icon: "💡",
          timestamp: Date.now(),
        };
      }

      // Landing on own property — offer upgrade if possible
      const currentLevel = owner.houseLevels[player.position] ?? 0;
      if (space.type === "property" && currentLevel < 4 && space.rentScale) {
        // Will be offered upgrade via "action" phase
        return true; // triggers action phase
      }
      return false;
    }

    if (!owner && space.price) {
      // Unowned — offer to buy
      return true;
    }

    // No price — nothing happens
    return false;
  }

  // GO, Free Parking — nothing special
  return false;
}



// ── Word Chain timer management ──────────────────────────────────

function clearWCTimer(roomId: string) {
  const timer = wcTimers.get(roomId);
  if (timer) {
    clearTimeout(timer);
    wcTimers.delete(roomId);
  }
}

function startWCTimer(roomId: string, io: GameIO) {
  clearWCTimer(roomId);

  const timer = setTimeout(() => {
    handleWCTimeout(roomId, io);
  }, (WC_TURN_DURATION + 1) * 1000); // +1s grace period

  wcTimers.set(roomId, timer);
}

function handleWCTimeout(roomId: string, io: GameIO) {
  const room = rooms.get(roomId);
  const state = wcStates.get(roomId);
  if (!room || !state || room.status !== "playing") return;

  // The player whose turn it was loses
  const loserId = state.currentTurnPlayerId;
  const loser = room.players.find((p) => p.id === loserId);
  const winner = room.players.find((p) => p.id !== loserId);

  if (!loser || !winner) return;

  room.status = "finished";
  state.winner = winner.id;
  state.endReason = "timeout";

  clearWCTimer(roomId);

  io.to(roomId).emit("wc_game_over", {
    winnerId: winner.id,
    winnerName: winner.username,
    loserId: loser.id,
    loserName: loser.username,
    reason: "timeout",
    gameState: { ...state },
  });

  console.log(`⏱ Word Chain timeout in room ${roomId}: ${loser.username} loses`);
}

// ── Active lobbies helper ─────────────────────────────────────────

export interface ActiveLobbyInfo {
  id: string;
  gameId: string;
  gameTitle: string;
  roomCode: string;
  hostName: string;
  currentPlayers: number;
  maxPlayers: number;
  route: string;
  status: "waiting" | "playing" | "finished";
  createdAt: string;
}

export function getActiveLobbies(): ActiveLobbyInfo[] {
  const list: ActiveLobbyInfo[] = [];
  const gameTitles: Record<string, string> = {
    chess: "Chess",
    caro: "Caro 5-in-a-Row",
    battleship: "Battleship",
    monopoly: "Monopoly",
    wordchain: "Word Chain",
  };
  const gameRoutes: Record<string, string> = {
    chess: "/games/chess",
    caro: "/games/caro",
    battleship: "/games/battleship",
    monopoly: "/games/monopoly",
    wordchain: "/games/wordchain",
  };

  for (const [id, room] of rooms.entries()) {
    if (room.players.length > 0 && room.status !== "finished") {
      const maxPlayers = room.gameType === "monopoly" ? MONOPOLY_MAX_PLAYERS : 2;
      list.push({
        id: room.id,
        gameId: room.gameType,
        gameTitle: gameTitles[room.gameType] || room.gameType,
        roomCode: room.id,
        hostName: room.players[0]?.username || "Host",
        currentPlayers: room.players.length,
        maxPlayers,
        route: gameRoutes[room.gameType] || `/games/${room.gameType}`,
        status: room.status,
        createdAt: room.createdAt ? new Date(room.createdAt).toISOString() : new Date().toISOString(),
      });
    }
  }
  return list;
}

// ── Main handler registration ────────────────────────────────────

export function registerSocketHandlers(io: GameIO): void {
  io.on("connection", (socket) => {
    console.log(`🔌 Client connected: ${socket.id}`);
    io.emit("online_players_count", io.engine.clientsCount);
    socket.emit("active_lobbies" as any, getActiveLobbies());

    socket.on("get_active_lobbies" as any, () => {
      socket.emit("active_lobbies" as any, getActiveLobbies());
    });

    // ── Join Room ────────────────────────────────────────────────
    socket.on("join_room", ({ roomId, gameType, username, action, language }) => {
      socket.data.username = username;
      socket.data.currentRoom = roomId;

      let room = rooms.get(roomId);

      if (!room) {
        if (action === "join") {
          socket.emit("error", { message: "Room not found." });
          console.log(`⚠️ Join failed: Room ${roomId} does not exist (user: ${username}, game: ${gameType})`);
          return;
        }

        room = {
          id: roomId,
          gameType,
          players: [],
          status: "waiting",
          createdAt: new Date(),
          language: gameType === "wordchain" ? (language || "en") : undefined,
        };
        rooms.set(roomId, room);
        const maxPlayers = gameType === "monopoly" ? MONOPOLY_MAX_PLAYERS : 2;
        console.log(`🏠 Room created: ${roomId} [${gameType}] (max: ${maxPlayers}${room.language ? `, lang: ${room.language}` : ""})`);
      } else {
        // Validate that the requested game type matches the existing room's game type
        if (room.gameType !== gameType) {
          socket.emit("error", { message: "Room not found." });
          console.log(`⚠️ Join failed: Room ${roomId} is for '${room.gameType}', not '${gameType}' (user: ${username})`);
          return;
        }
      }

      // Check if existing player is reconnecting with new socket
      const existingPlayer = room.players.find(
        (p) => p.socketId === socket.id || p.username === username
      );

      if (existingPlayer) {
        existingPlayer.socketId = socket.id;
        socket.join(roomId);
        socket.emit("room_joined", { room, playerId: existingPlayer.id });

        // If game is playing, re-send game state so player is synced!
        if (room.status === "playing") {
          if (room.gameType === "chess") {
            const gs = chessStates.get(roomId);
            if (gs) {
              socket.emit("chess_game_started", {
                room,
                gameState: gs,
                whitePlayerId: gs.whitePlayer.id,
                blackPlayerId: gs.blackPlayer.id,
              });
            }
          } else if (room.gameType === "caro") {
            const gs = caroStates.get(roomId);
            if (gs) {
              socket.emit("game_started", { room, gameState: gs });
            }
          } else if (room.gameType === "battleship") {
            broadcastBSGameState(roomId, io);
          } else if (room.gameType === "monopoly") {
            const gs = mpStates.get(roomId);
            if (gs) {
              socket.emit("mp_game_started", { room, gameState: gs });
            }
          } else if (room.gameType === "wordchain") {
            const gs = wcStates.get(roomId);
            if (gs) {
              socket.emit("wc_game_started", { room, gameState: gs });
            }
          }
        }
        return;
      }

      const maxPlayers = room.gameType === "monopoly" ? MONOPOLY_MAX_PLAYERS : 2;

      // Check if room is already full
      if (room.players.length >= maxPlayers) {
        socket.emit("error", { message: "Room is full." });
        console.log(`⚠️ Join failed: Room ${roomId} is full (${room.players.length}/${maxPlayers}) (user: ${username})`);
        return;
      }

      // Check if game has already started (cannot join midway)
      if (room.status !== "waiting") {
        socket.emit("error", { message: "Game has already started in this room." });
        console.log(`⚠️ Join failed: Room ${roomId} has already started (${room.status}) (user: ${username})`);
        return;
      }

      const player = {
        id: `player_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
        username,
        socketId: socket.id,
      };

      room.players.push(player);
      socket.join(roomId);

      socket.emit("room_joined", { room, playerId: player.id });
      socket.to(roomId).emit("player_joined", { player, room });

      console.log(`👤 ${username} joined room ${roomId} (${room.players.length}/${maxPlayers}) [${room.gameType}]`);

      // Auto-start when 2 players
      if (room.players.length === 2 && room.gameType !== "monopoly") {
        room.status = "playing";

        if (room.gameType === "caro") {
          const gameState = createInitialCaroState();
          caroStates.set(roomId, gameState);
          io.to(roomId).emit("game_started", { room, gameState });
        } else if (room.gameType === "wordchain") {
          const lang = room.language || "en";
          const firstPlayer = room.players[0];
          const gameState = createInitialWCState(lang, firstPlayer.id);
          wcStates.set(roomId, gameState);
          io.to(roomId).emit("wc_game_started", { room, gameState });
          // Timer starts after the first word is submitted
        } else if (room.gameType === "battleship") {
          const p1Id = room.players[0].id;
          const p2Id = room.players[1].id;
          bsStates.set(roomId, createInitialBSState(p1Id, p2Id));
          broadcastBSGameState(roomId, io);
        } else if (room.gameType === "chess") {
          const p1 = room.players[0];
          const p2 = room.players[1];
          const gameState = createInitialChessState(p1, p2);
          chessStates.set(roomId, gameState);
          io.to(roomId).emit("chess_game_started", {
            room,
            gameState,
            whitePlayerId: p1.id,
            blackPlayerId: p2.id,
          });
        }

        console.log(`🎮 Game started in room ${roomId}`);
      }

      io.emit("active_lobbies" as any, getActiveLobbies());
    });

    // ── Monopoly: manual start (host triggers when 2-4 players are in) ─
    socket.on("mp_start_game", ({ roomId }) => {
      const room = rooms.get(roomId);
      if (!room || room.gameType !== "monopoly" || room.status !== "waiting") return;

      if (room.players.length < MONOPOLY_MIN_PLAYERS) {
        socket.emit("error", { message: `Need at least ${MONOPOLY_MIN_PLAYERS} players to start.` });
        return;
      }

      // Only the first player (host) can start
      if (room.players[0].socketId !== socket.id) {
        socket.emit("error", { message: "Only the host can start the game." });
        return;
      }

      room.status = "playing";
      const gameState = createInitialMonopolyState(
        room.players.map((p) => ({ id: p.id, username: p.username }))
      );
      mpStates.set(roomId, gameState);
      io.to(roomId).emit("mp_game_started", { room, gameState });
      io.emit("active_lobbies" as any, getActiveLobbies());
      console.log(`🎩 Monopoly started in room ${roomId} with ${room.players.length} players`);
    });

    // ══════════════════════════════════════════════════════════════
    //  MONOPOLY EVENTS
    // ══════════════════════════════════════════════════════════════

    socket.on("mp_roll_dice", ({ roomId }) => {
      const room = rooms.get(roomId);
      const state = mpStates.get(roomId);
      if (!room || !state || room.status !== "playing" || room.gameType !== "monopoly") return;

      const player = room.players.find((p) => p.socketId === socket.id);
      if (!player) return;

      const mpPlayer = state.players.find((p) => p.playerId === player.id);
      if (!mpPlayer || !mpPlayer.isActive) return;

      if (player.id !== state.currentTurnPlayerId || state.turnPhase !== "roll") {
        socket.emit("error", { message: "Not your turn or can't roll now." });
        return;
      }

      // Roll 2 dice
      const die1 = Math.floor(Math.random() * 6) + 1;
      const die2 = Math.floor(Math.random() * 6) + 1;
      const diceTotal = die1 + die2;
      const isDoubles = die1 === die2;

      state.lastDice = [die1, die2];
      state.rollCount = (state.rollCount || 0) + 1;
      mpLog(state, `🎲 ${mpPlayer.username} rolled ${die1} + ${die2} = ${diceTotal}${isDoubles ? " (Doubles!)" : ""}`);

      io.to(roomId).emit("mp_dice_rolled", {
        playerId: player.id,
        username: mpPlayer.username,
        dice: [die1, die2],
        diceTotal,
        isDoubles,
      });

      // ── Jail logic ──────────────────────────────────────────────
      if (mpPlayer.inJail) {
        if (isDoubles) {
          mpPlayer.inJail = false;
          mpPlayer.jailTurns = 0;
          mpPlayer.doublesCount = 0;
          mpLog(state, `🔓 ${mpPlayer.username} rolled doubles and escaped Lost Island!`);
        } else {
          mpPlayer.jailTurns++;
          if (mpPlayer.jailTurns >= 3) {
            // Must pay $100 bail after 3 failed turns
            if (mpPlayer.balance >= 100) {
              mpPlayer.balance -= 100;
              mpPlayer.inJail = false;
              mpPlayer.jailTurns = 0;
              mpPlayer.doublesCount = 0;
              mpLog(state, `💵 ${mpPlayer.username} paid $100 bail after 3 turns on Lost Island.`);
            } else {
              const totalAssetValue = mpPlayer.ownedProperties.reduce((sum, idx) => {
                const sp = MONOPOLY_BOARD[idx];
                const hl = mpPlayer.houseLevels[idx] ?? 0;
                return sum + getSaleValue(sp?.price ?? 0, hl);
              }, 0);

              if (mpPlayer.balance + totalAssetValue >= 100) {
                mpPlayer.inJail = false;
                mpPlayer.jailTurns = 0;
                mpPlayer.doublesCount = 0;
                state.turnPhase = "debt";
                state.pendingDebt = {
                  amount: 100,
                  creditorId: null,
                  creditorName: "Bank",
                  spaceName: "Lost Island Bail",
                  type: "fine",
                };
                mpLog(state, `⚠️ ${mpPlayer.username} owes $100 bail on Lost Island (has $${mpPlayer.balance}). Sell properties to pay!`);
                io.to(roomId).emit("mp_game_update", { gameState: { ...state } });
                return;
              } else {
                mpPlayer.balance = 0;
                mpPlayer.isActive = false;
                mpPlayer.ownedProperties = [];
                mpPlayer.houseLevels = {};
                mpLog(state, `💀 ${mpPlayer.username} cannot afford $100 bail on Lost Island and went bankrupt!`);
                advanceMonopolyTurn(state, player.id, room, io, roomId);
                return;
              }
            }
          } else {
            mpLog(state, `🔒 ${mpPlayer.username} is still trapped on Lost Island (turn ${mpPlayer.jailTurns}/3).`);
            advanceMonopolyTurn(state, player.id, room, io, roomId);
            return;
          }
        }
      } else {
        // Not in jail — track doubles
        if (isDoubles) {
          mpPlayer.doublesCount++;
          if (mpPlayer.doublesCount >= 3) {
            // 3 doubles in a row → go to Lost Island
            mpPlayer.position = 8;
            mpPlayer.inJail = true;
            mpPlayer.jailTurns = 0;
            mpPlayer.doublesCount = 0;
            mpLog(state, `🏝️ ${mpPlayer.username} rolled 3 doubles in a row — sent to Lost Island!`);
            advanceMonopolyTurn(state, player.id, room, io, roomId);
            return;
          }
        } else {
          mpPlayer.doublesCount = 0;
        }
      }

      // ── Move player ─────────────────────────────────────────────
      const oldPosition = mpPlayer.position;
      mpPlayer.position = (mpPlayer.position + diceTotal) % MONOPOLY_BOARD.length;

      // Check if passed or landed on START
      if (mpPlayer.position < oldPosition && mpPlayer.position !== 0) {
        mpPlayer.balance += 250;
        mpLog(state, `💵 ${mpPlayer.username} passed START — collected $250!`);
      } else if (mpPlayer.position === 0 && oldPosition !== 0) {
        mpPlayer.balance += 250;
        mpLog(state, `💵 ${mpPlayer.username} landed on START — collected $250!`);
      }

      const landedSpace = MONOPOLY_BOARD[mpPlayer.position];
      mpLog(state, `📍 ${mpPlayer.username} landed on ${landedSpace?.name || "unknown"}.`);

      // ── Resolve the space ───────────────────────────────────────
      const shouldOfferBuy = resolveSpace(state, mpPlayer, diceTotal, io, roomId);

      // Check if player went bankrupt from space resolution
      if (!mpPlayer.isActive) {
        advanceMonopolyTurn(state, player.id, room, io, roomId);
        return;
      }

      // Check if player was placed into debt resolution phase
      if (state.pendingDebt || (state.turnPhase as string) === "debt") {
        io.to(roomId).emit("mp_game_update", { gameState: { ...state } });
        return;
      }

      // Check if player entered World Cup hosting phase
      if ((state.turnPhase as string) === "world_cup") {
        io.to(roomId).emit("mp_game_update", { gameState: { ...state } });
        return;
      }

      // Check if player entered Chance Target selection phase
      if ((state.turnPhase as string) === "chance_target") {
        io.to(roomId).emit("mp_game_update", { gameState: { ...state } });
        return;
      }

      // Check if player entered World Tour phase (e.g. from Flight ticket chance card)
      if ((state.turnPhase as string) === "world_tour") {
        io.to(roomId).emit("mp_game_update", { gameState: { ...state } });
        return;
      }

      if (shouldOfferBuy) {
        const space = MONOPOLY_BOARD[mpPlayer.position];
        const isOwnProperty = mpPlayer.ownedProperties.includes(mpPlayer.position);

        if (isOwnProperty && space.type === "property") {
          // Track visit count for own property
          mpPlayer.visitCounts = mpPlayer.visitCounts || {};
          mpPlayer.visitCounts[mpPlayer.position] = (mpPlayer.visitCounts[mpPlayer.position] || 0) + 1;
          const visitCount = mpPlayer.visitCounts[mpPlayer.position];

          const currentLevel = mpPlayer.houseLevels[mpPlayer.position] ?? 0;
          const maxLevel = visitCount >= 2 ? 4 : 3;
          const upgradeCostPerLevel = Math.floor((space.price ?? 0) * 0.5);

          // If property is already at max allowed level for this visit, auto-skip
          if (currentLevel >= maxLevel) {
            if (isDoubles && !mpPlayer.inJail) {
              state.turnPhase = "roll";
              mpLog(state, `🎲 ${mpPlayer.username} rolled doubles — roll again!`);
              io.to(roomId).emit("mp_game_update", { gameState: { ...state } });
            } else {
              advanceMonopolyTurn(state, player.id, room, io, roomId);
            }
            return;
          }

          // Check if player can afford at least 1 more level
          const minCost = upgradeCostPerLevel;
          if (mpPlayer.balance < minCost) {
            mpLog(
              state,
              `⚠️ ${mpPlayer.username} landed on ${space.name} but cannot afford to build (needs $${minCost}, has $${mpPlayer.balance}). Turn skipped.`
            );
            if (isDoubles && !mpPlayer.inJail) {
              state.turnPhase = "roll";
              mpLog(state, `🎲 ${mpPlayer.username} rolled doubles — roll again!`);
              io.to(roomId).emit("mp_game_update", { gameState: { ...state } });
            } else {
              advanceMonopolyTurn(state, player.id, room, io, roomId);
            }
            return;
          }

          // Player can afford building - calculate costs for levels 1..4
          const costs = [1, 2, 3, 4].map((lvl) => {
            if (lvl <= currentLevel) return 0;
            return (lvl - currentLevel) * upgradeCostPerLevel;
          });

          state.turnPhase = "action";
          io.to(roomId).emit("mp_game_update", { gameState: { ...state } });
          io.to(socket.id).emit("mp_offer_upgrade", {
            spaceIndex: mpPlayer.position,
            spaceName: space.name,
            currentLevel,
            upgradeCost: upgradeCostPerLevel,
            maxLevel,
            costs,
          });
        } else if (space.type === "property") {
          // Unowned property — can buy and build immediately Lv.1 to Lv.3 on 1st visit
          const upgradeCostPerLevel = Math.floor((space.price ?? 0) * 0.5);
          const minCost = (space.price ?? 0) + upgradeCostPerLevel; // Lv.1 minimum

          if (mpPlayer.balance < (space.price ?? 0)) {
            mpLog(
              state,
              `⚠️ ${mpPlayer.username} landed on ${space.name} but cannot afford to buy ($${space.price}). Turn skipped.`
            );
            if (isDoubles && !mpPlayer.inJail) {
              state.turnPhase = "roll";
              mpLog(state, `🎲 ${mpPlayer.username} rolled doubles — roll again!`);
              io.to(roomId).emit("mp_game_update", { gameState: { ...state } });
            } else {
              advanceMonopolyTurn(state, player.id, room, io, roomId);
            }
            return;
          }

          // Costs for buying & building Lv.1, Lv.2, Lv.3 directly on first visit
          const costs = [
            (space.price ?? 0) + upgradeCostPerLevel,
            (space.price ?? 0) + 2 * upgradeCostPerLevel,
            (space.price ?? 0) + 3 * upgradeCostPerLevel,
            0, // Lv.4 locked until 2nd visit
          ];

          state.turnPhase = "action";
          io.to(roomId).emit("mp_game_update", { gameState: { ...state } });
          io.to(socket.id).emit("mp_offer_upgrade", {
            spaceIndex: mpPlayer.position,
            spaceName: space.name,
            currentLevel: 0,
            upgradeCost: upgradeCostPerLevel,
            maxLevel: 3,
            costs,
          });
        } else {
          // Railroad
          if (mpPlayer.balance < (space.price ?? 0)) {
            mpLog(
              state,
              `⚠️ ${mpPlayer.username} landed on ${space.name} but cannot afford to buy ($${space.price}). Turn skipped.`
            );
            if (isDoubles && !mpPlayer.inJail) {
              state.turnPhase = "roll";
              mpLog(state, `🎲 ${mpPlayer.username} rolled doubles — roll again!`);
              io.to(roomId).emit("mp_game_update", { gameState: { ...state } });
            } else {
              advanceMonopolyTurn(state, player.id, room, io, roomId);
            }
            return;
          }

          state.turnPhase = "action";
          io.to(roomId).emit("mp_game_update", { gameState: { ...state } });
          io.to(socket.id).emit("mp_offer_buy", {
            spaceIndex: mpPlayer.position,
            spaceName: space.name,
            price: space.price!,
          });
        }
      } else {
        // No action needed — auto-advance turn
        if (isDoubles && !mpPlayer.inJail) {
          state.turnPhase = "roll";
          mpLog(state, `🎲 ${mpPlayer.username} rolled doubles — roll again!`);
          io.to(roomId).emit("mp_game_update", { gameState: { ...state } });
        } else {
          advanceMonopolyTurn(state, player.id, room, io, roomId);
        }
      }
    });

    socket.on("mp_buy_property", ({ roomId }) => {
      const room = rooms.get(roomId);
      const state = mpStates.get(roomId);
      if (!room || !state || room.status !== "playing" || room.gameType !== "monopoly") return;

      const player = room.players.find((p) => p.socketId === socket.id);
      if (!player) return;

      const mpPlayer = state.players.find((p) => p.playerId === player.id);
      if (!mpPlayer || !mpPlayer.isActive) return;

      if (player.id !== state.currentTurnPlayerId || state.turnPhase !== "action") {
        socket.emit("error", { message: "Can't buy right now." });
        return;
      }

      const space = MONOPOLY_BOARD[mpPlayer.position];
      if (!space || !space.price) {
        socket.emit("error", { message: "This space cannot be purchased." });
        return;
      }

      // Check if already owned
      const isOwned = state.players.some((p) =>
        p.isActive && p.ownedProperties.includes(mpPlayer.position)
      );
      if (isOwned) {
        socket.emit("error", { message: "This property is already owned." });
        return;
      }

      if (mpPlayer.balance < space.price) {
        mpLog(state, `⚠️ ${mpPlayer.username} cannot afford ${space.name} ($${space.price}).`);
        io.to(roomId).emit("mp_game_update", { gameState: { ...state } });
        socket.emit("error", { message: `Not enough money. You need $${space.price} but only have $${mpPlayer.balance}.` });
        return;
      }

      // Buy it
      mpPlayer.balance -= space.price;
      mpPlayer.ownedProperties.push(mpPlayer.position);
      mpPlayer.houseLevels[mpPlayer.position] = 0;
      mpPlayer.visitCounts = mpPlayer.visitCounts || {};
      mpPlayer.visitCounts[mpPlayer.position] = 1;
      mpLog(state, `🏠 ${mpPlayer.username} bought ${space.name} for $${space.price}.`);

      // Check if this purchase completed a full color monopoly
      checkAndNotifyMonopolyCompleted(state, mpPlayer, mpPlayer.position, io, roomId);

      // If doubles were rolled, allow rolling again
      if (mpPlayer.doublesCount > 0 && !mpPlayer.inJail) {
        state.turnPhase = "roll";
        mpLog(state, `🎲 ${mpPlayer.username} rolled doubles — roll again!`);
        io.to(roomId).emit("mp_game_update", { gameState: { ...state } });
      } else {
        advanceMonopolyTurn(state, player.id, room, io, roomId);
      }
    });

    socket.on("mp_end_turn", ({ roomId }) => {
      const room = rooms.get(roomId);
      const state = mpStates.get(roomId);
      if (!room || !state || room.status !== "playing" || room.gameType !== "monopoly") return;

      const player = room.players.find((p) => p.socketId === socket.id);
      if (!player) return;

      if (player.id !== state.currentTurnPlayerId) {
        socket.emit("error", { message: "Not your turn." });
        return;
      }

      // Allow ending turn from 'action' (decline to buy/upgrade) phase
      if (state.turnPhase !== "action") {
        socket.emit("error", { message: "No action to skip." });
        return;
      }

      const mpPlayer = state.players.find((p) => p.playerId === player.id);

      // Handle declining purchase/upgrade during 'action' phase
      if (mpPlayer && mpPlayer.doublesCount > 0 && !mpPlayer.inJail) {
        state.turnPhase = "roll";
        mpLog(state, `🎲 ${mpPlayer.username} declined and rolled doubles — roll again!`);
        io.to(roomId).emit("mp_game_update", { gameState: { ...state } });
        return;
      }

      advanceMonopolyTurn(state, player.id, room, io, roomId);
    });

    // ── Monopoly: upgrade property (build house/hotel) ───────────
    socket.on("mp_upgrade_property", ({ roomId, targetLevel }) => {
      const room = rooms.get(roomId);
      const state = mpStates.get(roomId);
      if (!room || !state || room.status !== "playing" || room.gameType !== "monopoly") return;

      const player = room.players.find((p) => p.socketId === socket.id);
      if (!player) return;

      const mpPlayer = state.players.find((p) => p.playerId === player.id);
      if (!mpPlayer || !mpPlayer.isActive) return;

      if (player.id !== state.currentTurnPlayerId || state.turnPhase !== "action") {
        socket.emit("error", { message: "Can't upgrade right now." });
        return;
      }

      const space = MONOPOLY_BOARD[mpPlayer.position];
      if (!space || space.type !== "property" || !space.price) {
        socket.emit("error", { message: "This space cannot be upgraded." });
        return;
      }

      const isOwnProperty = mpPlayer.ownedProperties.includes(mpPlayer.position);
      const isUnowned = !state.players.some((p) =>
        p.isActive && p.ownedProperties.includes(mpPlayer.position)
      );

      if (!isOwnProperty && !isUnowned) {
        socket.emit("error", { message: "This property is already owned by someone else." });
        return;
      }

      const currentLevel = isOwnProperty ? (mpPlayer.houseLevels[mpPlayer.position] ?? 0) : 0;
      const visitCount = isOwnProperty ? (mpPlayer.visitCounts?.[mpPlayer.position] ?? 1) : 1;
      const maxLevel = visitCount >= 2 ? 4 : 3;

      const requestedLevel = typeof targetLevel === "number" ? targetLevel : currentLevel + 1;

      if (requestedLevel <= currentLevel || requestedLevel > maxLevel || requestedLevel > 4) {
        socket.emit("error", { message: `Invalid build level. Maximum allowed is Level ${maxLevel}.` });
        return;
      }

      const upgradeCostPerLevel = Math.floor(space.price * 0.5);
      let totalCost = 0;

      if (isOwnProperty) {
        const levelsToAdd = requestedLevel - currentLevel;
        totalCost = levelsToAdd * upgradeCostPerLevel;
      } else {
        // Unowned first purchase + build
        totalCost = space.price + requestedLevel * upgradeCostPerLevel;
      }

      if (mpPlayer.balance < totalCost) {
        mpLog(state, `⚠️ ${mpPlayer.username} cannot afford to build Lv.${requestedLevel} on ${space.name} ($${totalCost}).`);
        io.to(roomId).emit("mp_game_update", { gameState: { ...state } });
        socket.emit("error", { message: `Not enough money. Need $${totalCost} but have $${mpPlayer.balance}.` });
        return;
      }

      // Upgrade it
      mpPlayer.balance -= totalCost;
      if (!isOwnProperty) {
        mpPlayer.ownedProperties.push(mpPlayer.position);
        mpPlayer.visitCounts = mpPlayer.visitCounts || {};
        mpPlayer.visitCounts[mpPlayer.position] = 1;
      }
      mpPlayer.houseLevels[mpPlayer.position] = requestedLevel;
      const levelName = requestedLevel === 4 ? "Hotel 🏨" : `House Lv.${requestedLevel} 🏠`;
      const actionText = isOwnProperty ? `upgraded to ${levelName}` : `bought and built ${levelName}`;
      mpLog(state, `🏗️ ${mpPlayer.username} ${actionText} on ${space.name} for $${totalCost}.`);

      // Check if this purchase completed a full color monopoly
      checkAndNotifyMonopolyCompleted(state, mpPlayer, mpPlayer.position, io, roomId);

      // After upgrade, auto-advance
      if (mpPlayer.doublesCount > 0 && !mpPlayer.inJail) {
        state.turnPhase = "roll";
        mpLog(state, `🎲 ${mpPlayer.username} rolled doubles — roll again!`);
        io.to(roomId).emit("mp_game_update", { gameState: { ...state } });
      } else {
        advanceMonopolyTurn(state, player.id, room, io, roomId);
      }
    });

    // ── Sell Property (Voluntary or during debt at 80% value) ──
    socket.on("mp_sell_property", ({ roomId, spaceIndex }) => {
      const room = rooms.get(roomId);
      if (!room || room.status !== "playing") return;
      const state = mpStates.get(roomId);
      if (!state) return;

      const player = room.players.find((p) => p.socketId === socket.id);
      if (!player) return;

      const mpPlayer = state.players.find((p) => p.playerId === player.id);
      if (!mpPlayer || !mpPlayer.isActive) return;

      // Must be player's turn or resolving debt
      if (player.id !== state.currentTurnPlayerId) {
        socket.emit("error", { message: "Can only sell properties on your turn." });
        return;
      }

      if (!mpPlayer.ownedProperties.includes(spaceIndex)) {
        socket.emit("error", { message: "You do not own this property." });
        return;
      }

      const space = MONOPOLY_BOARD[spaceIndex];
      if (!space || !space.price) {
        socket.emit("error", { message: "Invalid property to sell." });
        return;
      }

      const houseLevel = mpPlayer.houseLevels[spaceIndex] ?? 0;
      const saleValue = getSaleValue(space.price, houseLevel);

      // Perform sale: credit 80% price back to player
      mpPlayer.balance += saleValue;
      mpPlayer.ownedProperties = mpPlayer.ownedProperties.filter((idx) => idx !== spaceIndex);
      delete mpPlayer.houseLevels[spaceIndex];
      if (mpPlayer.visitCounts) {
        delete mpPlayer.visitCounts[spaceIndex];
      }
      if (space.colorGroup && mpPlayer.celebratedMonopolies) {
        mpPlayer.celebratedMonopolies = mpPlayer.celebratedMonopolies.filter((g) => g !== space.colorGroup);
      }
      if (state.worldCupSpaceIndex === spaceIndex) {
        state.worldCupSpaceIndex = null;
        mpLog(state, `🏆 World Cup host property ${space.name} was sold. World Cup host status cleared.`);
      }

      const levelStr = houseLevel > 0 ? ` (Lv.${houseLevel})` : "";
      mpLog(state, `🏷️ ${mpPlayer.username} sold ${space.name}${levelStr} for $${saleValue}.`);

      // If player is in debt phase and now has no properties left and cannot afford the debt -> auto-bankrupt
      if (
        state.turnPhase === "debt" &&
        state.pendingDebt &&
        mpPlayer.ownedProperties.length === 0 &&
        mpPlayer.balance < state.pendingDebt.amount
      ) {
        const debt = state.pendingDebt;
        if (debt.creditorId) {
          const creditor = state.players.find((p) => p.playerId === debt.creditorId);
          if (creditor) {
            creditor.balance += mpPlayer.balance;
          }
        }
        mpPlayer.balance = 0;
        mpPlayer.isActive = false;
        mpPlayer.ownedProperties = [];
        mpPlayer.houseLevels = {};
        state.pendingDebt = null;
        mpLog(state, `💀 ${mpPlayer.username} sold all properties but still cannot pay $${debt.amount} ${debt.type} debt and went bankrupt!`);
        advanceMonopolyTurn(state, player.id, room, io, roomId);
        return;
      }

      io.to(roomId).emit("mp_game_update", { gameState: { ...state } });
    });

    // ── Pay Debt (Once balance >= debt amount) ──
    socket.on("mp_pay_debt", ({ roomId }) => {
      const room = rooms.get(roomId);
      if (!room || room.status !== "playing") return;
      const state = mpStates.get(roomId);
      if (!state || state.turnPhase !== "debt" || !state.pendingDebt) return;

      const player = room.players.find((p) => p.socketId === socket.id);
      if (!player || player.id !== state.currentTurnPlayerId) return;

      const mpPlayer = state.players.find((p) => p.playerId === player.id);
      if (!mpPlayer || !mpPlayer.isActive) return;

      const debt = state.pendingDebt;
      if (mpPlayer.balance < debt.amount) {
        socket.emit("error", { message: `Not enough money to pay debt. Need $${debt.amount}, have $${mpPlayer.balance}. Sell more properties!` });
        return;
      }

      // Pay the debt
      mpPlayer.balance -= debt.amount;
      if (debt.creditorId) {
        const creditor = state.players.find((p) => p.playerId === debt.creditorId);
        if (creditor) {
          creditor.balance += debt.amount;
        }
      }

      mpLog(state, `💵 ${mpPlayer.username} paid $${debt.amount} ${debt.type} for ${debt.spaceName}.`);
      state.pendingDebt = null;

      // Pass or continue turn
      advanceMonopolyTurn(state, player.id, room, io, roomId);
    });

    // ── Declare Bankruptcy (Concede debt when unable/unwilling to pay) ──
    socket.on("mp_declare_bankruptcy", ({ roomId }) => {
      const room = rooms.get(roomId);
      if (!room || room.status !== "playing") return;
      const state = mpStates.get(roomId);
      if (!state || state.turnPhase !== "debt" || !state.pendingDebt) return;

      const player = room.players.find((p) => p.socketId === socket.id);
      if (!player || player.id !== state.currentTurnPlayerId) return;

      const mpPlayer = state.players.find((p) => p.playerId === player.id);
      if (!mpPlayer || !mpPlayer.isActive) return;

      const debt = state.pendingDebt;
      if (debt.creditorId) {
        const creditor = state.players.find((p) => p.playerId === debt.creditorId);
        if (creditor) {
          creditor.balance += mpPlayer.balance;
        }
      }

      if (state.worldCupSpaceIndex != null && mpPlayer.ownedProperties.includes(state.worldCupSpaceIndex)) {
        state.worldCupSpaceIndex = null;
      }

      mpPlayer.balance = 0;
      mpPlayer.isActive = false;
      mpPlayer.ownedProperties = [];
      mpPlayer.houseLevels = {};
      mpLog(state, `💀 ${mpPlayer.username} declared bankruptcy!`);
      state.pendingDebt = null;

      advanceMonopolyTurn(state, player.id, room, io, roomId);
    });

    // ── World Tour: travel to any space on board ──────────────────
    socket.on("mp_world_tour_travel", ({ roomId, targetSpaceIndex }) => {
      const room = rooms.get(roomId);
      const state = mpStates.get(roomId);
      if (!room || !state || room.status !== "playing" || room.gameType !== "monopoly") return;

      const player = room.players.find((p) => p.socketId === socket.id);
      if (!player) return;

      const mpPlayer = state.players.find((p) => p.playerId === player.id);
      if (!mpPlayer || !mpPlayer.isActive) return;

      if (player.id !== state.currentTurnPlayerId || state.turnPhase !== "world_tour") {
        socket.emit("error", { message: "Cannot travel via World Tour right now." });
        return;
      }

      if (!isWorldTourTargetValid(targetSpaceIndex)) {
        socket.emit("error", { message: "Invalid destination. You cannot land on corners, chance, or tax spaces." });
        return;
      }

      const targetSpace = MONOPOLY_BOARD[targetSpaceIndex];
      if (!targetSpace) return;

      // Clockwise flight path: from 24 to targetSpaceIndex
      // If targetSpaceIndex < 24 (e.g. spaces 1..23), player travels clockwise past START (0)
      if (targetSpaceIndex < 24) {
        mpPlayer.balance += 250;
        mpLog(state, `💵 ${mpPlayer.username} passed START during World Tour flight — collected $250!`);
      }

      mpPlayer.position = targetSpaceIndex;
      state.rollCount = (state.rollCount || 0) + 1;
      mpLog(state, `✈️ ${mpPlayer.username} flew via World Tour to ${targetSpace.name}!`);

      // Reset turnPhase before resolving destination — the phase was "world_tour"
      // from turn start; if we don't reset, the post-resolution check mistakenly
      // detects it as a NEW world_tour entry and loops the player back indefinitely.
      state.turnPhase = "roll";

      // Resolve the space they landed on
      const shouldOfferBuy = resolveSpace(state, mpPlayer, 0, io, roomId);

      // Check if player went bankrupt from space resolution
      if (!mpPlayer.isActive) {
        advanceMonopolyTurn(state, player.id, room, io, roomId);
        return;
      }

      // Check if player was placed into debt resolution phase
      if (state.pendingDebt || (state.turnPhase as string) === "debt") {
        io.to(roomId).emit("mp_game_update", { gameState: { ...state } });
        return;
      }

      // Check if player entered World Cup hosting phase
      if ((state.turnPhase as string) === "world_cup") {
        io.to(roomId).emit("mp_game_update", { gameState: { ...state } });
        return;
      }

      // Check if player entered Chance Target selection phase
      if ((state.turnPhase as string) === "chance_target") {
        io.to(roomId).emit("mp_game_update", { gameState: { ...state } });
        return;
      }

      // Check if player entered World Tour phase
      if ((state.turnPhase as string) === "world_tour") {
        io.to(roomId).emit("mp_game_update", { gameState: { ...state } });
        return;
      }

      if (shouldOfferBuy) {
        const space = MONOPOLY_BOARD[mpPlayer.position];
        const isOwnProperty = mpPlayer.ownedProperties.includes(mpPlayer.position);

        if (isOwnProperty && space.type === "property") {
          mpPlayer.visitCounts = mpPlayer.visitCounts || {};
          mpPlayer.visitCounts[mpPlayer.position] = (mpPlayer.visitCounts[mpPlayer.position] || 0) + 1;
          const visitCount = mpPlayer.visitCounts[mpPlayer.position];

          const currentLevel = mpPlayer.houseLevels[mpPlayer.position] ?? 0;
          const maxLevel = visitCount >= 2 ? 4 : 3;
          const upgradeCostPerLevel = Math.floor((space.price ?? 0) * 0.5);

          if (currentLevel >= maxLevel || mpPlayer.balance < upgradeCostPerLevel) {
            advanceMonopolyTurn(state, player.id, room, io, roomId);
            return;
          }

          const costs = [1, 2, 3, 4].map((lvl) => {
            if (lvl <= currentLevel) return 0;
            return (lvl - currentLevel) * upgradeCostPerLevel;
          });

          state.turnPhase = "action";
          io.to(roomId).emit("mp_game_update", { gameState: { ...state } });
          io.to(socket.id).emit("mp_offer_upgrade", {
            spaceIndex: mpPlayer.position,
            spaceName: space.name,
            currentLevel,
            upgradeCost: upgradeCostPerLevel,
            maxLevel,
            costs,
          });
        } else if (space.type === "property") {
          const upgradeCostPerLevel = Math.floor((space.price ?? 0) * 0.5);
          if (mpPlayer.balance < (space.price ?? 0)) {
            advanceMonopolyTurn(state, player.id, room, io, roomId);
            return;
          }

          const costs = [
            (space.price ?? 0) + upgradeCostPerLevel,
            (space.price ?? 0) + 2 * upgradeCostPerLevel,
            (space.price ?? 0) + 3 * upgradeCostPerLevel,
            0,
          ];

          state.turnPhase = "action";
          io.to(roomId).emit("mp_game_update", { gameState: { ...state } });
          io.to(socket.id).emit("mp_offer_upgrade", {
            spaceIndex: mpPlayer.position,
            spaceName: space.name,
            currentLevel: 0,
            upgradeCost: upgradeCostPerLevel,
            maxLevel: 3,
            costs,
          });
        } else if (space.type === "beach") {
          state.turnPhase = "action";
          io.to(roomId).emit("mp_game_update", { gameState: { ...state } });
          io.to(socket.id).emit("mp_offer_buy", {
            spaceIndex: mpPlayer.position,
            spaceName: space.name,
            price: space.price!,
          });
        }
      } else {
        advanceMonopolyTurn(state, player.id, room, io, roomId);
      }
    });

    // ── World Cup: select an owned property to host the World Cup ──
    socket.on("mp_host_world_cup", ({ roomId, spaceIndex }) => {
      const room = rooms.get(roomId);
      const state = mpStates.get(roomId);
      if (!room || !state || room.status !== "playing" || room.gameType !== "monopoly") return;

      const player = room.players.find((p) => p.socketId === socket.id);
      if (!player) return;

      const mpPlayer = state.players.find((p) => p.playerId === player.id);
      if (!mpPlayer || !mpPlayer.isActive) return;

      if (player.id !== state.currentTurnPlayerId || state.turnPhase !== "world_cup") {
        socket.emit("error", { message: "Cannot select World Cup host right now." });
        return;
      }

      if (!mpPlayer.ownedProperties.includes(spaceIndex)) {
        socket.emit("error", { message: "You can only select a property that you own." });
        return;
      }

      const hostSpace = MONOPOLY_BOARD[spaceIndex];
      if (!hostSpace) return;

      state.worldCupSpaceIndex = spaceIndex;
      mpLog(
        state,
        `🏆 ${mpPlayer.username} chose ${hostSpace.name} to host the World Cup! Rent is now DOUBLED (2×)! 🏆`
      );

      // Check if player rolled doubles before landing on World Cup
      const lastDice = state.lastDice;
      const isDoubles = lastDice && lastDice[0] === lastDice[1];
      if (isDoubles && !mpPlayer.inJail && (mpPlayer.doublesCount || 0) < 3) {
        state.turnPhase = "roll";
        mpLog(state, `🎲 ${mpPlayer.username} rolled doubles — roll again!`);
        io.to(roomId).emit("mp_game_update", { gameState: { ...state } });
      } else {
        advanceMonopolyTurn(state, player.id, room, io, roomId);
      }
    });

    // ── Chance: select a target property on the board ──────────────
    socket.on("mp_chance_select_target", ({ roomId, targetSpaceIndex }) => {
      const room = rooms.get(roomId);
      const state = mpStates.get(roomId);
      if (!room || !state || room.status !== "playing" || room.gameType !== "monopoly") return;

      const player = room.players.find((p) => p.socketId === socket.id);
      if (!player) return;

      const mpPlayer = state.players.find((p) => p.playerId === player.id);
      if (!mpPlayer || !mpPlayer.isActive) return;

      if (player.id !== state.currentTurnPlayerId || state.turnPhase !== "chance_target" || !state.pendingChanceTarget) {
        socket.emit("error", { message: "Cannot select chance target right now." });
        return;
      }

      const targetSpace = MONOPOLY_BOARD[targetSpaceIndex];
      if (!targetSpace) return;

      const chanceType = state.pendingChanceTarget.type;
      if (!state.shieldedSpaces) state.shieldedSpaces = [];
      if (!state.blackoutSpaces) state.blackoutSpaces = [];

      if (chanceType === "shield") {
        // Must be player's own property
        if (!mpPlayer.ownedProperties.includes(targetSpaceIndex)) {
          socket.emit("error", { message: "You can only shield your own property." });
          return;
        }
        if (!state.shieldedSpaces.includes(targetSpaceIndex)) {
          state.shieldedSpaces.push(targetSpaceIndex);
        }
        mpLog(state, `🛡️ ${mpPlayer.username} activated Asset Shield on ${targetSpace.name}! It is now immune to attacks.`);
        state.lastChanceEvent = {
          title: "🛡️ ASSET SHIELDED!",
          description: `${mpPlayer.username} protected ${targetSpace.name} with Energy Shield!`,
          icon: "🛡️",
          timestamp: Date.now(),
        };
      } else if (chanceType === "demolish") {
        // Must be opponent property and not shielded
        const opponent = state.players.find(
          (p) => p.isActive && p.playerId !== mpPlayer.playerId && p.ownedProperties.includes(targetSpaceIndex)
        );
        if (!opponent) {
          socket.emit("error", { message: "Must select an opponent property to demolish." });
          return;
        }
        if (state.shieldedSpaces.includes(targetSpaceIndex)) {
          socket.emit("error", { message: "This property is protected by Shield and cannot be demolished!" });
          return;
        }

        // Demolish property
        opponent.ownedProperties = opponent.ownedProperties.filter((idx) => idx !== targetSpaceIndex);
        delete opponent.houseLevels[targetSpaceIndex];
        if (opponent.visitCounts) delete opponent.visitCounts[targetSpaceIndex];
        if (targetSpace.colorGroup && opponent.celebratedMonopolies) {
          opponent.celebratedMonopolies = opponent.celebratedMonopolies.filter((g) => g !== targetSpace.colorGroup);
        }
        if (state.worldCupSpaceIndex === targetSpaceIndex) {
          state.worldCupSpaceIndex = null;
        }
        state.blackoutSpaces = state.blackoutSpaces.filter((idx) => idx !== targetSpaceIndex);

        mpLog(state, `💣 ${mpPlayer.username} demolished ${opponent.username}'s ${targetSpace.name}! Property returned to Bank.`);
        state.lastChanceEvent = {
          title: "💣 CITY DEMOLISHED!",
          description: `${mpPlayer.username} demolished ${opponent.username}'s ${targetSpace.name}!`,
          icon: "💣",
          timestamp: Date.now(),
        };
      } else if (chanceType === "blackout") {
        const opponent = state.players.find(
          (p) => p.isActive && p.playerId !== mpPlayer.playerId && p.ownedProperties.includes(targetSpaceIndex)
        );
        if (!opponent) {
          socket.emit("error", { message: "Must select an opponent property." });
          return;
        }
        if (state.shieldedSpaces.includes(targetSpaceIndex)) {
          socket.emit("error", { message: "This property is protected by Shield and immune to Blackout!" });
          return;
        }
        if (!state.blackoutSpaces.includes(targetSpaceIndex)) {
          state.blackoutSpaces.push(targetSpaceIndex);
        }
        mpLog(state, `⚡ ${mpPlayer.username} caused a Blackout in ${opponent.username}'s ${targetSpace.name}! Rent is now $0.`);
        state.lastChanceEvent = {
          title: "⚡ BLACKOUT TRIGGERED!",
          description: `Power cut in ${targetSpace.name} (Rent = $0)!`,
          icon: "⚡",
          timestamp: Date.now(),
        };
      } else if (chanceType === "downgrade") {
        const opponent = state.players.find(
          (p) => p.isActive && p.playerId !== mpPlayer.playerId && p.ownedProperties.includes(targetSpaceIndex)
        );
        if (!opponent) {
          socket.emit("error", { message: "Must select an opponent property." });
          return;
        }
        if (state.shieldedSpaces.includes(targetSpaceIndex)) {
          socket.emit("error", { message: "This property is protected by Shield!" });
          return;
        }
        const currentLvl = opponent.houseLevels[targetSpaceIndex] ?? 0;
        if (currentLvl <= 0) {
          socket.emit("error", { message: "This property has no houses to downgrade." });
          return;
        }
        opponent.houseLevels[targetSpaceIndex] = currentLvl - 1;
        mpLog(state, `🔨 ${mpPlayer.username} downgraded ${opponent.username}'s ${targetSpace.name} from Lv.${currentLvl} to Lv.${currentLvl - 1}.`);
        state.lastChanceEvent = {
          title: "🔨 BUILDING DOWNGRADED!",
          description: `${targetSpace.name} downgraded to Lv.${currentLvl - 1}!`,
          icon: "🔨",
          timestamp: Date.now(),
        };
      }

      state.pendingChanceTarget = null;

      // Check if player rolled doubles
      const lastDice = state.lastDice;
      const isDoubles = lastDice && lastDice[0] === lastDice[1];
      if (isDoubles && !mpPlayer.inJail && (mpPlayer.doublesCount || 0) < 3) {
        state.turnPhase = "roll";
        mpLog(state, `🎲 ${mpPlayer.username} rolled doubles — roll again!`);
        io.to(roomId).emit("mp_game_update", { gameState: { ...state } });
      } else {
        advanceMonopolyTurn(state, player.id, room, io, roomId);
      }
    });

    // ══════════════════════════════════════════════════════════════
    //  CHESS EVENTS
    // ══════════════════════════════════════════════════════════════

    socket.on("chess_move", (move) => {
      handleChessMove(socket, io, move);
    });

    socket.on("chess_resign", ({ roomId }) => {
      const room = rooms.get(roomId);
      if (!room || room.status !== "playing" || room.gameType !== "chess") return;

      const gameState = chessStates.get(roomId);
      if (!gameState) return;

      const player = room.players.find((p) => p.socketId === socket.id);
      if (!player) return;

      const resigningColor: ChessColor =
        player.id === gameState.whitePlayer.id ? "w" : "b";
      const winnerColor: ChessColor = resigningColor === "w" ? "b" : "w";

      room.status = "finished";
      gameState.winner = winnerColor;
      gameState.endReason = "resignation";

      io.to(roomId).emit("chess_game_update", { gameState: { ...gameState } });
      io.to(roomId).emit("chess_game_over", {
        winner: winnerColor,
        reason: "resignation",
        gameState: { ...gameState },
      });
      console.log(`🏳️ Resignation in room ${roomId}: ${resigningColor} resigned, ${winnerColor} wins`);
    });

    socket.on("chess_timeout", ({ roomId, losingColor }) => {
      const room = rooms.get(roomId);
      if (!room || room.status !== "playing" || room.gameType !== "chess") return;

      const gameState = chessStates.get(roomId);
      if (!gameState) return;

      const winnerColor: ChessColor = losingColor === "w" ? "b" : "w";
      room.status = "finished";
      gameState.winner = winnerColor;
      gameState.endReason = "timeout";

      io.to(roomId).emit("chess_game_update", { gameState: { ...gameState } });
      io.to(roomId).emit("chess_game_over", {
        winner: winnerColor,
        reason: "timeout",
        gameState: { ...gameState },
      });
      console.log(`⏱️ Chess timeout in room ${roomId}: ${losingColor} timed out, ${winnerColor} wins`);
    });

    // ══════════════════════════════════════════════════════════════
    //  CARO EVENTS
    // ══════════════════════════════════════════════════════════════

    socket.on("make_move", (move: any) => {
      const room = rooms.get(move.roomId);
      if (!room || room.status !== "playing") return;

      if (room.gameType === "chess" || move.from !== undefined) {
        handleChessMove(socket, io, move as ChessMove);
        return;
      }

      const gameState = caroStates.get(move.roomId);
      if (!gameState) return;

      if (move.player !== gameState.currentTurn) {
        socket.emit("error", { message: "Not your turn" });
        return;
      }

      const { x, y } = move;
      if (
        x < 0 || x >= CARO_GRID_SIZE ||
        y < 0 || y >= CARO_GRID_SIZE ||
        gameState.board[x][y] !== null
      ) {
        socket.emit("error", { message: "Invalid move" });
        return;
      }

      gameState.board[x][y] = move.player;
      gameState.moveHistory.push(move);
      gameState.currentTurn = move.player === "X" ? "O" : "X";

      io.to(move.roomId).emit("move_made", {
        move,
        gameState: { ...gameState },
      });
    });

    socket.on("timeout_turn", ({ roomId, losingPlayer }) => {
      const room = rooms.get(roomId);
      if (!room || room.status !== "playing") return;

      const gameState = caroStates.get(roomId);
      if (!gameState) return;

      room.status = "finished";
      const winner = losingPlayer === "X" ? "O" : "X";
      gameState.winner = winner;

      io.to(roomId).emit("game_over", {
        winner,
        reason: "timeout",
        gameState: { ...gameState },
      });
      console.log(`⏱ Timeout in room ${roomId}: ${losingPlayer} loses`);
    });

    // ══════════════════════════════════════════════════════════════
    //  WORD CHAIN EVENTS
    // ══════════════════════════════════════════════════════════════

    socket.on("wc_submit_word", async ({ roomId, word }) => {
      const room = rooms.get(roomId);
      if (!room || room.status !== "playing" || room.gameType !== "wordchain") return;

      const state = wcStates.get(roomId);
      if (!state) return;

      // Find the submitting player
      const player = room.players.find((p) => p.socketId === socket.id);
      if (!player) return;

      // Must be their turn
      if (player.id !== state.currentTurnPlayerId) {
        socket.emit("wc_word_rejected", {
          word,
          reason: "It's not your turn!",
        });
        return;
      }

      const trimmed = word.trim();
      if (!trimmed) {
        socket.emit("wc_word_rejected", { word, reason: "Word cannot be empty." });
        return;
      }

      const lower = trimmed.toLowerCase();

      // 1. Check chaining rule (skip for the first word)
      if (state.chain.length > 0) {
        const lastEntry = state.chain[state.chain.length - 1];
        if (!isValidChain(trimmed, lastEntry.connector, state.language)) {
          const hint =
            state.language === "vi"
              ? `Word must start with "${lastEntry.connector}"`
              : `Word must start with the letter "${lastEntry.connector.toUpperCase()}"`;
          socket.emit("wc_word_rejected", { word, reason: hint });
          return;
        }
      }

      // 2. Check for duplicates
      if (state.usedWords.includes(lower)) {
        socket.emit("wc_word_rejected", {
          word,
          reason: "This word has already been used!",
        });
        return;
      }

      // 3. Dictionary validation
      let isValid = false;
      if (state.language === "en") {
        isValid = await validateEnglishWord(trimmed);
      } else {
        isValid = await validateVietnameseWord(trimmed);
      }

      if (!isValid) {
        socket.emit("wc_word_rejected", {
          word,
          reason:
            state.language === "en"
              ? `"${trimmed}" is not a valid English word.`
              : `"${trimmed}" is not a valid Vietnamese compound word.`,
        });
        return;
      }

      // ── Word accepted! ──────────────────────────────────────────
      const connector = getConnector(trimmed, state.language);
      const entry: WordChainEntry = {
        word: trimmed,
        playerId: player.id,
        username: player.username,
        connector,
      };

      state.chain.push(entry);
      state.usedWords.push(lower);

      // Switch turn
      const otherPlayer = room.players.find((p) => p.id !== player.id);
      if (!otherPlayer) return;

      state.currentTurnPlayerId = otherPlayer.id;
      state.turnStartedAt = Date.now();

      // Broadcast acceptance
      io.to(roomId).emit("wc_word_accepted", {
        entry,
        gameState: { ...state },
      });

      io.to(roomId).emit("wc_turn_changed", {
        currentTurnPlayerId: otherPlayer.id,
        turnStartedAt: state.turnStartedAt,
      });

      // Reset server timer
      startWCTimer(roomId, io);

      console.log(`📝 Word Chain [${roomId}]: "${trimmed}" by ${player.username} → next: ${otherPlayer.username}`);
    });

    socket.on("wc_timeout", ({ roomId }) => {
      handleWCTimeout(roomId, io);
    });

    // ══════════════════════════════════════════════════════════════
    //  BATTLESHIP EVENTS
    // ══════════════════════════════════════════════════════════════

    socket.on("bs_ready", ({ roomId, ships }) => {
      const room = rooms.get(roomId);
      const state = bsStates.get(roomId);
      if (!room || !state || room.status !== "playing" || state.phase !== "placement") return;

      const player = room.players.find((p) => p.socketId === socket.id);
      if (!player) return;

      const pState = state.players[player.id];
      if (pState.ready) return;

      // Basic validation could be added here
      pState.ships = ships;
      pState.ready = true;

      const allReady = Object.values(state.players).every((ps) => ps.ready);
      if (allReady) {
        state.phase = "battle";
        // Randomly decide who goes first
        state.currentTurnPlayerId = room.players[Math.random() > 0.5 ? 0 : 1].id;
      }

      broadcastBSGameState(roomId, io);
    });

    socket.on("bs_fire", ({ roomId, x, y }) => {
      const room = rooms.get(roomId);
      const state = bsStates.get(roomId);
      if (!room || !state || room.status !== "playing" || state.phase !== "battle") return;

      const player = room.players.find((p) => p.socketId === socket.id);
      if (!player) return;

      if (player.id !== state.currentTurnPlayerId) {
        socket.emit("error", { message: "Not your turn" });
        return;
      }

      const enemy = room.players.find((p) => p.id !== player.id);
      if (!enemy) return;

      const pState = state.players[player.id];
      const eState = state.players[enemy.id];

      // Check if already fired here
      if (pState.shots.find((s) => s.x === x && s.y === y)) return;

      let result: "hit" | "miss" | "sunk" = "miss";
      let hitShipType: ShipType | undefined = undefined;

      // Check hits against enemy ships
      for (const ship of eState.ships) {
        let isHit = false;
        if (ship.vertical) {
          if (x === ship.x && y >= ship.y && y < ship.y + ship.length) isHit = true;
        } else {
          if (y === ship.y && x >= ship.x && x < ship.x + ship.length) isHit = true;
        }

        if (isHit) {
          ship.hits++;
          if (ship.hits >= ship.length) {
            result = "sunk";
            hitShipType = ship.type;
          } else {
            result = "hit";
          }
          break;
        }
      }

      pState.shots.push({ x, y, result });

      // Check win condition
      const allSunk = eState.ships.every((s) => s.hits >= s.length);
      if (allSunk) {
        state.phase = "finished";
        state.winner = player.id;
        state.currentTurnPlayerId = null;
        room.status = "finished";

        io.to(roomId).emit("bs_fire_result", {
          x,
          y,
          result,
          shipType: hitShipType,
          nextTurnPlayerId: player.id, // Game over, but field required
          firedBy: player.id,
        });

        room.players.forEach((p) => {
          const other = room.players.find((x) => x.id !== p.id);
          io.to(p.socketId).emit("bs_game_over", {
            winnerId: player.id,
            winnerName: player.username,
            reason: "win",
            enemyShips: other ? state.players[other.id].ships : undefined,
          });
        });
      } else {
        // Change turn if missed, or stay turn if hit? Classic rules usually allow firing again if hit.
        // Let's implement classic rules: if hit, same player fires again.
        const nextTurnId = (result === "hit" || result === "sunk") ? player.id : enemy.id;
        state.currentTurnPlayerId = nextTurnId;

        io.to(roomId).emit("bs_fire_result", {
          x,
          y,
          result,
          shipType: hitShipType,
          nextTurnPlayerId: nextTurnId,
          firedBy: player.id,
        });
      }
    });


    // ══════════════════════════════════════════════════════════════
    //  SHARED EVENTS
    // ══════════════════════════════════════════════════════════════

    socket.on("restart_game", ({ roomId }) => {
      const room = rooms.get(roomId);
      if (!room) return;

      if (room.players.length < 2) {
        socket.emit("error", { message: "Waiting for opponent to join..." });
        return;
      }

      // Prevent double restart
      const now = Date.now();
      if ((room as any).lastRestart && now - (room as any).lastRestart < 2000) {
        return;
      }
      (room as any).lastRestart = now;

      room.status = "playing";
      // Rotate players so they alternate who goes first
      if (room.players.length === 2) {
        room.players.reverse();
      } else if (room.players.length > 2) {
        const first = room.players.shift()!;
        room.players.push(first);
      }

      if (room.gameType === "caro") {
        const gameState = createInitialCaroState();
        caroStates.set(roomId, gameState);
        io.to(roomId).emit("game_started", { room, gameState });
      } else if (room.gameType === "wordchain") {
        const lang = room.language || "en";
        const firstPlayer = room.players[0];
        const gameState = createInitialWCState(lang, firstPlayer.id);
        wcStates.set(roomId, gameState);
        io.to(roomId).emit("wc_game_started", { room, gameState });
        // Timer starts after the first word is submitted
      } else if (room.gameType === "battleship") {
        const p1Id = room.players[0].id;
        const p2Id = room.players[1].id;
        bsStates.set(roomId, createInitialBSState(p1Id, p2Id));
        broadcastBSGameState(roomId, io);
      } else if (room.gameType === "monopoly") {
        const gameState = createInitialMonopolyState(
          room.players.map((p) => ({ id: p.id, username: p.username }))
        );
        mpStates.set(roomId, gameState);
        io.to(roomId).emit("mp_game_started", { room, gameState });
      } else if (room.gameType === "chess") {
        const p1 = room.players[0];
        const p2 = room.players[1];
        const gameState = createInitialChessState(p1, p2);
        chessStates.set(roomId, gameState);
        io.to(roomId).emit("chess_game_started", {
          room,
          gameState,
          whitePlayerId: p1.id,
          blackPlayerId: p2.id,
        });
      }

      console.log(`🔄 Game restarted in room ${roomId}`);
    });

    socket.on("leave_room", ({ roomId }) => {
      handleLeaveRoom(socket, roomId, io);
    });

    socket.on("disconnect", () => {
      console.log(`🔌 Client disconnected: ${socket.id}`);
      io.emit("online_players_count", io.engine.clientsCount);
      const roomId = socket.data.currentRoom;
      if (roomId) handleLeaveRoom(socket, roomId, io);
    });
  });

  // Cleanup stale empty rooms every minute
  setInterval(() => {
    const now = Date.now();
    for (const [id, room] of rooms) {
      if (
        room.players.length === 0 &&
        now - room.createdAt.getTime() > 5 * 60 * 1000
      ) {
        rooms.delete(id);
        caroStates.delete(id);
        wcStates.delete(id);
        bsStates.delete(id);
        mpStates.delete(id);
        chessStates.delete(id);
        clearWCTimer(id);
        console.log(`🧹 Cleaned up stale room: ${id}`);
      }
    }
    io.emit("active_lobbies" as any, getActiveLobbies());
  }, 60_000);
}

function handleLeaveRoom(
  socket: import("socket.io").Socket<
    ClientToServerEvents,
    ServerToClientEvents,
    InterServerEvents,
    SocketData
  >,
  roomId: string,
  io: GameIO
) {
  socket.leave(roomId);
  const room = rooms.get(roomId);
  if (!room) return;

  // Handle Caro disconnect
  if (room.gameType === "caro" && room.status === "playing") {
    const state = caroStates.get(roomId);
    const leavingPlayer = room.players.find((p) => p.socketId === socket.id);
    const stayingPlayer = room.players.find((p) => p.socketId !== socket.id);

    if (leavingPlayer && stayingPlayer) {
      room.status = "finished";
      const winnerSymbol = room.players.indexOf(stayingPlayer) === 0 ? "X" : "O";
      if (state) {
        state.winner = winnerSymbol;
      }
      io.to(roomId).emit("game_over", {
        winner: winnerSymbol,
        reason: "disconnect",
        gameState: state ? { ...state } : undefined,
      });
    }
  }

  // If this player disconnects during a Word Chain game, the other player wins
  if (room.gameType === "wordchain" && room.status === "playing") {
    const state = wcStates.get(roomId);
    const leavingPlayer = room.players.find(
      (p) => p.socketId === socket.id
    );
    const stayingPlayer = room.players.find(
      (p) => p.socketId !== socket.id
    );

    if (state && leavingPlayer && stayingPlayer) {
      room.status = "finished";
      state.winner = stayingPlayer.id;
      state.endReason = "disconnect";
      clearWCTimer(roomId);

      io.to(roomId).emit("wc_game_over", {
        winnerId: stayingPlayer.id,
        winnerName: stayingPlayer.username,
        loserId: leavingPlayer.id,
        loserName: leavingPlayer.username,
        reason: "disconnect",
        gameState: { ...state },
      });
    }
  }

  // Handle Battleship disconnect
  if (room.gameType === "battleship" && room.status === "playing") {
    const state = bsStates.get(roomId);
    const leavingPlayer = room.players.find((p) => p.socketId === socket.id);
    const stayingPlayer = room.players.find((p) => p.socketId !== socket.id);

    if (state && leavingPlayer && stayingPlayer) {
      room.status = "finished";
      state.phase = "finished";
      state.winner = stayingPlayer.id;

      room.players.forEach((p) => {
        const other = room.players.find((x) => x.id !== p.id);
        io.to(p.socketId).emit("bs_game_over", {
          winnerId: stayingPlayer.id,
          winnerName: stayingPlayer.username,
          reason: "disconnect",
          enemyShips: other ? state.players[other.id].ships : undefined,
        });
      });
    }
  }

  // Handle Chess disconnect
  if (room.gameType === "chess" && room.status === "playing") {
    const state = chessStates.get(roomId);
    const leavingPlayer = room.players.find((p) => p.socketId === socket.id);
    const stayingPlayer = room.players.find((p) => p.socketId !== socket.id);

    if (state && leavingPlayer && stayingPlayer) {
      room.status = "finished";
      const winnerColor: ChessColor =
        stayingPlayer.id === state.whitePlayer.id ? "w" : "b";
      state.winner = winnerColor;
      state.endReason = "disconnect";

      io.to(roomId).emit("chess_game_update", { gameState: { ...state } });
      io.to(roomId).emit("chess_game_over", {
        winner: winnerColor,
        reason: "disconnect",
        gameState: { ...state },
      });
    }
  }

  // Handle Monopoly disconnect — graceful: release properties, pass turn, continue game
  if (room.gameType === "monopoly" && room.status === "playing") {
    const state = mpStates.get(roomId);
    const leavingPlayer = room.players.find((p) => p.socketId === socket.id);

    if (state && leavingPlayer) {
      const mpPlayer = state.players.find((p) => p.playerId === leavingPlayer.id);
      if (mpPlayer) {
        // Mark as inactive and release all properties
        mpPlayer.isActive = false;
        mpPlayer.ownedProperties = [];
        mpPlayer.doublesCount = 0;
        mpLog(state, `🚪 ${mpPlayer.username} disconnected. Their properties are now available!`);

        // If it was their turn, pass to next player
        if (state.currentTurnPlayerId === leavingPlayer.id) {
          const nextPlayerId = getNextActivePlayer(state, leavingPlayer.id);
          if (nextPlayerId) {
            state.currentTurnPlayerId = nextPlayerId;
            state.turnPhase = "roll";
            const nextPlayer = state.players.find((p) => p.playerId === nextPlayerId);
            mpLog(state, `🎲 ${nextPlayer?.username || "Unknown"}'s turn — roll the dice!`);
          }
        }

        // Check if only 1 active player remains → they win
        const winnerId = checkMonopolyWinner(state);
        if (winnerId) {
          const winner = state.players.find((p) => p.playerId === winnerId);
          room.status = "finished";
          state.winner = winnerId;
          state.turnPhase = "end";
          mpLog(state, `🏆 ${winner?.username || "Unknown"} wins the game!`);
          io.to(roomId).emit("mp_game_update", { gameState: { ...state } });
          io.to(roomId).emit("mp_game_over", {
            winnerId,
            winnerName: winner?.username || "Unknown",
            reason: "disconnect",
            gameState: { ...state },
          });
        } else {
          io.to(roomId).emit("mp_game_update", { gameState: { ...state } });
        }
      }
    }
  }

  room.players = room.players.filter((p) => p.socketId !== socket.id);
  console.log(
    `👤 ${socket.data.username || socket.id} left room ${roomId} (${room.players.length} remaining)`
  );

  if (room.players.length === 0) {
    rooms.delete(roomId);
    caroStates.delete(roomId);
    wcStates.delete(roomId);
    bsStates.delete(roomId);
    mpStates.delete(roomId);
    chessStates.delete(roomId);
    clearWCTimer(roomId);
  } else {
    // For non-monopoly games, mark as finished. For monopoly, the game continues.
    if (room.gameType !== "monopoly" || room.status !== "playing") {
      room.status = "finished";
    }
    socket.to(roomId).emit("player_left", { playerId: socket.id, room });
  }

  io.emit("active_lobbies" as any, getActiveLobbies());
}
