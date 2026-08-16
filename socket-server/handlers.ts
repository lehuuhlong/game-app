import { Server as SocketIOServer } from "socket.io";
import fs from "fs";
import path from "path";
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
  MonopolyTokenColor,
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
const MONOPOLY_STARTING_BALANCE = 1500;
const MONOPOLY_MIN_PLAYERS = 2;
const MONOPOLY_MAX_PLAYERS = 4;

function createInitialMonopolyState(
  players: { id: string; username: string }[]
): MonopolyGameState {
  const mpPlayers = players.map((p, i) => ({
    playerId: p.id,
    username: p.username,
    tokenColor: MONOPOLY_TOKEN_COLORS[i],
    position: 0,
    balance: MONOPOLY_STARTING_BALANCE,
    ownedProperties: [] as number[],
    houseLevels: {} as Record<number, number>,
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
    eventLog: [
      { message: "🎩 Monopoly game started! Good luck!", timestamp: Date.now() },
      { message: `🎲 ${players[0].username}'s turn — roll the dice!`, timestamp: Date.now() },
    ],
    winner: null,
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
  const nextIndex = (currentIndex + 1) % activePlayers.length;
  return activePlayers[nextIndex].playerId;
}

/**
 * Calculate rent for a space, considering railroads (doubles per owned)
 * and utilities (4× or 10× dice roll).
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

  if (space.type === "railroad") {
    // $25 base, doubles for each railroad owned
    const railroadIndices = MONOPOLY_BOARD
      .filter((s) => s.type === "railroad")
      .map((s) => s.index);
    const ownedCount = railroadIndices.filter((i) =>
      owner.ownedProperties.includes(i)
    ).length;
    return 25 * Math.pow(2, ownedCount - 1);
  }

  if (space.type === "utility") {
    // 4× or 10× dice roll
    const utilityIndices = MONOPOLY_BOARD
      .filter((s) => s.type === "utility")
      .map((s) => s.index);
    const ownedCount = utilityIndices.filter((i) =>
      owner.ownedProperties.includes(i)
    ).length;
    return diceTotal * (ownedCount >= 2 ? 10 : 4);
  }

  // Regular property — check house level for scaled rent
  const houseLevel = owner.houseLevels[spaceIndex] ?? 0;
  if (houseLevel > 0 && space.rentScale && space.rentScale.length >= houseLevel) {
    return space.rentScale[houseLevel - 1];
  }

  // Base rent (no houses)
  return space.baseRent ?? 0;
}

/** Tax amounts for tax spaces. */
const TAX_AMOUNTS: Record<number, number> = {
  30: 400, // Tax
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

  const nextPlayerId = getNextActivePlayer(state, currentPlayerId);
  if (!nextPlayerId) {
    const winner = state.players.find((p) => p.playerId === currentPlayerId);
    room.status = "finished";
    state.winner = currentPlayerId;
    state.turnPhase = "end";
    mpLog(state, `🏆 ${winner?.username || "Unknown"} wins the game!`);
    io.to(roomId).emit("mp_game_update", { gameState: { ...state } });
    io.to(roomId).emit("mp_game_over", {
      winnerId: currentPlayerId,
      winnerName: winner?.username || "Unknown",
      gameState: { ...state },
    });
    return;
  }

  state.currentTurnPlayerId = nextPlayerId;
  state.turnPhase = "roll";
  state.lastDice = null;

  const nextPlayer = state.players.find((p) => p.playerId === nextPlayerId);
  mpLog(state, `🎲 ${nextPlayer?.username || "Unknown"}'s turn — roll the dice!`);
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

  // Go To Jail / World Tour
  if (space.type === "go_to_jail") {
    player.position = 8;
    player.inJail = true;
    player.jailTurns = 0;
    player.doublesCount = 0;
    mpLog(state, `🏝️ ${player.username} was sent to Lost Island!`);
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
        return true;
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

  // Chance / Community Chest — simplified: random $$ event
  if (space.type === "chance" || space.type === "community_chest") {
    const events = [
      { message: "Bank pays you dividend of $100", amount: 100 },
      { message: "Doctor's fees — pay $100", amount: -100 },
      { message: "You won a crossword competition — collect $200", amount: 200 },
      { message: "Pay hospital fees of $200", amount: -200 },
      { message: "Income tax refund — collect $40", amount: 40 },
      { message: "Pay school fees of $100", amount: -100 },
      { message: "Receive $50 consultancy fee", amount: 50 },
      { message: "You are assessed for street repairs — pay $80", amount: -80 },
      { message: "You have won second prize in a beauty contest — collect $20", amount: 20 },
      { message: "Life insurance matures — collect $200", amount: 200 },
    ];
    const event = events[Math.floor(Math.random() * events.length)];
    const icon = space.type === "chance" ? "❓" : "🏦";
    mpLog(state, `${icon} ${player.username}: ${event.message}`);

    if (event.amount < 0) {
      const penalty = Math.abs(event.amount);
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
            spaceName: space.name,
            type: "fine",
          };
          mpLog(state, `⚠️ ${player.username} owes $${penalty} for fine (has $${player.balance}). Sell properties to pay!`);
          return true;
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
      player.balance += event.amount;
    }
    return false;
  }

  // Purchasable space (property, railroad, utility)
  if (space.type === "property" || space.type === "railroad" || space.type === "utility") {
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
          mpLog(state, `⚠️ ${player.username} owes $${rent} rent${levelStr} to ${owner.username} for ${space.name} (has $${player.balance}). Sell properties to pay!`);
          return true;
        } else {
          // Bankrupt even after total liquidation
          owner.balance += player.balance;
          player.balance = 0;
          player.isActive = false;
          player.ownedProperties = [];
          player.houseLevels = {};
          mpLog(state, `💀 ${player.username} cannot pay $${rent} rent and went bankrupt!`);
          return false;
        }
      } else {
        player.balance -= rent;
        owner.balance += rent;
        mpLog(state, `🏠 ${player.username} paid $${rent} rent${levelStr} to ${owner.username} for ${space.name}.`);
        return false;
      }
    }

    if (owner && owner.playerId === player.playerId) {
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

  // GO, Jail (just visiting), Free Parking — nothing special
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

// ── Main handler registration ────────────────────────────────────

export function registerSocketHandlers(io: GameIO): void {
  io.on("connection", (socket) => {
    console.log(`🔌 Client connected: ${socket.id}`);
    io.emit("online_players_count", io.engine.clientsCount);

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

      if (room.players.find((p) => p.socketId === socket.id)) return;

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
        }

        console.log(`🎮 Game started in room ${roomId}`);
      }
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
      mpLog(state, `🎲 ${mpPlayer.username} rolled ${die1} + ${die2} = ${diceTotal}${isDoubles ? " (Doubles!)" : ""}`);

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
            // Must pay $50 bail after 3 failed turns
            mpPlayer.balance -= 50;
            mpPlayer.inJail = false;
            mpPlayer.jailTurns = 0;
            mpPlayer.doublesCount = 0;
            mpLog(state, `💵 ${mpPlayer.username} paid $50 bail after 3 turns on Lost Island.`);
            if (mpPlayer.balance <= 0) {
              mpPlayer.balance = 0;
              mpPlayer.isActive = false;
              mpPlayer.ownedProperties = [];
              mpPlayer.houseLevels = {};
              mpLog(state, `💀 ${mpPlayer.username} went bankrupt!`);
              advanceMonopolyTurn(state, player.id, room, io, roomId);
              return;
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

      // Check if passed or landed on GO
      if (mpPlayer.position < oldPosition && mpPlayer.position !== 0) {
        mpPlayer.balance += 300;
        mpLog(state, `💵 ${mpPlayer.username} passed GO — collected $300!`);
      } else if (mpPlayer.position === 0 && oldPosition !== 0) {
        mpPlayer.balance += 300;
        mpLog(state, `💵 ${mpPlayer.username} landed on GO — collected $300!`);
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

      if (shouldOfferBuy) {
        state.turnPhase = "action";
        io.to(roomId).emit("mp_game_update", { gameState: { ...state } });

        const space = MONOPOLY_BOARD[mpPlayer.position];

        // Check if this is own property → offer upgrade; else → offer buy
        const isOwnProperty = mpPlayer.ownedProperties.includes(mpPlayer.position);
        if (isOwnProperty && space.type === "property") {
          const currentLevel = mpPlayer.houseLevels[mpPlayer.position] ?? 0;
          const upgradeCost = Math.floor((space.price ?? 0) * 0.5);
          io.to(socket.id).emit("mp_offer_upgrade", {
            spaceIndex: mpPlayer.position,
            spaceName: space.name,
            currentLevel,
            upgradeCost,
          });
        } else {
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
      mpLog(state, `🏠 ${mpPlayer.username} bought ${space.name} for $${space.price}.`);

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

    // ── Monopoly: upgrade property (build house) ─────────────────
    socket.on("mp_upgrade_property", ({ roomId }) => {
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

      // Must own the property
      if (!mpPlayer.ownedProperties.includes(mpPlayer.position)) {
        socket.emit("error", { message: "You don't own this property." });
        return;
      }

      const currentLevel = mpPlayer.houseLevels[mpPlayer.position] ?? 0;
      if (currentLevel >= 4) {
        socket.emit("error", { message: "Property is already at max level (Hotel)." });
        return;
      }

      const upgradeCost = Math.floor(space.price * 0.5);
      if (mpPlayer.balance < upgradeCost) {
        mpLog(state, `⚠️ ${mpPlayer.username} cannot afford to upgrade ${space.name} ($${upgradeCost}).`);
        io.to(roomId).emit("mp_game_update", { gameState: { ...state } });
        socket.emit("error", { message: `Not enough money. Need $${upgradeCost} but have $${mpPlayer.balance}.` });
        return;
      }

      // Upgrade it
      mpPlayer.balance -= upgradeCost;
      const newLevel = currentLevel + 1;
      mpPlayer.houseLevels[mpPlayer.position] = newLevel;
      const levelName = newLevel === 4 ? "Hotel 🏨" : `House Lv.${newLevel} 🏠`;
      mpLog(state, `🏗️ ${mpPlayer.username} built ${levelName} on ${space.name} for $${upgradeCost}.`);

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

      const levelStr = houseLevel > 0 ? ` (Lv.${houseLevel})` : "";
      mpLog(state, `🏷️ ${mpPlayer.username} sold ${space.name}${levelStr} for $${saleValue}.`);

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

      mpPlayer.balance = 0;
      mpPlayer.isActive = false;
      mpPlayer.ownedProperties = [];
      mpPlayer.houseLevels = {};
      mpLog(state, `💀 ${mpPlayer.username} declared bankruptcy!`);
      state.pendingDebt = null;

      advanceMonopolyTurn(state, player.id, room, io, roomId);
    });

    // ══════════════════════════════════════════════════════════════
    //  CARO EVENTS
    // ══════════════════════════════════════════════════════════════

    socket.on("make_move", (move) => {
      const room = rooms.get(move.roomId);
      if (!room || room.status !== "playing") return;

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
      // Swap players so they alternate who goes first
      room.players.reverse();

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
        clearWCTimer(id);
        console.log(`🧹 Cleaned up stale room: ${id}`);
      }
    }
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
          enemyShips: other ? state.players[other.id].ships : undefined,
        });
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
            state.lastDice = null;
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
          mpLog(state, `🏆 ${winner?.username || "Unknown"} wins the game!`);
          io.to(roomId).emit("mp_game_update", { gameState: { ...state } });
          io.to(roomId).emit("mp_game_over", {
            winnerId,
            winnerName: winner?.username || "Unknown",
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
    clearWCTimer(roomId);
  } else {
    // For non-monopoly games, mark as finished. For monopoly, the game continues.
    if (room.gameType !== "monopoly" || room.status !== "playing") {
      room.status = "finished";
    }
    socket.to(roomId).emit("player_left", { playerId: socket.id, room });
  }
}
