'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { io, Socket } from 'socket.io-client';
import type {
  ClientToServerEvents,
  ServerToClientEvents,
  MonopolyGameState,
  MonopolyTokenColor,
  Room,
} from '@/types/socket';

const SOCKET_URL = process.env.NEXT_PUBLIC_SOCKET_URL || 'http://localhost:4000';

export function useMonopoly(username: string) {
  const socketRef = useRef<Socket<ServerToClientEvents, ClientToServerEvents> | null>(null);
  const roomIdRef = useRef('');
  const playerIdRef = useRef<string | null>(null);

  const [room, setRoom] = useState<Room | null>(null);
  const [playerId, setPlayerId] = useState<string | null>(null);
  const [gameState, setGameState] = useState<MonopolyGameState | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [joinError, setJoinError] = useState<string | null>(null);
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
  const [monopolyCelebration, setMonopolyCelebration] = useState<{
    playerId: string;
    username: string;
    tokenColor: MonopolyTokenColor;
    colorGroup: string;
    propertyNames: string[];
  } | null>(null);

  /** Callback fired when room_joined is confirmed by server */
  const onJoinSuccessRef = useRef<(() => void) | null>(null);

  // ── Socket management ─────────────────────────────────────────

  const getSocket = useCallback((): Socket<ServerToClientEvents, ClientToServerEvents> => {
    if (!socketRef.current || !socketRef.current.connected) {
      socketRef.current = io(SOCKET_URL, {
        transports: ['websocket', 'polling'],
        withCredentials: true,
      });
    }
    return socketRef.current;
  }, []);

  const setupSocket = useCallback((socket: Socket<ServerToClientEvents, ClientToServerEvents>) => {
    // Clear old listeners
    socket
      .off('room_joined')
      .off('player_joined')
      .off('player_left')
      .off('mp_game_started')
      .off('mp_game_update')
      .off('mp_dice_rolled')
      .off('mp_monopoly_completed')
      .off('mp_offer_buy')
      .off('mp_offer_upgrade')
      .off('mp_game_over')
      .off('error');

    // ── Shared room events ────────────────────────────────────────

    socket.on('room_joined', ({ room, playerId }) => {
      setRoom(room);
      setPlayerId(playerId);
      playerIdRef.current = playerId;
      onJoinSuccessRef.current?.();
      onJoinSuccessRef.current = null;
    });

    socket.on('player_joined' as any, ({ room }: { room: Room }) => {
      setRoom(room);
    });

    socket.on('player_left' as any, ({ room }: { room: Room }) => {
      setRoom(room);
    });

    // ── Monopoly-specific events ──────────────────────────────────

    socket.on('mp_game_started', ({ room, gameState }) => {
      setRoom(room);
      setGameState(gameState);
      setBuyOffer(null);
      setUpgradeOffer(null);
      setWinner(null);
      setMonopolyCelebration(null);
    });

    socket.on('mp_dice_rolled', ({ dice }) => {
      setGameState((prev) => (prev ? { ...prev, lastDice: dice } : prev));
    });

    socket.on('mp_monopoly_completed', (data) => {
      setMonopolyCelebration(data);
    });

    socket.on('mp_game_update', ({ gameState }) => {
      setGameState(gameState);
      // Clear offers when turn phase changes away from 'action'
      if (gameState.turnPhase !== 'action') {
        setBuyOffer(null);
        setUpgradeOffer(null);
      }
    });

    socket.on('mp_offer_buy', (offer) => {
      setBuyOffer(offer);
      setUpgradeOffer(null);
    });

    socket.on('mp_offer_upgrade', (offer) => {
      setUpgradeOffer(offer);
      setBuyOffer(null);
    });

    socket.on('mp_game_over', ({ winnerId, winnerName, gameState }) => {
      setGameState(gameState);
      setWinner({ id: winnerId, name: winnerName });

      // Record score and match (only winner submits to prevent duplicate entries)
      try {
        const isMeWinner = winnerId === playerIdRef.current;
        if (isMeWinner && gameState?.players && gameState.players.length >= 2) {
          fetch("/api/matches", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              gameType: "monopoly",
              players: gameState.players.map((p: any) => ({
                username: p.username,
                result: p.playerId === winnerId ? "win" : "loss",
                score: p.balance || 0,
              })),
              duration: 0,
              gameData: { winnerName },
            }),
          })
            .then((r) => r.json())
            .then((resData) => {
              try {
                const stored = localStorage.getItem("game-portal-user");
                if (stored && resData.users) {
                  const u = JSON.parse(stored);
                  const updated = resData.users.find((x: any) => x.username === u.username);
                  if (updated) {
                    Object.assign(u, updated);
                    localStorage.setItem("game-portal-user", JSON.stringify(u));
                  }
                }
              } catch {}
            })
            .catch(() => {});
        }
      } catch {
        // ignore
      }
    });

    socket.on('error', (data) => {
      setError(data.message);
      setJoinError(data.message);
      onJoinSuccessRef.current = null;
      setTimeout(() => {
        setError(null);
        setJoinError(null);
      }, 4000);
    });
  }, []);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      socketRef.current?.disconnect();
      socketRef.current = null;
    };
  }, []);

  // ── Actions ───────────────────────────────────────────────────

  const joinRoom = useCallback(
    (roomId: string, action: 'create' | 'join' = 'join', onSuccess?: () => void) => {
      const socket = getSocket();
      roomIdRef.current = roomId;
      setupSocket(socket);
      if (onSuccess) {
        onJoinSuccessRef.current = onSuccess;
      }
      socket.emit('join_room', {
        roomId,
        gameType: 'monopoly',
        username,
        action,
      });
    },
    [username, getSocket, setupSocket]
  );

  const resetAllState = useCallback(() => {
    setRoom(null);
    setPlayerId(null);
    playerIdRef.current = null;
    setGameState(null);
    setError(null);
    setJoinError(null);
    setBuyOffer(null);
    setUpgradeOffer(null);
    setWinner(null);
    onJoinSuccessRef.current = null;
  }, []);

  const leaveRoom = useCallback(
    (roomId: string) => {
      socketRef.current?.emit('leave_room', { roomId });
      socketRef.current?.disconnect();
      socketRef.current = null;
      roomIdRef.current = '';
      resetAllState();
    },
    [resetAllState]
  );

  const startGame = useCallback(() => {
    if (!roomIdRef.current) return;
    socketRef.current?.emit('mp_start_game', { roomId: roomIdRef.current });
  }, []);

  const rollDice = useCallback(() => {
    if (!roomIdRef.current) return;
    socketRef.current?.emit('mp_roll_dice', { roomId: roomIdRef.current });
  }, []);

  const buyProperty = useCallback(() => {
    if (!roomIdRef.current) return;
    socketRef.current?.emit('mp_buy_property', { roomId: roomIdRef.current });
    setBuyOffer(null);
  }, []);

  const upgradeProperty = useCallback((targetLevel: number) => {
    if (!roomIdRef.current) return;
    socketRef.current?.emit('mp_upgrade_property', { roomId: roomIdRef.current, targetLevel });
    setUpgradeOffer(null);
  }, []);

  const endTurn = useCallback(() => {
    if (!roomIdRef.current) return;
    socketRef.current?.emit('mp_end_turn', { roomId: roomIdRef.current });
    setBuyOffer(null);
    setUpgradeOffer(null);
  }, []);

  const sellProperty = useCallback((spaceIndex: number) => {
    if (!roomIdRef.current) return;
    socketRef.current?.emit('mp_sell_property', { roomId: roomIdRef.current, spaceIndex });
  }, []);

  const payDebt = useCallback(() => {
    if (!roomIdRef.current) return;
    socketRef.current?.emit('mp_pay_debt', { roomId: roomIdRef.current });
  }, []);

  const declareBankruptcy = useCallback(() => {
    if (!roomIdRef.current) return;
    socketRef.current?.emit('mp_declare_bankruptcy', { roomId: roomIdRef.current });
  }, []);

  const restart = useCallback(() => {
    if (!roomIdRef.current) return;
    socketRef.current?.emit('restart_game', { roomId: roomIdRef.current });
    setBuyOffer(null);
    setUpgradeOffer(null);
    setWinner(null);
  }, []);

  const dismissMonopolyCelebration = useCallback(() => {
    setMonopolyCelebration(null);
  }, []);

  const worldTourTravel = useCallback((targetSpaceIndex: number) => {
    if (!roomIdRef.current) return;
    socketRef.current?.emit('mp_world_tour_travel', { roomId: roomIdRef.current, targetSpaceIndex });
  }, []);

  const hostWorldCup = useCallback((spaceIndex: number) => {
    if (!roomIdRef.current) return;
    socketRef.current?.emit('mp_host_world_cup', { roomId: roomIdRef.current, spaceIndex });
  }, []);

  const selectChanceTarget = useCallback((targetSpaceIndex: number) => {
    if (!roomIdRef.current) return;
    socketRef.current?.emit('mp_chance_select_target', { roomId: roomIdRef.current, targetSpaceIndex });
  }, []);

  return {
    // State
    room,
    playerId,
    gameState,
    error,
    joinError,
    buyOffer,
    upgradeOffer,
    winner,
    monopolyCelebration,

    // Actions
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
