/**
 * Handler entry point.
 *
 * Registers all game handlers and sets up the Socket.io connection handler.
 * This replaces the old monolithic `handlers.ts` file.
 */

import type { GameIO } from "../stores";
import { registerGameHandler, setupRoomHandlers, startRoomCleanup } from "./room";
import { caroHandler } from "./caro.handler";
import { wordchainHandler } from "./wordchain.handler";
import { battleshipHandler } from "./battleship.handler";
import { chessHandler } from "./chess.handler";
import { monopolyHandler } from "./monopoly.handler";

export function registerSocketHandlers(io: GameIO): void {
  // Register all game handlers
  registerGameHandler(caroHandler);
  registerGameHandler(wordchainHandler);
  registerGameHandler(battleshipHandler);
  registerGameHandler(chessHandler);
  registerGameHandler(monopolyHandler);

  // Handle new connections
  io.on("connection", (socket) => {
    console.log(`⚡ Client connected: ${socket.id}`);
    io.emit("online_players_count", io.engine.clientsCount);
    setupRoomHandlers(socket, io);
  });

  // Start stale room cleanup
  startRoomCleanup();
}
