'use client';

import { useState, useCallback } from 'react';
import type { Socket } from 'socket.io-client';
import type {
  ClientToServerEvents,
  ServerToClientEvents,
  Room,
  MonopolyGameState,
  MonopolyTokenColor,
} from '@/types/socket';
import { useGameSocket } from '@/hooks/useGameSocket';

export function useMonopoly(username: string) {
  const [gameState, setGameState] = useState<MonopolyGameState | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [buyOffer, setBuyOffer] = useState<{
    spaceIndex: number;
    spaceName: string;
    price: number;
  } | null>(null);
  const [upgradeOffer, setUpgradeOffer] = useState<{
    spaceIndex: number;
    spaceName: string;
    currentLevel: number;
    upgradeCost: number;
    maxLevel: number;
    costs: number[];
  } | null>(null);
  const [winner, setWinner] = useState<{ id: string; name: string } | null>(null);
  const [endReason, setEndReason] = useState<string | null>(null);
  const [monopolyCelebration, setMonopolyCelebration] = useState<{
    playerId: string;
    username: string;
    tokenColor: MonopolyTokenColor;
    colorGroup: string;
    propertyNames: string[];
  } | null>(null);

  const setupMPSocket = useCallback(
    (socket: Socket<ServerToClientEvents, ClientToServerEvents>) => {
      socket.off('mp_game_started');
      socket.off('mp_game_update');
      socket.off('mp_dice_rolled');
      socket.off('mp_monopoly_completed');
      socket.off('mp_offer_buy');
      socket.off('mp_offer_upgrade');
      socket.off('mp_game_over');

      socket.on('mp_game_started', ({ room: r, gameState: gs }: { room: Room; gameState: MonopolyGameState }) => {
        setRoom(r);
        setGameState(gs);
        setBuyOffer(null);
        setUpgradeOffer(null);
        setWinner(null);
        setMonopolyCelebration(null);
        setScreen('playing');
      });

      socket.on('mp_dice_rolled', ({ dice }: { playerId: string; username: string; dice: [number, number]; diceTotal: number; isDoubles: boolean }) => {
        setGameState((prev) => (prev ? { ...prev, lastDice: dice } : prev));
      });

      socket.on('mp_monopoly_completed', (data: { playerId: string; username: string; tokenColor: MonopolyTokenColor; colorGroup: string; propertyNames: string[] }) => {
        setMonopolyCelebration(data);
      });

      socket.on('mp_game_update', ({ gameState: gs }: { gameState: MonopolyGameState }) => {
        setGameState(gs);
        if (gs.turnPhase !== 'action') {
          setBuyOffer(null);
          setUpgradeOffer(null);
        }
      });

      socket.on('mp_offer_buy', (offer: { spaceIndex: number; spaceName: string; price: number }) => {
        setBuyOffer(offer);
        setUpgradeOffer(null);
      });

      socket.on('mp_offer_upgrade', (offer: { spaceIndex: number; spaceName: string; currentLevel: number; upgradeCost: number; maxLevel: number; costs: number[] }) => {
        setUpgradeOffer(offer);
        setBuyOffer(null);
      });

      socket.on('mp_game_over', ({ winnerId, winnerName, gameState: gs, reason }: { winnerId: string; winnerName: string; gameState: MonopolyGameState; reason?: string }) => {
        setGameState(gs);
        setWinner({ id: winnerId, name: winnerName });
        setEndReason(reason || 'win');
        setScreen('finished');

        const isMeWinner = winnerId === playerIdRef.current;
        if (isMeWinner && gs?.players && gs.players.length >= 2) {
          saveMatchResult({
            gameType: 'monopoly',
            players: gs.players.map((p) => ({
              username: p.username,
              result: p.playerId === winnerId ? 'win' : 'loss',
              score: p.balance || 0,
            })),
            duration: 0,
            gameData: { winnerName },
          });
        }
      });
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    []
  );

  const gameSocket = useGameSocket({
    gameType: 'monopoly',
    username: username || '',
    onSetupSocket: setupMPSocket,
  });

  const {
    socketRef,
    roomIdRef,
    playerIdRef,
    screen,
    setScreen,
    room,
    setRoom,
    roomId,
    playerId,
    players,
    joinError,
    statusMsg,
    copied,
    createRoom,
    joinRoom,
    leaveRoom: baseLeaveRoom,
    requestRematch: baseRequestRematch,
    copyRoomCode,
    saveMatchResult,
  } = gameSocket;

  const resetAllState = useCallback(() => {
    setGameState(null);
    setError(null);
    setBuyOffer(null);
    setUpgradeOffer(null);
    setWinner(null);
    setEndReason(null);
    setMonopolyCelebration(null);
  }, []);

  const leaveRoom = useCallback(
    () => {
      baseLeaveRoom();
      resetAllState();
    },
    [baseLeaveRoom, resetAllState]
  );

  const startGame = useCallback(() => {
    if (!roomIdRef.current) return;
    socketRef.current?.emit('mp_start_game', { roomId: roomIdRef.current });
  }, [socketRef, roomIdRef]);

  const rollDice = useCallback(() => {
    if (!roomIdRef.current) return;
    socketRef.current?.emit('mp_roll_dice', { roomId: roomIdRef.current });
  }, [socketRef, roomIdRef]);

  const buyProperty = useCallback(() => {
    if (!roomIdRef.current) return;
    socketRef.current?.emit('mp_buy_property', { roomId: roomIdRef.current });
    setBuyOffer(null);
  }, [socketRef, roomIdRef]);

  const upgradeProperty = useCallback(
    (targetLevel: number) => {
      if (!roomIdRef.current) return;
      socketRef.current?.emit('mp_upgrade_property', {
        roomId: roomIdRef.current,
        targetLevel,
      });
      setUpgradeOffer(null);
    },
    [socketRef, roomIdRef]
  );

  const endTurn = useCallback(() => {
    if (!roomIdRef.current) return;
    socketRef.current?.emit('mp_end_turn', { roomId: roomIdRef.current });
    setBuyOffer(null);
    setUpgradeOffer(null);
  }, [socketRef, roomIdRef]);

  const sellProperty = useCallback(
    (spaceIndex: number) => {
      if (!roomIdRef.current) return;
      socketRef.current?.emit('mp_sell_property', {
        roomId: roomIdRef.current,
        spaceIndex,
      });
    },
    [socketRef, roomIdRef]
  );

  const payDebt = useCallback(() => {
    if (!roomIdRef.current) return;
    socketRef.current?.emit('mp_pay_debt', { roomId: roomIdRef.current });
  }, [socketRef, roomIdRef]);

  const declareBankruptcy = useCallback(() => {
    if (!roomIdRef.current) return;
    socketRef.current?.emit('mp_declare_bankruptcy', {
      roomId: roomIdRef.current,
    });
  }, [socketRef, roomIdRef]);

  const restart = useCallback(() => {
    if (!roomIdRef.current) return;
    baseRequestRematch();
    setBuyOffer(null);
    setUpgradeOffer(null);
    setWinner(null);
    setEndReason(null);
  }, [baseRequestRematch, roomIdRef]);

  const dismissMonopolyCelebration = useCallback(() => {
    setMonopolyCelebration(null);
  }, []);

  const worldTourTravel = useCallback(
    (targetSpaceIndex: number) => {
      if (!roomIdRef.current) return;
      socketRef.current?.emit('mp_world_tour_travel', {
        roomId: roomIdRef.current,
        targetSpaceIndex,
      });
    },
    [socketRef, roomIdRef]
  );

  const hostWorldCup = useCallback(
    (spaceIndex: number) => {
      if (!roomIdRef.current) return;
      socketRef.current?.emit('mp_host_world_cup', {
        roomId: roomIdRef.current,
        spaceIndex,
      });
    },
    [socketRef, roomIdRef]
  );

  const selectChanceTarget = useCallback(
    (targetSpaceIndex: number) => {
      if (!roomIdRef.current) return;
      socketRef.current?.emit('mp_chance_select_target', {
        roomId: roomIdRef.current,
        targetSpaceIndex,
      });
    },
    [socketRef, roomIdRef]
  );

  return {
    screen,
    setScreen,
    room,
    roomId,
    playerId,
    players,
    gameState,
    error,
    joinError,
    statusMsg,
    copied,
    copyRoomCode,
    buyOffer,
    upgradeOffer,
    winner,
    endReason,
    monopolyCelebration,

    // Actions
    createRoom,
    joinRoom,
    leaveRoom,
    startGame,
    rollDice,
    buyProperty,
    upgradeProperty,
    sellProperty,
    payDebt,
    declareBankruptcy,
    endTurn,
    restart,
    dismissMonopolyCelebration,
    worldTourTravel,
    hostWorldCup,
    selectChanceTarget,
  };
}
