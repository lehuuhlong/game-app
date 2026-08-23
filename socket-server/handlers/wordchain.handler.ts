/**
 * Word Chain (Nối Từ) game handler.
 *
 * Manages:
 *  - Dictionary loading (Vietnamese local file, English API)
 *  - Word validation, chaining rules
 *  - Server-authoritative turn timer
 *  - Game state creation / restart
 *  - Disconnect handling
 */

import fs from "fs";
import path from "path";
import type {
  Room,
  WordChainLanguage,
  WordChainEntry,
  WordChainGameState,
} from "../../shared/types";
import { rooms, wcStates, wcTimers, type GameIO, type GameSocket } from "../stores";
import type { GameHandler } from "./types";

const WC_TURN_DURATION = 20; // seconds

// ── Dictionary ────────────────────────────────────────────────────

let vietnameseDictionary = new Set<string>();

try {
  const dictPath = path.join(process.cwd(), "src", "data", "vietnamese-words.txt");
  if (fs.existsSync(dictPath)) {
    const fileContent = fs.readFileSync(dictPath, "utf-8");
    fileContent.split(/\r?\n/).forEach((line) => {
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

// ── Helpers ────────────────────────────────────────────────────────

function getConnector(word: string, language: WordChainLanguage): string {
  const trimmed = word.trim().toLowerCase();
  if (language === "vi") {
    const parts = trimmed.split(/\s+/);
    return parts[parts.length - 1];
  }
  return trimmed[trimmed.length - 1];
}

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

async function validateEnglishWord(word: string): Promise<boolean> {
  try {
    const res = await fetch(
      `https://api.dictionaryapi.dev/api/v2/entries/en/${encodeURIComponent(
        word.trim().toLowerCase()
      )}`
    );
    return res.status === 200;
  } catch {
    console.warn(`⚠ Dictionary API unreachable for "${word}", allowing.`);
    return true;
  }
}

async function validateVietnameseWord(word: string): Promise<boolean> {
  const lower = word.trim().toLowerCase().replace(/_/g, " ");
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

// ── Timer management ──────────────────────────────────────────────

function clearWCTimer(roomId: string): void {
  const timer = wcTimers.get(roomId);
  if (timer) {
    clearTimeout(timer);
    wcTimers.delete(roomId);
  }
}

function startWCTimer(roomId: string, io: GameIO): void {
  clearWCTimer(roomId);
  const timer = setTimeout(() => {
    handleWCTimeout(roomId, io);
  }, (WC_TURN_DURATION + 1) * 1000);
  wcTimers.set(roomId, timer);
}

function handleWCTimeout(roomId: string, io: GameIO): void {
  const room = rooms.get(roomId);
  const state = wcStates.get(roomId);
  if (!room || !state || room.status !== "playing") return;

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

// ── Handler ───────────────────────────────────────────────────────

export const wordchainHandler: GameHandler = {
  gameType: "wordchain",
  maxPlayers: 2,
  autoStart: true,

  startGame(room: Room, io: GameIO): void {
    const lang = room.language || "en";
    const firstPlayer = room.players[0];
    const gameState = createInitialWCState(lang, firstPlayer.id);
    wcStates.set(room.id, gameState);
    io.to(room.id).emit("wc_game_started", { room, gameState });
  },

  registerEvents(socket: GameSocket, io: GameIO): void {
    socket.on("wc_submit_word", async ({ roomId, word }) => {
      const room = rooms.get(roomId);
      if (!room || room.status !== "playing" || room.gameType !== "wordchain") return;

      const state = wcStates.get(roomId);
      if (!state) return;

      const player = room.players.find((p) => p.socketId === socket.id);
      if (!player) return;

      if (player.id !== state.currentTurnPlayerId) {
        socket.emit("wc_word_rejected", { word, reason: "It's not your turn!" });
        return;
      }

      const trimmed = word.trim();
      if (!trimmed) {
        socket.emit("wc_word_rejected", { word, reason: "Word cannot be empty." });
        return;
      }

      const lower = trimmed.toLowerCase();

      // 1. Check chaining rule (skip for first word)
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
        socket.emit("wc_word_rejected", { word, reason: "This word has already been used!" });
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

      const otherPlayer = room.players.find((p) => p.id !== player.id);
      if (!otherPlayer) return;

      state.currentTurnPlayerId = otherPlayer.id;
      state.turnStartedAt = Date.now();

      io.to(roomId).emit("wc_word_accepted", {
        entry,
        gameState: { ...state },
      });

      io.to(roomId).emit("wc_turn_changed", {
        currentTurnPlayerId: otherPlayer.id,
        turnStartedAt: state.turnStartedAt,
      });

      startWCTimer(roomId, io);

      console.log(`📝 Word Chain [${roomId}]: "${trimmed}" by ${player.username} → next: ${otherPlayer.username}`);
    });

    socket.on("wc_timeout", ({ roomId }) => {
      handleWCTimeout(roomId, io);
    });
  },

  handleReconnect(socket: GameSocket, room: Room, _io: GameIO): void {
    const gs = wcStates.get(room.id);
    if (gs) {
      socket.emit("wc_game_started", { room, gameState: gs });
    }
  },

  handleDisconnect(socket: GameSocket, room: Room, io: GameIO): void {
    const state = wcStates.get(room.id);
    const leavingPlayer = room.players.find((p) => p.socketId === socket.id);
    const stayingPlayer = room.players.find((p) => p.socketId !== socket.id);

    if (state && leavingPlayer && stayingPlayer) {
      room.status = "finished";
      state.winner = stayingPlayer.id;
      state.endReason = "disconnect";
      clearWCTimer(room.id);

      io.to(room.id).emit("wc_game_over", {
        winnerId: stayingPlayer.id,
        winnerName: stayingPlayer.username,
        loserId: leavingPlayer.id,
        loserName: leavingPlayer.username,
        reason: "disconnect",
        gameState: { ...state },
      });
    }
  },

  handleRestart(room: Room, io: GameIO): void {
    const lang = room.language || "en";
    const firstPlayer = room.players[0];
    const gameState = createInitialWCState(lang, firstPlayer.id);
    wcStates.set(room.id, gameState);
    io.to(room.id).emit("wc_game_started", { room, gameState });
  },
};
