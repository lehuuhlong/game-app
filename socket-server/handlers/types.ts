/**
 * Game Handler Interface.
 *
 * Each game module exports an object conforming to this interface.
 * The shared room handler uses it to dispatch game-specific logic
 * without if/else chains.
 */

import type { Room } from "../../shared/types";
import type { GameIO, GameSocket } from "../stores";

export interface GameHandler {
  /** The game type identifier (must match GameType union) */
  gameType: string;

  /** Maximum players for this game type */
  maxPlayers: number;

  /** Whether the game auto-starts when maxPlayers is reached, or requires manual start */
  autoStart: boolean;

  /**
   * Create initial game state and store it.
   * Called when the room reaches the required player count (or manual start).
   * Should emit the appropriate "game_started" event.
   */
  startGame(room: Room, io: GameIO): void;

  /**
   * Register game-specific socket event listeners.
   * Called once per socket connection.
   */
  registerEvents(socket: GameSocket, io: GameIO): void;

  /**
   * Handle player reconnection — re-send current game state.
   * Called when an existing player rejoins with a new socket.
   */
  handleReconnect(socket: GameSocket, room: Room, io: GameIO): void;

  /**
   * Handle player disconnection during an active game.
   * Typically awards the win to the remaining player.
   */
  handleDisconnect(socket: GameSocket, room: Room, io: GameIO): void;

  /**
   * Handle game restart / rematch.
   * Should reset game state and emit the "game_started" event.
   */
  handleRestart(room: Room, io: GameIO): void;
}
