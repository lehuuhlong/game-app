/**
 * Shared room handler.
 *
 * Manages all game-agnostic events:
 *  - join_room (create / join / reconnect)
 *  - leave_room / disconnect
 *  - restart_game
 *  - Stale room cleanup
 *
 * Dispatches game-specific logic to the appropriate GameHandler
 * via the handler registry.
 */

import type { Player, Room, GameType } from "../../shared/types";
import { rooms, purgeRoomState, wcTimers, type GameIO, type GameSocket } from "../stores";
import type { GameHandler } from "./types";

// ── Handler Registry ──────────────────────────────────────────────

const gameHandlers = new Map<string, GameHandler>();

export function registerGameHandler(handler: GameHandler): void {
  gameHandlers.set(handler.gameType, handler);
}

function getHandler(gameType: string): GameHandler | undefined {
  return gameHandlers.get(gameType);
}

// ── Room Management ───────────────────────────────────────────────

export function setupRoomHandlers(socket: GameSocket, io: GameIO): void {
  // ── join_room ─────────────────────────────────────────────────
  socket.on("join_room", ({ roomId, gameType, username, action, language }) => {
    socket.data.username = username;
    socket.data.currentRoom = roomId;

    let room = rooms.get(roomId);

    const GAME_DISPLAY_NAMES: Record<string, string> = {
      caro: "Caro",
      wordchain: "Word Chain",
      battleship: "Battleship",
      chess: "Chess",
      monopoly: "Monopoly",
    };

    // Reject if room belongs to a different game
    if (room && room.gameType !== gameType) {
      const roomGame = GAME_DISPLAY_NAMES[room.gameType] || room.gameType;
      const targetGame = GAME_DISPLAY_NAMES[gameType] || gameType;
      socket.emit("error", {
        message: `This room code is for ${roomGame}. It cannot be joined from ${targetGame}.`,
      });
      return;
    }

    // Check if this is a reconnection (only if game is already in progress)
    if (room && room.status === "playing") {
      const existingPlayer = room.players.find((p) => p.username === username);
      if (existingPlayer) {
        // Reconnect — update the socketId
        existingPlayer.socketId = socket.id;
        socket.join(roomId);

        const playerId = existingPlayer.id;
        socket.emit("room_joined", { room, playerId });

        // Re-send game state if game is in progress
        const handler = getHandler(room.gameType);
        handler?.handleReconnect(socket, room, io);

        io.emit("online_players_count", io.engine.clientsCount);
        console.log(`🔄 ${username} reconnected to room ${roomId}`);
        return;
      }
    }

    if (action === "join") {
      if (!room) {
        socket.emit("error", { message: "Room not found. Please check the code." });
        return;
      }
      const handler = getHandler(room.gameType);
      const maxPlayers = handler?.maxPlayers ?? 2;

      if (room.players.length >= maxPlayers) {
        socket.emit("error", { message: "Room is full." });
        return;
      }
    }

    // Create room if it doesn't exist
    if (!room) {
      room = {
        id: roomId,
        gameType: gameType as GameType,
        players: [],
        status: "waiting",
        createdAt: new Date(),
        language,
      };
      rooms.set(roomId, room);
    }

    // Create the player
    const playerId = `player_${Math.random().toString(36).substring(2, 9)}`;
    let finalUsername = username || `Guest_${playerId.slice(-4)}`;
    if (room.players.some((p) => p.username === finalUsername)) {
      finalUsername = `${finalUsername} #2`;
    }

    const player: Player = {
      id: playerId,
      username: finalUsername,
      socketId: socket.id,
    };

    room.players.push(player);
    socket.join(roomId);
    socket.emit("room_joined", { room, playerId });
    socket.to(roomId).emit("player_joined", { player, room });

    console.log(
      `👤 ${player.username} joined room ${roomId} (${room.players.length} players)`
    );

    // Check if we should auto-start
    const handler = getHandler(room.gameType);
    if (handler?.autoStart && room.players.length >= handler.maxPlayers && room.status === "waiting") {
      room.status = "playing";
      handler.startGame(room, io);
      console.log(`🚀 Auto-started ${room.gameType} in room ${roomId}`);
    }

    io.emit("online_players_count", io.engine.clientsCount);
  });

  // ── restart_game ──────────────────────────────────────────────
  socket.on("restart_game", ({ roomId }) => {
    const room = rooms.get(roomId);
    if (!room) return;

    const handler = getHandler(room.gameType);
    if (!handler) return;

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

    handler.handleRestart(room, io);
    console.log(`🔄 Game restarted in room ${roomId}`);
  });

  // ── leave_room ────────────────────────────────────────────────
  socket.on("leave_room", ({ roomId }) => {
    handleLeaveRoom(socket, roomId, io);
  });

  // ── disconnect ────────────────────────────────────────────────
  socket.on("disconnect", () => {
    console.log(`🔌 Client disconnected: ${socket.id}`);
    io.emit("online_players_count", io.engine.clientsCount);
    const roomId = socket.data.currentRoom;
    if (roomId) handleLeaveRoom(socket, roomId, io);
  });

  // Register game-specific events
  for (const handler of gameHandlers.values()) {
    handler.registerEvents(socket, io);
  }
}

// ── Leave Room (shared) ───────────────────────────────────────────

function handleLeaveRoom(socket: GameSocket, roomId: string, io: GameIO): void {
  socket.leave(roomId);
  const room = rooms.get(roomId);
  if (!room) return;

  // Dispatch game-specific disconnect logic
  if (room.status === "playing") {
    const handler = getHandler(room.gameType);
    handler?.handleDisconnect(socket, room, io);
  }

  // Remove player from room
  room.players = room.players.filter((p) => p.socketId !== socket.id);
  console.log(
    `👤 ${socket.data.username || socket.id} left room ${roomId} (${room.players.length} remaining)`
  );

  if (room.players.length === 0) {
    purgeRoomState(roomId);
  } else {
    // For non-monopoly games, mark as finished. For monopoly, the game continues.
    if (room.gameType !== "monopoly" || room.status !== "playing") {
      room.status = "finished";
    }
    socket.to(roomId).emit("player_left", { playerId: socket.id, room });
  }
}

// ── Stale Room Cleanup ────────────────────────────────────────────

export function startRoomCleanup(): void {
  setInterval(() => {
    const now = Date.now();
    for (const [id, room] of rooms) {
      if (
        room.players.length === 0 &&
        now - room.createdAt.getTime() > 5 * 60 * 1000
      ) {
        purgeRoomState(id);
        console.log(`🧹 Cleaned up stale room: ${id}`);
      }
    }
  }, 60_000);
}
