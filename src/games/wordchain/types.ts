/**
 * Type definitions for Word Chain (Nối Từ) game.
 * Re-exports shared socket types and adds client-specific types.
 */

export type { WordChainLanguage, WordChainEntry, WordChainGameState } from "@/types/socket";

export type WordChainScreen = "lobby" | "waiting" | "playing" | "finished";

export interface WordChainPlayer {
  id: string;
  username: string;
}
