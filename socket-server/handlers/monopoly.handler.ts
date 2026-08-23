/**
 * Monopoly game handler.
 *
 * Manages:
 *  - 2-4 player lobby with manual host start
 *  - Dice rolling, movement, doubles, jail
 *  - Property buying, upgrading (houses/hotel), selling
 *  - Rent calculation (color monopoly 1.5×, World Cup 2×, blackout $0)
 *  - Chance cards (demolish, blackout, downgrade, shield, flight, jail, cash)
 *  - World Tour (fly to any space) and World Cup (host city)
 *  - Debt resolution and bankruptcy
 *  - Disconnect handling (graceful — game continues)
 */

import type {
  Room,
  MonopolyGameState,
  MonopolyPlayerState,
  MonopolyTokenColor,
  MonopolyChanceTarget,
} from "../../shared/types";
import { rooms, mpStates, type GameIO, type GameSocket } from "../stores";
import { MONOPOLY_BOARD, getSaleValue } from "../src/data/monopoly-board";
import type { GameHandler } from "./types";

// ── Constants ─────────────────────────────────────────────────────

const MONOPOLY_TOKEN_COLORS: MonopolyTokenColor[] = ["red", "blue", "green", "yellow"];
const MONOPOLY_STARTING_BALANCE = 2500;
const MONOPOLY_MIN_PLAYERS = 2;
const MONOPOLY_MAX_PLAYERS = 4;

// ── State creation ────────────────────────────────────────────────

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

// ── Utility helpers ───────────────────────────────────────────────

function mpLog(state: MonopolyGameState, message: string): void {
  state.eventLog.push({ message, timestamp: Date.now() });
  if (state.eventLog.length > 50) {
    state.eventLog = state.eventLog.slice(-50);
  }
}

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

function isColorGroupMonopolized(
  colorGroup: string,
  player: MonopolyPlayerState
): boolean {
  const groupSpaces = MONOPOLY_BOARD.filter((s) => s.colorGroup === colorGroup);
  if (groupSpaces.length === 0) return false;
  return groupSpaces.every((s) => player.ownedProperties.includes(s.index));
}

function checkAndNotifyMonopolyCompleted(
  state: MonopolyGameState,
  mpPlayer: MonopolyPlayerState,
  spaceIndex: number,
  io: GameIO,
  roomId: string
): void {
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

function calculateRent(
  spaceIndex: number,
  state: MonopolyGameState,
  _diceTotal: number
): number {
  const space = MONOPOLY_BOARD[spaceIndex];
  if (!space) return 0;

  const owner = state.players.find((p) =>
    p.isActive && p.ownedProperties.includes(spaceIndex)
  );
  if (!owner) return 0;

  if (state.blackoutSpaces && state.blackoutSpaces.includes(spaceIndex)) {
    return 0;
  }

  let baseRentAmount = 0;

  if (space.type === "beach") {
    const beachIndices = MONOPOLY_BOARD
      .filter((s) => s.type === "beach")
      .map((s) => s.index);
    const ownedCount = beachIndices.filter((i) =>
      owner.ownedProperties.includes(i)
    ).length;
    const BEACH_RENT_SCALE = [50, 120, 250, 500];
    baseRentAmount = BEACH_RENT_SCALE[Math.min(ownedCount, BEACH_RENT_SCALE.length) - 1] ?? 50;
  } else {
    const houseLevel = owner.houseLevels[spaceIndex] ?? 0;
    if (houseLevel > 0 && space.rentScale && space.rentScale.length >= houseLevel) {
      baseRentAmount = space.rentScale[houseLevel - 1];
    } else {
      baseRentAmount = space.baseRent ?? 0;
    }
  }

  let finalRent = baseRentAmount;

  if (space.colorGroup && isColorGroupMonopolized(space.colorGroup, owner)) {
    finalRent = Math.round(finalRent * 1.5);
  }

  if (state.worldCupSpaceIndex === spaceIndex) {
    finalRent = Math.round(finalRent * 2);
  }

  return finalRent;
}

const TAX_AMOUNTS: Record<number, number> = {
  30: 200,
};

function checkMonopolyWinner(state: MonopolyGameState): string | null {
  const activePlayers = state.players.filter((p) => p.isActive);
  if (activePlayers.length === 1) {
    return activePlayers[0].playerId;
  }
  return null;
}

function isWorldTourTargetValid(spaceIndex: number): boolean {
  if (spaceIndex < 0 || spaceIndex >= MONOPOLY_BOARD.length) return false;
  if (spaceIndex === 0 || spaceIndex === 8 || spaceIndex === 16 || spaceIndex === 24) return false;
  const space = MONOPOLY_BOARD[spaceIndex];
  if (!space) return false;
  if (space.type === "chance" || space.type === "tax") return false;
  return true;
}

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
  player: MonopolyPlayerState,
  diceTotal: number,
  io: GameIO,
  roomId: string
): boolean {
  const space = MONOPOLY_BOARD[player.position];
  if (!space) return false;

  if (space.type === "world_tour") {
    mpLog(state, `✈️ ${player.username} arrived at World Tour! On their next turn, they can fly directly to any destination!`);
    return false;
  }

  if (space.type === "world_cup") {
    if (player.ownedProperties.length > 0) {
      state.turnPhase = "world_cup";
      mpLog(state, `🏆 ${player.username} landed on World Cup! Select one of your properties on the board to host World Cup (2× Rent)!`);
      return true;
    } else {
      mpLog(state, `🏆 ${player.username} landed on World Cup but has no properties to host.`);
      return false;
    }
  }

  if (space.type === "jail") {
    player.inJail = true;
    player.jailTurns = 0;
    player.doublesCount = 0;
    mpLog(state, `🏝️ ${player.username} landed on Lost Island and is now trapped!`);
    return false;
  }

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

  if (space.type === "chance") {
    return resolveChanceCard(state, player, io, roomId);
  }

  if (space.type === "property" || space.type === "beach") {
    const owner = state.players.find((p) =>
      p.isActive && p.ownedProperties.includes(player.position)
    );

    if (owner && owner.playerId !== player.playerId) {
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

      const currentLevel = owner.houseLevels[player.position] ?? 0;
      if (space.type === "property" && currentLevel < 4 && space.rentScale) {
        return true;
      }
      return false;
    }

    if (!owner && space.price) {
      return true;
    }

    return false;
  }

  return false;
}

/**
 * Resolve a Chance card draw.
 * Returns false (never offers buy after chance).
 */
function resolveChanceCard(
  state: MonopolyGameState,
  player: MonopolyPlayerState,
  _io: GameIO,
  _roomId: string
): boolean {
  if (!state.shieldedSpaces) state.shieldedSpaces = [];
  if (!state.blackoutSpaces) state.blackoutSpaces = [];

  const opponents = state.players.filter((p) => p.isActive && p.playerId !== player.playerId);
  const opponentProperties = opponents
    .flatMap((p) => p.ownedProperties)
    .filter((idx) => !state.shieldedSpaces?.includes(idx));
  const playerProperties = player.ownedProperties.filter((idx) => !state.shieldedSpaces?.includes(idx));

  const candidateCards: string[] = [];

  if (opponentProperties.length > 0) {
    candidateCards.push("demolish", "demolish", "blackout", "blackout");
    const hasHouses = opponents.some((o) =>
      opponentProperties.some((idx) => (o.houseLevels[idx] ?? 0) > 0)
    );
    if (hasHouses) {
      candidateCards.push("downgrade", "downgrade");
    }
  }

  if (playerProperties.length > 0) {
    candidateCards.push("shield", "shield", "shield");
  }

  candidateCards.push(
    "flight", "jail", "dividend", "lottery", "inheritance",
    "consultancy", "medical", "speeding", "renovation"
  );
  if (!player.inJail) {
    candidateCards.push("jail");
  }

  const chosenCard = candidateCards[Math.floor(Math.random() * candidateCards.length)];

  // ── Target-selection cards ──────────────────────────────────────

  const targetCards: Record<string, { targetable: number[]; chanceTarget: MonopolyChanceTarget; noTargetBonus: number; noTargetTitle: string }> = {
    demolish: {
      targetable: opponents.flatMap((p) => p.ownedProperties).filter((idx) => !state.shieldedSpaces?.includes(idx)),
      chanceTarget: { type: "demolish", title: "💣 DEMOLISH CITY", description: "Click an opponent's highlighted city on the board to demolish it!" },
      noTargetBonus: 200,
      noTargetTitle: "💣 DEMOLISH BONUS",
    },
    blackout: {
      targetable: opponents.flatMap((p) => p.ownedProperties).filter((idx) => !state.shieldedSpaces?.includes(idx) && !state.blackoutSpaces?.includes(idx)),
      chanceTarget: { type: "blackout", title: "⚡ CITY BLACKOUT", description: "Click an opponent's city to cut power (Rent becomes $0)!" },
      noTargetBonus: 150,
      noTargetTitle: "⚡ BLACKOUT BONUS",
    },
    downgrade: {
      targetable: opponents.flatMap((p) => p.ownedProperties).filter((idx) => {
        const owner = opponents.find((o) => o.ownedProperties.includes(idx));
        const lvl = owner?.houseLevels[idx] ?? 0;
        return lvl > 0 && !state.shieldedSpaces?.includes(idx);
      }),
      chanceTarget: { type: "downgrade", title: "🔨 DOWNGRADE BUILDING", description: "Click an opponent's city with houses to downgrade by 1 level!" },
      noTargetBonus: 150,
      noTargetTitle: "🔨 DOWNGRADE BONUS",
    },
    shield: {
      targetable: player.ownedProperties.filter((idx) => !state.shieldedSpaces?.includes(idx)),
      chanceTarget: { type: "shield", title: "🛡️ ASSET SHIELD", description: "Click 1 of your cities to protect with an Energy Shield!" },
      noTargetBonus: 200,
      noTargetTitle: "🛡️ SHIELD BONUS",
    },
  };

  if (chosenCard in targetCards) {
    const cardInfo = targetCards[chosenCard];
    if (cardInfo.targetable.length > 0) {
      state.turnPhase = "chance_target";
      state.pendingChanceTarget = cardInfo.chanceTarget;
      state.lastChanceEvent = {
        title: `${cardInfo.chanceTarget.title.split(" ")[0]} ${cardInfo.chanceTarget.title.split(" ").slice(1).join(" ")} CARD!`,
        description: `${player.username} drew ${cardInfo.chanceTarget.title.replace(/[^\w\s]/g, "").trim()} card!`,
        icon: cardInfo.chanceTarget.title.split(" ")[0],
        timestamp: Date.now(),
      };
      mpLog(state, `❓${cardInfo.chanceTarget.title.split(" ")[0]} ${player.username} drew ${cardInfo.chanceTarget.title.replace(/[^\w\s]/g, "").trim()} card! Choosing a target...`);
      return false;
    } else {
      player.balance += cardInfo.noTargetBonus;
      state.lastChanceEvent = {
        title: cardInfo.noTargetTitle,
        description: `No valid targets — collected $${cardInfo.noTargetBonus} bonus!`,
        icon: "💰",
        timestamp: Date.now(),
      };
      mpLog(state, `❓${cardInfo.chanceTarget.title.split(" ")[0]} ${player.username} drew ${cardInfo.chanceTarget.title.replace(/[^\w\s]/g, "").trim()} card (No valid targets — received $${cardInfo.noTargetBonus} bonus).`);
      return false;
    }
  }

  // ── Non-target cards ────────────────────────────────────────────

  if (chosenCard === "flight") {
    player.position = 24;
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

// ── Shared helpers for offer/buy/upgrade after landing ─────────────

function emitOfferOrAdvance(
  state: MonopolyGameState,
  mpPlayer: MonopolyPlayerState,
  player: { id: string },
  room: Room,
  io: GameIO,
  roomId: string,
  socket: GameSocket,
  shouldOfferBuy: boolean,
  isDoubles: boolean
): void {
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
        if (isDoubles && !mpPlayer.inJail) {
          state.turnPhase = "roll";
          mpLog(state, `🎲 ${mpPlayer.username} rolled doubles — roll again!`);
          io.to(roomId).emit("mp_game_update", { gameState: { ...state } });
        } else {
          advanceMonopolyTurn(state, player.id, room, io, roomId);
        }
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
        mpLog(state, `⚠️ ${mpPlayer.username} landed on ${space.name} but cannot afford to buy ($${space.price}). Turn skipped.`);
        if (isDoubles && !mpPlayer.inJail) {
          state.turnPhase = "roll";
          mpLog(state, `🎲 ${mpPlayer.username} rolled doubles — roll again!`);
          io.to(roomId).emit("mp_game_update", { gameState: { ...state } });
        } else {
          advanceMonopolyTurn(state, player.id, room, io, roomId);
        }
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
    } else {
      // Beach / Railroad
      if (mpPlayer.balance < (space.price ?? 0)) {
        mpLog(state, `⚠️ ${mpPlayer.username} landed on ${space.name} but cannot afford to buy ($${space.price}). Turn skipped.`);
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
    if (isDoubles && !mpPlayer.inJail) {
      state.turnPhase = "roll";
      mpLog(state, `🎲 ${mpPlayer.username} rolled doubles — roll again!`);
      io.to(roomId).emit("mp_game_update", { gameState: { ...state } });
    } else {
      advanceMonopolyTurn(state, player.id, room, io, roomId);
    }
  }
}

/**
 * Check if player entered a special phase that blocks turn advancement.
 * Returns true if the phase requires waiting for player input.
 */
function isInSpecialPhase(state: MonopolyGameState): boolean {
  return (
    !!state.pendingDebt ||
    state.turnPhase === "debt" ||
    state.turnPhase === "world_cup" ||
    state.turnPhase === "chance_target" ||
    state.turnPhase === "world_tour"
  );
}

// ── Handler ───────────────────────────────────────────────────────

export const monopolyHandler: GameHandler = {
  gameType: "monopoly",
  maxPlayers: MONOPOLY_MAX_PLAYERS,
  autoStart: false, // Requires host to start manually

  startGame(room: Room, io: GameIO): void {
    const gameState = createInitialMonopolyState(
      room.players.map((p) => ({ id: p.id, username: p.username }))
    );
    mpStates.set(room.id, gameState);
    io.to(room.id).emit("mp_game_started", { room, gameState });
    console.log(`🎩 Monopoly started in room ${room.id} with ${room.players.length} players`);
  },

  registerEvents(socket: GameSocket, io: GameIO): void {
    // ── Manual start (host only) ────────────────────────────────
    socket.on("mp_start_game", ({ roomId }) => {
      const room = rooms.get(roomId);
      if (!room || room.gameType !== "monopoly" || room.status !== "waiting") return;

      if (room.players.length < MONOPOLY_MIN_PLAYERS) {
        socket.emit("error", { message: `Need at least ${MONOPOLY_MIN_PLAYERS} players to start.` });
        return;
      }

      if (room.players[0].socketId !== socket.id) {
        socket.emit("error", { message: "Only the host can start the game." });
        return;
      }

      room.status = "playing";
      monopolyHandler.startGame(room, io);
    });

    // ── Roll Dice ───────────────────────────────────────────────
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

      // ── Jail logic ────────────────────────────────────────────
      if (mpPlayer.inJail) {
        if (isDoubles) {
          mpPlayer.inJail = false;
          mpPlayer.jailTurns = 0;
          mpPlayer.doublesCount = 0;
          mpLog(state, `🔓 ${mpPlayer.username} rolled doubles and escaped Lost Island!`);
        } else {
          mpPlayer.jailTurns++;
          if (mpPlayer.jailTurns >= 3) {
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
        if (isDoubles) {
          mpPlayer.doublesCount++;
          if (mpPlayer.doublesCount >= 3) {
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

      // ── Move player ───────────────────────────────────────────
      const oldPosition = mpPlayer.position;
      mpPlayer.position = (mpPlayer.position + diceTotal) % MONOPOLY_BOARD.length;

      if (mpPlayer.position < oldPosition && mpPlayer.position !== 0) {
        mpPlayer.balance += 250;
        mpLog(state, `💵 ${mpPlayer.username} passed START — collected $250!`);
      } else if (mpPlayer.position === 0 && oldPosition !== 0) {
        mpPlayer.balance += 250;
        mpLog(state, `💵 ${mpPlayer.username} landed on START — collected $250!`);
      }

      const landedSpace = MONOPOLY_BOARD[mpPlayer.position];
      mpLog(state, `📍 ${mpPlayer.username} landed on ${landedSpace?.name || "unknown"}.`);

      // ── Resolve the space ─────────────────────────────────────
      const shouldOfferBuy = resolveSpace(state, mpPlayer, diceTotal, io, roomId);

      if (!mpPlayer.isActive) {
        advanceMonopolyTurn(state, player.id, room, io, roomId);
        return;
      }

      if (isInSpecialPhase(state)) {
        io.to(roomId).emit("mp_game_update", { gameState: { ...state } });
        return;
      }

      emitOfferOrAdvance(state, mpPlayer, player, room, io, roomId, socket, shouldOfferBuy, isDoubles);
    });

    // ── Buy Property ────────────────────────────────────────────
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

      mpPlayer.balance -= space.price;
      mpPlayer.ownedProperties.push(mpPlayer.position);
      mpPlayer.houseLevels[mpPlayer.position] = 0;
      mpPlayer.visitCounts = mpPlayer.visitCounts || {};
      mpPlayer.visitCounts[mpPlayer.position] = 1;
      mpLog(state, `🏠 ${mpPlayer.username} bought ${space.name} for $${space.price}.`);

      checkAndNotifyMonopolyCompleted(state, mpPlayer, mpPlayer.position, io, roomId);

      if (mpPlayer.doublesCount > 0 && !mpPlayer.inJail) {
        state.turnPhase = "roll";
        mpLog(state, `🎲 ${mpPlayer.username} rolled doubles — roll again!`);
        io.to(roomId).emit("mp_game_update", { gameState: { ...state } });
      } else {
        advanceMonopolyTurn(state, player.id, room, io, roomId);
      }
    });

    // ── End Turn (decline buy/upgrade) ──────────────────────────
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

      if (state.turnPhase !== "action") {
        socket.emit("error", { message: "No action to skip." });
        return;
      }

      const mpPlayer = state.players.find((p) => p.playerId === player.id);

      if (mpPlayer && mpPlayer.doublesCount > 0 && !mpPlayer.inJail) {
        state.turnPhase = "roll";
        mpLog(state, `🎲 ${mpPlayer.username} declined and rolled doubles — roll again!`);
        io.to(roomId).emit("mp_game_update", { gameState: { ...state } });
        return;
      }

      advanceMonopolyTurn(state, player.id, room, io, roomId);
    });

    // ── Upgrade Property ────────────────────────────────────────
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
        totalCost = space.price + requestedLevel * upgradeCostPerLevel;
      }

      if (mpPlayer.balance < totalCost) {
        mpLog(state, `⚠️ ${mpPlayer.username} cannot afford to build Lv.${requestedLevel} on ${space.name} ($${totalCost}).`);
        io.to(roomId).emit("mp_game_update", { gameState: { ...state } });
        socket.emit("error", { message: `Not enough money. Need $${totalCost} but have $${mpPlayer.balance}.` });
        return;
      }

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

      checkAndNotifyMonopolyCompleted(state, mpPlayer, mpPlayer.position, io, roomId);

      if (mpPlayer.doublesCount > 0 && !mpPlayer.inJail) {
        state.turnPhase = "roll";
        mpLog(state, `🎲 ${mpPlayer.username} rolled doubles — roll again!`);
        io.to(roomId).emit("mp_game_update", { gameState: { ...state } });
      } else {
        advanceMonopolyTurn(state, player.id, room, io, roomId);
      }
    });

    // ── Sell Property ───────────────────────────────────────────
    socket.on("mp_sell_property", ({ roomId, spaceIndex }) => {
      const room = rooms.get(roomId);
      if (!room || room.status !== "playing") return;
      const state = mpStates.get(roomId);
      if (!state) return;

      const player = room.players.find((p) => p.socketId === socket.id);
      if (!player) return;

      const mpPlayer = state.players.find((p) => p.playerId === player.id);
      if (!mpPlayer || !mpPlayer.isActive) return;

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

    // ── Pay Debt ────────────────────────────────────────────────
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

      mpPlayer.balance -= debt.amount;
      if (debt.creditorId) {
        const creditor = state.players.find((p) => p.playerId === debt.creditorId);
        if (creditor) {
          creditor.balance += debt.amount;
        }
      }

      mpLog(state, `💵 ${mpPlayer.username} paid $${debt.amount} ${debt.type} for ${debt.spaceName}.`);
      state.pendingDebt = null;

      advanceMonopolyTurn(state, player.id, room, io, roomId);
    });

    // ── Declare Bankruptcy ──────────────────────────────────────
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

    // ── World Tour Travel ───────────────────────────────────────
    socket.on("mp_world_tour_travel", ({ roomId, targetSpaceIndex }) => {
      const room = rooms.get(roomId);
      const state = mpStates.get(roomId);
      if (!room || !state || room.status !== "playing" || room.gameType !== "monopoly") return;

      const player = room.players.find((p) => p.socketId === socket.id);
      if (!player) return;

      const mpPlayer = state.players.find((p) => p.playerId === player.id);
      if (!mpPlayer || !mpPlayer.isActive) return;

      if (player.id !== state.currentTurnPlayerId || (state.turnPhase !== "world_tour" && mpPlayer.position !== 24)) {
        socket.emit("error", { message: "Cannot travel via World Tour right now." });
        return;
      }

      if (!isWorldTourTargetValid(targetSpaceIndex)) {
        socket.emit("error", { message: "Invalid destination. You cannot land on corners, chance, or tax spaces." });
        return;
      }

      const targetSpace = MONOPOLY_BOARD[targetSpaceIndex];
      if (!targetSpace) return;

      if (targetSpaceIndex < 24) {
        mpPlayer.balance += 250;
        mpLog(state, `💵 ${mpPlayer.username} passed START during World Tour flight — collected $250!`);
      }

      mpPlayer.position = targetSpaceIndex;
      state.rollCount = (state.rollCount || 0) + 1;
      mpLog(state, `✈️ ${mpPlayer.username} flew via World Tour to ${targetSpace.name}!`);

      const shouldOfferBuy = resolveSpace(state, mpPlayer, 0, io, roomId);

      if (!mpPlayer.isActive) {
        advanceMonopolyTurn(state, player.id, room, io, roomId);
        return;
      }

      if (isInSpecialPhase(state)) {
        io.to(roomId).emit("mp_game_update", { gameState: { ...state } });
        return;
      }

      // World Tour doesn't grant doubles, so isDoubles = false
      emitOfferOrAdvance(state, mpPlayer, player, room, io, roomId, socket, shouldOfferBuy, false);
    });

    // ── World Cup Host Selection ────────────────────────────────
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
      mpLog(state, `🏆 ${mpPlayer.username} chose ${hostSpace.name} to host the World Cup! Rent is now DOUBLED (2×)! 🏆`);

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

    // ── Chance Target Selection ─────────────────────────────────
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
  },

  handleReconnect(socket: GameSocket, room: Room, _io: GameIO): void {
    const gs = mpStates.get(room.id);
    if (gs) {
      socket.emit("mp_game_started", { room, gameState: gs });
    }
  },

  handleDisconnect(socket: GameSocket, room: Room, io: GameIO): void {
    const state = mpStates.get(room.id);
    const leavingPlayer = room.players.find((p) => p.socketId === socket.id);

    if (state && leavingPlayer) {
      const mpPlayer = state.players.find((p) => p.playerId === leavingPlayer.id);
      if (mpPlayer) {
        mpPlayer.isActive = false;
        mpPlayer.ownedProperties = [];
        mpPlayer.doublesCount = 0;
        mpLog(state, `🚪 ${mpPlayer.username} disconnected. Their properties are now available!`);

        if (state.currentTurnPlayerId === leavingPlayer.id) {
          const nextPlayerId = getNextActivePlayer(state, leavingPlayer.id);
          if (nextPlayerId) {
            state.currentTurnPlayerId = nextPlayerId;
            state.turnPhase = "roll";
            const nextPlayer = state.players.find((p) => p.playerId === nextPlayerId);
            mpLog(state, `🎲 ${nextPlayer?.username || "Unknown"}'s turn — roll the dice!`);
          }
        }

        const winnerId = checkMonopolyWinner(state);
        if (winnerId) {
          const winner = state.players.find((p) => p.playerId === winnerId);
          room.status = "finished";
          state.winner = winnerId;
          state.turnPhase = "end";
          mpLog(state, `🏆 ${winner?.username || "Unknown"} wins the game!`);
          io.to(room.id).emit("mp_game_update", { gameState: { ...state } });
          io.to(room.id).emit("mp_game_over", {
            winnerId,
            winnerName: winner?.username || "Unknown",
            reason: "disconnect",
            gameState: { ...state },
          });
        } else {
          io.to(room.id).emit("mp_game_update", { gameState: { ...state } });
        }
      }
    }
  },

  handleRestart(room: Room, io: GameIO): void {
    const gameState = createInitialMonopolyState(
      room.players.map((p) => ({ id: p.id, username: p.username }))
    );
    mpStates.set(room.id, gameState);
    io.to(room.id).emit("mp_game_started", { room, gameState });
  },
};
