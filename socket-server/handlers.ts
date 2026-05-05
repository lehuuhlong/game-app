import { Server as SocketIOServer } from "socket.io";
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
} from "./types";

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
 * Validate a Vietnamese compound word against a local mock list.
 * (Placeholder — ready to be swapped for a real JSON dataset)
 */
const MOCK_VIETNAMESE_WORDS = new Set([
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

async function validateVietnameseWord(word: string): Promise<boolean> {
  const lower = word.trim().toLowerCase();
  // Check if it's at least 2 syllables (compound word)
  if (lower.split(/\s+/).length < 2) return false;
  return MOCK_VIETNAMESE_WORDS.has(lower);
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
          socket.emit("error", { message: "Room does not exist" });
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
        console.log(`🏠 Room created: ${roomId} (${gameType}${room.language ? `, ${room.language}` : ""})`);
      }

      if (room.players.find((p) => p.socketId === socket.id)) return;

      if (room.players.length >= 2) {
        socket.emit("error", { message: "Room is full" });
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

      console.log(`👤 ${username} joined room ${roomId} (${room.players.length}/2)`);

      // Auto-start when 2 players
      if (room.players.length === 2) {
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
        }

        console.log(`🎮 Game started in room ${roomId}`);
      }
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

  room.players = room.players.filter((p) => p.socketId !== socket.id);
  console.log(
    `👤 ${socket.data.username || socket.id} left room ${roomId} (${room.players.length} remaining)`
  );

  if (room.players.length === 0) {
    rooms.delete(roomId);
    caroStates.delete(roomId);
    wcStates.delete(roomId);
    clearWCTimer(roomId);
  } else {
    room.status = "finished";
    socket.to(roomId).emit("player_left", { playerId: socket.id, room });
  }
}
