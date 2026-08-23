/**
 * Client-side socket type re-exports.
 *
 * All types are defined in the shared package (shared/types.ts)
 * and re-exported here so existing `@/types/socket` imports keep working.
 */
export type {
  Player,
  Room,
  GameType,
  WordChainLanguage,
  CaroMove,
  CaroGameState,
  WordChainEntry,
  WordChainGameState,
  BattleshipPhase,
  ShipType,
  ShipPlacement,
  BattleshipPlayerState,
  BattleshipGameState,
  MonopolySpaceType,
  MonopolyColorGroup,
  MonopolyBoardSpace,
  MonopolyTokenColor,
  MonopolyPlayerState,
  MonopolyEventLog,
  MonopolyPendingDebt,
  MonopolyChanceTarget,
  MonopolyChanceEvent,
  MonopolyGameState,
  ChessColor,
  ChessMove,
  ChessMoveRecord,
  ChessPlayerInfo,
  ChessGameState,
  ClientToServerEvents,
  ServerToClientEvents,
  InterServerEvents,
  SocketData,
} from "../../shared/types";
