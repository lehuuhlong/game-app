"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { io, Socket } from "socket.io-client";
import type {
  ClientToServerEvents,
  ServerToClientEvents,
  Room,
  Player,
  BilliardsAimData,
  BilliardsShotData,
  BilliardsSettledData,
  BilliardsBallInHandData,
  BilliardsConfirmBallInHandData,
  BilliardsPhysicsSyncData,
} from "@/types/socket";
import { useAuth } from "@/components/auth/AuthProvider";

type GameSocket = Socket<ServerToClientEvents, ClientToServerEvents>;

const SOCKET_URL =
  process.env.NEXT_PUBLIC_SOCKET_URL || "http://localhost:4000";

export type MultiplayerMode = "local" | "online";
export type MultiplayerScreen = "lobby" | "waiting" | "playing";

interface UseBilliardsMultiplayerOptions {
  onRemoteAim?: (data: BilliardsAimData) => void;
  onRemoteShoot?: (data: BilliardsShotData) => void;
  onRemoteSettled?: (data: BilliardsSettledData) => void;
  onRemoteBallInHandMove?: (data: BilliardsBallInHandData) => void;
  onRemoteBallInHandConfirm?: (data: BilliardsConfirmBallInHandData) => void;
  onRemoteSyncPhysics?: (data: BilliardsPhysicsSyncData) => void;
  onGameStarted?: () => void;
  onGameRestarted?: () => void;
  onGameOver?: (data: { winner: 1 | 2; reason: string }) => void;
}

export function useBilliardsMultiplayer(options: UseBilliardsMultiplayerOptions = {}) {
  const { user } = useAuth();
  const username = user?.username || "Guest";

  const [mode, setMode] = useState<MultiplayerMode>("online");
  const [screen, setScreen] = useState<MultiplayerScreen>("lobby");
  const [room, setRoom] = useState<Room | null>(null);
  const [roomId, setRoomId] = useState<string>("");
  const [myPlayerNum, setMyPlayerNum] = useState<1 | 2 | null>(null);
  const [statusMsg, setStatusMsg] = useState<string>("");
  const [error, setError] = useState<string | null>(null);
  const [joinError, setJoinError] = useState<string | null>(null);

  const socketRef = useRef<GameSocket | null>(null);
  const roomIdRef = useRef<string>("");
  const playerIdRef = useRef<string>("");
  const screenRef = useRef<MultiplayerScreen>("lobby");
  const modeRef = useRef<MultiplayerMode>("online");
  const myPlayerNumRef = useRef<1 | 2 | null>(null);
  const originalPlayersRef = useRef<Player[]>([]);
  const optionsRef = useRef(options);
  optionsRef.current = options;

  useEffect(() => {
    screenRef.current = screen;
  }, [screen]);

  useEffect(() => {
    modeRef.current = mode;
  }, [mode]);

  useEffect(() => {
    myPlayerNumRef.current = myPlayerNum;
  }, [myPlayerNum]);

  // ── Get or create socket ──────────────────────────────────────────────
  const getSocket = useCallback(() => {
    if (!socketRef.current) {
      socketRef.current = io(SOCKET_URL, {
        transports: ["websocket", "polling"],
        autoConnect: true,
      });
    }
    return socketRef.current;
  }, []);

  // ── Setup socket listeners ────────────────────────────────────────────
  const setupSocket = useCallback((socket: GameSocket) => {
    socket.removeAllListeners();

    socket.on("room_joined", ({ room: r, playerId }) => {
      setRoom(r);
      playerIdRef.current = playerId;
      setError(null);
      setJoinError(null);

      if (r.players.length === 1) {
        setScreen("waiting");
        setStatusMsg("Waiting for opponent to join...");
        setMyPlayerNum(1);
      } else if (r.players.length === 2) {
        // Player 2 joined
        const pNum = r.players[0].id === playerId ? 1 : 2;
        setMyPlayerNum(pNum);
        setScreen("playing");
        setStatusMsg("");
      }
    });

    socket.on("player_joined", ({ player, room: r }) => {
      setRoom(r);
      setStatusMsg(`${player.username} joined! Starting match...`);
    });

    socket.on("player_left", ({ room: r }) => {
      setRoom(r);
      if (screenRef.current === "playing") {
        setStatusMsg("Opponent left the room.");
        setError("Opponent disconnected.");
        // Fallback: if in game and opponent left, award win to remaining player
        if (myPlayerNumRef.current) {
          optionsRef.current.onGameOver?.({
            winner: myPlayerNumRef.current,
            reason: "disconnect",
          });
        }
      } else if (r.status === "waiting") {
        setStatusMsg("Opponent left. Waiting for another player...");
      }
    });

    socket.on("billiards_game_started", ({ room: r, player1Id, player2Id }) => {
      setRoom(r);
      originalPlayersRef.current = [...r.players];
      setRoomId(r.id);
      roomIdRef.current = r.id;

      const currentPId = playerIdRef.current;
      const isP1 =
        currentPId === player1Id ||
        (r.players[0] && (r.players[0].id === currentPId || r.players[0].username === username));

      const assignedNum: 1 | 2 = isP1 ? 1 : 2;
      setMyPlayerNum(assignedNum);
      myPlayerNumRef.current = assignedNum;
      setScreen("playing");
      setStatusMsg("");
      setError(null);
      optionsRef.current.onGameStarted?.();
    });

    socket.on("billiards_game_over", ({ winner, reason }) => {
      optionsRef.current.onGameOver?.({ winner, reason });
    });

    socket.on("billiards_remote_aim", (data) => {
      optionsRef.current.onRemoteAim?.(data);
    });

    socket.on("billiards_remote_shoot", (data) => {
      optionsRef.current.onRemoteShoot?.(data);
    });

    socket.on("billiards_remote_settled", (data) => {
      optionsRef.current.onRemoteSettled?.(data);
    });

    socket.on("billiards_remote_ball_in_hand_move", (data) => {
      optionsRef.current.onRemoteBallInHandMove?.(data);
    });

    socket.on("billiards_remote_ball_in_hand_confirm", (data) => {
      optionsRef.current.onRemoteBallInHandConfirm?.(data);
    });

    socket.on("billiards_remote_sync_physics", (data) => {
      optionsRef.current.onRemoteSyncPhysics?.(data);
    });

    socket.on("billiards_game_restarted", () => {
      optionsRef.current.onGameRestarted?.();
    });

    socket.on("room_expired", ({ message }) => {
      setScreen("lobby");
      setRoom(null);
      setRoomId("");
      roomIdRef.current = "";
      setMyPlayerNum(null);
      setError(message || "Room expired.");
      setJoinError(message || "Room expired.");
    });

    socket.on("error", ({ message }) => {
      setError(message);
      if (screenRef.current === "lobby") {
        setJoinError(message);
      }
    });
  }, [username]);

  // ── Actions ───────────────────────────────────────────────────────────
  const createRoom = useCallback((explicitUsername?: string) => {
    setError(null);
    setJoinError(null);
    const code = Math.random().toString(36).substring(2, 8).toUpperCase();
    roomIdRef.current = code;
    setRoomId(code);
    setMode("online");
    const uName = explicitUsername || username || "Guest";

    const socket = getSocket();
    setupSocket(socket);

    socket.emit("join_room", {
      roomId: code,
      gameType: "billiards",
      username: uName,
      action: "create",
    });
  }, [username, getSocket, setupSocket]);

  const joinRoom = useCallback(
    (code: string, explicitUsername?: string) => {
      setError(null);
      setJoinError(null);
      const cleanCode = code.trim().toUpperCase();
      if (!cleanCode) {
        setJoinError("Please enter a room code.");
        return;
      }

      roomIdRef.current = cleanCode;
      setRoomId(cleanCode);
      setMode("online");
      const uName = explicitUsername || username || "Guest";

      const socket = getSocket();
      setupSocket(socket);

      socket.emit("join_room", {
        roomId: cleanCode,
        gameType: "billiards",
        username: uName,
        action: "join",
      });
    },
    [username, getSocket, setupSocket]
  );

  const startLocalGame = useCallback(() => {
    if (socketRef.current) {
      if (roomIdRef.current) {
        socketRef.current.emit("leave_room", { roomId: roomIdRef.current });
      }
      socketRef.current.disconnect();
      socketRef.current = null;
    }
    setMode("local");
    setScreen("playing");
    setRoom(null);
    setRoomId("");
    roomIdRef.current = "";
    setMyPlayerNum(null);
    myPlayerNumRef.current = null;
    setError(null);
    setJoinError(null);
    setStatusMsg("");
    optionsRef.current.onGameStarted?.();
  }, []);

  const leaveRoom = useCallback(() => {
    if (socketRef.current && roomIdRef.current) {
      socketRef.current.emit("leave_room", { roomId: roomIdRef.current });
      socketRef.current.disconnect();
      socketRef.current = null;
    }
    setScreen("lobby");
    setRoom(null);
    setRoomId("");
    roomIdRef.current = "";
    setMyPlayerNum(null);
    setError(null);
    setJoinError(null);
    setStatusMsg("");
  }, []);

  const switchMode = useCallback(
    (newMode: MultiplayerMode) => {
      if (mode === "online" && newMode === "local") {
        startLocalGame();
      } else {
        leaveRoom();
        setMode(newMode);
      }
    },
    [mode, startLocalGame, leaveRoom]
  );

  const restartOnlineGame = useCallback(() => {
    if (socketRef.current && roomIdRef.current) {
      socketRef.current.emit("billiards_restart", { roomId: roomIdRef.current });
    }
  }, []);

  // ── Relay Emitters ───────────────────────────────────────────────────
  const sendAim = useCallback((data: { cueAngle: number; aimDir: { x: number; y: number }; power: number }) => {
    if (modeRef.current !== "online" || !socketRef.current || !roomIdRef.current) return;
    socketRef.current.emit("billiards_aim", {
      roomId: roomIdRef.current,
      ...data,
    });
  }, []);

  const sendShoot = useCallback((data: Omit<BilliardsShotData, "roomId">) => {
    if (modeRef.current !== "online" || !socketRef.current || !roomIdRef.current) return;
    socketRef.current.emit("billiards_shoot", {
      roomId: roomIdRef.current,
      ...data,
    });
  }, []);

  const sendSettled = useCallback((data: Omit<BilliardsSettledData, "roomId">) => {
    if (modeRef.current !== "online" || !socketRef.current || !roomIdRef.current) return;
    socketRef.current.emit("billiards_settled", {
      roomId: roomIdRef.current,
      ...data,
    });
  }, []);

  const sendBallInHandMove = useCallback((pos: { x: number; y: number }) => {
    if (modeRef.current !== "online" || !socketRef.current || !roomIdRef.current) return;
    socketRef.current.emit("billiards_ball_in_hand_move", {
      roomId: roomIdRef.current,
      ...pos,
    });
  }, []);

  const sendBallInHandConfirm = useCallback((pos: { x: number; y: number }) => {
    if (modeRef.current !== "online" || !socketRef.current || !roomIdRef.current) return;
    socketRef.current.emit("billiards_ball_in_hand_confirm", {
      roomId: roomIdRef.current,
      ...pos,
    });
  }, []);

  const sendPhysicsTick = useCallback(
    (data: Omit<BilliardsPhysicsSyncData, "roomId">) => {
      if (modeRef.current !== "online" || !socketRef.current || !roomIdRef.current) return;
      socketRef.current.emit("billiards_sync_physics", {
        roomId: roomIdRef.current,
        ...data,
      });
    },
    []
  );

  // Opponent player info
  const opponent =
    room?.players.find((p) => p.socketId !== socketRef.current?.id && p.id !== playerIdRef.current) ||
    null;

  // Turn check
  const isMyTurn = useCallback(
    (currentPlayer: 1 | 2): boolean => {
      if (mode === "local") return true;
      return myPlayerNum === currentPlayer;
    },
    [mode, myPlayerNum]
  );

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (socketRef.current) {
        if (roomIdRef.current) {
          socketRef.current.emit("leave_room", { roomId: roomIdRef.current });
        }
        socketRef.current.disconnect();
        socketRef.current = null;
      }
    };
  }, []);

  return {
    mode,
    screen,
    room,
    roomId,
    myPlayerNum,
    opponent,
    statusMsg,
    error,
    joinError,
    createRoom,
    joinRoom,
    leaveRoom,
    startLocalGame,
    switchMode,
    restartOnlineGame,
    sendAim,
    sendShoot,
    sendSettled,
    sendBallInHandMove,
    sendBallInHandConfirm,
    sendPhysicsTick,
    isMyTurn,
    originalPlayers: originalPlayersRef.current,
  };
}
